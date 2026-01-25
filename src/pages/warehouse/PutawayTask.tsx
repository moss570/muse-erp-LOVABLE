import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import BarcodeScanner from "@/components/shared/BarcodeScanner";
import { 
  Package, 
  MapPin, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  ArrowLeft,
  ArrowRight,
  RotateCcw
} from "lucide-react";
import { differenceInHours, isPast } from "date-fns";

type WizardStep = 'source' | 'lot' | 'quantity' | 'destination' | 'confirm';

const STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: 'source', label: 'Source', icon: <MapPin className="h-4 w-4" /> },
  { key: 'lot', label: 'Lot', icon: <Package className="h-4 w-4" /> },
  { key: 'quantity', label: 'Quantity', icon: <Package className="h-4 w-4" /> },
  { key: 'destination', label: 'Destination', icon: <MapPin className="h-4 w-4" /> },
  { key: 'confirm', label: 'Confirm', icon: <CheckCircle className="h-4 w-4" /> },
];

const PutawayTask = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('source');
  const [sourceLocationId, setSourceLocationId] = useState<string | null>(null);
  const [sourceLocationBarcode, setSourceLocationBarcode] = useState<string | null>(null);
  const [lotVerified, setLotVerified] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [destinationLocationId, setDestinationLocationId] = useState<string | null>(null);
  const [destinationLocationBarcode, setDestinationLocationBarcode] = useState<string | null>(null);
  
  // Validation errors
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [lotError, setLotError] = useState<string | null>(null);
  const [destinationError, setDestinationError] = useState<string | null>(null);

  // Fetch task data
  const { data: task, isLoading } = useQuery({
    queryKey: ['putaway-task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('putaway_tasks')
        .select(`
          *,
          receiving_lot:receiving_lots!putaway_tasks_receiving_lot_id_fkey(
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

  // Fetch all locations for barcode validation
  const { data: locations } = useQuery({
    queryKey: ['all-locations-with-barcodes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name, location_code, location_type, location_barcode, is_active')
        .eq('is_active', true);
      return data || [];
    }
  });

  // Calculate remaining quantity
  const remainingQuantity = task ? (task.total_quantity - (task.putaway_quantity || 0)) : 0;

  // Set initial quantity when task loads
  useEffect(() => {
    if (task && quantity === 0) {
      setQuantity(remainingQuantity);
    }
  }, [task, remainingQuantity, quantity]);

  // Calculate progress
  const progress = task?.total_quantity > 0 
    ? ((task.putaway_quantity || 0) / task.total_quantity) * 100 
    : 0;

  // Deadline info
  const isOverdue = task?.deadline && isPast(new Date(task.deadline));
  const hoursRemaining = task?.deadline 
    ? differenceInHours(new Date(task.deadline), new Date())
    : null;

  // Get current step index
  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);

  // Validate source location barcode
  const handleSourceScan = (barcode: string) => {
    setSourceError(null);
    const location = locations?.find(
      l => l.location_barcode?.toLowerCase() === barcode.toLowerCase()
    );
    
    if (!location) {
      setSourceError(`Location barcode "${barcode}" not found in system`);
      return;
    }

    setSourceLocationId(location.id);
    setSourceLocationBarcode(barcode);
    
    toast({
      title: "Source Location Verified",
      description: `${location.location_code ? location.location_code + ' - ' : ''}${location.name}`
    });
    
    // Auto-advance to next step
    setTimeout(() => setCurrentStep('lot'), 500);
  };

  // Validate lot barcode
  const handleLotScan = (barcode: string) => {
    setLotError(null);
    const expectedLot = task?.receiving_lot?.internal_lot_number;
    const supplierLot = task?.receiving_lot?.supplier_lot_number;
    
    if (barcode.toLowerCase() !== expectedLot?.toLowerCase() && 
        barcode.toLowerCase() !== supplierLot?.toLowerCase()) {
      setLotError(`Barcode "${barcode}" does not match expected lot ${expectedLot}`);
      return;
    }

    setLotVerified(true);
    
    toast({
      title: "Lot Verified",
      description: task?.receiving_lot?.material?.name
    });
    
    // Auto-advance
    setTimeout(() => setCurrentStep('quantity'), 500);
  };

  // Handle quantity confirmation
  const handleQuantityConfirm = () => {
    if (quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Enter a quantity greater than 0", variant: "destructive" });
      return;
    }
    if (quantity > remainingQuantity) {
      toast({ title: "Quantity Too High", description: `Maximum is ${remainingQuantity}`, variant: "destructive" });
      return;
    }
    setCurrentStep('destination');
  };

  // Validate destination location barcode
  const handleDestinationScan = (barcode: string) => {
    setDestinationError(null);
    const location = locations?.find(
      l => l.location_barcode?.toLowerCase() === barcode.toLowerCase() && l.location_type === 'warehouse'
    );
    
    if (!location) {
      const anyMatch = locations?.find(l => l.location_barcode?.toLowerCase() === barcode.toLowerCase());
      if (anyMatch) {
        setDestinationError(`"${anyMatch.name}" is not a warehouse location`);
      } else {
        setDestinationError(`Location barcode "${barcode}" not found`);
      }
      return;
    }

    setDestinationLocationId(location.id);
    setDestinationLocationBarcode(barcode);
    
    toast({
      title: "Destination Verified",
      description: `${location.location_code ? location.location_code + ' - ' : ''}${location.name}`
    });
    
    // Auto-advance to confirm
    setTimeout(() => setCurrentStep('confirm'), 500);
  };

  // Putaway mutation
  const putawayMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      if (!destinationLocationId || !sourceLocationId) {
        throw new Error('Missing location data');
      }

      // Create transaction with source tracking
      const { error: txError } = await supabase
        .from('putaway_transactions')
        .insert({
          putaway_task_id: taskId,
          receiving_lot_id: task?.receiving_lot?.id,
          quantity: quantity,
          unit_id: task?.unit_id,
          location_id: destinationLocationId,
          source_location_id: sourceLocationId,
          source_location_barcode_scanned: sourceLocationBarcode,
          location_barcode_scanned: destinationLocationBarcode,
          lot_barcode_scanned: task?.receiving_lot?.internal_lot_number,
          performed_by: userId
        });

      if (txError) throw txError;

      // Update task
      const newPutawayQty = (task?.putaway_quantity || 0) + quantity;
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
          : `${quantity} ${task?.receiving_lot?.unit?.code} moved successfully.`
      });
      queryClient.invalidateQueries({ queryKey: ['putaway-task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['putaway-tasks'] });
      
      if (isComplete) {
        navigate('/warehouse/putaway');
      } else {
        // Reset wizard for another putaway
        resetWizard();
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

  // Reset wizard state
  const resetWizard = () => {
    setCurrentStep('source');
    setSourceLocationId(null);
    setSourceLocationBarcode(null);
    setLotVerified(false);
    setQuantity(remainingQuantity);
    setDestinationLocationId(null);
    setDestinationLocationBarcode(null);
    setSourceError(null);
    setLotError(null);
    setDestinationError(null);
  };

  // Get source location name
  const getSourceLocationName = () => {
    if (!sourceLocationId) return null;
    const loc = locations?.find(l => l.id === sourceLocationId);
    return loc ? `${loc.location_code ? loc.location_code + ' - ' : ''}${loc.name}` : sourceLocationBarcode;
  };

  // Get destination location name
  const getDestinationLocationName = () => {
    if (!destinationLocationId) return null;
    const loc = locations?.find(l => l.id === destinationLocationId);
    return loc ? `${loc.location_code ? loc.location_code + ' - ' : ''}${loc.name}` : destinationLocationBarcode;
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!task) {
    return <div className="p-6 text-center">Task not found</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/warehouse/putaway')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Putaway</h1>
          <div className="text-sm text-muted-foreground font-mono">
            {task.receiving_lot?.internal_lot_number}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={resetWizard}>
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Deadline Warning */}
      {isOverdue && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>OVERDUE! Complete immediately.</AlertDescription>
        </Alert>
      )}
      {!isOverdue && hoursRemaining !== null && hoursRemaining <= 6 && (
        <Alert className="mb-4">
          <Clock className="h-4 w-4" />
          <AlertDescription>{hoursRemaining}h remaining</AlertDescription>
        </Alert>
      )}

      {/* Progress Bar */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>Progress</span>
            <span className="font-mono">
              {task.putaway_quantity || 0} / {task.total_quantity} {task.receiving_lot?.unit?.code}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Step Indicators */}
      <div className="flex justify-between mb-6 px-2">
        {STEPS.map((step, index) => (
          <div 
            key={step.key}
            className={`flex flex-col items-center gap-1 ${
              index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index < currentStepIndex 
                ? 'bg-primary text-primary-foreground' 
                : index === currentStepIndex 
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' 
                  : 'bg-muted text-muted-foreground'
            }`}>
              {index < currentStepIndex ? <CheckCircle className="h-4 w-4" /> : index + 1}
            </div>
            <span className="text-xs">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {STEPS[currentStepIndex].icon}
            Step {currentStepIndex + 1}: {STEPS[currentStepIndex].label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Source Location */}
          {currentStep === 'source' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan the location where the item is currently stored (e.g., Receiving Dock)
              </p>
              <BarcodeScanner
                onScan={handleSourceScan}
                label="Scan Source Location Barcode"
                validated={!!sourceLocationId}
                validationError={sourceError || undefined}
                autoFocus
              />
            </div>
          )}

          {/* Step 2: Lot Verification */}
          {currentStep === 'lot' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Material:</span>
                  <p className="font-medium">{task.receiving_lot?.material?.name}</p>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Expected Lot:</span>
                  <p className="font-mono font-medium">{task.receiving_lot?.internal_lot_number}</p>
                </div>
              </div>
              <BarcodeScanner
                onScan={handleLotScan}
                expectedValue={task.receiving_lot?.internal_lot_number || undefined}
                label="Scan Lot Barcode to Verify"
                validated={lotVerified}
                validationError={lotError || undefined}
                autoFocus
              />
            </div>
          )}

          {/* Step 3: Quantity */}
          {currentStep === 'quantity' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Remaining to put away:</div>
                <div className="text-2xl font-bold">
                  {remainingQuantity} {task.receiving_lot?.unit?.code}
                </div>
              </div>
              
              <div>
                <Label htmlFor="quantity" className="text-base">Quantity to Move</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    max={remainingQuantity}
                    min={1}
                    className="h-14 text-xl font-mono text-center"
                  />
                  <span className="text-lg text-muted-foreground min-w-[60px]">
                    {task.receiving_lot?.unit?.code}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Max: {remainingQuantity} {task.receiving_lot?.unit?.code}
                </p>
              </div>

              <Button 
                className="w-full h-14 text-lg" 
                onClick={handleQuantityConfirm}
                disabled={quantity <= 0 || quantity > remainingQuantity}
              >
                Continue
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 4: Destination Location */}
          {currentStep === 'destination' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan the warehouse location where you placed the {quantity} {task.receiving_lot?.unit?.code}
              </p>
              <BarcodeScanner
                onScan={handleDestinationScan}
                label="Scan Destination Location Barcode"
                validated={!!destinationLocationId}
                validationError={destinationError || undefined}
                autoFocus
              />
            </div>
          )}

          {/* Step 5: Confirm */}
          {currentStep === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-medium">{getSourceLocationName()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lot:</span>
                  <span className="font-mono">{task.receiving_lot?.internal_lot_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Material:</span>
                  <span className="font-medium">{task.receiving_lot?.material?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="text-lg font-bold">{quantity} {task.receiving_lot?.unit?.code}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium text-primary">{getDestinationLocationName()}</span>
                </div>
              </div>

              <Button 
                className="w-full h-14 text-lg" 
                onClick={() => putawayMutation.mutate()}
                disabled={putawayMutation.isPending}
              >
                {putawayMutation.isPending ? (
                  "Processing..."
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Confirm Putaway
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Putaways */}
      {task.transactions && task.transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Previous Movements</CardTitle>
          </CardHeader>
          <CardContent>
            {task.transactions.map((tx: any) => (
              <div key={tx.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span className="text-muted-foreground">
                  {tx.location?.zone ? `${tx.location.zone} - ` : ''}{tx.location?.name}
                </span>
                <span className="font-mono">{tx.quantity} {task.receiving_lot?.unit?.code}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3">
        {currentStepIndex > 0 && currentStep !== 'confirm' && (
          <Button 
            variant="outline" 
            className="flex-1 h-12"
            onClick={() => setCurrentStep(STEPS[currentStepIndex - 1].key)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <Button 
          variant="outline" 
          className={currentStepIndex > 0 && currentStep !== 'confirm' ? "flex-1 h-12" : "w-full h-12"}
          onClick={() => navigate('/warehouse/putaway')}
        >
          Save & Exit
        </Button>
      </div>
    </div>
  );
};

export default PutawayTask;
