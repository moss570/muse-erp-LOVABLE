import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock, AlertTriangle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { useNavigate } from "react-router-dom";

const CycleCountWidget = () => {
  const navigate = useNavigate();

  const { data: cycleCounts } = useQuery({
    queryKey: ['cycle-counts-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycle_counts')
        .select(`
          *,
          assigned_to:profiles!assigned_to(full_name)
        `)
        .in('status', ['scheduled', 'in_progress', 'pending_review'])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const overdue = cycleCounts?.filter(c => isPast(new Date(c.scheduled_date)) && c.status === 'scheduled') || [];
  const dueToday = cycleCounts?.filter(c => isToday(new Date(c.scheduled_date)) && c.status === 'scheduled') || [];
  const inProgress = cycleCounts?.filter(c => c.status === 'in_progress') || [];
  const pendingReview = cycleCounts?.filter(c => c.status === 'pending_review') || [];

  const totalPending = (cycleCounts?.length || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Cycle Counts
          </div>
          <Badge variant={overdue.length > 0 ? "destructive" : pendingReview.length > 0 ? "secondary" : "outline"}>
            {totalPending}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingReview.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Pending Review ({pendingReview.length})</span>
            </div>
            {pendingReview.map(count => (
              <div
                key={count.id}
                className="text-sm p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                onClick={() => navigate(`/warehouse/cycle-counts/${count.id}/review`)}
              >
                {count.count_number} - {count.items_with_variance} variances
              </div>
            ))}
          </div>
        )}

        {overdue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Overdue ({overdue.length})</span>
            </div>
            {overdue.slice(0, 3).map(count => (
              <div key={count.id} className="text-sm text-muted-foreground">
                {count.count_number} - Due {format(new Date(count.scheduled_date), 'MMM d')}
              </div>
            ))}
          </div>
        )}

        {dueToday.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Due Today ({dueToday.length})</p>
            {dueToday.map(count => (
              <div
                key={count.id}
                className="text-sm p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                onClick={() => navigate(`/warehouse/cycle-counts/${count.id}`)}
              >
                {count.count_number} - {count.count_type}
              </div>
            ))}
          </div>
        )}

        {inProgress.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">In Progress ({inProgress.length})</p>
            {inProgress.map(count => (
              <div
                key={count.id}
                className="text-sm p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                onClick={() => navigate(`/warehouse/cycle-counts/${count.id}`)}
              >
                <div className="flex justify-between">
                  <span>{count.count_number}</span>
                  <span className="text-muted-foreground">
                    {count.items_counted}/{count.total_items}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPending === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            No pending counts
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/warehouse/cycle-counts')}
        >
          View All Counts
        </Button>
      </CardContent>
    </Card>
  );
};

export default CycleCountWidget;
