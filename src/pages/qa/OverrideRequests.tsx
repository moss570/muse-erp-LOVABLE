import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PendingOverrideRequests } from '@/components/qa/PendingOverrideRequests';
import { useOverrideRequests } from '@/hooks/useOverrideRequests';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { variant: 'default', label: 'Pending' },
  approved: { variant: 'secondary', label: 'Approved' },
  denied: { variant: 'destructive', label: 'Denied' },
  expired: { variant: 'outline', label: 'Expired' },
  cancelled: { variant: 'outline', label: 'Cancelled' },
};

export default function OverrideRequestsPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  
  const { data: allRequests, isLoading } = useOverrideRequests();

  const pendingCount = allRequests?.filter((r) => r.status === 'pending').length || 0;
  const approvedRequests = allRequests?.filter((r) => r.status === 'approved') || [];
  const deniedRequests = allRequests?.filter((r) => r.status === 'denied') || [];

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      emergency_production: 'Emergency production need',
      supplier_documentation_pending: 'Supplier documentation pending',
      temporary_issue_being_resolved: 'Temporary issue being resolved',
      administrative_data_pending: 'Administrative data pending',
      other: 'Other',
    };
    return labels[reason] || reason;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🔒 Override Requests
        </h1>
        <p className="text-muted-foreground">
          Manage QA override requests and approvals
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {isAdmin ? (
            <PendingOverrideRequests />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Only administrators can review pending override requests.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Approved Overrides</CardTitle>
              <CardDescription>
                Previously approved override requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : approvedRequests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No approved overrides
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Approved By</TableHead>
                      <TableHead>Approved At</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="capitalize">
                          {req.related_table_name.replace('_', ' ')}
                        </TableCell>
                        <TableCell>{getReasonLabel(req.override_reason)}</TableCell>
                        <TableCell>
                          {req.requester?.full_name || req.requester?.email || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {req.reviewer?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {req.reviewed_at && format(new Date(req.reviewed_at), 'PPp')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {req.override_type === 'full_approval' ? 'Full' : 'Conditional'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="denied" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Denied Overrides</CardTitle>
              <CardDescription>
                Previously denied override requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : deniedRequests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No denied overrides
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Denied By</TableHead>
                      <TableHead>Denied At</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deniedRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="capitalize">
                          {req.related_table_name.replace('_', ' ')}
                        </TableCell>
                        <TableCell>{getReasonLabel(req.override_reason)}</TableCell>
                        <TableCell>
                          {req.requester?.full_name || req.requester?.email || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {req.reviewer?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {req.reviewed_at && format(new Date(req.reviewed_at), 'PPp')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {req.review_notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
