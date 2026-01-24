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
import { useToast } from '@/hooks/use-toast';
import { Package2, CheckCircle, Plus, Box } from 'lucide-react';

interface ShippingPallet {
  id: string;
  pallet_number: string;
  items: { order_item_id: string; quantity: number }[];
}

export function PackingTab({ order }: { order: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [shippingPallets, setShippingPallets] = useState<ShippingPallet[]>([]);
  const [isPackDialogOpen, setIsPackDialogOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<any>(null);
  const [selectedPalletId, setSelectedPalletId] = useState<string>('');
  const [quantityToPack, setQuantityToPack] = useState<number>(0);

  // Fetch pick request to see what's been picked
  const { data: pickRequest } = useQuery({
    queryKey: ['pick-request-for-order', order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pick_requests')
        .select(`
          *,
          items:pick_request_items(
            *,
            product:products(id, name, sku),
            picks:pick_request_picks(
              *,
              production_lot:production_lots(id, lot_number),
              pallet:pallets(id, pallet_number)
            )
          )
        `)
        .eq('sales_order_id', order.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!order.id
  });

  // Start packing mutation (update order status)
  const startPackingMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from('sales_orders')
        .update({ status: 'packing' })
        .eq('id', order.id);
    },
    onSuccess: () => {
      toast({
        title: 'Packing started',
        description: 'Order moved to packing stage'
      });
      queryClient.invalidateQueries({ queryKey: ['sales-order'] });
    }
  });

  // Create shipping pallet
  const createShippingPallet = () => {
    const newPallet: ShippingPallet = {
      id: crypto.randomUUID(),
      pallet_number: `SP-${Date.now()}-${shippingPallets.length + 1}`,
      items: []
    };
    setShippingPallets(prev => [...prev, newPallet]);
  };

  // Pack items mutation
  const packItemsMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Update the quantity_packed for the order item
      const currentPacked = selectedOrderItem.quantity_packed || 0;
      await supabase
        .from('sales_order_items')
        .update({
          quantity_packed: currentPacked + quantityToPack
        })
        .eq('id', selectedOrderItem.id);

      // Update the pallet assignment
      setShippingPallets(prev =>
        prev.map(p =>
          p.id === selectedPalletId
            ? {
                ...p,
                items: [
                  ...p.items,
                  { order_item_id: selectedOrderItem.id, quantity: quantityToPack }
                ]
              }
            : p
        )
      );
    },
    onSuccess: () => {
      toast({
        title: 'Items packed',
        description: `${quantityToPack} cases packed onto pallet`
      });
      setIsPackDialogOpen(false);
      setSelectedOrderItem(null);
      setSelectedPalletId('');
      setQuantityToPack(0);
      queryClient.invalidateQueries({ queryKey: ['sales-order'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error packing items',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Complete packing mutation
  const completePackingMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Check if all items are fully packed
      const allFullyPacked = order.sales_order_items.every((item: any) =>
        (item.quantity_packed || 0) >= item.quantity_picked
      );

      // Update order status
      await supabase
        .from('sales_orders')
        .update({
          status: allFullyPacked ? 'packed' : 'packing'
        })
        .eq('id', order.id);

      // TODO: Save shipping pallet data to database
      // This would involve creating records in a shipping_pallets table
      // For now, we're just tracking status
    },
    onSuccess: () => {
      toast({
        title: 'Packing completed',
        description: 'Order ready for shipping'
      });
      queryClient.invalidateQueries({ queryKey: ['sales-order'] });
    }
  });

  const openPackDialog = (item: any) => {
    setSelectedOrderItem(item);
    setQuantityToPack(item.quantity_picked - (item.quantity_packed || 0));
    setIsPackDialogOpen(true);
  };

  if (!order) return null;

  const canStartPacking = ['picked', 'partially_picked', 'packing'].includes(order.status);
  const isPackingStarted = ['packing', 'packed'].includes(order.status);

  return (
    <div className="space-y-6">
      {!canStartPacking ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Package2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Packing Not Available</h3>
              <p className="text-muted-foreground">
                Order must be picked before packing can begin
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Packing Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Packing Status</CardTitle>
                  <CardDescription>
                    Organize picked items onto shipping pallets
                  </CardDescription>
                </div>
                {!isPackingStarted && (
                  <Button onClick={() => startPackingMutation.mutate()}>
                    Start Packing
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Picked</TableHead>
                    <TableHead className="text-right">Packed</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.sales_order_items?.map((item: any) => {
                    const packed = item.quantity_packed || 0;
                    const remaining = item.quantity_picked - packed;
                    const isComplete = remaining <= 0;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.products.name}</div>
                          <div className="text-sm text-muted-foreground">{item.products.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity_picked}</TableCell>
                        <TableCell className="text-right">{packed}</TableCell>
                        <TableCell className="text-right font-medium">{remaining}</TableCell>
                        <TableCell className="text-center">
                          {isComplete ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <Package2 className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isComplete && isPackingStarted && order.status !== 'packed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPackDialog(item)}
                            >
                              Pack
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {isPackingStarted && order.status !== 'packed' && (
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => completePackingMutation.mutate()}
                    disabled={completePackingMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Packing
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Pallets */}
          {isPackingStarted && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Shipping Pallets</CardTitle>
                  <Button size="sm" variant="outline" onClick={createShippingPallet}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Pallet
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {shippingPallets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Box className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No shipping pallets created yet</p>
                    <p className="text-sm">Create pallets to organize packed items</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shippingPallets.map((pallet) => (
                      <Card key={pallet.id}>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {pallet.pallet_number}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {pallet.items.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Empty pallet</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead className="text-right">Quantity</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pallet.items.map((item, idx) => {
                                  const orderItem = order.sales_order_items.find(
                                    (oi: any) => oi.id === item.order_item_id
                                  );
                                  return (
                                    <TableRow key={idx}>
                                      <TableCell>
                                        {orderItem?.products?.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {item.quantity} cases
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Picked Items Details (from pick request) */}
          {pickRequest && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Picked Lot Details</CardTitle>
                <CardDescription>
                  Lot traceability for packed items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Lot Number</TableHead>
                      <TableHead>Pallet</TableHead>
                      <TableHead className="text-right">Cases</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickRequest.items?.flatMap((item: any) =>
                      item.picks?.map((pick: any) => (
                        <TableRow key={pick.id}>
                          <TableCell>{item.product.name}</TableCell>
                          <TableCell className="font-mono">
                            {pick.production_lot.lot_number}
                          </TableCell>
                          <TableCell>
                            {pick.pallet?.pallet_number || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            {pick.cases_picked}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Pack Dialog */}
      <Dialog open={isPackDialogOpen} onOpenChange={setIsPackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Pack: {selectedOrderItem?.products?.name}
            </DialogTitle>
            <DialogDescription>
              Assign items to a shipping pallet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shipping Pallet</Label>
              <select
                className="w-full p-2 border rounded"
                value={selectedPalletId}
                onChange={(e) => setSelectedPalletId(e.target.value)}
              >
                <option value="">Select pallet</option>
                {shippingPallets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.pallet_number}
                  </option>
                ))}
              </select>
              {shippingPallets.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Create a shipping pallet first
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quantity to Pack (cases)</Label>
              <Input
                type="number"
                min="0"
                max={selectedOrderItem?.quantity_picked - (selectedOrderItem?.quantity_packed || 0)}
                value={quantityToPack}
                onChange={(e) => setQuantityToPack(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Available to pack: {selectedOrderItem?.quantity_picked - (selectedOrderItem?.quantity_packed || 0)} cases
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPackDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => packItemsMutation.mutate()}
              disabled={
                !selectedPalletId ||
                quantityToPack <= 0 ||
                packItemsMutation.isPending
              }
            >
              Pack Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
