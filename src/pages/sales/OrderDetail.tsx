import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderTab } from '@/components/sales/order-detail/OrderTab';
import { PickingTab } from '@/components/sales/order-detail/PickingTab';
import { PackingTab } from '@/components/sales/order-detail/PackingTab';
import { ShippingTab } from '@/components/sales/order-detail/ShippingTab';
import { InvoicingTab } from '@/components/sales/order-detail/InvoicingTab';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('order');

  // Fetch sales order with all related data
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['sales-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customers (
            id,
            code,
            name,
            email,
            phone,
            payment_terms,
            tax_exempt,
            early_pay_discount_percent,
            early_pay_days
          ),
          sales_order_items (
            *,
            products (
              id,
              sku,
              name
            )
          )
        `)
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-6">Loading order...</div>;
  }

  if (!order) {
    return <div className="p-6">Order not found</div>;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      picking: { variant: 'default', label: 'Picking' },
      picked: { variant: 'default', label: 'Picked' },
      packing: { variant: 'default', label: 'Packing' },
      packed: { variant: 'default', label: 'Packed' },
      shipped: { variant: 'default', label: 'Shipped' },
      invoiced: { variant: 'default', label: 'Invoiced' },
      closed: { variant: 'outline', label: 'Closed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Determine which tabs are enabled based on order status
  const isPickingEnabled = ['confirmed', 'picking', 'picked', 'packing', 'packed', 'shipped', 'invoiced'].includes(order.status);
  const isPackingEnabled = ['picked', 'packing', 'packed', 'shipped', 'invoiced'].includes(order.status);
  const isShippingEnabled = ['packed', 'shipped', 'invoiced'].includes(order.status);
  const isInvoicingEnabled = ['shipped', 'invoiced'].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sales/orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{order.order_number}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-muted-foreground">
              {order.customers.name} • {new Date(order.order_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="order">Order</TabsTrigger>
          <TabsTrigger value="picking" disabled={!isPickingEnabled}>
            Picking
          </TabsTrigger>
          <TabsTrigger value="packing" disabled={!isPackingEnabled}>
            Packing
          </TabsTrigger>
          <TabsTrigger value="shipping" disabled={!isShippingEnabled}>
            Shipping
          </TabsTrigger>
          <TabsTrigger value="invoicing" disabled={!isInvoicingEnabled}>
            Invoicing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="order" className="mt-6">
          <OrderTab order={order} />
        </TabsContent>

        <TabsContent value="picking" className="mt-6">
          {isPickingEnabled && <PickingTab order={order} />}
        </TabsContent>

        <TabsContent value="packing" className="mt-6">
          {isPackingEnabled && <PackingTab order={order} />}
        </TabsContent>

        <TabsContent value="shipping" className="mt-6">
          {isShippingEnabled && <ShippingTab order={order} />}
        </TabsContent>

        <TabsContent value="invoicing" className="mt-6">
          {isInvoicingEnabled && <InvoicingTab order={order} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
