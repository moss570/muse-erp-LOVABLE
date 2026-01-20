import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { differenceInHours, isPast } from "date-fns";

const Putaway = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['putaway-tasks', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('putaway_tasks')
        .select(`
          *,
          receiving_lot:receiving_lots(
            internal_lot_number,
            supplier_lot_number,
            material:materials(id, name, code),
            supplier:suppliers(name),
            unit:units_of_measure(code)
          )
        `)
        .order('deadline', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (task: any) => {
    if (task.status === 'completed') {
      return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>;
    }
    if (task.deadline && isPast(new Date(task.deadline))) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
    }
    if (task.status === 'in_progress') {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const getTimeRemaining = (deadline: string) => {
    if (!deadline) return null;
    const hours = differenceInHours(new Date(deadline), new Date());
    if (hours < 0) return <span className="text-destructive font-medium">OVERDUE</span>;
    if (hours <= 6) return <span className="text-yellow-600">{hours}h left</span>;
    return <span className="text-muted-foreground">{hours}h left</span>;
  };

  const overdueCount = tasks?.filter(t => t.deadline && isPast(new Date(t.deadline))).length || 0;
  const inProgressCount = tasks?.filter(t => t.status === 'in_progress').length || 0;
  const pendingCount = tasks?.filter(t => t.status === 'pending').length || 0;
  const completedCount = tasks?.filter(t => t.status === 'completed').length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Putaway</h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className={overdueCount > 0 ? "border-destructive" : ""}>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-destructive" : ""}`}>
              {overdueCount}
            </div>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {inProgressCount}
            </div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {pendingCount}
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {completedCount}
            </div>
            <p className="text-sm text-muted-foreground">Completed Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Lot #</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Time Remaining</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks?.map((task) => {
                const progress = task.total_quantity > 0 
                  ? ((task.putaway_quantity || 0) / task.total_quantity) * 100 
                  : 0;
                return (
                  <TableRow key={task.id}>
                    <TableCell>{getStatusBadge(task)}</TableCell>
                    <TableCell className="font-mono">
                      {task.receiving_lot?.internal_lot_number}
                    </TableCell>
                    <TableCell>{task.receiving_lot?.material?.name}</TableCell>
                    <TableCell>
                      {task.total_quantity} {task.receiving_lot?.unit?.code}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="w-20" />
                        <span className="text-sm text-muted-foreground">
                          {task.putaway_quantity || 0}/{task.total_quantity}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{task.deadline && getTimeRemaining(task.deadline)}</TableCell>
                    <TableCell>
                      {task.status !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/warehouse/putaway/${task.id}`)}
                        >
                          {task.status === 'in_progress' ? 'Continue' : 'Start'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!tasks || tasks.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {isLoading ? 'Loading...' : 'No putaway tasks found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Putaway;
