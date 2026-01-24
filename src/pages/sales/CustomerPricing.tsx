import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CustomerPricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newPricing, setNewPricing] = useState({
    product_size_id: '',
    unit_price: '',
    customer_item_number: '',
    min_quantity: '1',
  });

  // Fetch active customers
  const { data: customers } = useQuery({
    queryKey: ['customers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, code, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch customer-specific pricing for selected customer
  const { data: customerPricing, isLoading } = useQuery({
    queryKey: ['customer-pricing', selectedCustomerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_product_pricing')
        .select(`
          *,
          product_size:product_sizes(
            id,
            sku,
            size_name,
            product:products(id, name, sku)
          )
        `)
        .eq('customer_id', selectedCustomerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomerId,
  });

  // Fetch all product sizes for the add dialog
  const { data: productSizes } = useQuery({
    queryKey: ['product-sizes-all', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('product_sizes')
        .select(`
          id,
          sku,
          size_name,
          distributor_price,
          direct_price,
          product:products!inner(id, name, sku)
        `)
        .eq('is_active', true)
        .order('sku');

      if (searchTerm) {
        query = query.or(`sku.ilike.%${searchTerm}%,product.name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: showAddDialog,
  });

  // Create customer pricing mutation
  const createPricingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('customer_product_pricing').insert({
        customer_id: selectedCustomerId,
        product_size_id: newPricing.product_size_id,
        unit_price: parseFloat(newPricing.unit_price),
        customer_item_number: newPricing.customer_item_number || null,
        min_quantity: parseInt(newPricing.min_quantity) || 1,
        is_active: true,
        effective_date: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-pricing', selectedCustomerId] });
      toast({ title: 'Customer pricing created successfully' });
      setShowAddDialog(false);
      setNewPricing({ product_size_id: '', unit_price: '', customer_item_number: '', min_quantity: '1' });
      setSearchTerm('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating customer pricing',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  // Delete customer pricing mutation
  const deletePricingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_product_pricing')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-pricing', selectedCustomerId] });
      toast({ title: 'Customer pricing deleted successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting customer pricing',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const selectedProduct = productSizes?.find(ps => ps.id === newPricing.product_size_id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customer-Specific Pricing</h1>
        <p className="text-muted-foreground mt-2">
          Manage custom pricing for individual customers. These prices override price sheets and default product pricing.
        </p>
      </div>

      {/* Customer Selector */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Label htmlFor="customer-select">Select Customer</Label>
          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
            <SelectTrigger id="customer-select">
              <SelectValue placeholder="Choose a customer..." />
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

        {selectedCustomerId && (
          <Button onClick={() => setShowAddDialog(true)} className="mt-6">
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Pricing
          </Button>
        )}
      </div>

      {/* Pricing Table */}
      {selectedCustomerId && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Customer Item #</TableHead>
                <TableHead>Min Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading pricing...
                  </TableCell>
                </TableRow>
              ) : customerPricing?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <p className="font-medium">No custom pricing configured</p>
                    <p className="text-sm">Click "Add Custom Pricing" to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                customerPricing?.map((pricing: any) => (
                  <TableRow key={pricing.id}>
                    <TableCell className="font-medium">
                      {pricing.product_size?.product?.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {pricing.product_size?.sku}
                    </TableCell>
                    <TableCell>{pricing.product_size?.size_name}</TableCell>
                    <TableCell>
                      {pricing.customer_item_number ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {pricing.customer_item_number}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{pricing.min_quantity || 1}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${parseFloat(pricing.unit_price).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {new Date(pricing.effective_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {pricing.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePricingMutation.mutate(pricing.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Pricing Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Custom Pricing</DialogTitle>
            <DialogDescription>
              Set a custom price for a specific product SKU for this customer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Products */}
            <div className="space-y-2">
              <Label>Search Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by SKU or product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label htmlFor="product-size">Product SKU *</Label>
              <Select
                value={newPricing.product_size_id}
                onValueChange={(value) => {
                  setNewPricing({ ...newPricing, product_size_id: value });
                  // Auto-populate price from product size if available
                  const productSize = productSizes?.find(ps => ps.id === value);
                  if (productSize && (productSize.direct_price || productSize.distributor_price)) {
                    const defaultPrice = productSize.direct_price || productSize.distributor_price;
                    setNewPricing(prev => ({ ...prev, unit_price: defaultPrice?.toString() || '' }));
                  }
                }}
              >
                <SelectTrigger id="product-size">
                  <SelectValue placeholder="Select a product SKU..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {productSizes?.map((ps: any) => (
                    <SelectItem key={ps.id} value={ps.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{ps.sku}</span>
                          <span className="text-xs text-muted-foreground">
                            {ps.product?.name} - {ps.size_name}
                          </span>
                        </div>
                        {(ps.direct_price || ps.distributor_price) && (
                          <span className="text-xs text-muted-foreground">
                            Default: ${parseFloat(ps.direct_price || ps.distributor_price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  {selectedProduct.product?.name} - {selectedProduct.size_name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Unit Price */}
              <div className="space-y-2">
                <Label htmlFor="unit-price">Unit Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                  <Input
                    id="unit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newPricing.unit_price}
                    onChange={(e) => setNewPricing({ ...newPricing, unit_price: e.target.value })}
                    className="pl-7"
                  />
                </div>
              </div>

              {/* Min Quantity */}
              <div className="space-y-2">
                <Label htmlFor="min-quantity">Minimum Quantity</Label>
                <Input
                  id="min-quantity"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={newPricing.min_quantity}
                  onChange={(e) => setNewPricing({ ...newPricing, min_quantity: e.target.value })}
                />
              </div>
            </div>

            {/* Customer Item Number */}
            <div className="space-y-2">
              <Label htmlFor="customer-item-number">Customer Item Number</Label>
              <Input
                id="customer-item-number"
                placeholder="Customer's internal SKU or item code"
                value={newPricing.customer_item_number}
                onChange={(e) => setNewPricing({ ...newPricing, customer_item_number: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Enter the customer's own item number or SKU for this product
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setNewPricing({ product_size_id: '', unit_price: '', customer_item_number: '', min_quantity: '1' });
              setSearchTerm('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => createPricingMutation.mutate()}
              disabled={!newPricing.product_size_id || !newPricing.unit_price}
            >
              Add Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
