import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, Clock, AlertTriangle } from "lucide-react";
import { differenceInHours, isPast } from "date-fns";
import { useNavigate } from "react-router-dom";

const PutawayStatusWidget = () => {
  const navigate = useNavigate();

  const { data: putawayTasks } = useQuery({
    queryKey: ['putaway-tasks-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('putaway_tasks')
        .select(`
          *,
          receiving_lot:receiving_lots!putaway_tasks_receiving_lot_id_fkey(
            internal_lot_number,
            material:materials(name),
            unit:units_of_measure(code)
          )
        `)
        .in('status', ['pending', 'in_progress'])
        .order('deadline', { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000
  });

  const overdueTasks = putawayTasks?.filter(t => t.deadline && isPast(new Date(t.deadline))) || [];
  const urgentTasks = putawayTasks?.filter(t => {
    if (!t.deadline) return false;
    const hoursRemaining = differenceInHours(new Date(t.deadline), new Date());
    return hoursRemaining > 0 && hoursRemaining <= 6;
  }) || [];
  const normalTasks = putawayTasks?.filter(t => {
    if (!t.deadline) return true;
    const hoursRemaining = differenceInHours(new Date(t.deadline), new Date());
    return hoursRemaining > 6;
  }) || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Putaway Status
          </CardTitle>
          <Badge variant={overdueTasks.length > 0 ? "destructive" : "secondary"}>
            {putawayTasks?.length || 0} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overdue Section */}
        {overdueTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium">
              <AlertTriangle className="h-4 w-4" />
              OVERDUE ({overdueTasks.length})
            </div>
            {overdueTasks.slice(0, 3).map(task => (
              <div key={task.id} className="text-sm pl-6">
                {task.receiving_lot?.internal_lot_number}
                {' - '}
                {task.receiving_lot?.material?.name}
              </div>
            ))}
          </div>
        )}

        {/* Urgent Section */}
        {urgentTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-yellow-600 font-medium">
              <Clock className="h-4 w-4" />
              Due Soon ({urgentTasks.length})
            </div>
            {urgentTasks.slice(0, 3).map(task => (
              <div key={task.id} className="text-sm pl-6 flex justify-between">
                <span>{task.receiving_lot?.internal_lot_number}</span>
                <span className="text-muted-foreground">
                  {differenceInHours(new Date(task.deadline!), new Date())}h remaining
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Normal Tasks */}
        {normalTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Ready for Putaway ({normalTasks.length})</p>
            {normalTasks.slice(0, 3).map(task => (
              <div key={task.id} className="text-sm pl-2 flex justify-between">
                <span>{task.receiving_lot?.material?.name}</span>
                <span className="text-muted-foreground">
                  {task.total_quantity} {task.receiving_lot?.unit?.code}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {(!putawayTasks || putawayTasks.length === 0) && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No items awaiting putaway
          </div>
        )}

        <Button
          className="w-full"
          variant="outline"
          onClick={() => navigate('/warehouse/putaway')}
        >
          <Package className="h-4 w-4 mr-2" />
          Open Putaway Screen
        </Button>
      </CardContent>
    </Card>
  );
};

export default PutawayStatusWidget;
