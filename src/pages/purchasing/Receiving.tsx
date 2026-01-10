import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReceiving, ReceivingSession } from '@/hooks/useReceiving';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Search, Plus, Package, MoreVertical, Eye, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ReceivingSessionDialog } from '@/components/purchasing/ReceivingSessionDialog';
import { ReceivingDetailDialog } from '@/components/purchasing/ReceivingDetailDialog';

const getStatusBadge = (status: string) => {
  const configs: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
    in_progress: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'In Progress' },
    completed: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Completed' },
    cancelled: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Cancelled' },
  };
  const config = configs[status] || configs.in_progress;
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
};

export default function Receiving() {
  const navigate = useNavigate();
  const { useSessions, cancelSession } = useReceiving();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Fetch sessions with filters
  const { data: sessions, isLoading } = useSessions({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: search || undefined,
  });

  // Fetch pending POs for new receiving
  const { data: pendingPOs } = useQuery({
    queryKey: ['pending-pos-for-receiving'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          order_date,
          expected_delivery_date,
          supplier:suppliers(id, name, code),
          items:purchase_order_items(
            id,
            quantity_ordered,
            quantity_received,
            material:materials(id, name, code)
          )
        `)
        .in('status', ['sent', 'partially_received'])
        .order('expected_delivery_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const handleCancelSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to cancel this receiving session? All items will be removed.')) {
      await cancelSession.mutateAsync(sessionId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Receiving</h1>
          <p className="text-muted-foreground">Receive materials from purchase orders</p>
        </div>
        <Button onClick={() => setIsNewSessionOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Receiving
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by receiving number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Receiving Sessions</CardTitle>
          <CardDescription>
            {sessions?.length || 0} sessions found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !sessions?.length ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No receiving sessions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start a new receiving session to receive materials from a PO
              </p>
              <Button onClick={() => setIsNewSessionOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Receiving
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receiving #</TableHead>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow 
                    key={session.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <TableCell className="font-mono font-medium">
                      {session.receiving_number}
                    </TableCell>
                    <TableCell className="font-mono">
                      {session.purchase_order?.po_number || '-'}
                    </TableCell>
                    <TableCell>
                      {session.purchase_order?.supplier?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(session.received_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {session.location?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(session.status)}
                    </TableCell>
                    <TableCell>
                      {session.received_by_profile 
                        ? `${session.received_by_profile.first_name} ${session.received_by_profile.last_name}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSessionId(session.id);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {session.status === 'in_progress' && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelSession(session.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel Session
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Session Dialog */}
      <ReceivingSessionDialog
        open={isNewSessionOpen}
        onOpenChange={setIsNewSessionOpen}
        pendingPOs={pendingPOs || []}
      />

      {/* Session Detail Dialog */}
      {selectedSessionId && (
        <ReceivingDetailDialog
          sessionId={selectedSessionId}
          open={!!selectedSessionId}
          onOpenChange={(open) => !open && setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}
