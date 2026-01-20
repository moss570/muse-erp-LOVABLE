import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const PendingIssuesWidget = () => {
  const navigate = useNavigate();

  const { data: pendingIssues } = useQuery({
    queryKey: ['pending-issue-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_issue_requests')
        .select(`
          *,
          requested_by:profiles!production_issue_requests_requested_by_fkey(first_name, last_name),
          work_order:production_work_orders(work_order_number),
          items:production_issue_request_items(
            id,
            material:materials(name)
          )
        `)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('needed_by', { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000
  });

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      urgent: { variant: "destructive", label: "Urgent" },
      high: { variant: "default", label: "High" },
      normal: { variant: "secondary", label: "Normal" },
      low: { variant: "outline", label: "Low" }
    };
    const config = variants[priority] || variants.normal;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const urgent = pendingIssues?.filter(i => i.priority === 'urgent') || [];
  const others = pendingIssues?.filter(i => i.priority !== 'urgent') || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Pending Issue Requests
          </div>
          <Badge variant={urgent.length > 0 ? "destructive" : "secondary"}>
            {pendingIssues?.length || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Urgent Section */}
        {urgent.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              URGENT ({urgent.length})
            </div>
            {urgent.map(request => (
              <div
                key={request.id}
                className="p-3 bg-destructive/10 rounded-lg cursor-pointer hover:bg-destructive/20"
                onClick={() => navigate(`/warehouse/issue-to-production/${request.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{request.request_number}</span>
                  <span className="text-sm text-muted-foreground">
                    {request.items?.length} items
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Needed by: {format(new Date(request.needed_by), 'h:mm a')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Other Requests */}
        {others.slice(0, 5).map(request => (
          <div
            key={request.id}
            className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
            onClick={() => navigate(`/warehouse/issue-to-production/${request.id}`)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{request.request_number}</p>
                <p className="text-sm text-muted-foreground">
                  {request.items?.length} materials
                </p>
              </div>
              <div className="text-right">
                {getPriorityBadge(request.priority)}
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(request.needed_by), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          </div>
        ))}

        {(!pendingIssues || pendingIssues.length === 0) && (
          <div className="text-center py-4 text-muted-foreground">
            No pending requests
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/warehouse/issue-to-production')}
        >
          View All Requests
        </Button>
      </CardContent>
    </Card>
  );
};

export default PendingIssuesWidget;
