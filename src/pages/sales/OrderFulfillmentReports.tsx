import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, AlertTriangle, Package } from 'lucide-react';
import { format } from 'date-fns';

export default function OrderFulfillmentReports() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Backorders Query - Orders with items not fully shipped
  const { data: backorders, isLoading: loadingBackorders } = useQuery({
    queryKey: ['backorders', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          id,
          order_number,
          order_date,
          ship_date,
          status,
          customer:customers(id, code, name),
          sales_order_items(
            id,
            product:products(id, name, sku),
            quantity_ordered,
            quantity_shipped
          )
        `)
        .gte('order_date', dateRange.from.toISOString())
        .lte('order_date', dateRange.to.toISOString())
        .in('status', ['confirmed', 'partially_shipped', 'ready_to_ship'])
        .order('order_date', { ascending: false });

      if (error) throw error;

      // Filter to only orders with backordered items
      return data?.filter((order: any) =>
        order.sales_order_items.some(
          (item: any) => (item.quantity_shipped || 0) < item.quantity_ordered
        )
      ).map((order: any) => ({
        ...order,
        backordered_items: order.sales_order_items.filter(
          (item: any) => (item.quantity_shipped || 0) < item.quantity_ordered
        ),
      }));
    },
  });

  // Incomplete Shipments Query - Partially shipped orders
  const { data: incompleteShipments, isLoading: loadingIncomplete } = useQuery({
    queryKey: ['incomplete-shipments', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          id,
          order_number,
          order_date,
          ship_date,
          status,
          is_partially_shipped,
          customer:customers(id, code, name),
          sales_order_items(
            id,
            product:products(id, name, sku),
            quantity_ordered,
            quantity_shipped,
            quantity_packed
          )
        `)
        .gte('order_date', dateRange.from.toISOString())
        .lte('order_date', dateRange.to.toISOString())
        .eq('is_partially_shipped', true)
        .order('order_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Late Orders Query - Past ship date and not fully shipped
  const { data: lateOrders, isLoading: loadingLate } = useQuery({
    queryKey: ['late-orders'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          id,
          order_number,
          order_date,
          ship_date,
          status,
          customer:customers(id, code, name),
          sales_order_items(
            id,
            product:products(id, name, sku),
            quantity_ordered,
            quantity_shipped
          )
        `)
        .lt('ship_date', today)
        .in('status', ['confirmed', 'partially_shipped', 'ready_to_ship'])
        .order('ship_date', { ascending: true });

      if (error) throw error;

      return data?.filter((order: any) =>
        order.sales_order_items.some(
          (item: any) => (item.quantity_shipped || 0) < item.quantity_ordered
        )
      );
    },
  });

  const exportToCSV = (data: any[], filename: string) => {
    // Simple CSV export functionality
    console.log('Exporting to CSV:', filename, data);
    // Implementation would go here
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Fulfillment Reports</h1>
          <p className="text-muted-foreground mt-2">
            Track backorders, incomplete shipments, and late orders
          </p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3">
              <p className="text-sm font-medium mb-2">Filter by Order Date Range</p>
              <div className="flex gap-2">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                />
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Tabs defaultValue="backorders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="backorders" className="relative">
            Backorders
            {backorders && backorders.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1">
                {backorders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="incomplete" className="relative">
            Incomplete Shipments
            {incompleteShipments && incompleteShipments.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1">
                {incompleteShipments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="late" className="relative">
            Late Orders
            {lateOrders && lateOrders.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1">
                {lateOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Backorders Tab */}
        <TabsContent value="backorders">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Backorders
                  </CardTitle>
                  <CardDescription>
                    Orders with items not yet fully shipped
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(backorders || [], 'backorders.csv')}
                  disabled={!backorders || backorders.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBackorders ? (
                <div className="text-center py-8 text-muted-foreground">Loading backorders...</div>
              ) : !backorders || backorders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 opacity-30 mb-3" />
                  <p className="font-medium">No backorders found</p>
                  <p className="text-sm">All orders are fully shipped or no orders in date range</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Ship Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Shipped</TableHead>
                      <TableHead className="text-right">Backorder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backorders.map((order: any) =>
                      order.backordered_items.map((item: any, idx: number) => (
                        <TableRow key={`${order.id}-${item.id}`}>
                          {idx === 0 && (
                            <>
                              <TableCell rowSpan={order.backordered_items.length} className="font-medium">
                                {order.order_number}
                              </TableCell>
                              <TableCell rowSpan={order.backordered_items.length}>
                                {order.customer.name}
                              </TableCell>
                              <TableCell rowSpan={order.backordered_items.length}>
                                {new Date(order.order_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell rowSpan={order.backordered_items.length}>
                                {order.ship_date ? new Date(order.ship_date).toLocaleDateString() : 'TBD'}
                              </TableCell>
                              <TableCell rowSpan={order.backordered_items.length}>
                                <Badge variant={order.status === 'partially_shipped' ? 'secondary' : 'outline'}>
                                  {order.status.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product.name}</div>
                              <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                          <TableCell className="text-right">{item.quantity_shipped || 0}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">
                              {item.quantity_ordered - (item.quantity_shipped || 0)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incomplete Shipments Tab */}
        <TabsContent value="incomplete">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-500" />
                    Incomplete Shipments
                  </CardTitle>
                  <CardDescription>
                    Orders with partial shipments
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(incompleteShipments || [], 'incomplete-shipments.csv')}
                  disabled={!incompleteShipments || incompleteShipments.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingIncomplete ? (
                <div className="text-center py-8 text-muted-foreground">Loading incomplete shipments...</div>
              ) : !incompleteShipments || incompleteShipments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 opacity-30 mb-3" />
                  <p className="font-medium">No incomplete shipments found</p>
                  <p className="text-sm">All orders are fully shipped or not started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Ship Date</TableHead>
                      <TableHead className="text-right">Total Items</TableHead>
                      <TableHead className="text-right">Shipped Items</TableHead>
                      <TableHead className="text-right">Completion %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incompleteShipments.map((order: any) => {
                      const totalOrdered = order.sales_order_items.reduce(
                        (sum: number, item: any) => sum + item.quantity_ordered,
                        0
                      );
                      const totalShipped = order.sales_order_items.reduce(
                        (sum: number, item: any) => sum + (item.quantity_shipped || 0),
                        0
                      );
                      const completionPercent = totalOrdered > 0 ? (totalShipped / totalOrdered) * 100 : 0;

                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>{order.customer.name}</TableCell>
                          <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {order.ship_date ? new Date(order.ship_date).toLocaleDateString() : 'TBD'}
                          </TableCell>
                          <TableCell className="text-right">{totalOrdered}</TableCell>
                          <TableCell className="text-right">{totalShipped}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={completionPercent >= 75 ? 'secondary' : 'outline'}>
                              {completionPercent.toFixed(0)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Late Orders Tab */}
        <TabsContent value="late">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Late Orders
                  </CardTitle>
                  <CardDescription>
                    Orders past ship date and not fully shipped
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(lateOrders || [], 'late-orders.csv')}
                  disabled={!lateOrders || lateOrders.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingLate ? (
                <div className="text-center py-8 text-muted-foreground">Loading late orders...</div>
              ) : !lateOrders || lateOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 opacity-30 mb-3" />
                  <p className="font-medium">No late orders found</p>
                  <p className="text-sm">All orders are on schedule</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Ship Date</TableHead>
                      <TableHead>Days Late</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Unfulfilled Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lateOrders.map((order: any) => {
                      const shipDate = new Date(order.ship_date);
                      const today = new Date();
                      const daysLate = Math.floor((today.getTime() - shipDate.getTime()) / (1000 * 60 * 60 * 24));
                      const unfulfilledCount = order.sales_order_items.filter(
                        (item: any) => (item.quantity_shipped || 0) < item.quantity_ordered
                      ).length;

                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>{order.customer.name}</TableCell>
                          <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {shipDate.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">{daysLate} days</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.status.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{unfulfilledCount}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
