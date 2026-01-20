import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Plus, Clock } from "lucide-react";
import { format } from "date-fns";

const IssueRequests = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: requests, isLoading } = useQuery({
    queryKey: ['production-issue-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('production_issue_requests')
        .select(`
          *,
          requested_by:profiles!production_issue_requests_requested_by_fkey(first_name, last_name),
          delivery_location:locations!production_issue_requests_delivery_location_id_fkey(name),
          items:production_issue_request_items(id)
        `)
        .order('created_at', { ascending: false });

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
      draft: { variant: "outline", label: "Draft" },
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ArrowRightLeft className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Issue Requests</h1>
        </div>
        <Button onClick={() => navigate('/production/issue-requests/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
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
              <SelectItem value="cancelled">Cancelled</SelectItem>
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
                <TableHead>Request #</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Needed By</TableHead>
                <TableHead>Priority</TableHead>
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
                    <TableCell className="font-medium">
                      {request.request_number}
                    </TableCell>
                    <TableCell>{request.items?.length || 0}</TableCell>
                    <TableCell>
                      {request.requested_by?.first_name} {request.requested_by?.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(request.needed_by), 'MMM d, h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/production/issue-requests/${request.id}`)}
                      >
                        View
                      </Button>
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

export default IssueRequests;
