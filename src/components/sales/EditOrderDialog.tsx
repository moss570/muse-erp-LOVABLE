import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    customer_id: string;
    customer_po_number: string | null;
    requested_delivery_date: string | null;
    ship_to_name: string | null;
    ship_to_address: string | null;
    ship_to_city: string | null;
    ship_to_state: string | null;
    ship_to_zip: string | null;
    notes: string | null;
    status: string;
  };
}

export function EditOrderDialog({ open, onOpenChange, order }: EditOrderDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState(order.customer_id);
  const [customerPoNumber, setCustomerPoNumber] = useState(order.customer_po_number || '');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(order.requested_delivery_date || '');
  const [shipToName, setShipToName] = useState(order.ship_to_name || '');
  const [shipToAddress, setShipToAddress] = useState(order.ship_to_address || '');
  const [shipToCity, setShipToCity] = useState(order.ship_to_city || '');
  const [shipToState, setShipToState] = useState(order.ship_to_state || '');
  const [shipToZip, setShipToZip] = useState(order.ship_to_zip || '');
  const [notes, setNotes] = useState(order.notes || '');

  // Reset form when order changes
  useEffect(() => {
    setCustomerId(order.customer_id);
    setCustomerPoNumber(order.customer_po_number || '');
    setRequestedDeliveryDate(order.requested_delivery_date || '');
    setShipToName(order.ship_to_name || '');
    setShipToAddress(order.ship_to_address || '');
    setShipToCity(order.ship_to_city || '');
    setShipToState(order.ship_to_state || '');
    setShipToZip(order.ship_to_zip || '');
    setNotes(order.notes || '');
  }, [order]);

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers-for-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, code, name, address, city, state, zip')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Update order mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sales_orders')
        .update({
          customer_id: customerId,
          customer_po_number: customerPoNumber || null,
          requested_delivery_date: requestedDeliveryDate || null,
          ship_to_name: shipToName,
          ship_to_address: shipToAddress,
          ship_to_city: shipToCity,
          ship_to_state: shipToState,
          ship_to_zip: shipToZip,
          notes: notes || null,
        })
        .eq('id', order.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({
        title: 'Success',
        description: `Order ${order.order_number} updated`,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update shipping address when customer changes (if user wants to reset to customer default)
  const handleResetShippingToCustomer = () => {
    const customer = customers?.find(c => c.id === customerId);
    if (customer) {
      setShipToName(customer.name);
      setShipToAddress(customer.address || '');
      setShipToCity(customer.city || '');
      setShipToState(customer.state || '');
      setShipToZip(customer.zip || '');
    }
  };

  const isDraft = order.status === 'draft';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order {order.order_number}</DialogTitle>
          <DialogDescription>
            {isDraft 
              ? 'Update order details. Customer and shipping information can be modified while the order is in draft status.'
              : 'Only limited fields can be edited after the order has been confirmed.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Selection - Only editable in draft */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId} disabled={!isDraft}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.code} - {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer PO Number */}
          <div className="space-y-2">
            <Label htmlFor="customer_po_number">Customer PO Number</Label>
            <Input
              id="customer_po_number"
              placeholder="Customer's purchase order number"
              value={customerPoNumber}
              onChange={(e) => setCustomerPoNumber(e.target.value)}
            />
          </div>

          {/* Requested Delivery Date */}
          <div className="space-y-2">
            <Label htmlFor="requested_delivery_date">Requested Delivery Date</Label>
            <Input
              id="requested_delivery_date"
              type="date"
              value={requestedDeliveryDate}
              onChange={(e) => setRequestedDeliveryDate(e.target.value)}
            />
          </div>

          {/* Shipping Address */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Shipping Address</Label>
              {isDraft && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={handleResetShippingToCustomer}
                >
                  Reset to Customer Address
                </Button>
              )}
            </div>
            <Input
              placeholder="Ship To Name"
              value={shipToName}
              onChange={(e) => setShipToName(e.target.value)}
              disabled={!isDraft}
            />
            <Input
              placeholder="Address"
              value={shipToAddress}
              onChange={(e) => setShipToAddress(e.target.value)}
              disabled={!isDraft}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="City"
                value={shipToCity}
                onChange={(e) => setShipToCity(e.target.value)}
                disabled={!isDraft}
              />
              <Input
                placeholder="State"
                value={shipToState}
                onChange={(e) => setShipToState(e.target.value)}
                maxLength={2}
                disabled={!isDraft}
              />
              <Input
                placeholder="ZIP"
                value={shipToZip}
                onChange={(e) => setShipToZip(e.target.value)}
                disabled={!isDraft}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional order notes"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!customerId || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
