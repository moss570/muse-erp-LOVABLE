import { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Loader2, 
  Plus, 
  FileText, 
  DollarSign, 
  Calculator, 
  MoreHorizontal, 
  Truck, 
  Link2, 
  RefreshCw, 
  CheckCircle,
  Clock,
  Eye,
  Pencil,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { usePOInvoices, useApproveInvoice, useDeleteInvoice } from '@/hooks/useInvoices';
import { useXeroSyncInvoice, useXeroConnection } from '@/hooks/useXero';
import { InvoiceFormDialog } from './InvoiceFormDialog';
import { FreightInvoiceFormDialog } from './FreightInvoiceFormDialog';
import { LinkFreightInvoiceDialog } from './LinkFreightInvoiceDialog';
import { AdditionalCostsDialog } from './AdditionalCostsDialog';
import { InvoiceViewDialog } from './InvoiceViewDialog';
import { LandedCostsDialog } from './LandedCostsDialog';
import { XeroSyncBadge } from './XeroConnectionButton';

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return <Badge className="bg-green-500">Paid</Badge>;
    case 'partial':
      return <Badge variant="secondary">Partial</Badge>;
    case 'overdue':
      return <Badge variant="destructive">Overdue</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

const getApprovalStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
  }
};

const getInvoiceTypeBadge = (type: string) => {
  if (type === 'freight') {
    return <Badge variant="secondary" className="gap-1"><Truck className="h-3 w-3" />Freight</Badge>;
  }
  return null;
};

interface InvoiceListCardProps {
  purchaseOrderId: string;
  supplierId: string;
  canEdit: boolean;
}

