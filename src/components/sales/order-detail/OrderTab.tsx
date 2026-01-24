import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Send, Save } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

export function OrderTab({ order }: { order: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [shippingCharge, setShippingCharge] = useState(order.shipping_charge || '0.00');

  const [newItem, setNewItem] = useState({
    product_id: '',
    quantity: '1',
    unit_price: '',
  });

  const isDraft = order.status === 'draft';

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['products-for-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, sku, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Get customer price when product selected
  const getPriceForProduct = async (productId: string, quantity: number) => {
    const { data, error } = await supabase.rpc('get_customer_price', {
      p_customer_id: order.customer_id,
      p_product_id: productId,
      p_quantity: quantity,
      p_order_date: order.order_date,
    });

    if (error) {
      console.error('Error getting price:', error);
      return null;
    }

    return data;
  };

  // Auto-populate price when product/quantity changes
  const handleProductChange = async (productId: string) => {
    setNewItem({ ...newItem, product_id: productId });

    if (productId && newItem.quantity) {
      const price = await getPriceForProduct(productId, parseInt(newItem.quantity));
      if (price) {
        setNewItem(prev => ({ ...prev, unit_price: price.toString() }));
      }
    }
  };

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sales_order_items').insert({
        sales_order_id: order.id,
        product_id: newItem.product_id,
        quantity_ordered: parseInt(newItem.quantity),
        unit_price: parseFloat(newItem.unit_price),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-order', order.id] });
      toast({ title: 'Success', description: 'Product added to order' });
      setShowAddItemDialog(false);
      setNewItem({ product_id: '', quantity: '1', unit_price: '' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-order', order.id] });
      toast({ title: 'Success', description: 'Product removed from order' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update shipping charge
  const updateShippingMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase
        .from('sales_orders')
        .update({ shipping_charge: amount })
        .eq('id', order.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-order', order.id] });
      toast({ title: 'Success', description: 'Shipping charge updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Confirm order (change from draft to confirmed)
  const confirmOrderMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sales_orders')
        .update({ status: 'confirmed' })
        .eq('id', order.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({ title: 'Success', description: 'Order confirmed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      {/* Order Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label className="text-muted-foreground">Customer</Label>
              <p className="font-medium">{order.customers.name}</p>
              <p className="text-sm text-muted-foreground">{order.customers.code}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Contact</Label>
              <p className="text-sm">{order.customers.email || '-'}</p>
              <p className="text-sm">{order.customers.phone || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Payment Terms</Label>
              <p className="text-sm">{order.payment_terms || 'N/A'}</p>
            </div>
            {order.customers.early_pay_discount_percent > 0 && (
              <div>
                <Label className="text-muted-foreground">Early Pay Discount</Label>
                <p className="text-sm">
                  {order.customers.early_pay_discount_percent}% / {order.customers.early_pay_days} days
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Info */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium">{order.ship_to_name}</p>
              <p className="text-sm">{order.ship_to_address}</p>
              <p className="text-sm">
                {order.ship_to_city}, {order.ship_to_state} {order.ship_to_zip}
              </p>
              <p className="text-sm">{order.ship_to_country || 'USA'}</p>
            </div>
            {order.requested_delivery_date && (
              <div className="mt-4">
                <Label className="text-muted-foreground">Requested Delivery</Label>
                <p className="text-sm">
                  {new Date(order.requested_delivery_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Products in this order</CardDescription>
            </div>
            {isDraft && (
              <Button size="sm" onClick={() => setShowAddItemDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty Ordered</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
                {isDraft && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.sales_order_items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isDraft ? 6 : 5} className="text-center py-8">
                    No items added yet. Click "Add Product" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                order.sales_order_items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.products.sku}</TableCell>
                    <TableCell>{item.products.name}</TableCell>
                    <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                    <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${item.line_total.toFixed(2)}
                    </TableCell>
                    {isDraft && (
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">${order.subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Shipping:</span>
                {isDraft ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={shippingCharge}
                      onChange={(e) => setShippingCharge(e.target.value)}
                      className="w-24 text-right"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateShippingMutation.mutate(parseFloat(shippingCharge))}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="font-medium">${order.shipping_charge.toFixed(2)}</span>
                )}
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax ({(order.tax_rate * 100).toFixed(2)}%):
                </span>
                <span className="font-medium">${order.tax_amount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-lg">${order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isDraft && order.sales_order_items?.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button onClick={() => confirmOrderMutation.mutate()}>
                <Send className="h-4 w-4 mr-2" />
                Confirm Order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product to Order</DialogTitle>
            <DialogDescription>Select a product and enter pricing details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select
                value={newItem.product_id}
                onValueChange={handleProductChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity (cases) *</Label>
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
                placeholder="Price per case"
              />
              <p className="text-xs text-muted-foreground">
                Price auto-populated from customer pricing if available
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addItemMutation.mutate()}
              disabled={!newItem.product_id || !newItem.quantity || !newItem.unit_price}
            >
              Add to Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
