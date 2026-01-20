import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const CycleCountReview = () => {
  const { countId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [itemActions, setItemActions] = useState<Record<string, string>>({});

  const { data: count, isLoading } = useQuery({
    queryKey: ['cycle-count-review', countId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycle_counts')
        .select(`
          *,
          items:cycle_count_items(
            *,
            material:materials(id, name, code),
            location:locations(name, zone),
            receiving_lot:receiving_lots(internal_lot_number),
            unit:units_of_measure!system_unit_id(code),
            counted_by_user:profiles!counted_by(full_name)
          )
        `)
        .eq('id', countId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const reviewItems = count?.items?.filter((i: any) => i.requires_review && i.status === 'counted') || [];
  const autoApprovedItems = count?.items?.filter((i: any) => !i.requires_review || i.status === 'approved') || [];

  const approveMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      for (const item of reviewItems) {
        const action = itemActions[item.id] || 'approve';

        if (action === 'approve' || action === 'adjust') {
          await supabase
            .from('cycle_count_items')
            .update({
              status: 'approved',
              approved_by: userId,
              approved_at: new Date().toISOString()
            })
            .eq('id', item.id);

          if (item.variance_quantity !== 0 && item.receiving_lot_id) {
            // Create inventory adjustment
            const { data: lotData } = await supabase
              .from('receiving_lots')
              .select('quantity_received, current_location_id, location_id')
              .eq('id', item.receiving_lot_id)
              .single();

            const quantityBefore = lotData?.quantity_received || 0;
            const locationId = lotData?.current_location_id || lotData?.location_id;

            if (locationId) {
              const { data: adjustment } = await supabase
                .from('inventory_adjustments')
                .insert({
                  receiving_lot_id: item.receiving_lot_id,
                  location_id: locationId,
                  adjustment_type: item.variance_quantity > 0 ? 'increase' : 'decrease',
                  reason_code: 'CYCLE_COUNT',
                  quantity_before: quantityBefore,
                  quantity_adjusted: Math.abs(item.variance_quantity),
                  quantity_after: item.physical_quantity,
                  unit_id: item.system_unit_id,
                  notes: `Cycle count ${count.count_number}`,
                  adjusted_by: userId
                })
                .select()
                .single();

              await supabase
                .from('cycle_count_items')
                .update({ adjustment_id: adjustment?.id })
                .eq('id', item.id);

              await supabase
                .from('receiving_lots')
                .update({
                  quantity_received: item.physical_quantity
                })
                .eq('id', item.receiving_lot_id);
            }
          }
        } else if (action === 'recount') {
          await supabase
            .from('cycle_count_items')
            .update({
              status: 'recounting',
              physical_quantity: null,
              counted_at: null,
              requires_review: false
            })
            .eq('id', item.id);
        }
      }

      await supabase
        .from('cycle_counts')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          total_variance_value: reviewItems.reduce((sum: number, i: any) => sum + Math.abs(i.variance_value || 0), 0)
        })
        .eq('id', countId);

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Count Approved",
        description: "Cycle count has been approved and adjustments processed."
      });
      queryClient.invalidateQueries({ queryKey: ['cycle-counts'] });
      navigate('/warehouse/cycle-counts');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!count) return <div className="p-6">Count not found</div>;

  const totalVarianceValue = reviewItems.reduce((sum: number, i: any) => sum + Math.abs(i.variance_value || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Review Count</h1>
        <Badge variant="outline" className="text-lg">
          {count.count_number}
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{count.total_items}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">With Variance</p>
              <p className="text-2xl font-bold">{count.items_with_variance}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requires Review</p>
              <p className="text-2xl font-bold">{reviewItems.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Variance Value</p>
              <p className="text-2xl font-bold text-red-600">
                ${totalVarianceValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {reviewItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Items Requiring Review ({reviewItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Lot #</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Physical</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.material?.name}</TableCell>
                    <TableCell>{item.receiving_lot?.internal_lot_number}</TableCell>
                    <TableCell>{item.location?.name}</TableCell>
                    <TableCell>{item.system_quantity} {item.unit?.code}</TableCell>
                    <TableCell>{item.physical_quantity} {item.unit?.code}</TableCell>
                    <TableCell className={item.variance_quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.variance_quantity > 0 ? '+' : ''}{item.variance_quantity}
                      {' '}({item.variance_percentage?.toFixed(1)}%)
                    </TableCell>
                    <TableCell>
                      ${Math.abs(item.variance_value || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={itemActions[item.id] === 'approve' || !itemActions[item.id] ? 'default' : 'outline'}
                          onClick={() => setItemActions({ ...itemActions, [item.id]: 'approve' })}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={itemActions[item.id] === 'recount' ? 'default' : 'outline'}
                          onClick={() => setItemActions({ ...itemActions, [item.id]: 'recount' })}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {autoApprovedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Auto-Approved ({autoApprovedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {autoApprovedItems.length} items had variance within acceptable threshold (≤2%) and were auto-approved.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate('/warehouse/cycle-counts')}>
          Cancel
        </Button>
        <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve Count
        </Button>
      </div>
    </div>
  );
};

export default CycleCountReview;
