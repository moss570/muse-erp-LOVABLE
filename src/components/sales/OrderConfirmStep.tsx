import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle2, Loader2, ShoppingCart, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { type PendingPurchaseOrder, useUpdatePendingOrder } from '@/hooks/usePendingOrders';

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

interface OrderConfirmStepProps {
  pendingOrder: PendingPurchaseOrder;
  selectedCustomerId: string | null;
  mappedItems: MappedItem[];
  isCreating: boolean;
  onCreatingChange: (creating: boolean) => void;
  onComplete: () => void;
}

export function OrderConfirmStep({
  pendingOrder,
  selectedCustomerId,
  mappedItems,
  isCreating,
  onCreatingChange,
  onComplete,
}: OrderConfirmStepProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updatePendingOrder = useUpdatePendingOrder();

  const extractedData = pendingOrder.raw_extracted_data;

  // Calculate totals
  const subtotal = mappedItems.reduce((sum, item) => {
    return sum + (item.quantity * (item.unit_price || 0));
  }, 0);

  const canCreate = selectedCustomerId && mappedItems.every((item) => item.mapped_product_size_id);

  const handleCreateOrder = async () => {
    if (!selectedCustomerId) return;

    onCreatingChange(true);

    try {
      // 1. Generate order number
      const { data: orderNumber, error: numberError } = await supabase
        .rpc('generate_sales_order_number');

      if (numberError) throw numberError;

      // 2. Get product_id for each mapped product_size
      const productSizeIds = mappedItems
        .map((item) => item.mapped_product_size_id)
        .filter(Boolean) as string[];

      const { data: productSizes } = await supabase
        .from('product_sizes')
        .select('id, product_id')
        .in('id', productSizeIds);

      const productSizeMap = new Map(
        productSizes?.map((ps) => [ps.id, ps.product_id]) || []
      );

      // 3. Create the sales order
      const { data: salesOrder, error: orderError } = await supabase
        .from('sales_orders')
        .insert([{
          order_number: orderNumber,
          customer_id: selectedCustomerId,
          customer_po_number: extractedData?.po_number || null,
          order_date: extractedData?.po_date || new Date().toISOString().split('T')[0],
          requested_delivery_date: extractedData?.requested_delivery_date || null,
          status: 'pending',
          notes: `Imported from customer PO. Original file: ${pendingOrder.pdf_filename}`,
        }])
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // 4. Create sales order items
      const orderItems = mappedItems.map((item) => ({
        sales_order_id: salesOrder.id,
        product_id: productSizeMap.get(item.mapped_product_size_id!) || '',
        product_size_id: item.mapped_product_size_id!,
        quantity_ordered: item.quantity,
        unit_price: item.unit_price || 0,
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 5. Save item mappings that should be remembered
      const mappingsToSave = mappedItems.filter(
        (item) => item.remember_mapping && item.mapped_product_size_id
      );

      for (const mapping of mappingsToSave) {
        // Check if mapping already exists
        const { data: existing } = await supabase
          .from('customer_product_pricing')
          .select('id')
          .eq('customer_id', selectedCustomerId)
          .eq('customer_item_number', mapping.original_item_number)
          .single();

        if (!existing) {
          // Create new mapping
          await supabase.from('customer_product_pricing').insert({
            customer_id: selectedCustomerId,
            product_size_id: mapping.mapped_product_size_id,
            customer_item_number: mapping.original_item_number,
            unit_price: mapping.unit_price || 0,
            effective_date: new Date().toISOString().split('T')[0],
            is_active: true,
          });
        } else {
          // Update existing mapping
          await supabase
            .from('customer_product_pricing')
            .update({
              product_size_id: mapping.mapped_product_size_id,
              unit_price: mapping.unit_price || 0,
            })
            .eq('id', existing.id);
        }
      }

      // 4. Update the pending order status
      const { data: { user } } = await supabase.auth.getUser();
      
      await updatePendingOrder.mutateAsync({
        id: pendingOrder.id,
        updates: {
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          created_sales_order_id: salesOrder.id,
        },
      });

      // 5. Invalidate queries and show success
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-purchase-orders-count'] });

      toast.success(`Sales Order ${salesOrder.order_number} created!`);

      // Navigate to the new order
      onComplete();
      navigate(`/sales/orders/${salesOrder.id}`);
    } catch (error) {
      console.error('Failed to create sales order:', error);
      toast.error('Failed to create sales order');
      onCreatingChange(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Order Summary</CardTitle>
          <CardDescription>
            Review the order details before creating the sales order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Customer PO#:</span>
              <span className="ml-2 font-mono">{extractedData?.po_number || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">PO Date:</span>
              <span className="ml-2">
                {extractedData?.po_date
                  ? format(new Date(extractedData.po_date), 'MMM d, yyyy')
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Requested Delivery:</span>
              <span className="ml-2">
                {extractedData?.requested_delivery_date
                  ? format(new Date(extractedData.requested_delivery_date), 'MMM d, yyyy')
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Items:</span>
              <span className="ml-2">{mappedItems.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Customer Item #</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                  <TableHead className="text-center">Learn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm font-medium">
                      {item.mapped_sku || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.original_item_number}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {item.unit_price ? `$${item.unit_price.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${(item.quantity * (item.unit_price || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.remember_mapping && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={4} className="text-right font-medium">
                    Subtotal:
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ${subtotal.toFixed(2)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Validation Messages */}
      {!canCreate && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {!selectedCustomerId
              ? 'Please select a customer before creating the order.'
              : 'Please map all line items to internal SKUs before creating the order.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Mappings to Remember */}
      {mappedItems.filter((item) => item.remember_mapping).length > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {mappedItems.filter((item) => item.remember_mapping).length} item mapping(s) will be
            saved for future orders from this customer.
          </AlertDescription>
        </Alert>
      )}

      {/* Create Button */}
      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={handleCreateOrder}
          disabled={!canCreate || isCreating}
          className="min-w-[200px]"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Order...
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create Sales Order
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
