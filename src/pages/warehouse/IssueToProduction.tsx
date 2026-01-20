import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Clock, AlertTriangle } from "lucide-react";
import { format, isPast, differenceInHours } from "date-fns";

const IssueToProduction = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data: requests, isLoading } = useQuery({
    queryKey: ['warehouse-issue-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('production_issue_requests')
        .select(`
          *,
          requested_by:profiles!production_issue_requests_requested_by_fkey(first_name, last_name),
          delivery_location:locations!production_issue_requests_delivery_location_id_fkey(name),
          items:production_issue_request_items(id, material:materials(name))
        `)
        .order('needed_by', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      low: { variant: "outline", label: "Low" },
      normal: { variant: "secondary", label: "Normal" },
      high: { variant: "default", label: "High" },
      urgent: { variant: "destructive", label: "Urgent" }
    };
    const config = variants[priority] || variants.normal;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTimeIndicator = (neededBy: string) => {
    const deadline = new Date(neededBy);
    if (isPast(deadline)) {
      return <Badge variant="destructive">OVERDUE</Badge>;
    }
    const hours = differenceInHours(deadline, new Date());
    if (hours <= 1) {
      return <Badge variant="destructive">{hours}h left</Badge>;
    }
    if (hours <= 4) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{hours}h left</Badge>;
    }
    return <span className="text-muted-foreground">{hours}h left</span>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ArrowRightLeft className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Issue to Production</h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-red-600">
              {requests?.filter(r => isPast(new Date(r.needed_by)) && r.status === 'pending').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-600">
              {requests?.filter(r => r.priority === 'urgent' && r.status === 'pending').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Urgent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">
              {requests?.filter(r => r.status === 'pending').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">
              {requests?.filter(r => r.status === 'completed').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Completed Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
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

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Request #</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead>Deliver To</TableHead>
                <TableHead>Needed By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : requests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No issue requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                    <TableCell className="font-medium">
                      {request.request_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {request.items?.slice(0, 2).map((item: any, idx: number) => (
                          <span key={idx} className="text-sm">{item.material?.name}</span>
                        ))}
                        {request.items?.length > 2 && (
                          <span className="text-sm text-muted-foreground">
                            +{request.items.length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{request.delivery_location?.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(request.needed_by), 'h:mm a')}</span>
                        {getTimeIndicator(request.needed_by)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.status === 'pending' || request.status === 'in_progress' ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/warehouse/issue-to-production/${request.id}`)}
                        >
                          Fulfill
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/warehouse/issue-to-production/${request.id}`)}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default IssueToProduction;
