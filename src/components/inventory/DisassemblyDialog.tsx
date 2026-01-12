import { useState, useEffect } from 'react';
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
import { useInventory } from '@/hooks/useInventory';
import { Package, ArrowRight, Scale, Printer } from 'lucide-react';
import { format } from 'date-fns';

interface DisassemblyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotId: string;
}

interface LotDetails {
  id: string;
  internal_lot_number: string;
  supplier_lot_number: string | null;
  quantity_received: number;
  quantity_in_base_unit: number;
  expiry_date: string | null;
  location_id: string;
  container_status: string;
  material: {
    id: string;
    code: string;
    name: string;
    base_unit_id: string;
    base_unit: { id: string; code: string; name: string };
  };
  unit: { id: string; code: string; name: string };
  location: { id: string; name: string };
  purchase_units: {
    id: string;
    conversion_to_base: number;
    unit: { id: string; code: string; name: string };
  }[];
}

export function DisassemblyDialog({ open, onOpenChange, lotId }: DisassemblyDialogProps) {
  const { createDisassembly } = useInventory();
  const [notes, setNotes] = useState('');
  const [printLabel, setPrintLabel] = useState(true);

  // Fetch lot details with material and purchase units
  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot-for-disassembly', lotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receiving_lots')
        .select(`
          id,
          internal_lot_number,
          supplier_lot_number,
          quantity_received,
          quantity_in_base_unit,
          expiry_date,
          location_id,
          container_status,
          material:materials(
            id,
            code,
            name,
            base_unit_id,
            base_unit:units_of_measure!materials_base_unit_id_fkey(id, code, name)
          ),
          unit:units_of_measure(id, code, name),
          location:locations(id, name)
        `)
        .eq('id', lotId)
        .single();

      if (error) throw error;

      // Fetch purchase units for this material
      const { data: purchaseUnits, error: puError } = await supabase
        .from('material_purchase_units')
        .select(`
          id,
          conversion_to_base,
          unit:units_of_measure(id, code, name)
        `)
        .eq('material_id', (data as any).material.id)
        .eq('is_active', true);

      if (puError) throw puError;

      return {
        ...data,
        purchase_units: purchaseUnits,
      } as unknown as LotDetails;
    },
    enabled: open && !!lotId,
  });

  // Calculate converted quantity
  const convertedQuantity = lot ? lot.quantity_in_base_unit : 0;
  const conversionFactor = lot && lot.quantity_received > 0 
    ? lot.quantity_in_base_unit / lot.quantity_received 
    : 1;

  const handleSubmit = async () => {
    if (!lot) return;

    // Find the purchase unit used for this lot (match by unit_id)
    const purchaseUnit = lot.purchase_units.find(
      pu => pu.unit.id === lot.unit.id
    ) || lot.purchase_units[0];

    if (!purchaseUnit) {
      return;
    }

    await createDisassembly.mutateAsync({
      parent_receiving_lot_id: lot.id,
      material_id: lot.material.id,
      location_id: lot.location_id,
      original_purchase_unit_id: purchaseUnit.id,
      original_quantity: lot.quantity_received,
      converted_unit_id: lot.material.base_unit.id,
      converted_quantity: convertedQuantity,
      conversion_factor: conversionFactor,
      notes,
    });

    // TODO: Handle label printing if printLabel is true
    
    onOpenChange(false);
    setNotes('');
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Open Container
          </DialogTitle>
          <DialogDescription>
            Convert bulk packaging to usage units for production
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : lot ? (
          <div className="space-y-6">
            {/* Material Info */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-2 font-medium">{lot.material.name}</div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>Item #: {lot.material.code}</div>
                <div>Lot: {lot.internal_lot_number}</div>
                <div>Location: {lot.location.name}</div>
                {lot.expiry_date && (
                  <div>Expires: {format(new Date(lot.expiry_date), 'MMM d, yyyy')}</div>
                )}
              </div>
              {lot.container_status === 'opened' && (
                <Badge variant="secondary" className="mt-2">
                  Already Opened
                </Badge>
              )}
            </div>

            {/* Conversion Preview */}
            <div className="flex items-center justify-center gap-4 rounded-lg border p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{lot.quantity_received}</div>
                <div className="text-sm text-muted-foreground">{lot.unit.name}</div>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{convertedQuantity.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">{lot.material.base_unit.name}</div>
              </div>
            </div>

            {/* Conversion Factor */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Scale className="h-4 w-4" />
              <span>Conversion factor: 1 {lot.unit.code} = {conversionFactor.toFixed(4)} {lot.material.base_unit.code}</span>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any observations about the container condition..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Print Label Option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="printLabel"
                checked={printLabel}
                onChange={(e) => setPrintLabel(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="printLabel" className="flex items-center gap-2 cursor-pointer">
                <Printer className="h-4 w-4" />
                Print opened container label
              </Label>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Lot not found</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!lot || createDisassembly.isPending || lot.container_status === 'opened'}
          >
            {createDisassembly.isPending ? 'Opening...' : 'Open Container'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
