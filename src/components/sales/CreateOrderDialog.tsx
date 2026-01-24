import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrderDialog({ open, onOpenChange }: CreateOrderDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [customerPoNumber, setCustomerPoNumber] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [shipToName, setShipToName] = useState('');
  const [shipToAddress, setShipToAddress] = useState('');
  const [shipToCity, setShipToCity] = useState('');
  const [shipToState, setShipToState] = useState('');
  const [shipToZip, setShipToZip] = useState('');
  const [notes, setNotes] = useState('');

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

  // Fetch company settings for default tax rate
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('default_tax_rate')
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Auto-fill shipping address when customer selected
  useEffect(() => {
    if (customerId) {
      const customer = customers?.find(c => c.id === customerId);
      if (customer) {
        setShipToName(customer.name);
        setShipToAddress(customer.address || '');
        setShipToCity(customer.city || '');
        setShipToState(customer.state || '');
        setShipToZip(customer.zip || '');
      }
    }
  }, [customerId, customers]);

  // Create order mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get customer details for defaults
      const { data: customer } = await supabase
        .from('customers')
        .select('payment_terms, allow_backorders, tax_exempt')
        .eq('id', customerId)
        .single();

      // Generate order number
      const { data: orderNumber, error: numberError } = await supabase
        .rpc('generate_sales_order_number');

      if (numberError) throw numberError;

      // Create sales order
      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          customer_po_number: customerPoNumber || null,
          order_date: new Date().toISOString().split('T')[0],
          requested_delivery_date: requestedDeliveryDate || null,
          ship_to_name: shipToName,
          ship_to_address: shipToAddress,
          ship_to_city: shipToCity,
          ship_to_state: shipToState,
          ship_to_zip: shipToZip,
          payment_terms: customer?.payment_terms,
          allow_backorders: customer?.allow_backorders || true,
          tax_rate: customer?.tax_exempt ? 0 : (companySettings?.default_tax_rate || 0.07),
          status: 'draft',
          notes: notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      return order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({
        title: 'Success',
        description: `Order ${order.order_number} created`,
      });
      onOpenChange(false);
      resetForm();
      navigate(`/sales/orders/${order.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setCustomerId('');
    setCustomerPoNumber('');
    setRequestedDeliveryDate('');
    setShipToName('');
    setShipToAddress('');
    setShipToCity('');
    setShipToState('');
    setShipToZip('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Sales Order</DialogTitle>
          <DialogDescription>
            Create a new sales order. You can add line items after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
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
            <Label>Shipping Address</Label>
            <Input
              placeholder="Ship To Name"
              value={shipToName}
              onChange={(e) => setShipToName(e.target.value)}
            />
            <Input
              placeholder="Address"
              value={shipToAddress}
              onChange={(e) => setShipToAddress(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="City"
                value={shipToCity}
                onChange={(e) => setShipToCity(e.target.value)}
              />
              <Input
                placeholder="State"
                value={shipToState}
                onChange={(e) => setShipToState(e.target.value)}
                maxLength={2}
              />
              <Input
                placeholder="ZIP"
                value={shipToZip}
                onChange={(e) => setShipToZip(e.target.value)}
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
            onClick={() => createMutation.mutate()}
            disabled={!customerId || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