export function InvoiceListCard({
  purchaseOrderId,
  supplierId,
  canEdit,
}: InvoiceListCardProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isFreightCreateOpen, setIsFreightCreateOpen] = useState(false);
  const [costsDialogInvoiceId, setCostsDialogInvoiceId] = useState<string | null>(null);
  const [linkFreightDialogId, setLinkFreightDialogId] = useState<string | null>(null);

  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [landedCostsDialogId, setLandedCostsDialogId] = useState<string | null>(null);

  const { data: invoices, isLoading } = usePOInvoices(purchaseOrderId);
  const { data: xeroConnection } = useXeroConnection();
  const xeroSync = useXeroSyncInvoice();
  const approveInvoice = useApproveInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();

  const materialInvoices = invoices?.filter((i) => i.invoice_type !== 'freight') || [];
  const freightInvoices = invoices?.filter((i) => i.invoice_type === 'freight') || [];

  const totalInvoiced = materialInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalFreight = freightInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = invoices?.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0;

  const handleSyncToXero = async (invoiceId: string) => {
    await xeroSync.mutateAsync(invoiceId);
  };

  const handleApprove = async (invoiceId: string) => {
    await approveInvoice.mutateAsync(invoiceId);
  };

  const handleDelete = async () => {
    if (deleteInvoiceId) {
      await deleteInvoiceMutation.mutateAsync(deleteInvoiceId);
      setDeleteInvoiceId(null);
    }
  };

  const renderInvoiceRow = (invoice: any) => (
    <TableRow key={invoice.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{invoice.invoice_number}</span>
          {getInvoiceTypeBadge(invoice.invoice_type)}
        </div>
      </TableCell>
      <TableCell>
        {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
      </TableCell>
      <TableCell>
        {invoice.due_date
          ? format(new Date(invoice.due_date), 'MMM d, yyyy')
          : '-'}
      </TableCell>
      <TableCell className="text-right font-medium">
        ${Number(invoice.total_amount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {getApprovalStatusBadge(invoice.approval_status || 'pending')}
          {getPaymentStatusBadge(invoice.payment_status || 'pending')}
        </div>
      </TableCell>
      <TableCell>
        <XeroSyncBadge
          syncStatus={invoice.xero_sync_status}
          syncedAt={invoice.xero_synced_at}
          syncError={invoice.xero_sync_error}
        />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewInvoiceId(invoice.id)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => setCostsDialogInvoiceId(invoice.id)}>
              <Calculator className="h-4 w-4 mr-2" />
              Additional Costs
            </DropdownMenuItem>

            {invoice.approval_status === 'approved' && (
              <DropdownMenuItem onClick={() => setLandedCostsDialogId(invoice.id)}>
                <TrendingUp className="h-4 w-4 mr-2" />
                View Landed Costs
              </DropdownMenuItem>
            )}
            
            {invoice.invoice_type !== 'freight' && (
              <DropdownMenuItem onClick={() => setLinkFreightDialogId(invoice.id)}>
                <Link2 className="h-4 w-4 mr-2" />
                Link Freight Invoice
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {invoice.approval_status !== 'approved' && (
              <DropdownMenuItem 
                onClick={() => handleApprove(invoice.id)}
                disabled={approveInvoice.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Calculate Landed Cost
              </DropdownMenuItem>
            )}

            {xeroConnection && (
              <DropdownMenuItem 
                onClick={() => handleSyncToXero(invoice.id)}
                disabled={xeroSync.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {invoice.xero_invoice_id ? 'Resync to Xero' : 'Sync to Xero'}
              </DropdownMenuItem>
            )}

            {canEdit && invoice.approval_status !== 'approved' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setDeleteInvoiceId(invoice.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Invoice
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsFreightCreateOpen(true)}>
                <Truck className="h-4 w-4 mr-1" />
                Add Freight Invoice
              </Button>
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Invoice
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : invoices && invoices.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Xero</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(renderInvoiceRow)}
                </TableBody>
              </Table>

              <div className="flex justify-end gap-6 pt-2 border-t">
                <div className="text-sm">
                  <span className="text-muted-foreground">Materials:</span>{' '}
                  <span className="font-medium">
                    ${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {totalFreight > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Freight:</span>{' '}
                    <span className="font-medium">
                      ${totalFreight.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Paid:</span>{' '}
                  <span className="font-medium text-green-600">
                    ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No invoices yet</p>
              {canEdit && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Button
                    variant="link"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    Add material invoice
                  </Button>
                  <span className="text-muted-foreground">or</span>
                  <Button
                    variant="link"
                    onClick={() => setIsFreightCreateOpen(true)}
                  >
                    Add freight invoice
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        purchaseOrderId={purchaseOrderId}
        supplierId={supplierId}
      />

      <FreightInvoiceFormDialog
        open={isFreightCreateOpen}
        onOpenChange={setIsFreightCreateOpen}
        purchaseOrderId={purchaseOrderId}
      />

      {costsDialogInvoiceId && (
        <AdditionalCostsDialog
          open={!!costsDialogInvoiceId}
          onOpenChange={(open) => !open && setCostsDialogInvoiceId(null)}
          invoiceId={costsDialogInvoiceId}
        />
      )}

      {linkFreightDialogId && (
        <LinkFreightInvoiceDialog
          open={!!linkFreightDialogId}
          onOpenChange={(open) => !open && setLinkFreightDialogId(null)}
          materialInvoiceId={linkFreightDialogId}
          supplierId={supplierId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteInvoiceId} onOpenChange={(open) => !open && setDeleteInvoiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This will also delete all associated line items, additional costs, and landed cost allocations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteInvoiceMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice View Dialog */}
      {viewInvoiceId && (
        <InvoiceViewDialog
          open={!!viewInvoiceId}
          onOpenChange={(open) => !open && setViewInvoiceId(null)}
          invoiceId={viewInvoiceId}
        />
      )}

      {/* Landed Costs Dialog */}
      {landedCostsDialogId && (
        <LandedCostsDialog
          open={!!landedCostsDialogId}
          onOpenChange={(open) => !open && setLandedCostsDialogId(null)}
          invoiceId={landedCostsDialogId}
        />
      )}
    </>
  );
}
