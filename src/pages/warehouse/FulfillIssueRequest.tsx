import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, MapPin, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const FulfillIssueRequest = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedLots, setSelectedLots] = useState<Record<string, string[]>>({});

  // Fetch request with items
  const { data: request, isLoading } = useQuery({
    queryKey: ['issue-request', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_issue_requests')
        .select(`
          *,
          requested_by:profiles!production_issue_requests_requested_by_fkey(first_name, last_name),
          delivery_location:locations!production_issue_requests_delivery_location_id_fkey(id, name),
          items:production_issue_request_items(
            *,
            material:materials(id, name, code),
            usage_unit:units_of_measure!production_issue_request_items_usage_unit_id_fkey(code),
            purchase_unit:units_of_measure!production_issue_request_items_purchase_unit_id_fkey(code)
          )
        `)
        .eq('id', requestId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Fetch available lots for each material (FEFO order)
  const { data: availableLots } = useQuery({
    queryKey: ['available-lots-for-issue', request?.items],
    queryFn: async () => {
      if (!request?.items) return {};
      
      const materialIds = [...new Set(request.items.map((i: any) => i.material_id))];
      const lotsByMaterial: Record<string, any[]> = {};

      for (const materialId of materialIds) {
        const { data } = await supabase
          .from('receiving_lots')
          .select(`
            id, internal_lot_number, supplier_lot_number,
            current_quantity, expiry_date, container_status,
            unit:units_of_measure!receiving_lots_unit_id_fkey(code),
            location:locations!receiving_lots_current_location_id_fkey(id, name)
          `)
          .eq('material_id', materialId)
          .eq('hold_status', 'none')
          .eq('putaway_complete', true)
          .gt('current_quantity', 0)
          .order('expiry_date', { ascending: true, nullsFirst: false });

        lotsByMaterial[materialId as string] = data || [];
      }

      return lotsByMaterial;
    },
    enabled: !!request?.items
  });

  // Select lot for an item
  const toggleLotSelection = (itemId: string, lotId: string) => {
    setSelectedLots(prev => {
      const current = prev[itemId] || [];
      if (current.includes(lotId)) {
        return { ...prev, [itemId]: current.filter(id => id !== lotId) };
      }
      return { ...prev, [itemId]: [...current, lotId] };
    });
  };

  // Fulfill mutation
  const fulfillMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Process each item
      for (const item of request.items) {
        const itemSelectedLots = selectedLots[item.id] || [];
        if (itemSelectedLots.length === 0) continue;

        // Update item with selected lots
        await supabase
          .from('production_issue_request_items')
          .update({
            selected_lots: itemSelectedLots.map(lotId => ({ lot_id: lotId })),
            quantity_fulfilled: item.quantity_requested,
            fulfilled_at: new Date().toISOString(),
            status: 'fulfilled'
          })
          .eq('id', item.id);

        // Create inventory transactions
        for (const lotId of itemSelectedLots) {
          const lot = availableLots?.[item.material_id]?.find((l: any) => l.id === lotId);
          if (!lot) continue;

          // Deduct from inventory
          await supabase
            .from('receiving_lots')
            .update({
              current_quantity: (lot.current_quantity || 0) - item.quantity_requested
            })
            .eq('id', lotId);

          // Create transaction record
          await supabase
            .from('inventory_transactions')
            .insert({
              transaction_type: 'production_consume',
              receiving_lot_id: lotId,
              quantity: item.quantity_requested,
              unit_id: item.usage_unit_id,
              from_location_id: lot.location?.id,
              to_location_id: request.delivery_location?.id,
              reference_type: 'issue_request',
              reference_id: request.id,
              performed_by: userId
            });
        }
      }

      // Update request status
      await supabase
        .from('production_issue_requests')
        .update({
          status: 'completed',
          fulfilled_by: userId,
          fulfilled_at: new Date().toISOString()
        })
        .eq('id', requestId);

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Request Fulfilled",
        description: "Materials have been issued to production."
      });
      queryClient.invalidateQueries({ queryKey: ['warehouse-issue-requests'] });
      navigate('/warehouse/issue-to-production');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading) return <div className="container mx-auto py-6">Loading...</div>;
  if (!request) return <div className="container mx-auto py-6">Request not found</div>;

  const requestedByName = request.requested_by 
    ? `${request.requested_by.first_name || ''} ${request.requested_by.last_name || ''}`.trim()
    : 'Unknown';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ArrowRightLeft className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Fulfill Request</h1>
          <Badge variant="outline" className="text-lg">
            {request.request_number}
          </Badge>
        </div>
        <Badge variant={request.priority === 'urgent' ? 'destructive' : 'secondary'}>
          {request.priority}
        </Badge>
      </div>

      {/* Request Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Requested By:</span>
              <p className="font-medium">{requestedByName}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Needed By:</span>
              <p className="font-medium">{format(new Date(request.needed_by), 'MMM d, h:mm a')}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Deliver To:</span>
              <div className="flex items-center gap-1 font-medium">
                <MapPin className="h-4 w-4" />
                {request.delivery_location?.name}
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Items:</span>
              <p className="font-medium">{request.items?.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items to Fulfill */}
      {request.items?.map((item: any) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{item.material?.name}</span>
              <Badge variant="outline">
                {item.quantity_requested} {item.usage_unit?.code} needed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Sealed Units:</span>
                <p className="font-medium">{item.quantity_purchase_uom} × {item.purchase_unit?.code}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Disassemble:</span>
                <p className={item.disassemble_required ? "font-medium text-orange-600" : "text-muted-foreground"}>
                  {item.disassemble_required ? `1 × ${item.purchase_unit?.code}` : 'None'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining After:</span>
                <p className={item.remaining_after_use > 0 ? "font-medium" : "text-muted-foreground"}>
                  {item.remaining_after_use > 0 
                    ? `${item.remaining_after_use} ${item.usage_unit?.code}`
                    : 'None'}
                </p>
              </div>
            </div>

            {/* Available Lots (FEFO) */}
            <p className="font-medium">Select Lots (FEFO Order)</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Lot #</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableLots?.[item.material_id]?.map((lot: any) => (
                  <TableRow key={lot.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLots[item.id]?.includes(lot.id)}
                        onCheckedChange={() => toggleLotSelection(item.id, lot.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{lot.internal_lot_number}</TableCell>
                    <TableCell>{lot.location?.name}</TableCell>
                    <TableCell>
                      {lot.current_quantity} {lot.unit?.code}
                    </TableCell>
                    <TableCell>
                      {lot.expiry_date && format(new Date(lot.expiry_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lot.container_status === 'sealed' ? 'secondary' : 'outline'}>
                        {lot.container_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!availableLots?.[item.material_id] || availableLots[item.material_id].length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                      No available lots found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button
          onClick={() => fulfillMutation.mutate()}
          disabled={fulfillMutation.isPending || Object.keys(selectedLots).length === 0}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Complete Fulfillment
        </Button>
      </div>
    </div>
  );
};

export default FulfillIssueRequest;
