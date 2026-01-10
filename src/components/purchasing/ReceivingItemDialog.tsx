import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReceiving, ReceivingItem } from '@/hooks/useReceiving';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Thermometer, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface POItem {
  id: string;
  quantity_ordered: number;
  quantity_received: number;
  remaining: number;
  receivedInSession: number;
  material: {
    id: string;
    name: string;
    code: string;
    receiving_temperature_min: number | null;
    receiving_temperature_max: number | null;
  };
  unit: {
    id: string;
    code: string;
    name: string;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  poItems: POItem[];
  existingItems: ReceivingItem[];
}

export function ReceivingItemDialog({ open, onOpenChange, sessionId, poItems, existingItems }: Props) {
  const { addItem } = useReceiving();
  
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [quantityReceived, setQuantityReceived] = useState<string>('');
  const [unitId, setUnitId] = useState<string>('');
  const [supplierLotNumber, setSupplierLotNumber] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [temperatureReading, setTemperatureReading] = useState<string>('');
  const [temperatureUnit, setTemperatureUnit] = useState('F');
  const [inspectionStatus, setInspectionStatus] = useState<string>('approved');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPOItem = poItems.find(item => item.id === selectedItem);
  
  // Check temperature range
  const temperatureInRange = (() => {
    if (!temperatureReading || !selectedPOItem) return null;
    const temp = parseFloat(temperatureReading);
    const min = selectedPOItem.material.receiving_temperature_min;
    const max = selectedPOItem.material.receiving_temperature_max;
    if (min === null && max === null) return null;
    if (min !== null && temp < min) return false;
    if (max !== null && temp > max) return false;
    return true;
  })();

  // Fetch units for conversion
  const { data: units } = useQuery({
    queryKey: ['units-of-measure'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Set default unit when item is selected
  useEffect(() => {
    if (selectedPOItem) {
      setUnitId(selectedPOItem.unit.id);
    }
  }, [selectedPOItem]);

  const handleSubmit = async () => {
    if (!selectedItem || !quantityReceived || !unitId) return;

    setIsSubmitting(true);
    try {
      // Calculate base unit quantity (simplified - assumes same unit for now)
      const qty = parseFloat(quantityReceived);
      const baseQty = qty; // TODO: Add unit conversion

      await addItem.mutateAsync({
        receiving_session_id: sessionId,
        po_item_id: selectedItem,
        quantity_received: qty,
        quantity_in_base_unit: baseQty,
        unit_id: unitId,
        supplier_lot_number: supplierLotNumber || undefined,
        manufacture_date: manufactureDate || undefined,
        expiry_date: expiryDate || undefined,
        temperature_reading: temperatureReading ? parseFloat(temperatureReading) : undefined,
        temperature_unit: temperatureReading ? temperatureUnit : undefined,
        temperature_in_range: temperatureInRange ?? undefined,
        inspection_status: inspectionStatus,
        rejection_reason: inspectionStatus === 'rejected' ? rejectionReason : undefined,
        notes: notes || undefined,
      });

      onOpenChange(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedItem('');
    setQuantityReceived('');
    setUnitId('');
    setSupplierLotNumber('');
    setManufactureDate('');
    setExpiryDate('');
    setTemperatureReading('');
    setTemperatureUnit('F');
    setInspectionStatus('approved');
    setRejectionReason('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Item</DialogTitle>
          <DialogDescription>
            Record a received item with lot and inspection details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Selection */}
          <div className="space-y-2">
            <Label>Material *</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger>
                <SelectValue placeholder="Select material to receive" />
              </SelectTrigger>
              <SelectContent>
                {poItems.filter(item => item.remaining > 0).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center gap-2">
                      <span>{item.material.name}</span>
                      <span className="text-muted-foreground">
                        ({item.remaining} remaining)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPOItem && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ordered</span>
                <span>{selectedPOItem.quantity_ordered} {selectedPOItem.unit.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Previously Received</span>
                <span>{selectedPOItem.quantity_received} {selectedPOItem.unit.code}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Remaining</span>
                <span>{selectedPOItem.remaining} {selectedPOItem.unit.code}</span>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity Received *</Label>
              <Input
                type="number"
                step="0.01"
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {units?.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.code} - {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lot Information */}
          <div className="space-y-2">
            <Label>Supplier Lot Number</Label>
            <Input
              value={supplierLotNumber}
              onChange={(e) => setSupplierLotNumber(e.target.value)}
              placeholder="Lot number from supplier"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Manufacture Date</Label>
              <Input
                type="date"
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Temperature Reading
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                value={temperatureReading}
                onChange={(e) => setTemperatureReading(e.target.value)}
                placeholder="Temperature"
                className="flex-1"
              />
              <Select value={temperatureUnit} onValueChange={setTemperatureUnit}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">°F</SelectItem>
                  <SelectItem value="C">°C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {temperatureReading && selectedPOItem && (
              selectedPOItem.material.receiving_temperature_min !== null || 
              selectedPOItem.material.receiving_temperature_max !== null
            ) && (
              <p className={`text-sm ${temperatureInRange ? 'text-green-600' : 'text-red-600'}`}>
                Expected: {selectedPOItem.material.receiving_temperature_min ?? '?'}°F - {selectedPOItem.material.receiving_temperature_max ?? '?'}°F
                {temperatureInRange === false && ' (OUT OF RANGE)'}
              </p>
            )}
          </div>

          {/* Inspection Status */}
          <div className="space-y-2">
            <Label>Inspection Status *</Label>
            <Select value={inspectionStatus} onValueChange={setInspectionStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="hold">On Hold</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {inspectionStatus === 'rejected' && (
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={2}
              />
            </div>
          )}

          {temperatureInRange === false && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Temperature is out of acceptable range. Consider placing on hold or rejecting.
              </AlertDescription>
            </Alert>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedItem || !quantityReceived || !unitId || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
