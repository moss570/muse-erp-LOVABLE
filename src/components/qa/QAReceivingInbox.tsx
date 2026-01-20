import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Clock } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { useNavigate } from "react-router-dom";

const QAReceivingInbox = () => {
  const navigate = useNavigate();

  const { data: pendingInspections, isLoading } = useQuery({
    queryKey: ['qa-pending-inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_receiving_sessions')
        .select(`
          *,
          lots:receiving_lots(
            id,
            internal_lot_number,
            material:materials(name)
          )
        `)
        .eq('qa_inspection_status', 'pending')
        .not('submitted_to_qa_at', 'is', null)
        .order('submitted_to_qa_at', { ascending: true });

      if (error) throw error;
      
      // Fetch supplier names separately
      const supplierIds = [...new Set(data?.map(s => s.purchase_order_id).filter(Boolean))];
      let supplierMap: Record<string, string> = {};
      
      if (supplierIds.length > 0) {
        const { data: pos } = await supabase
          .from('purchase_orders')
          .select('id, supplier:suppliers(name)')
          .in('id', supplierIds);
        
        pos?.forEach(po => {
          if (po.supplier) {
            supplierMap[po.id] = (po.supplier as any).name;
          }
        });
      }
      
      return data?.map(session => ({
        ...session,
        supplierName: session.purchase_order_id ? supplierMap[session.purchase_order_id] : null
      }));
    },
    refetchInterval: 30000
  });

  const getAgeIndicator = (submittedAt: string) => {
    const hours = differenceInHours(new Date(), new Date(submittedAt));
    if (hours > 4) return { color: 'text-red-600', label: 'Urgent' };
    if (hours > 2) return { color: 'text-yellow-600', label: 'Aging' };
    return { color: 'text-green-600', label: 'Recent' };
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Pending 2nd Inspections
          </CardTitle>
          <Badge variant="secondary">
            {pendingInspections?.length || 0}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : pendingInspections?.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No pending inspections
          </div>
        ) : (
          <div className="space-y-2">
            {pendingInspections?.slice(0, 5).map((session) => {
              const age = getAgeIndicator(session.submitted_to_qa_at!);
              return (
                <div
                  key={session.id}
                  className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => navigate(`/qa/receiving-inspection/${session.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {session.receiving_number || `Session ${session.id.slice(0, 8)}`}
                      </div>
                      {session.supplierName && (
                        <div className="text-sm text-muted-foreground">
                          {session.supplierName}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {session.lots?.length} lot(s)
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className={`text-xs font-medium ${age.color}`}>
                        {age.label}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(session.submitted_to_qa_at!), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {pendingInspections && pendingInspections.length > 5 && (
              <Button
                variant="link"
                className="w-full"
                onClick={() => navigate('/qa/receiving-inspections')}
              >
                View All ({pendingInspections.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QAReceivingInbox;
