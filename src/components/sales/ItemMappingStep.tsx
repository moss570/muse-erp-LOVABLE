import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Search, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface MappedItem {
  original_item_number: string;
  description: string | null;
  quantity: number;
  unit_price: number | null;
  unit_of_measure: string | null;
  mapped_product_size_id: string | null;
  mapped_sku: string | null;
  remember_mapping: boolean;
}

interface ItemMappingStepProps {
  items: MappedItem[];
  customerId: string | null;
  onItemsChange: (items: MappedItem[]) => void;
}

export function ItemMappingStep({ items, customerId, onItemsChange }: ItemMappingStepProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch product sizes for dropdown
  const { data: productSizes } = useQuery({
    queryKey: ['product-sizes-for-mapping', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('product_sizes')
        .select(`
          id,
          sku,
          product:products(name),
          container_size:container_sizes(name)
        `)
        .eq('is_active', true)
        .order('sku')
        .limit(50);

      if (searchQuery) {
        query = query.ilike('sku', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing customer item mappings
  const { data: existingMappings } = useQuery({
    queryKey: ['customer-item-mappings', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('customer_product_pricing')
        .select(`
          customer_item_number,
          product_size_id,
          product_size:product_sizes(sku)
        `)
        .eq('customer_id', customerId)
        .not('customer_item_number', 'is', null);

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Auto-map items based on existing mappings
  useEffect(() => {
    if (!existingMappings || existingMappings.length === 0) return;

    const updatedItems = items.map((item) => {
      // Check if we already have a mapping
      if (item.mapped_product_size_id) return item;

      // Look for existing mapping by customer item number
      const mapping = existingMappings.find(
        (m) => m.customer_item_number?.toLowerCase() === item.original_item_number.toLowerCase()
      );

      if (mapping) {
        return {
          ...item,
          mapped_product_size_id: mapping.product_size_id,
          mapped_sku: (mapping.product_size as any)?.sku || null,
        };
      }

      // Try to match by exact SKU
      const exactMatch = productSizes?.find(
        (ps) => ps.sku.toLowerCase() === item.original_item_number.toLowerCase()
      );

      if (exactMatch) {
        return {
          ...item,
          mapped_product_size_id: exactMatch.id,
          mapped_sku: exactMatch.sku,
        };
      }

      return item;
    });

    // Only update if something changed
    const hasChanges = updatedItems.some(
      (item, i) => item.mapped_product_size_id !== items[i].mapped_product_size_id
    );

    if (hasChanges) {
      onItemsChange(updatedItems);
    }
  }, [existingMappings, productSizes, items, onItemsChange]);

  const handleItemMapping = (index: number, productSizeId: string | null) => {
    const productSize = productSizes?.find((ps) => ps.id === productSizeId);
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      mapped_product_size_id: productSizeId,
      mapped_sku: productSize?.sku || null,
    };
    onItemsChange(updatedItems);
  };

  const handleRememberMapping = (index: number, remember: boolean) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      remember_mapping: remember,
    };
    onItemsChange(updatedItems);
  };

  const mappedCount = items.filter((item) => item.mapped_product_size_id).length;
  const unmappedCount = items.length - mappedCount;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4">
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          {mappedCount} Mapped
        </Badge>
        {unmappedCount > 0 && (
          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
            <AlertCircle className="h-3 w-3" />
            {unmappedCount} Unmapped
          </Badge>
        )}
      </div>

      {/* Search for SKUs */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search SKUs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Line Item Mapping</CardTitle>
          <CardDescription>
            Map each customer item number to your internal SKU. Check "Remember" to auto-match in future orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Item #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Map to SKU</TableHead>
                  <TableHead className="text-center">Remember</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8" />
                        <p>No line items extracted</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {item.original_item_number}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.description || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                        {item.unit_of_measure && (
                          <span className="text-muted-foreground ml-1">
                            {item.unit_of_measure}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.unit_price ? `$${item.unit_price.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.mapped_product_size_id || ''}
                          onValueChange={(value) =>
                            handleItemMapping(index, value || null)
                          }
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select SKU..." />
                          </SelectTrigger>
                          <SelectContent>
                            {productSizes?.map((ps) => (
                              <SelectItem key={ps.id} value={ps.id}>
                                <span className="font-mono">{ps.sku}</span>
                                <span className="text-muted-foreground ml-2">
                                  {(ps.product as any)?.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={item.remember_mapping}
                          onCheckedChange={(checked) =>
                            handleRememberMapping(index, !!checked)
                          }
                          disabled={!item.mapped_product_size_id}
                        />
                      </TableCell>
                      <TableCell>
                        {item.mapped_product_size_id ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {unmappedCount === 0 && items.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          All items mapped successfully
        </div>
      )}
    </div>
  );
}
