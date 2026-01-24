import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { useToast } from '@/hooks/use-toast';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PriceSheetItem {
  id: string;
  product_id: string;
  unit_price: number;
  min_quantity: number;
  products: {
    id: string;
    sku: string;
    name: string;
  };
}

export default function PriceSheetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    product_id: '',
    unit_price: '',
    min_quantity: '1',
  });

  // Fetch price sheet
  const { data: priceSheet, isLoading: sheetLoading } = useQuery({
    queryKey: ['price-sheet', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_sheets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch price sheet items
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['price-sheet-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_sheet_items')
        .select(`
          id,
          product_id,
          unit_price,
          min_quantity,
          products (
            id,
            sku,
            name
          )
        `)
        .eq('price_sheet_id', id)
        .order('min_quantity', { ascending: true });

      if (error) throw error;
      return data as PriceSheetItem[];
    },
    enabled: !!id,
  });

  // Fetch all products for dropdown
  const { data: products } = useQuery({
    queryKey: ['products-for-pricing'],
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

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const { error } = await supabase
        .from('price_sheet_items')
        .insert({
          price_sheet_id: id,
          product_id: item.product_id,
          unit_price: parseFloat(item.unit_price),
          min_quantity: parseInt(item.min_quantity),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-sheet-items', id] });
      toast({
        title: 'Success',
        description: 'Product added to price sheet',
      });
      setShowAddDialog(false);
      setNewItem({
        product_id: '',
        unit_price: '',
        min_quantity: '1',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('price_sheet_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-sheet-items', id] });
      toast({
        title: 'Success',
        description: 'Product removed from price sheet',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const isDraft = priceSheet?.status === 'draft';

  if (sheetLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!priceSheet) {
    return <div className="p-6">Price sheet not found</div>;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      pending_approval: { variant: 'default', label: 'Pending Approval' },
      approved: { variant: 'default', label: 'Approved' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <SettingsBreadcrumb
        currentPage={priceSheet.name}
        parentPages={[{ name: 'Price Sheets', href: '/settings/price-sheets' }]}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings/price-sheets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{priceSheet.name}</h1>
              {getStatusBadge(priceSheet.status)}
            </div>
            <p className="text-muted-foreground">
              {priceSheet.description || 'Price sheet details'}
            </p>
          </div>
        </div>
        {isDraft && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        )}
      </div>

      {/* Price Sheet Info */}
      <Card>
        <CardHeader>
          <CardTitle>Price Sheet Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground">Price Tier</Label>
              <p className="font-medium capitalize">{priceSheet.price_tier}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Effective Date</Label>
              <p className="font-medium">
                {new Date(priceSheet.effective_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Expiry Date</Label>
              <p className="font-medium">
                {priceSheet.expiry_date
                  ? new Date(priceSheet.expiry_date).toLocaleDateString()
                  : 'No expiry'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">{getStatusBadge(priceSheet.status)}</div>
            </div>
          </div>

          {priceSheet.rejection_reason && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <Label className="text-destructive">Rejection Reason:</Label>
              <p className="text-sm mt-1">{priceSheet.rejection_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Products & Pricing</CardTitle>
          <CardDescription>
            {isDraft
              ? 'Add products and set prices with volume breaks'
              : 'View pricing for this sheet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Min Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                {isDraft && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsLoading ? (
                <TableRow>
                  <TableCell colSpan={isDraft ? 5 : 4} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isDraft ? 5 : 4} className="text-center py-8">
                    No products added yet. Click "Add Product" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.products.sku}</TableCell>
                    <TableCell>{item.products.name}</TableCell>
                    <TableCell>{item.min_quantity} cases</TableCell>
                    <TableCell className="font-medium">
                      ${item.unit_price.toFixed(2)} / case
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
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product to Price Sheet</DialogTitle>
            <DialogDescription>
              Set the price and minimum quantity for this product
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product_id">Product *</Label>
              <Select
                value={newItem.product_id}
                onValueChange={(value) => setNewItem({ ...newItem, product_id: value })}
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
              <Label htmlFor="unit_price">Unit Price (per case) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0"
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                placeholder="24.50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_quantity">Minimum Quantity (cases) *</Label>
              <Input
                id="min_quantity"
                type="number"
                min="1"
                value={newItem.min_quantity}
                onChange={(e) => setNewItem({ ...newItem, min_quantity: e.target.value })}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                For volume breaks, add the same product multiple times with different minimums
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addItemMutation.mutate(newItem)}
              disabled={!newItem.product_id || !newItem.unit_price || !newItem.min_quantity}
            >
              <Save className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
