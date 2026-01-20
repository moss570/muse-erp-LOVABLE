import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  QrCode, 
  MapPin, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  ArrowLeft
} from "lucide-react";
import { differenceInHours, isPast } from "date-fns";

const PutawayTask = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState(0);
  const [locationId, setLocationId] = useState("");
  const [splitMode, setSplitMode] = useState(false);
  const [splitAllocations, setSplitAllocations] = useState<{locationId: string; quantity: number}[]>([]);
  const [lotScanned, setLotScanned] = useState(false);
  const [locationScanned, setLocationScanned] = useState(false);

  // Fetch task data
  const { data: task, isLoading } = useQuery({
    queryKey: ['putaway-task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('putaway_tasks')
        .select(`
          *,
          receiving_lot:receiving_lots(
            id,
            internal_lot_number,
            supplier_lot_number,
            quantity_received,
            material:materials(id, name, code),
            supplier:suppliers(name),
            unit:units_of_measure(id, code, name)
          ),
          transactions:putaway_transactions(
            id,
            quantity,
            location:locations(id, name, zone)
          )
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['warehouse-locations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('*')
        .eq('location_type', 'warehouse')
        .eq('is_active', true)
        .order('zone')
        .order('name');
      return data;
    }
  });

  // Calculate remaining quantity
  const remainingQuantity = task ? (task.total_quantity - (task.putaway_quantity || 0)) : 0;

  // Set initial quantity
  useEffect(() => {
    if (task) {
      setQuantity(remainingQuantity);
    }
  }, [task, remainingQuantity]);

  // Calculate progress
  const progress = task?.total_quantity > 0 
    ? ((task.putaway_quantity || 0) / task.total_quantity) * 100 
    : 0;

  // Deadline info
  const isOverdue = task?.deadline && isPast(new Date(task.deadline));
  const hoursRemaining = task?.deadline 
    ? differenceInHours(new Date(task.deadline), new Date())
    : null;

  // Putaway mutation
  const putawayMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const allocations = splitMode ? splitAllocations : [{ locationId, quantity }];

      // Validate total
      const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity, 0);
      if (totalAllocated > remainingQuantity) {
        throw new Error('Total quantity exceeds remaining');
      }

      // Create transactions
      for (const allocation of allocations) {
        const { error: txError } = await supabase
          .from('putaway_transactions')
          .insert({
            putaway_task_id: taskId,
            receiving_lot_id: task?.receiving_lot?.id,
            quantity: allocation.quantity,
            unit_id: task?.unit_id,
            location_id: allocation.locationId,
            performed_by: userId
          });

        if (txError) throw txError;
      }

      // Update task
      const newPutawayQty = (task?.putaway_quantity || 0) + totalAllocated;
      const isComplete = newPutawayQty >= task?.total_quantity;

      const { error: taskError } = await supabase
        .from('putaway_tasks')
        .update({
          putaway_quantity: newPutawayQty,
          status: isComplete ? 'completed' : 'in_progress',
          started_at: task?.started_at || new Date().toISOString(),
          completed_at: isComplete ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      // Update receiving lot if complete
      if (isComplete) {
        await supabase
          .from('receiving_lots')
          .update({
            putaway_complete: true,
            putaway_completed_at: new Date().toISOString()
          })
          .eq('id', task?.receiving_lot?.id);
      }

      return isComplete;
    },
    onSuccess: (isComplete) => {
      toast({
        title: isComplete ? "Putaway Complete!" : "Progress Saved",
        description: isComplete 
          ? "All items have been put away."
          : "Your progress has been saved. You can continue later."
      });
      queryClient.invalidateQueries({ queryKey: ['putaway-task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['putaway-tasks'] });
      
      if (isComplete) {
        navigate('/warehouse/putaway');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Simulate barcode scan
  const handleScanLot = () => {
    setLotScanned(true);
    toast({ title: "Lot Scanned", description: task?.receiving_lot?.internal_lot_number });
  };

  const handleScanLocation = () => {
    setLocationScanned(true);
    toast({ title: "Location Scanned" });
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!task) {
    return <div className="p-6">Task not found</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/warehouse/putaway')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Putaway Task</h1>
          <div className="text-muted-foreground font-mono">
            {task.receiving_lot?.internal_lot_number}
          </div>
        </div>
      </div>

      {/* Deadline Warning */}
      {isOverdue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            OVERDUE! This putaway should have been completed.
          </AlertDescription>
        </Alert>
      )}
      {!isOverdue && hoursRemaining !== null && hoursRemaining <= 6 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {hoursRemaining} hours remaining to complete this putaway.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {task.putaway_quantity || 0} / {task.total_quantity} {task.receiving_lot?.unit?.code}
            </span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      {/* Lot Information */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Lot Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Material:</span>
              <p className="font-medium">{task.receiving_lot?.material?.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining:</span>
              <p className="font-medium text-lg">
                {remainingQuantity} {task.receiving_lot?.unit?.code}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Supplier Lot:</span>
              <p className="font-medium">{task.receiving_lot?.supplier_lot_number}</p>
            </div>
          </div>

          {/* Scan Lot Button */}
          <Button
            variant={lotScanned ? "secondary" : "outline"}
            className="w-full h-16 text-lg"
            onClick={handleScanLot}
          >
            <QrCode className="h-6 w-6 mr-2" />
            {lotScanned ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Lot Verified
              </span>
            ) : (
              'Scan Lot Barcode to Confirm'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Destination */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Destination
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm">Split to multiple locations</span>
              <Switch checked={splitMode} onCheckedChange={setSplitMode} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!splitMode ? (
            <>
              {/* Single Location */}
              <div>
                <Label>Quantity</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    max={remainingQuantity}
                    min={0}
                    className="text-lg h-12"
                  />
                  <span className="text-muted-foreground">
                    {task.receiving_lot?.unit?.code}
                  </span>
                </div>
              </div>

              <div>
                <Label>Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger className="h-12 mt-1">
                    <SelectValue placeholder="Select location..." />
                  </SelectTrigger>
                        <SelectContent>
                          {locations?.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scan Location Button */}
              {locationId && (
                <Button
                  variant={locationScanned ? "secondary" : "outline"}
                  className="w-full h-12"
                  onClick={handleScanLocation}
                >
                  <QrCode className="h-5 w-5 mr-2" />
                  {locationScanned ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Location Verified
                    </span>
                  ) : (
                    'Scan Location Barcode'
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              {/* Split Mode */}
              <div className="space-y-3">
                {splitAllocations.map((alloc, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Location</Label>
                      <Select
                        value={alloc.locationId}
                        onValueChange={(v) => {
                          const newAllocs = [...splitAllocations];
                          newAllocs[index].locationId = v;
                          setSplitAllocations(newAllocs);
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {locations?.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        value={alloc.quantity}
                        onChange={(e) => {
                          const newAllocs = [...splitAllocations];
                          newAllocs[index].quantity = Number(e.target.value);
                          setSplitAllocations(newAllocs);
                        }}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSplitAllocations([...splitAllocations, { locationId: '', quantity: 0 }])}
                >
                  + Add Location
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Total: {splitAllocations.reduce((s, a) => s + a.quantity, 0)} / {remainingQuantity}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Previous Putaways */}
      {task.transactions && task.transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Previous Putaways</CardTitle>
          </CardHeader>
          <CardContent>
            {task.transactions.map((tx: any) => (
              <div key={tx.id} className="flex justify-between text-sm py-1">
                <span>{tx.location?.zone} - {tx.location?.name}</span>
                <span>{tx.quantity} {task.receiving_lot?.unit?.code}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate('/warehouse/putaway')}
        >
          Save & Exit
        </Button>
        <Button
          className="flex-1"
          onClick={() => putawayMutation.mutate()}
          disabled={
            (!splitMode && (!locationId || quantity <= 0)) ||
            (splitMode && splitAllocations.length === 0) ||
            putawayMutation.isPending
          }
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Confirm Putaway
        </Button>
      </div>
    </div>
  );
};

export default PutawayTask;
