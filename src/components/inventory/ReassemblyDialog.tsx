import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Package, ArrowLeft, AlertTriangle } from "lucide-react";

interface ReassemblyDialogProps {
  lot: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ReassemblyDialog = ({ lot, open, onClose, onSuccess }: ReassemblyDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [action, setAction] = useState("return_sealed");
  const [reasonCode, setReasonCode] = useState("UNUSED_RETURN");
  const [notes, setNotes] = useState("");

  // Check if can reassemble to sealed (exact conversion match)
  const conversionFactor = lot.material?.conversion_factor || lot.quantity_in_base_unit || 1;
  const canReassemble = lot.quantity_received >= conversionFactor;

  // Close/Return mutation
  const closeMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (action === 'return_sealed' && canReassemble && lot.parent_lot_id) {
        // Reassemble: Add back to parent sealed lot using RPC function
        const { error: rpcError } = await supabase.rpc('increment_lot_quantity', {
          lot_id: lot.parent_lot_id,
          amount: 1
        });

        if (rpcError) throw rpcError;

        // Log the conversion
        await supabase
          .from('inventory_conversion_log')
          .insert({
            source_lot_id: lot.id,
            source_quantity: lot.quantity_received,
            source_unit_id: lot.unit_id,
            target_lot_id: lot.parent_lot_id,
            target_quantity: 1,
            target_unit_id: lot.unit_id,
            conversion_type: 'reassembly',
            reason_code: reasonCode,
            reason_notes: notes,
            performed_by: userId
          });

        // Mark open container as empty
        await supabase
          .from('receiving_lots')
          .update({
            quantity_received: 0,
            container_status: 'empty'
          })
          .eq('id', lot.id);

      } else if (action === 'dispose') {
        // Create disposal record
        await supabase
          .from('disposal_log')
          .insert({
            receiving_lot_id: lot.id,
            material_id: lot.material_id,
            quantity_disposed: lot.quantity_received,
            unit_id: lot.unit_id,
            total_value: 0,
            disposal_reason_code: 'OPEN_EXPIRED',
            disposal_reason_notes: notes,
            source_type: 'expiry',
            disposed_by: userId
          });

        // Zero out the lot
        await supabase
          .from('receiving_lots')
          .update({
            quantity_received: 0,
            container_status: 'empty'
          })
          .eq('id', lot.id);
      }

      return true;
    },
    onSuccess: () => {
      toast({
        title: action === 'return_sealed' ? "Container Closed" : "Container Disposed",
        description: action === 'return_sealed' 
          ? "Returned to sealed inventory."
          : "Container has been disposed."
      });
      queryClient.invalidateQueries({ queryKey: ['open-containers'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Close Open Container
          </DialogTitle>
          <DialogDescription>
            Choose what to do with this open container.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lot Info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Lot:</span>
                <p className="font-medium">{lot.internal_lot_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Material:</span>
                <p className="font-medium">{lot.material?.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining:</span>
                <p className="font-medium">{lot.quantity_received} {lot.unit?.code}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Full Container:</span>
                <p className="font-medium">{conversionFactor} {lot.unit?.code}</p>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div>
            <Label>Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canReassemble && lot.parent_lot_id && (
                  <SelectItem value="return_sealed">
                    Return to Sealed Inventory (Full)
                  </SelectItem>
                )}
                <SelectItem value="dispose">Dispose / Write-off</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reassembly Warning */}
          {action === 'return_sealed' && !canReassemble && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cannot return to sealed: Container is not full. 
                Current: {lot.quantity_received}, Required: {conversionFactor} {lot.unit?.code}
              </AlertDescription>
            </Alert>
          )}

          {action === 'return_sealed' && !lot.parent_lot_id && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cannot return to sealed: No parent lot linked.
              </AlertDescription>
            </Alert>
          )}

          {/* Reason */}
          <div>
            <Label>Reason</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNUSED_RETURN">Unused Return</SelectItem>
                <SelectItem value="ISSUE_TO_PROD">Production Complete</SelectItem>
                <SelectItem value="DATA_CORRECTION">Expired</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending || (action === 'return_sealed' && (!canReassemble || !lot.parent_lot_id))}
            variant={action === 'dispose' ? 'destructive' : 'default'}
          >
            {action === 'return_sealed' ? (
              <><ArrowLeft className="h-4 w-4 mr-2" />Return to Sealed</>
            ) : (
              'Dispose'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReassemblyDialog;
