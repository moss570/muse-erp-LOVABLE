import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Returns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateRMAOpen, setIsCreateRMAOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rmaDetails, setRmaDetails] = useState({
    customer_id: '',
    invoice_id: '',
    reason: '',
    description: ''
  });

  // Fetch RMA requests
  const { data: rmas } = useQuery({
    queryKey: ['rma-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('rma_requests')
        .select(`
          *,
          customer:customers(id, name, code),
          invoice:sales_invoices(invoice_number, invoice_date),
          items:rma_items(
            *,
            product:products(id, name, sku)
          )
        `)
        .order('request_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, code, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Fetch invoices for selected customer
  const { data: customerInvoices } = useQuery({
    queryKey: ['customer-invoices', rmaDetails.customer_id],
    queryFn: async () => {
      if (!rmaDetails.customer_id) return [];

      const { data, error } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, invoice_date, total_amount')
        .eq('customer_id', rmaDetails.customer_id)
        .order('invoice_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!rmaDetails.customer_id
  });

  // Create RMA mutation
  const createRMAMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Generate RMA number
      const { data: rmaNumber } = await supabase
        .rpc('generate_rma_number');

      // Create RMA request
      const { data: rma, error: rmaError } = await supabase
        .from('rma_requests')
        .insert({
          rma_number: rmaNumber,
          customer_id: rmaDetails.customer_id,
          invoice_id: rmaDetails.invoice_id || null,
          request_date: new Date().toISOString().split('T')[0],
          reason: rmaDetails.reason,
          description: rmaDetails.description,
          status: 'pending',
          requested_by: userId
        })
        .select()
        .single();

      if (rmaError) throw rmaError;

      return rma;
    },
    onSuccess: (rma) => {
      toast({
        title: 'RMA created',
        description: `RMA ${rma.rma_number} created successfully`
      });
      setIsCreateRMAOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['rma-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating RMA',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Approve RMA mutation
  const approveRMAMutation = useMutation({
    mutationFn: async (rmaId: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      await supabase
        .from('rma_requests')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', rmaId);
    },
    onSuccess: () => {
      toast({
        title: 'RMA approved',
        description: 'Return authorization approved'
      });
      queryClient.invalidateQueries({ queryKey: ['rma-requests'] });
    }
  });

  // Reject RMA mutation
  const rejectRMAMutation = useMutation({
    mutationFn: async ({ rmaId, reason }: { rmaId: string; reason: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      await supabase
        .from('rma_requests')
        .update({
          status: 'rejected',
          approved_by: userId,
          approved_date: new Date().toISOString().split('T')[0],
          rejection_reason: reason
        })
        .eq('id', rmaId);
    },
    onSuccess: () => {
      toast({
        title: 'RMA rejected',
        description: 'Return authorization rejected'
      });
      queryClient.invalidateQueries({ queryKey: ['rma-requests'] });
    }
  });

  const resetForm = () => {
    setRmaDetails({
      customer_id: '',
      invoice_id: '',
      reason: '',
      description: ''
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const stats = {
    total: rmas?.length || 0,
    pending: rmas?.filter(r => r.status === 'pending').length || 0,
    approved: rmas?.filter(r => r.status === 'approved').length || 0,
    completed: rmas?.filter(r => r.status === 'completed').length || 0
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Returns & RMAs</h1>
          <p className="text-muted-foreground">Manage customer returns and return merchandise authorizations</p>
        </div>
        <Button onClick={() => setIsCreateRMAOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create RMA
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total RMAs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* RMAs Table */}
      <Card>
        <CardHeader>
          <CardTitle>RMA Requests</CardTitle>
          <CardDescription>Return merchandise authorizations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RMA #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rmas?.map((rma) => (
                <TableRow key={rma.id}>
                  <TableCell className="font-medium">{rma.rma_number}</TableCell>
                  <TableCell>{format(new Date(rma.request_date), 'PP')}</TableCell>
                  <TableCell>
                    <div className="font-medium">{rma.customer.name}</div>
                    <div className="text-sm text-muted-foreground">{rma.customer.code}</div>
                  </TableCell>
                  <TableCell>
                    {rma.invoice ? rma.invoice.invoice_number : '-'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {rma.reason}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(rma.status)}
                      <Badge variant={
                        rma.status === 'approved' ? 'default' :
                        rma.status === 'rejected' ? 'destructive' :
                        rma.status === 'completed' ? 'default' :
                        'secondary'
                      }>
                        {rma.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {rma.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveRMAMutation.mutate(rma.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectRMAMutation.mutate({
                            rmaId: rma.id,
                            reason: 'Rejected by manager'
                          })}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create RMA Dialog */}
      <Dialog open={isCreateRMAOpen} onOpenChange={setIsCreateRMAOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create RMA Request</DialogTitle>
            <DialogDescription>
              Create a return merchandise authorization for a customer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select
                value={rmaDetails.customer_id}
                onValueChange={(v) => setRmaDetails(prev => ({ ...prev, customer_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {rmaDetails.customer_id && (
              <div className="space-y-2">
                <Label>Related Invoice (Optional)</Label>
                <Select
                  value={rmaDetails.invoice_id}
                  onValueChange={(v) => setRmaDetails(prev => ({ ...prev, invoice_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {customerInvoices?.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} - {format(new Date(invoice.invoice_date), 'PP')} - ${invoice.total_amount.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Return Reason *</Label>
              <Select
                value={rmaDetails.reason}
                onValueChange={(v) => setRmaDetails(prev => ({ ...prev, reason: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged_in_transit">Damaged in Transit</SelectItem>
                  <SelectItem value="wrong_product">Wrong Product</SelectItem>
                  <SelectItem value="quality_issue">Quality Issue</SelectItem>
                  <SelectItem value="expired_product">Expired Product</SelectItem>
                  <SelectItem value="customer_error">Customer Order Error</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Detailed description of the return..."
                value={rmaDetails.description}
                onChange={(e) => setRmaDetails(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateRMAOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => createRMAMutation.mutate()}
              disabled={
                !rmaDetails.customer_id ||
                !rmaDetails.reason ||
                !rmaDetails.description ||
                createRMAMutation.isPending
              }
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Create RMA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
