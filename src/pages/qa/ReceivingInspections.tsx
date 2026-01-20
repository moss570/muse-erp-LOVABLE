import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Clock } from "lucide-react";
import { format, differenceInHours } from "date-fns";

const ReceivingInspections = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['qa-inspection-sessions', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('po_receiving_sessions')
        .select(`
          *,
          inspection:qa_receiving_inspections(
            result,
            inspector_id,
            inspected_at
          ),
          lots:receiving_lots(id)
        `)
        .not('submitted_to_qa_at', 'is', null)
        .order('submitted_to_qa_at', { ascending: statusFilter === 'pending' });

      if (statusFilter !== 'all') {
        query = query.eq('qa_inspection_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch supplier names and inspector names
      const poIds = [...new Set(data?.map(s => s.purchase_order_id).filter(Boolean))];
      const inspectorIds = [...new Set(data?.map(s => (s.inspection as any)?.inspector_id).filter(Boolean))];
      
      let supplierMap: Record<string, string> = {};
      let inspectorMap: Record<string, string> = {};
      
      if (poIds.length > 0) {
        const { data: pos } = await supabase
          .from('purchase_orders')
          .select('id, supplier:suppliers(name)')
          .in('id', poIds);
        
        pos?.forEach(po => {
          if (po.supplier) {
            supplierMap[po.id] = (po.supplier as any).name;
          }
        });
      }
      
      if (inspectorIds.length > 0) {
        const { data: inspectors } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', inspectorIds);
        
        inspectors?.forEach(p => {
          inspectorMap[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        });
      }
      
      return data?.map(session => {
        const insp = session.inspection as any;
        return {
        ...session,
        supplierName: session.purchase_order_id ? supplierMap[session.purchase_order_id] : null,
        inspectorName: insp?.inspector_id ? inspectorMap[insp.inspector_id] : null
      };});
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      partial: { variant: "outline", label: "Partial" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Receiving Inspections</h1>
        </div>
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
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Lots</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions?.map((session) => {
                const waitTime = session.submitted_to_qa_at 
                  ? differenceInHours(new Date(), new Date(session.submitted_to_qa_at))
                  : 0;
                return (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono">
                      {session.receiving_number || session.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{session.supplierName || '-'}</TableCell>
                    <TableCell>{session.lots?.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {session.submitted_to_qa_at && format(new Date(session.submitted_to_qa_at), 'MMM d, h:mm a')}
                        {session.qa_inspection_status === 'pending' && waitTime > 2 && (
                          <Badge variant="destructive" className="text-xs">
                            {waitTime}h
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(session.qa_inspection_status || 'pending')}</TableCell>
                    <TableCell>
                      {session.inspectorName || '-'}
                    </TableCell>
                    <TableCell>
                      {session.qa_inspection_status === 'pending' ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/qa/receiving-inspection/${session.id}`)}
                        >
                          Inspect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/qa/receiving-inspection/${session.id}`)}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!sessions || sessions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {isLoading ? 'Loading...' : 'No inspections found'}
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

export default ReceivingInspections;
