import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface HoldEntry {
  id: string;
  receiving_lot_id: string;
  reason: { id: string; code: string; name: string; supplier_points: number } | null;
  receiving_lot: {
    supplier: { id: string; name: string } | null;
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
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [specificResolutionType, setSpecificResolutionType] = useState<string>(
    resolutionType === 'release' ? 'release' : 'dispose'
  );
  const [assessSupplierPoints, setAssessSupplierPoints] = useState(resolutionType === 'reject');
  const [createCapa, setCreateCapa] = useState(false);

  const resolveMutation = useMutation({
    mutationFn: async () => {
      const updateData: Record<string, any> = {
        status: resolutionType === 'release' ? 'released' : 
                specificResolutionType === 'dispose' ? 'disposed' : 
                specificResolutionType === 'return_to_supplier' ? 'returned' : 'rejected',
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
        resolution_notes: resolutionNotes,
        resolution_type: specificResolutionType,
        supplier_point_assessed: assessSupplierPoints,
      };

      const { error } = await supabase
        .from('inventory_holds')
        .update(updateData)
        .eq('id', hold.id);

      if (error) throw error;

      // Update receiving lot hold status
      const lotStatus = resolutionType === 'release' ? 'released' : 
                        specificResolutionType === 'dispose' ? 'disposed' : 
                        specificResolutionType === 'return_to_supplier' ? 'returned' : 'none';
      
      await supabase
        .from('receiving_lots')
        .update({ hold_status: lotStatus })
        .eq('id', hold.receiving_lot_id);

      return { success: true };
    },
    onSuccess: () => {
      toast.success(
        resolutionType === 'release' 
          ? 'Hold released successfully' 
          : 'Hold rejected successfully'
      );
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to resolve hold: ${error.message}`);
    }
  });

  const handleSubmit = () => {
    if (!resolutionNotes.trim()) {
      toast.error('Please provide resolution notes');
      return;
    }
    resolveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {resolutionType === 'release' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Release Hold
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Reject / Dispose Hold
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {resolutionType === 'reject' && (
            <div className="space-y-2">
              <Label>Disposition Action</Label>
              <Select value={specificResolutionType} onValueChange={setSpecificResolutionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dispose">Dispose</SelectItem>
                  <SelectItem value="return_to_supplier">Return to Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Resolution Notes *</Label>
            <Textarea
              id="notes"
              placeholder={
                resolutionType === 'release' 
                  ? "Explain why the hold is being released..." 
                  : "Explain the reason for rejection/disposal..."
              }
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
            />
          </div>

          {hold.reason?.supplier_points ? (
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Checkbox
                id="assess-points"
                checked={assessSupplierPoints}
                onCheckedChange={(checked) => setAssessSupplierPoints(!!checked)}
              />
              <div>
                <Label htmlFor="assess-points" className="cursor-pointer">
                  Assess supplier points (+{hold.reason.supplier_points})
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Add {hold.reason.supplier_points} points to {hold.receiving_lot?.supplier?.name}'s score
                </p>
              </div>
            </div>
          ) : null}

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

          {resolutionType === 'reject' && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p>This action will permanently mark this inventory as disposed or returned.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={resolveMutation.isPending}
            variant={resolutionType === 'release' ? 'default' : 'destructive'}
          >
            {resolveMutation.isPending ? 'Processing...' : 
              resolutionType === 'release' ? 'Release Hold' : 'Confirm Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
