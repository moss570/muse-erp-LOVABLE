import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, Package, DollarSign, Truck, CheckCircle, Split } from "lucide-react";
import { cn } from "@/lib/utils";

interface HoldEntry {
  id: string;
  receiving_lot_id: string;
  reason: { id: string; code: string; name: string; supplier_points: number } | null;
  receiving_lot: {
    id: string;
    quantity_received: number;
    supplier: { id: string; name: string } | null;
    material: { id: string; name: string } | null;
    unit: { id: string; code: string } | null;
  } | null;
}

interface HoldResolutionDialogProps {
  hold: HoldEntry;
  resolutionType: 'release' | 'reject';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function HoldResolutionDialog({ 
  hold, 
  resolutionType, 
  open, 
  onOpenChange, 
  onSuccess 
}: HoldResolutionDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [resolution, setResolution] = useState<'release' | 'dispose' | 'return' | 'partial'>(
    resolutionType === 'release' ? 'release' : 'dispose'
  );
  const [releaseQty, setReleaseQty] = useState(0);
  const [disposeQty, setDisposeQty] = useState(0);
  const [returnQty, setReturnQty] = useState(0);
  const [notes, setNotes] = useState("");
  const [glAccountId, setGlAccountId] = useState("");
  const [assessSupplierPoints, setAssessSupplierPoints] = useState(resolutionType === 'reject');
  const [createCapa, setCreateCapa] = useState(false);

  const totalQty = hold.receiving_lot?.quantity_received || 0;
  const unitCode = hold.receiving_lot?.unit?.code || '';
  const materialName = hold.receiving_lot?.material?.name || '';
  const supplierPoints = hold.reason?.supplier_points || 0;

  // Estimated unit cost (placeholder - should come from receiving_lot.landed_cost)
  const estimatedUnitCost = 50;
  const disposeValue = disposeQty * estimatedUnitCost;
  const returnValue = returnQty * estimatedUnitCost;

  // Update quantities when resolution type changes
  useEffect(() => {
    if (resolution === 'release') {
      setReleaseQty(totalQty);
      setDisposeQty(0);
      setReturnQty(0);
    } else if (resolution === 'dispose') {
      setReleaseQty(0);
      setDisposeQty(totalQty);
      setReturnQty(0);
    } else if (resolution === 'return') {
      setReleaseQty(0);
      setDisposeQty(0);
      setReturnQty(totalQty);
    } else if (resolution === 'partial') {
      // Keep current values or reset
      if (releaseQty + disposeQty + returnQty === 0) {
        setReleaseQty(Math.floor(totalQty / 2));
        setDisposeQty(Math.ceil(totalQty / 2));
      }
    }
  }, [resolution, totalQty]);

  // Fetch GL accounts for disposal
  const { data: glAccounts } = useQuery({
    queryKey: ['gl-accounts-disposal'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gl_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_code');
      return data;
    },
    enabled: resolution === 'dispose' || resolution === 'partial'
  });

  // Resolution mutation
  const resolveMutation = useMutation({
    mutationFn: async () => {
      const finalStatus = resolution === 'release' ? 'released' : 
                         resolution === 'dispose' ? 'disposed' : 
                         resolution === 'return' ? 'returned' : 'released';

      const updateData: Record<string, any> = {
        status: finalStatus,
        resolution_type: resolution === 'partial' ? 'partial' : resolution,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
        resolution_notes: notes,
        supplier_point_assessed: assessSupplierPoints && (disposeQty > 0 || returnQty > 0),
      };

      // Update hold record
      const { error: holdError } = await supabase
        .from('inventory_holds')
        .update(updateData)
        .eq('id', hold.id);

      if (holdError) throw holdError;

      // Update receiving lot status
      const lotStatus = resolution === 'release' ? 'released' : 
                       resolution === 'dispose' ? 'disposed' : 
                       resolution === 'return' ? 'returned' : 
                       releaseQty > 0 ? 'released' : 'disposed';

      const { error: lotError } = await supabase
        .from('receiving_lots')
        .update({ 
          hold_status: lotStatus,
          // Update current_quantity if partially released
          ...(resolution === 'partial' && releaseQty > 0 ? { current_quantity: releaseQty } : {})
        })
        .eq('id', hold.receiving_lot_id);

      if (lotError) throw lotError;

      // Create disposal log entry if disposing any quantity
      if (disposeQty > 0) {
        const { error: disposeError } = await supabase
          .from('disposal_log')
          .insert({
            receiving_lot_id: hold.receiving_lot_id,
            material_id: hold.receiving_lot?.material?.id,
            quantity_disposed: disposeQty,
            unit_id: hold.receiving_lot?.unit?.id,
            unit_cost: estimatedUnitCost,
            total_value: disposeValue,
            gl_account_id: glAccountId || null,
            disposal_reason_code: hold.reason?.code || 'OTHER',
            disposal_reason_notes: notes,
            source_type: 'hold_rejection',
            source_reference_id: hold.id,
            supplier_id: hold.receiving_lot?.supplier?.id,
            supplier_points_assessed: assessSupplierPoints ? supplierPoints : 0,
            disposed_by: user?.id,
            requires_approval: disposeValue > 500
          });

        if (disposeError) throw disposeError;
      }

      return { success: true };
    },
    onSuccess: () => {
      const message = resolution === 'release' ? 'released to inventory' :
                     resolution === 'dispose' ? 'disposed' :
                     resolution === 'return' ? 'marked for supplier return' :
                     'partially resolved';
      toast.success(`Lot ${hold.receiving_lot?.material?.name} has been ${message}`);
      queryClient.invalidateQueries({ queryKey: ['hold-log'] });
      queryClient.invalidateQueries({ queryKey: ['hold-log-summary'] });
      queryClient.invalidateQueries({ queryKey: ['disposal-log'] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to resolve hold: ${error.message}`);
    }
  });

  const totalAllocated = releaseQty + disposeQty + returnQty;
  const isValid = resolution === 'partial' 
    ? totalAllocated === totalQty && totalAllocated > 0
    : true;

  const handleSubmit = () => {
    if (!notes.trim()) {
      toast.error('Please provide resolution notes');
      return;
    }
    if (!isValid) {
      toast.error('Total allocated quantity must equal the lot quantity');
      return;
    }
    resolveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {resolutionType === 'release' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Release Hold
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Reject / Dispose Hold
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Choose how to resolve this hold for {materialName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Lot Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Material:</span>
                  <span className="ml-2 font-medium">{materialName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="ml-2 font-medium">{totalQty} {unitCode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Hold Reason:</span>
                  <span className="ml-2 font-medium">{hold.reason?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Supplier Points:</span>
                  <span className="ml-2 font-medium">{supplierPoints} pts</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Options */}
          <div className="space-y-3">
            <Label>Resolution Option</Label>
            <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as any)}>
              {/* Release to Inventory */}
              <div className={cn(
                "flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
                resolution === 'release' ? "border-green-500 bg-green-50" : "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="release" id="release" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="release" className="flex items-center gap-2 cursor-pointer">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Release to Inventory
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Approve this lot and signal warehouse team for putaway.
                  </p>
                </div>
              </div>

              {/* Reject & Dispose */}
              <div className={cn(
                "flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
                resolution === 'dispose' ? "border-destructive bg-destructive/5" : "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="dispose" id="dispose" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="dispose" className="flex items-center gap-2 cursor-pointer">
                    <DollarSign className="h-4 w-4 text-destructive" />
                    Reject & Dispose
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dispose of this lot. Estimated value: ${(totalQty * estimatedUnitCost).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Return to Supplier */}
              <div className={cn(
                "flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
                resolution === 'return' ? "border-blue-500 bg-blue-50" : "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="return" id="return" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="return" className="flex items-center gap-2 cursor-pointer">
                    <Truck className="h-4 w-4 text-blue-500" />
                    Reject & Return to Supplier
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create RMA for supplier return.
                  </p>
                </div>
              </div>

              {/* Partial Resolution */}
              <div className={cn(
                "flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
                resolution === 'partial' ? "border-warning bg-warning/10" : "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="partial" id="partial" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="partial" className="flex items-center gap-2 cursor-pointer">
                    <Split className="h-4 w-4 text-warning" />
                    Partial Resolution
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Split quantity between release, dispose, and/or return.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Partial Resolution Quantities */}
          {resolution === 'partial' && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="releaseQty">Release</Label>
                    <Input
                      id="releaseQty"
                      type="number"
                      value={releaseQty}
                      onChange={(e) => setReleaseQty(Number(e.target.value))}
                      min={0}
                      max={totalQty}
                      className="mt-1"
                    />
                    <span className="text-xs text-muted-foreground">{unitCode}</span>
                  </div>
                  <div>
                    <Label htmlFor="disposeQty">Dispose</Label>
                    <Input
                      id="disposeQty"
                      type="number"
                      value={disposeQty}
                      onChange={(e) => setDisposeQty(Number(e.target.value))}
                      min={0}
                      max={totalQty}
                      className="mt-1"
                    />
                    <span className="text-xs text-muted-foreground">{unitCode}</span>
                  </div>
                  <div>
                    <Label htmlFor="returnQty">Return</Label>
                    <Input
                      id="returnQty"
                      type="number"
                      value={returnQty}
                      onChange={(e) => setReturnQty(Number(e.target.value))}
                      min={0}
                      max={totalQty}
                      className="mt-1"
                    />
                    <span className="text-xs text-muted-foreground">{unitCode}</span>
                  </div>
                </div>
                <p className={cn(
                  "text-sm",
                  totalAllocated === totalQty ? "text-green-600" : "text-destructive"
                )}>
                  Total: {totalAllocated} / {totalQty} {unitCode}
                  {totalAllocated !== totalQty && ' - Must equal total quantity'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* GL Account Selection for Disposal */}
          {(resolution === 'dispose' || (resolution === 'partial' && disposeQty > 0)) && (
            <div className="space-y-2">
              <Label>GL Account for Expense</Label>
              <Select value={glAccountId} onValueChange={setGlAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select GL account..." />
                </SelectTrigger>
                <SelectContent>
                  {glAccounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Estimated disposal value: ${disposeValue.toFixed(2)}
              </p>
            </div>
          )}

          {/* Supplier Points Assessment */}
          {supplierPoints > 0 && (resolution === 'dispose' || resolution === 'return' || 
            (resolution === 'partial' && (disposeQty > 0 || returnQty > 0))) && (
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Checkbox
                id="assess-points"
                checked={assessSupplierPoints}
                onCheckedChange={(checked) => setAssessSupplierPoints(!!checked)}
              />
              <div>
                <Label htmlFor="assess-points" className="cursor-pointer">
                  Assess {supplierPoints} points to supplier rating
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Add {supplierPoints} points to {hold.receiving_lot?.supplier?.name}'s score
                </p>
              </div>
            </div>
          )}

          {/* Create CAPA */}
          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <Checkbox
              id="create-capa"
              checked={createCapa}
              onCheckedChange={(checked) => setCreateCapa(!!checked)}
            />
            <div>
              <Label htmlFor="create-capa" className="cursor-pointer">
                Create CAPA
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Open a Corrective Action for this issue
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Resolution Notes *</Label>
            <Textarea
              id="notes"
              placeholder="Enter resolution notes (required)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* High-value disposal warning */}
          {disposeValue > 500 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This disposal exceeds $500 and will require manager approval.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={resolveMutation.isPending || !isValid}
            variant={resolution === 'release' ? 'default' : 'destructive'}
          >
            {resolveMutation.isPending ? 'Processing...' : 'Confirm Resolution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
