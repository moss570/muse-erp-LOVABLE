import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInventory } from '@/hooks/useInventory';
import { AlertTriangle, Plus, Minus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface AdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotId: string;
}

const ADJUSTMENT_REASONS = [
  { value: 'found_physical', label: 'Found Physical Inventory' },
  { value: 'scale_error', label: 'Scale/Measurement Error' },
  { value: 'damage', label: 'Damaged Product' },
  { value: 'spoilage', label: 'Spoilage' },
  { value: 'production_variance', label: 'Production Variance' },
  { value: 'count_correction', label: 'Cycle Count Correction' },
  { value: 'data_entry_error', label: 'Data Entry Error' },
  { value: 'other', label: 'Other' },
];

export function AdjustmentDialog({ open, onOpenChange, lotId }: AdjustmentDialogProps) {
  const { createAdjustment } = useInventory();
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease' | 'write_off'>('increase');
  const [quantity, setQuantity] = useState<string>('');
  const [reasonCode, setReasonCode] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch lot details
  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot-for-adjustment', lotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receiving_lots')
        .select(`
          id,
          internal_lot_number,
          supplier_lot_number,
          quantity_received,
          quantity_in_base_unit,
          current_quantity,
          expiry_date,
          location_id,
          material:materials(id, code, name, base_unit_id),
          unit:units_of_measure!receiving_lots_unit_id_fkey(id, code, name),
          location:locations!receiving_lots_location_id_fkey(id, name)
        `)
        .eq('id', lotId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!lotId,
  });

  const currentQty = lot?.current_quantity ?? lot?.quantity_in_base_unit ?? 0;
  const adjustmentQty = parseFloat(quantity) || 0;
  
  const getNewQuantity = () => {
    switch (adjustmentType) {
      case 'increase':
        return currentQty + adjustmentQty;
      case 'decrease':
        return Math.max(0, currentQty - adjustmentQty);
      case 'write_off':
        return 0;
      default:
        return currentQty;
    }
  };

  const handleSubmit = async () => {
    if (!lot || !reasonCode) return;

    const newQty = getNewQuantity();
    const adjustedQty = adjustmentType === 'write_off' ? currentQty : adjustmentQty;

    await createAdjustment.mutateAsync({
      receiving_lot_id: lot.id,
      location_id: lot.location_id,
      adjustment_type: adjustmentType,
      reason_code: reasonCode,
      quantity_before: currentQty,
      quantity_adjusted: adjustedQty,
      quantity_after: newQty,
      unit_id: lot.unit.id,
      notes,
      requires_approval: adjustedQty > 10, // Require approval for large adjustments
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setAdjustmentType('increase');
    setQuantity('');
    setReasonCode('');
    setNotes('');
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Adjust Inventory
          </DialogTitle>
          <DialogDescription>
            Correct inventory discrepancy for this lot
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : lot ? (
          <div className="space-y-6">
            {/* Lot Info */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-2 font-medium">{lot.material?.name}</div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>Item #: {lot.material?.code}</div>
                <div>Lot: {lot.internal_lot_number}</div>
                <div>Location: {lot.location?.name}</div>
                <div>Current Qty: <span className="font-medium text-foreground">{currentQty} {lot.unit?.code}</span></div>
              </div>
            </div>

            {/* Adjustment Type */}
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={adjustmentType === 'increase' ? 'default' : 'outline'}
                  className="gap-2"
                  onClick={() => setAdjustmentType('increase')}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
                <Button
                  type="button"
                  variant={adjustmentType === 'decrease' ? 'default' : 'outline'}
                  className="gap-2"
                  onClick={() => setAdjustmentType('decrease')}
                >
                  <Minus className="h-4 w-4" />
                  Remove
                </Button>
                <Button
                  type="button"
                  variant={adjustmentType === 'write_off' ? 'destructive' : 'outline'}
                  className="gap-2"
                  onClick={() => setAdjustmentType('write_off')}
                >
                  <Trash2 className="h-4 w-4" />
                  Write Off
                </Button>
              </div>
            </div>

            {/* Quantity (not shown for write_off) */}
            {adjustmentType !== 'write_off' && (
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity to {adjustmentType === 'increase' ? 'Add' : 'Remove'}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">{lot.unit?.code}</span>
                </div>
              </div>
            )}

            {/* New Quantity Preview */}
            <div className="flex items-center justify-between rounded-lg bg-muted p-4">
              <span className="text-sm text-muted-foreground">New Quantity:</span>
              <span className="text-xl font-bold">
                {getNewQuantity().toFixed(2)} {lot.unit?.code}
              </span>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason for Adjustment *</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_REASONS.map(reason => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional details about this adjustment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Approval Warning */}
            {adjustmentQty > 10 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Large adjustments require supervisor approval
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Lot not found</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              !lot || 
              !reasonCode || 
              (adjustmentType !== 'write_off' && !quantity) ||
              createAdjustment.isPending
            }
            variant={adjustmentType === 'write_off' ? 'destructive' : 'default'}
          >
            {createAdjustment.isPending ? 'Saving...' : 'Save Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
