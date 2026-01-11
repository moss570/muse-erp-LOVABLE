import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, CheckCircle, Clock, Truck } from 'lucide-react';
import { useInvoice, useInvoiceLineItems, useAdditionalCosts } from '@/hooks/useInvoices';

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

interface InvoiceViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}

export function InvoiceViewDialog({
  open,
  onOpenChange,
  invoiceId,
}: InvoiceViewDialogProps) {
  const { data: invoice, isLoading: invoiceLoading } = useInvoice(invoiceId);
  const { data: lineItems, isLoading: itemsLoading } = useInvoiceLineItems(invoiceId);
  const { data: additionalCosts } = useAdditionalCosts(invoiceId);

  const isLoading = invoiceLoading || itemsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Invoice Details
            {invoice?.invoice_type === 'freight' && (
              <Badge variant="secondary" className="gap-1">
                <Truck className="h-3 w-3" />
                Freight
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : invoice ? (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Invoice Number</div>
                  <div className="font-medium">{invoice.invoice_number}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Supplier</div>
                  <div className="font-medium">{invoice.supplier?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Invoice Date</div>
                  <div className="font-medium">
                    {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div className="font-medium">
                    {invoice.due_date
                      ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                      : '-'}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Approval Status</div>
                  {getApprovalStatusBadge(invoice.approval_status || 'pending')}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Payment Status</div>
                  {getPaymentStatusBadge(invoice.payment_status || 'pending')}
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Line Items</div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.description}</div>
                              {item.material && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  {item.material.code}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            ${Number(item.unit_cost).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${Number(item.line_total || item.quantity * item.unit_cost).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!lineItems || lineItems.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                            No line items
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Additional Costs */}
              {additionalCosts && additionalCosts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Additional Costs</div>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {additionalCosts.map((cost) => (
                          <TableRow key={cost.id}>
                            <TableCell className="capitalize">{cost.cost_type}</TableCell>
                            <TableCell>{cost.description || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${Number(cost.amount).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">
                    ${Number(invoice.subtotal).toFixed(2)}
                  </span>
                </div>
                {invoice.freight_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Freight:</span>
                    <span>${Number(invoice.freight_amount).toFixed(2)}</span>
                  </div>
                )}
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>${Number(invoice.tax_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${Number(invoice.total_amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Notes</div>
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {invoice.notes}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Invoice not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}