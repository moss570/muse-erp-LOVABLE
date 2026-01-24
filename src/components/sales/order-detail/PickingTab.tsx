import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Package, CheckCircle, AlertCircle, Plus, Truck, Warehouse } from 'lucide-react';
import { format } from 'date-fns';

interface PickSelection {
  lotId: string;
  pallet_id: string;
  quantity: number;
  cases: number;
}

export function PickingTab({ order }: { order: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSourceType, setSelectedSourceType] = useState<'internal' | 'third_party_warehouse'>('internal');
  const [thirdPartyLocationId, setThirdPartyLocationId] = useState<string>('');
  const [pickSelections, setPickSelections] = useState<Record<string, PickSelection[]>>({});
  const [isPickDialogOpen, setIsPickDialogOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<any>(null);

  // Fetch pick request if it exists
  const { data: pickRequest } = useQuery({
    queryKey: ['pick-request-for-order', order.id],
    queryFn: async (): Promise<any> => {
      const { data, error } = await supabase
        .from('pick_requests' as any)
        .select(`
          *,
          items:pick_request_items(
            *,
            product:products(id, name, sku),
            picks:pick_request_picks(
              *,
              production_lot:production_lots(
                id, lot_number, expiry_date,
                pallet:pallets(id, pallet_number)
              )
            )
          )
        `)
        .eq('sales_order_id', order.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as any;
    },
    enabled: !!order.id
  });

  // Fetch 3PL locations
  const { data: thirdPartyLocations } = useQuery({
    queryKey: ['3pl-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, code')
        .eq('location_type', 'third_party_warehouse')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Fetch available lots for a product (FEFO order)
  const { data: availableLots } = useQuery({
    queryKey: ['available-lots-for-product', selectedOrderItem?.product_id],
    queryFn: async (): Promise<any[]> => {
      if (!selectedOrderItem?.product_id) return [];

      const { data, error } = await supabase
        .from('pallets' as any)
        .select(`
          id, pallet_number, current_cases, status,
          production_lot:production_lots(
            id, lot_number, expiry_date, cases_produced,
            product:products(id, name, sku)
          ),
          location:locations(id, name, code)
        `)
        .eq('product_id', selectedOrderItem.product_id)
        .eq('status', 'available')
        .gt('current_cases', 0)
        .order('production_lot(expiry_date)', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!selectedOrderItem?.product_id && selectedSourceType === 'internal'
  });

  // Create pick request mutation
  const createPickRequestMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Generate pick request number
      const { data: requestNumber } = await supabase
        .rpc('generate_pick_request_number');

      // Create pick request
      const { data: newPickRequest, error: pickError } = await supabase
        .from('pick_requests')
        .insert({
          request_number: requestNumber,
          sales_order_id: order.id,
          source_type: selectedSourceType,
          third_party_warehouse_id: selectedSourceType === 'third_party_warehouse' ? thirdPartyLocationId : null,
          location_id: order.customer?.default_location_id || order.location_id,
          status: 'pending',
          requested_by: userId
        })
        .select()
        .single();

      if (pickError) throw pickError;

      // Create pick request items from order items
      const items = order.sales_order_items.map((item: any) => ({
        pick_request_id: newPickRequest.id,
        product_id: item.product_id,
        quantity_requested: item.quantity_ordered - item.quantity_picked,
        quantity_picked: 0
      }));

      const { error: itemsError } = await supabase
        .from('pick_request_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Update order status and link pick request
      await supabase
        .from('sales_orders')
        .update({
          status: 'picking',
          pick_request_id: newPickRequest.id
        })
        .eq('id', order.id);

      // If 3PL, send email (edge function would handle this)
      if (selectedSourceType === 'third_party_warehouse') {
        await supabase.functions.invoke('send-3pl-release-email', {
          body: { pick_request_id: newPickRequest.id }
        }).catch(err => {
          console.error('Failed to send 3PL email:', err);
          // Don't fail the whole operation
        });
      }

      return newPickRequest;
    },
    onSuccess: () => {
      toast({
        title: 'Pick request created',
        description: selectedSourceType === 'third_party_warehouse'
          ? '3PL release email sent'
          : 'Ready for warehouse picking'
      });
      queryClient.invalidateQueries({ queryKey: ['pick-request-for-order'] });
      queryClient.invalidateQueries({ queryKey: ['sales-order'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating pick request',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Record picks mutation
  const recordPicksMutation = useMutation({
    mutationFn: async ({ itemId, selections }: { itemId: string; selections: PickSelection[] }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Get the pick request item
      const pickRequestItem = pickRequest?.items.find((i: any) =>
        i.product_id === selectedOrderItem.product_id
      );

      if (!pickRequestItem) throw new Error('Pick request item not found');

      // Create pick records
      for (const selection of selections) {
        const lot = availableLots?.find((l: any) => l.production_lot.id === selection.lotId);
        if (!lot) continue;

        // Create pick record
        await supabase
          .from('pick_request_picks')
          .insert({
            pick_request_item_id: pickRequestItem.id,
            production_lot_id: selection.lotId,
            pallet_id: selection.pallet_id,
            quantity_picked: selection.quantity,
            cases_picked: selection.cases,
            expiry_date: lot.production_lot?.expiry_date,
            picked_by: userId
          } as any);

        // Update pallet quantity
        await supabase
          .from('pallets')
          .update({
            current_cases: lot.current_cases - selection.cases
          })
          .eq('id', selection.pallet_id);

        // Create lot consumption record
        await supabase
          .from('lot_consumption')
          .insert({
            consumed_lot_id: selection.lotId,
            consumption_type: 'sales',
            quantity_consumed: selection.cases,
            consumed_by: userId
          } as any);
      }

      // Update pick request item
      const totalCases = selections.reduce((sum, s) => sum + s.cases, 0);
      await supabase
        .from('pick_request_items')
        .update({
          quantity_picked: pickRequestItem.quantity_picked + totalCases
        })
        .eq('id', pickRequestItem.id);

      // Update sales order item
      await supabase
        .from('sales_order_items')
        .update({
          quantity_picked: selectedOrderItem.quantity_picked + totalCases
        })
        .eq('id', itemId);
    },
    onSuccess: () => {
      toast({
        title: 'Picks recorded',
        description: 'Lot traceability maintained'
      });
      setPickSelections({});
      setIsPickDialogOpen(false);
      setSelectedOrderItem(null);
      queryClient.invalidateQueries({ queryKey: ['pick-request-for-order'] });
      queryClient.invalidateQueries({ queryKey: ['sales-order'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error recording picks',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Complete picking mutation
  const completePickingMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Update pick request
      await supabase
        .from('pick_requests')
        .update({
          status: 'completed',
          completed_by: userId,
          completed_at: new Date().toISOString()
        })
        .eq('id', pickRequest.id);

      // Check if all items are fully picked
      const allFullyPicked = order.sales_order_items.every((item: any) =>
        item.quantity_picked >= item.quantity_ordered
      );

      // Update order status
      await supabase
        .from('sales_orders')
        .update({
          status: allFullyPicked ? 'picked' : 'partially_picked'
        })
        .eq('id', order.id);
    },
    onSuccess: () => {
      toast({
        title: 'Picking completed',
        description: 'Order ready for packing'
      });
      queryClient.invalidateQueries({ queryKey: ['sales-order'] });
      queryClient.invalidateQueries({ queryKey: ['pick-request-for-order'] });
    }
  });

  const openPickDialog = (item: any) => {
    setSelectedOrderItem(item);
    setIsPickDialogOpen(true);
  };

  const addPickSelection = () => {
    const newSelection: PickSelection = {
      lotId: '',
      pallet_id: '',
      quantity: 0,
      cases: 0
    };
    setPickSelections(prev => ({
      ...prev,
      [selectedOrderItem.id]: [...(prev[selectedOrderItem.id] || []), newSelection]
    }));
  };

  const updatePickSelection = (index: number, field: keyof PickSelection, value: any) => {
    setPickSelections(prev => {
      const current = [...(prev[selectedOrderItem.id] || [])];
      current[index] = { ...current[index], [field]: value };

      // Auto-fill pallet_id when lot is selected
      if (field === 'lotId') {
        const selectedLot = availableLots?.find((l: any) => l.production_lot.id === value);
        if (selectedLot) {
          current[index].pallet_id = selectedLot.id;
        }
      }

      return { ...prev, [selectedOrderItem.id]: current };
    });
  };

  const removePickSelection = (index: number) => {
    setPickSelections(prev => ({
      ...prev,
      [selectedOrderItem.id]: (prev[selectedOrderItem.id] || []).filter((_, i) => i !== index)
    }));
  };

  if (!order) return null;

  return (
    <div className="space-y-6">
      {/* Pick Request Status */}
      {!pickRequest ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Pick Request</CardTitle>
            <CardDescription>
              Choose picking source and create warehouse pick request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Picking Source</Label>
              <Select value={selectedSourceType} onValueChange={(v: any) => setSelectedSourceType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      Internal Warehouse
                    </div>
                  </SelectItem>
                  <SelectItem value="third_party_warehouse">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      3PL / Third Party Warehouse
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedSourceType === 'third_party_warehouse' && (
              <div className="space-y-2">
                <Label>3PL Location</Label>
                <Select value={thirdPartyLocationId} onValueChange={setThirdPartyLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select 3PL location" />
                  </SelectTrigger>
                  <SelectContent>
                    {thirdPartyLocations?.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={() => createPickRequestMutation.mutate()}
              disabled={
                createPickRequestMutation.isPending ||
                (selectedSourceType === 'third_party_warehouse' && !thirdPartyLocationId)
              }
            >
              <Package className="h-4 w-4 mr-2" />
              Create Pick Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pick Request: {pickRequest.request_number}</CardTitle>
                <CardDescription>
                  Source: {pickRequest.source_type === 'internal' ? 'Internal Warehouse' : '3PL Warehouse'}
                </CardDescription>
              </div>
              <Badge variant={
                pickRequest.status === 'completed' ? 'default' :
                pickRequest.status === 'in_progress' ? 'secondary' :
                'outline'
              }>
                {pickRequest.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pickRequest.source_type === 'third_party_warehouse' ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium text-yellow-900">3PL Release Request</p>
                      <p className="text-sm text-yellow-700">
                        Release email sent to 3PL warehouse. Waiting for confirmation.
                      </p>
                      {pickRequest.release_email_sent_at && (
                        <p className="text-xs text-yellow-600">
                          Sent: {format(new Date(pickRequest.release_email_sent_at), 'PPp')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {/* 3PL items table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Requested</TableHead>
                      <TableHead className="text-right">Confirmed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickRequest.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-sm text-muted-foreground">{item.product.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity_requested} cases</TableCell>
                        <TableCell className="text-right">{item.quantity_picked} cases</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Internal picking table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Picked</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.sales_order_items?.map((item: any) => {
                      const remaining = item.quantity_ordered - item.quantity_picked;
                      const isComplete = remaining <= 0;

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.products.name}</div>
                            <div className="text-sm text-muted-foreground">{item.products.sku}</div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                          <TableCell className="text-right">{item.quantity_picked}</TableCell>
                          <TableCell className="text-right font-medium">{remaining}</TableCell>
                          <TableCell className="text-center">
                            {isComplete ? (
                              <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isComplete && pickRequest.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPickDialog(item)}
                              >
                                Pick
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {pickRequest.status !== 'completed' && (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => completePickingMutation.mutate()}
                      disabled={completePickingMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Picking
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pick Dialog for Internal Picking */}
      <Dialog open={isPickDialogOpen} onOpenChange={setIsPickDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pick: {selectedOrderItem?.products?.name}
            </DialogTitle>
            <DialogDescription>
              Select lots and pallets (FEFO order). Remaining to pick: {selectedOrderItem?.quantity_ordered - selectedOrderItem?.quantity_picked} cases
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Available Lots */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Available Inventory (FEFO Order)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lot #</TableHead>
                      <TableHead>Pallet #</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Cases</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableLots?.map((pallet: any) => (
                      <TableRow key={pallet.id}>
                        <TableCell className="font-medium">{pallet.production_lot.lot_number}</TableCell>
                        <TableCell>{pallet.pallet_number}</TableCell>
                        <TableCell>{pallet.location?.name}</TableCell>
                        <TableCell>
                          {pallet.production_lot.expiry_date
                            ? format(new Date(pallet.production_lot.expiry_date), 'PP')
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell className="text-right">{pallet.current_cases}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pick Selections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Pick Selections</Label>
                <Button size="sm" variant="outline" onClick={addPickSelection}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pick
                </Button>
              </div>

              {(pickSelections[selectedOrderItem?.id] || []).map((selection, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Lot / Pallet</Label>
                        <Select
                          value={selection.lotId}
                          onValueChange={(v) => updatePickSelection(index, 'lotId', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select lot" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLots?.map((pallet: any) => (
                              <SelectItem key={pallet.id} value={pallet.production_lot.id}>
                                {pallet.production_lot.lot_number} / {pallet.pallet_number} ({pallet.current_cases} cases)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cases to Pick</Label>
                        <Input
                          type="number"
                          min="0"
                          value={selection.cases || ''}
                          onChange={(e) => updatePickSelection(index, 'cases', parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      <div className="flex items-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removePickSelection(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPickDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordPicksMutation.mutate({
                itemId: selectedOrderItem.id,
                selections: pickSelections[selectedOrderItem?.id] || []
              })}
              disabled={
                !pickSelections[selectedOrderItem?.id]?.length ||
                pickSelections[selectedOrderItem?.id]?.some(s => !s.lotId || s.cases <= 0) ||
                recordPicksMutation.isPending
              }
            >
              Record Picks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
