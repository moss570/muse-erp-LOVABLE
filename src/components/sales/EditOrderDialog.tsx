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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

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
    order_date?: string;
    sales_order_items?: any[];
  };
}

export function EditOrderDialog({ open, onOpenChange, order }: EditOrderDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isDraft = order.status === 'draft';

  const [customerId, setCustomerId] = useState(order.customer_id);
  const [customerPoNumber, setCustomerPoNumber] = useState(order.customer_po_number || '');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(order.requested_delivery_date || '');
  const [shipToName, setShipToName] = useState(order.ship_to_name || '');
  const [shipToAddress, setShipToAddress] = useState(order.ship_to_address || '');
  const [shipToCity, setShipToCity] = useState(order.ship_to_city || '');
  const [shipToState, setShipToState] = useState(order.ship_to_state || '');
  const [shipToZip, setShipToZip] = useState(order.ship_to_zip || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [activeTab, setActiveTab] = useState('details');

  // Line item state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    product_size_id: '',
    product_id: '',
    quantity: '1',
    unit_price: '',
  });

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
    setActiveTab('details');
    setShowAddItem(false);
    setNewItem({ product_size_id: '', product_id: '', quantity: '1', unit_price: '' });
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

  // Fetch line items for this order
  const { data: lineItems, refetch: refetchItems } = useQuery({
    queryKey: ['edit-order-items', order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_order_items')
        .select(`
          *,
          product_sizes (id, sku, size_name),
          products (id, name, sku)
        `)
        .eq('sales_order_id', order.id)
        .order('created_at');

      if (error) throw error;
      return data;
    },
    enabled: open && isDraft,
  });

  // Fetch sellable product sizes
  const { data: productSizes } = useQuery({
    queryKey: ['product-sizes-for-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sizes')
        .select('id, sku, size_name, size_type, product_id, products(name, sku)')
        .eq('is_active', true)
        .in('size_type', ['unit', 'case'])
        .order('sku');

      if (error) throw error;
      return data;
    },
    enabled: open && isDraft,
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

  // Add line item mutation
  const addItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sales_order_items').insert({
        sales_order_id: order.id,
        product_id: newItem.product_id,
        product_size_id: newItem.product_size_id,
        quantity_ordered: parseInt(newItem.quantity),
        unit_price: parseFloat(newItem.unit_price),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-order-items', order.id] });
      queryClient.invalidateQueries({ queryKey: ['sales-order', order.id] });
      sonnerToast.success('Product added to order');
      setShowAddItem(false);
      setNewItem({ product_size_id: '', product_id: '', quantity: '1', unit_price: '' });
      refetchItems();
    },
    onError: (error: any) => {
      sonnerToast.error(error.message);
    },
  });

  // Delete line item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-order-items', order.id] });
      queryClient.invalidateQueries({ queryKey: ['sales-order', order.id] });
      sonnerToast.success('Item removed');
      refetchItems();
    },
    onError: (error: any) => {
      sonnerToast.error(error.message);
    },
  });

  // Get price for selected product
  const handleProductSizeChange = async (productSizeId: string) => {
    const selectedSize = productSizes?.find((ps: any) => ps.id === productSizeId);
    const productId = selectedSize?.product_id || '';
    setNewItem({ ...newItem, product_size_id: productSizeId, product_id: productId });

    // Try to get customer price
    if (productId) {
      const { data, error } = await supabase.rpc('get_customer_price', {
        p_customer_id: order.customer_id,
        p_product_id: productId,
        p_quantity: parseInt(newItem.quantity) || 1,
        p_order_date: order.order_date || new Date().toISOString().split('T')[0],
      });

      if (!error && data) {
        setNewItem(prev => ({ ...prev, product_size_id: productSizeId, product_id: productId, unit_price: data.toString() }));
      }
    }
  };

  // Update shipping address when customer changes
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order {order.order_number}</DialogTitle>
          <DialogDescription>
            {isDraft 
              ? 'Update order details and manage line items. All fields can be modified while the order is in draft status.'
              : 'Only limited fields can be edited after the order has been confirmed.'}
          </DialogDescription>
        </DialogHeader>

        {isDraft ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Order Details</TabsTrigger>
              <TabsTrigger value="items">Line Items ({lineItems?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
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
                <div className="flex items-center justify-between">
                  <Label>Shipping Address</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={handleResetShippingToCustomer}
                  >
                    Reset to Customer Address
                  </Button>
                </div>
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
            </TabsContent>

            <TabsContent value="items" className="space-y-4 mt-4">
              {/* Add Item Section */}
              {!showAddItem ? (
                <Button onClick={() => setShowAddItem(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Add Product</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Product *</Label>
                      <Select
                        value={newItem.product_size_id}
                        onValueChange={handleProductSizeChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {productSizes?.map((ps: any) => (
                            <SelectItem key={ps.id} value={ps.id}>
                              {ps.sku} - {ps.products?.name} ({ps.size_name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Price *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newItem.unit_price}
                          onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                          placeholder="Price per unit"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setShowAddItem(false);
                        setNewItem({ product_size_id: '', product_id: '', quantity: '1', unit_price: '' });
                      }}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => addItemMutation.mutate()}
                        disabled={!newItem.product_size_id || !newItem.quantity || !newItem.unit_price || addItemMutation.isPending}
                      >
                        {addItemMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Add to Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Line Items Table */}
              {lineItems && lineItems.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product_sizes?.sku || item.products?.sku}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.products?.name} - {item.product_sizes?.size_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                          <TableCell className="text-right">${item.unit_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${(item.quantity_ordered * item.unit_price).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              disabled={deleteItemMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  No items in this order yet. Click "Add Product" to add items.
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            {/* Non-draft: limited editing */}
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select value={customerId} disabled>
                <SelectTrigger>
                  <SelectValue />
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

            <div className="space-y-2">
              <Label htmlFor="customer_po_number">Customer PO Number</Label>
              <Input
                id="customer_po_number"
                placeholder="Customer's purchase order number"
                value={customerPoNumber}
                onChange={(e) => setCustomerPoNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requested_delivery_date">Requested Delivery Date</Label>
              <Input
                id="requested_delivery_date"
                type="date"
                value={requestedDeliveryDate}
                onChange={(e) => setRequestedDeliveryDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Shipping Address (Read Only)</Label>
              <Input value={shipToName} disabled />
              <Input value={shipToAddress} disabled />
              <div className="grid grid-cols-3 gap-2">
                <Input value={shipToCity} disabled />
                <Input value={shipToState} disabled />
                <Input value={shipToZip} disabled />
              </div>
            </div>

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
        )}

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
