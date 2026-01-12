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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useInventory, InventoryLotView } from '@/hooks/useInventory';
import { ArrowRight, Package, AlertTriangle, Truck } from 'lucide-react';
import { format } from 'date-fns';

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedLots?: string[];
  movementType?: 'transfer' | 'issue_to_production';
}

export function TransferDialog({ 
  open, 
  onOpenChange, 
  preselectedLots = [],
  movementType = 'transfer'
}: TransferDialogProps) {
  const { createMovement, useInventoryByLot } = useInventory();
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedLots, setSelectedLots] = useState<Map<string, number>>(new Map());

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, location_code, location_type')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch inventory at source location
  const { data: sourceLots } = useInventoryByLot({ locationId: sourceLocationId });

  // Filter to production locations for issue_to_production
  const destinationLocations = movementType === 'issue_to_production'
    ? locations?.filter(l => l.location_type === 'production' || l.location_type === 'kitchen')
    : locations?.filter(l => l.id !== sourceLocationId);

  // Initialize selected lots from preselected
  useEffect(() => {
    if (preselectedLots.length > 0 && sourceLots) {
      const newSelected = new Map<string, number>();
      preselectedLots.forEach(lotId => {
        const lot = sourceLots.find(l => l.receiving_lot_id === lotId);
        if (lot) {
          newSelected.set(lotId, lot.current_quantity);
        }
      });
      setSelectedLots(newSelected);
    }
  }, [preselectedLots, sourceLots]);

  const handleQuantityChange = (lotId: string, quantity: number, maxQty: number) => {
    const newSelected = new Map(selectedLots);
    if (quantity > 0 && quantity <= maxQty) {
      newSelected.set(lotId, quantity);
    } else if (quantity <= 0) {
      newSelected.delete(lotId);
    }
    setSelectedLots(newSelected);
  };

  const toggleLotSelection = (lot: InventoryLotView, checked: boolean) => {
    const newSelected = new Map(selectedLots);
    if (checked) {
      newSelected.set(lot.receiving_lot_id, lot.current_quantity);
    } else {
      newSelected.delete(lot.receiving_lot_id);
    }
    setSelectedLots(newSelected);
  };

  const handleSubmit = async () => {
    if (!sourceLocationId || !destinationLocationId || selectedLots.size === 0) return;

    // Get unit IDs for each lot
    const items = await Promise.all(
      Array.from(selectedLots.entries()).map(async ([lotId, qty]) => {
        const lot = sourceLots?.find(l => l.receiving_lot_id === lotId);
        
        // Fetch the unit_id from the receiving lot
        const { data: lotData } = await supabase
          .from('receiving_lots')
          .select('unit_id, material_id')
          .eq('id', lotId)
          .single();

        return {
          receiving_lot_id: lotId,
          material_id: lot?.material_id,
          quantity_requested: qty,
          unit_id: lotData?.unit_id || '',
        };
      })
    );

    await createMovement.mutateAsync({
      movement_type: movementType,
      source_location_id: sourceLocationId,
      destination_location_id: destinationLocationId,
      notes,
      items: items.filter(i => i.unit_id),
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSourceLocationId('');
    setDestinationLocationId('');
    setNotes('');
    setSelectedLots(new Map());
  };

  const getExpiryBadge = (status: string) => {
    switch (status) {
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'expiring_soon':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Expiring Soon</Badge>;
      default:
        return null;
    }
  };

  const title = movementType === 'issue_to_production' ? 'Issue to Production' : 'Transfer Inventory';
  const description = movementType === 'issue_to_production' 
    ? 'Move materials from warehouse to production area'
    : 'Move inventory between locations';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Location Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Location</Label>
              <Select value={sourceLocationId} onValueChange={setSourceLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To Location</Label>
              <Select 
                value={destinationLocationId} 
                onValueChange={setDestinationLocationId}
                disabled={!sourceLocationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {destinationLocations?.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Available Lots (FEFO sorted) */}
          {sourceLocationId && (
            <div className="space-y-2">
              <Label>Select Lots to Transfer (FEFO Order)</Label>
              <div className="rounded-md border max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Lot #</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right w-32">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceLots?.map(lot => (
                      <TableRow 
                        key={lot.receiving_lot_id}
                        className={selectedLots.has(lot.receiving_lot_id) ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedLots.has(lot.receiving_lot_id)}
                            onCheckedChange={(checked) => toggleLotSelection(lot, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{lot.material_name}</div>
                          <div className="text-sm text-muted-foreground">{lot.material_code}</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {lot.internal_lot_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {lot.expiry_date 
                              ? format(new Date(lot.expiry_date), 'MMM d, yyyy')
                              : '-'
                            }
                            {getExpiryBadge(lot.expiry_status)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {lot.current_quantity} {lot.unit_code}
                        </TableCell>
                        <TableCell className="text-right">
                          {selectedLots.has(lot.receiving_lot_id) && (
                            <Input
                              type="number"
                              min="0"
                              max={lot.current_quantity}
                              value={selectedLots.get(lot.receiving_lot_id) || 0}
                              onChange={(e) => handleQuantityChange(
                                lot.receiving_lot_id,
                                parseFloat(e.target.value) || 0,
                                lot.current_quantity
                              )}
                              className="w-24 text-right"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!sourceLots || sourceLots.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No inventory at this location
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Selected Summary */}
          {selectedLots.size > 0 && (
            <div className="rounded-lg bg-muted/30 p-4">
              <div className="flex items-center gap-2 font-medium mb-2">
                <Package className="h-4 w-4" />
                {selectedLots.size} lot(s) selected for transfer
              </div>
              <div className="text-sm text-muted-foreground">
                Total items: {Array.from(selectedLots.values()).reduce((a, b) => a + b, 0).toFixed(2)}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Reason for transfer, special handling instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              !sourceLocationId || 
              !destinationLocationId || 
              selectedLots.size === 0 ||
              createMovement.isPending
            }
          >
            {createMovement.isPending ? 'Creating...' : 'Create Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
