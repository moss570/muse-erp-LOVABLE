import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReceiving } from '@/hooks/useReceiving';
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
import { format } from 'date-fns';
import { Loader2, Package, Truck } from 'lucide-react';

interface PendingPO {
  id: string;
  po_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  supplier: {
    id: string;
    name: string;
    code: string;
  };
  items: {
    id: string;
    quantity_ordered: number;
    quantity_received: number;
    material: {
      id: string;
      name: string;
      code: string;
    };
  }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingPOs: PendingPO[];
}

export function ReceivingSessionDialog({ open, onOpenChange, pendingPOs }: Props) {
  const navigate = useNavigate();
  const { createSession } = useReceiving();
  const [selectedPO, setSelectedPO] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [locationId, setLocationId] = useState<string>('');
  const [carrierName, setCarrierName] = useState('');
  const [truckNumber, setTruckNumber] = useState('');
  const [trailerNumber, setTrailerNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [sealIntact, setSealIntact] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations-receiving'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, location_code, location_type')
        .eq('is_active', true)
        .in('location_type', ['warehouse', 'receiving'])
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const selectedPOData = pendingPOs.find(po => po.id === selectedPO);

  const handleSubmit = async () => {
    if (!selectedPO) return;

    setIsSubmitting(true);
    try {
      const result = await createSession.mutateAsync({
        purchase_order_id: selectedPO,
        received_date: receivedDate,
        location_id: locationId || undefined,
        carrier_name: carrierName || undefined,
        truck_number: truckNumber || undefined,
        trailer_number: trailerNumber || undefined,
        driver_name: driverName || undefined,
        seal_number: sealNumber || undefined,
        seal_intact: sealIntact,
        notes: notes || undefined,
      });
      
      onOpenChange(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedPO('');
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setLocationId('');
    setCarrierName('');
    setTruckNumber('');
    setTrailerNumber('');
    setDriverName('');
    setSealNumber('');
    setSealIntact(true);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            New Receiving Session
          </DialogTitle>
          <DialogDescription>
            Start receiving materials from a purchase order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* PO Selection */}
          <div className="space-y-2">
            <Label>Purchase Order *</Label>
            <Select value={selectedPO} onValueChange={setSelectedPO}>
              <SelectTrigger>
                <SelectValue placeholder="Select a purchase order" />
              </SelectTrigger>
              <SelectContent>
                {pendingPOs.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No pending purchase orders
                  </div>
                ) : (
                  pendingPOs.map((po) => {
                    const remainingItems = po.items.filter(
                      item => item.quantity_received < item.quantity_ordered
                    ).length;
                    return (
                      <SelectItem key={po.id} value={po.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{po.po_number}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{po.supplier.name}</span>
                          <span className="text-muted-foreground">
                            ({remainingItems} items pending)
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected PO Details */}
          {selectedPOData && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Supplier</span>
                <span className="font-medium">{selectedPOData.supplier.name}</span>
              </div>
              {selectedPOData.expected_delivery_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expected Delivery</span>
                  <span>{format(new Date(selectedPOData.expected_delivery_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Items to Receive</span>
                <span>
                  {selectedPOData.items.filter(i => i.quantity_received < i.quantity_ordered).length} of {selectedPOData.items.length}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Received Date */}
            <div className="space-y-2">
              <Label>Received Date *</Label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Receiving Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.location_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Carrier/Truck Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4" />
              Carrier Information
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Carrier Name</Label>
                <Input
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  placeholder="e.g., FedEx Freight"
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Truck Number</Label>
                <Input
                  value={truckNumber}
                  onChange={(e) => setTruckNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Trailer Number</Label>
                <Input
                  value={trailerNumber}
                  onChange={(e) => setTrailerNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Seal Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Seal Number</Label>
              <Input
                value={sealNumber}
                onChange={(e) => setSealNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Seal Intact?</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={sealIntact}
                  onCheckedChange={setSealIntact}
                />
                <span className="text-sm">{sealIntact ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this delivery..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedPO || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start Receiving
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
