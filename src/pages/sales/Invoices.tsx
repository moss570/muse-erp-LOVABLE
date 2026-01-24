import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Mail, Printer, FileText, Loader2 } from 'lucide-react';
import { DataTableHeader } from '@/components/ui/data-table-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SalesInvoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  payment_status: string;
  customers: {
    id: string;
    name: string;
    code: string;
  };
}

export default function Invoices() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [emailingInvoiceId, setEmailingInvoiceId] = useState<string | null>(null);

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['sales-invoices', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('sales_invoices')
        .select(`
          id,
          invoice_number,
          invoice_type,
          invoice_date,
          due_date,
          total_amount,
          balance_due,
          payment_status,
          customers!sales_invoices_customer_id_fkey (
            id,
            name,
            code
          )
        `)
        .order('invoice_date', { ascending: false })
        .order('invoice_number', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(invoice => ({
        ...invoice,
        customers: invoice.customers as any,
      })) as SalesInvoice[];
    },
  });

  // Email invoice mutation
  const emailInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { invoice_id: invoiceId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      const invoice = invoices?.find(inv => inv.id === invoiceId);
      toast({
        title: 'Invoice Emailed',
        description: `Invoice ${invoice?.invoice_number} sent successfully`,
      });
      setEmailingInvoiceId(null);
    },
    onError: (error: any, invoiceId) => {
      const invoice = invoices?.find(inv => inv.id === invoiceId);
      toast({
        title: 'Email Failed',
        description: error.message || `Failed to send invoice ${invoice?.invoice_number}`,
        variant: 'destructive',
      });
      setEmailingInvoiceId(null);
    },
  });

  const handleEmailInvoice = (invoiceId: string) => {
    setEmailingInvoiceId(invoiceId);
    emailInvoiceMutation.mutate(invoiceId);
  };

  const filteredInvoices = invoices?.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.customers.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.customers.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      unpaid: { variant: 'secondary', label: 'Unpaid' },
      partial: { variant: 'default', label: 'Partial' },
      paid: { variant: 'default', label: 'Paid' },
      overdue: { variant: 'destructive', label: 'Overdue' },
      credited: { variant: 'outline', label: 'Credited' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    if (type === 'credit_memo') {
      return <Badge variant="outline">Credit Memo</Badge>;
    }
    return null;
  };

  // Summary stats
  const stats = {
    total: invoices?.length || 0,
    unpaid: invoices?.filter(i => i.payment_status === 'unpaid').length || 0,
    overdue: invoices?.filter(i => i.payment_status === 'overdue').length || 0,
    totalOutstanding: invoices
      ?.filter(i => ['unpaid', 'partial', 'overdue'].includes(i.payment_status))
      ?.reduce((sum, i) => sum + i.balance_due, 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage customer invoices and payments
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unpaid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unpaid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalOutstanding.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Invoices</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">All Status</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTableHeader
            searchPlaceholder="Search invoices..."
            onSearchChange={setSearchQuery}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices?.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/sales/invoices/${invoice.id}`)}
                  >
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{getTypeBadge(invoice.invoice_type)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.customers.name}</div>
                        <div className="text-xs text-muted-foreground">{invoice.customers.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.payment_status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${invoice.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${invoice.balance_due.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Print invoice
                          }}
                          title="Print Invoice"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmailInvoice(invoice.id);
                          }}
                          disabled={emailingInvoiceId === invoice.id}
                          title="Email Invoice"
                        >
                          {emailingInvoiceId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sales/invoices/${invoice.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
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
}
