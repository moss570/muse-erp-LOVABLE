import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TruckIcon, Plus, CheckCircle, Package, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface ShipmentItem {
  sales_order_item_id: string;
  quantity_shipped: number;
}

export function ShippingTab({ order }: { order: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateShipmentOpen, setIsCreateShipmentOpen] = useState(false);
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);
  const [shipmentDetails, setShipmentDetails] = useState({
    ship_date: new Date().toISOString().split('T')[0],
    carrier: '',
    tracking_number: '',
    freight_cost: '',
    notes: ''
  });

  // Fetch existing shipments
  const { data: shipments } = useQuery({
    queryKey: ['sales-shipments', order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_shipments')
        .select(`
          *,
          items:sales_shipment_items(
            *,
            order_item:sales_order_items(
              *,
              product:products(id, name, sku)
            )
          )
        `)
        .eq('sales_order_id', order.id)
        .order('ship_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!order.id
  });

  // Initialize shipment items from order items
  const initializeShipmentItems = () => {
    const items = order.sales_order_items.map((item: any) => ({
      sales_order_item_id: item.id,
      quantity_shipped: Math.max(0, item.quantity_packed - item.quantity_shipped)
    })).filter((item: ShipmentItem) => item.quantity_shipped > 0);

    setShipmentItems(items);
  };

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Validate that we have items to ship
      const itemsToShip = shipmentItems.filter(i => i.quantity_shipped > 0);
      if (itemsToShip.length === 0) {
        throw new Error('No items selected for shipment');
      }

      // Generate shipment number
      const { data: shipmentNumber } = await supabase
        .rpc('generate_shipment_number');

      // Create shipment
      const { data: newShipment, error: shipmentError } = await supabase
        .from('sales_shipments')
        .insert({
          shipment_number: shipmentNumber,
          sales_order_id: order.id,
          ship_date: shipmentDetails.ship_date,
          carrier: shipmentDetails.carrier || null,
          tracking_number: shipmentDetails.tracking_number || null,
          freight_cost: shipmentDetails.freight_cost ? parseFloat(shipmentDetails.freight_cost) : null,
          notes: shipmentDetails.notes || null,
          status: 'preparing',
          total_cases: itemsToShip.reduce((sum, item) => sum + item.quantity_shipped, 0),
          created_by: userId
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Create shipment items
      const shipmentItemsData = itemsToShip.map(item => ({
        shipment_id: newShipment.id,
        sales_order_item_id: item.sales_order_item_id,
        quantity_shipped: item.quantity_shipped
      }));

      const { error: itemsError } = await supabase
        .from('sales_shipment_items')
        .insert(shipmentItemsData);

      if (itemsError) throw itemsError;

      // Update sales order items quantity_shipped
      for (const item of itemsToShip) {
        const orderItem = order.sales_order_items.find((oi: any) => oi.id === item.sales_order_item_id);
        if (!orderItem) continue;

        await supabase
          .from('sales_order_items')
          .update({
            quantity_shipped: (orderItem.quantity_shipped || 0) + item.quantity_shipped
          })
          .eq('id', item.sales_order_item_id);
      }

      // Update order status
      const allItemsShipped = order.sales_order_items.every((item: any) => {
        const shippedQty = (item.quantity_shipped || 0) +
          (itemsToShip.find(si => si.sales_order_item_id === item.id)?.quantity_shipped || 0);
        return shippedQty >= item.quantity_ordered;
      });

      const hasPartialShipment = shipments && shipments.length > 0;

      await supabase
        .from('sales_orders')
        .update({
          status: allItemsShipped ? 'shipped' : 'partially_shipped',
          is_partially_shipped: hasPartialShipment || !allItemsShipped,
          shipment_count: (shipments?.length || 0) + 1
        })
        .eq('id', order.id);

      return newShipment;
    },
    onSuccess: () => {
      toast({
        title: 'Shipment created',
        description: 'Shipment record created successfully'
      });
      setIsCreateShipmentOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['sales-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['sales-order'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating shipment',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Mark shipment as shipped mutation
  const markShippedMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      await supabase
        .from('sales_shipments')
        .update({
          status: 'shipped'
        })
        .eq('id', shipmentId);

      // Update order status if needed
      const { data: updatedShipments } = await supabase
        .from('sales_shipments')
        .select('status')
        .eq('sales_order_id', order.id);

      const allShipped = updatedShipments?.every(s => s.status === 'shipped' || s.status === 'delivered');

      if (allShipped) {
        await supabase
          .from('sales_orders')
          .update({ status: 'shipped' })
          .eq('id', order.id);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Shipment marked as shipped',
        description: 'Status updated successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['sales-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['sales-order'] });
    }
  });

  const resetForm = () => {
    setShipmentDetails({
      ship_date: new Date().toISOString().split('T')[0],
      carrier: '',
      tracking_number: '',
      freight_cost: '',
      notes: ''
    });
    setShipmentItems([]);
  };

  const updateShipmentItemQuantity = (orderItemId: string, quantity: number) => {
    setShipmentItems(prev =>
      prev.map(item =>
        item.sales_order_item_id === orderItemId
          ? { ...item, quantity_shipped: quantity }
          : item
      )
    );
  };

  if (!order) return null;

  const canShip = ['packed', 'shipping', 'partially_shipped'].includes(order.status);

  return (
    <div className="space-y-6">
      {!canShip ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <TruckIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Shipping Not Available</h3>
              <p className="text-muted-foreground">
                Order must be packed before shipping can begin
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Shipment Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shipments</CardTitle>
                  <CardDescription>
                    Track shipments and deliveries
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  initializeShipmentItems();
                  setIsCreateShipmentOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Shipment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {shipments && shipments.length > 0 ? (
                <div className="space-y-4">
                  {shipments.map((shipment: any) => (
                    <Card key={shipment.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {shipment.shipment_number}
                            </CardTitle>
                            <CardDescription>
                              Ship Date: {format(new Date(shipment.ship_date), 'PP')}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              shipment.status === 'delivered' ? 'default' :
                              shipment.status === 'shipped' ? 'secondary' :
                              'outline'
                            }>
                              {shipment.status}
                            </Badge>
                            {shipment.status === 'preparing' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markShippedMutation.mutate(shipment.id)}
                              >
                                Mark Shipped
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {shipment.carrier && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Carrier</Label>
                              <p className="font-medium">{shipment.carrier}</p>
                            </div>
                          )}
                          {shipment.tracking_number && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Tracking #</Label>
                              <p className="font-medium font-mono">{shipment.tracking_number}</p>
                            </div>
                          )}
                          {shipment.freight_cost && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Freight Cost</Label>
                              <p className="font-medium">${shipment.freight_cost.toFixed(2)}</p>
                            </div>
                          )}
                          <div>
                            <Label className="text-xs text-muted-foreground">Total Cases</Label>
                            <p className="font-medium">{shipment.total_cases}</p>
                          </div>
                        </div>

                        {shipment.items && shipment.items.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Qty Shipped</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {shipment.items.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <div className="font-medium">{item.order_item.product.name}</div>
                                    <div className="text-sm text-muted-foreground">{item.order_item.product.sku}</div>
                                  </TableCell>
                                  <TableCell className="text-right">{item.quantity_shipped} cases</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        {shipment.notes && (
                          <div className="mt-4 pt-4 border-t">
                            <Label className="text-xs text-muted-foreground">Notes</Label>
                            <p className="text-sm mt-1">{shipment.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TruckIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No shipments created yet</p>
                  <p className="text-sm">Create a shipment to begin shipping this order</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shipping Status by Item</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Packed</TableHead>
                    <TableHead className="text-right">Shipped</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.sales_order_items?.map((item: any) => {
                    const shipped = item.quantity_shipped || 0;
                    const remaining = item.quantity_packed - shipped;
                    const isComplete = remaining <= 0;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.products.name}</div>
                          <div className="text-sm text-muted-foreground">{item.products.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                        <TableCell className="text-right">{item.quantity_packed}</TableCell>
                        <TableCell className="text-right">{shipped}</TableCell>
                        <TableCell className="text-right font-medium">{remaining}</TableCell>
                        <TableCell className="text-center">
                          {isComplete ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Shipment Dialog */}
      <Dialog open={isCreateShipmentOpen} onOpenChange={setIsCreateShipmentOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Shipment</DialogTitle>
            <DialogDescription>
              Create a new shipment for this order (supports partial shipments)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Shipment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ship Date</Label>
                <Input
                  type="date"
                  value={shipmentDetails.ship_date}
                  onChange={(e) => setShipmentDetails(prev => ({ ...prev, ship_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Carrier</Label>
                <Input
                  placeholder="e.g., FedEx, UPS"
                  value={shipmentDetails.carrier}
                  onChange={(e) => setShipmentDetails(prev => ({ ...prev, carrier: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  placeholder="Tracking number"
                  value={shipmentDetails.tracking_number}
                  onChange={(e) => setShipmentDetails(prev => ({ ...prev, tracking_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Freight Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={shipmentDetails.freight_cost}
                  onChange={(e) => setShipmentDetails(prev => ({ ...prev, freight_cost: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Shipment notes..."
                value={shipmentDetails.notes}
                onChange={(e) => setShipmentDetails(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Items to Ship */}
            <div className="space-y-2">
              <Label>Items to Ship</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right w-32">Qty to Ship</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipmentItems.map((item) => {
                    const orderItem = order.sales_order_items.find((oi: any) => oi.id === item.sales_order_item_id);
                    if (!orderItem) return null;

                    const available = orderItem.quantity_packed - (orderItem.quantity_shipped || 0);
                    if (available <= 0) return null;

                    return (
                      <TableRow key={item.sales_order_item_id}>
                        <TableCell>
                          <div className="font-medium">{orderItem.products.name}</div>
                          <div className="text-sm text-muted-foreground">{orderItem.products.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">{available} cases</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            max={available}
                            value={item.quantity_shipped}
                            onChange={(e) => updateShipmentItemQuantity(
                              item.sales_order_item_id,
                              parseInt(e.target.value) || 0
                            )}
                            className="text-right"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateShipmentOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => createShipmentMutation.mutate()}
              disabled={
                createShipmentMutation.isPending ||
                shipmentItems.filter(i => i.quantity_shipped > 0).length === 0
              }
            >
              Create Shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
