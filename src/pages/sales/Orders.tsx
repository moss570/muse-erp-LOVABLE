import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Package, TruckIcon, FileText } from 'lucide-react';
import { DataTableHeader } from '@/components/ui/data-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateOrderDialog } from '@/components/sales/CreateOrderDialog';

interface SalesOrder {
  id: string;
  order_number: string;
  order_date: string;
  status: string;
  customer: {
    id: string;
    name: string;
    code: string;
  };
  total_amount: number;
  is_partially_shipped: boolean;
  has_backorders: boolean;
  shipment_count: number;
}

export default function Orders() {
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch sales orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['sales-orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('sales_orders')
        .select(`
          id,
          order_number,
          order_date,
          status,
          total_amount,
          is_partially_shipped,
          has_backorders,
          shipment_count,
          customers!sales_orders_customer_id_fkey (
            id,
            name,
            code
          )
        `)
        .order('order_date', { ascending: false })
        .order('order_number', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(order => ({
        ...order,
        customer: order.customers as any,
      })) as SalesOrder[];
    },
  });

  const filteredOrders = orders?.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon?: React.ElementType }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      picking: { variant: 'default', label: 'Picking', icon: Package },
      picked: { variant: 'default', label: 'Picked', icon: Package },
      packing: { variant: 'default', label: 'Packing' },
      packed: { variant: 'default', label: 'Packed' },
      shipping: { variant: 'default', label: 'Shipping', icon: TruckIcon },
      partially_shipped: { variant: 'default', label: 'Partially Shipped', icon: TruckIcon },
      shipped: { variant: 'default', label: 'Shipped', icon: TruckIcon },
      invoiced: { variant: 'default', label: 'Invoiced', icon: FileText },
      closed: { variant: 'outline', label: 'Closed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  // Summary stats
  const stats = {
    total: orders?.length || 0,
    draft: orders?.filter(o => o.status === 'draft').length || 0,
    pending: orders?.filter(o => ['confirmed', 'picking', 'packing'].includes(o.status)).length || 0,
    shipped: orders?.filter(o => o.status === 'shipped' || o.status === 'partially_shipped').length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Orders</h1>
          <p className="text-muted-foreground">
            Manage customer orders from creation to fulfillment
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Shipped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shipped}</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Orders</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="picking">Picking</option>
                <option value="shipped">Shipped</option>
                <option value="invoiced">Invoiced</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTableHeader
            title=""
            searchValue={searchQuery}
            searchPlaceholder="Search orders..."
            onSearchChange={setSearchQuery}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : filteredOrders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No orders found. Create your first order to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders?.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/sales/orders/${order.id}`)}
                  >
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{order.customer.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {order.is_partially_shipped && (
                          <Badge variant="outline" className="text-xs">
                            Partial Ship
                          </Badge>
                        )}
                        {order.has_backorders && (
                          <Badge variant="outline" className="text-xs">
                            Backorder
                          </Badge>
                        )}
                        {order.shipment_count > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {order.shipment_count} Shipments
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${order.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/sales/orders/${order.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
