import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, DollarSign, Mail, Printer, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function InvoicingTab({ order }: { order: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isGenerateInvoiceOpen, setIsGenerateInvoiceOpen] = useState(false);

  // Fetch shipments for this order
  const { data: shipments } = useQuery({
    queryKey: ['sales-shipments', order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_shipments')
        .select(`
          *,
          items:sales_shipment_items(
            *,
            order_item:sales_order_items(
              *,
              product:products(id, name, sku, unit_price)
            )
          )
        `)
        .eq('sales_order_id', order.id)
        .order('ship_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!order.id
  });

  // Fetch invoices for this order
  const { data: invoices } = useQuery({
    queryKey: ['sales-invoices-for-order', order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select(`
          *,
          shipment:sales_shipments(id, shipment_number, ship_date),
          items:sales_invoice_items(
            *,
            product:products(id, name, sku)
          )
        `)
        .eq('sales_order_id', order.id)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!order.id
  });

  // Get un-invoiced shipments
  const uninvoicedShipments = shipments?.filter(s =>
    !invoices?.some(inv => inv.shipment_id === s.id)
  ) || [];

  // Generate invoice from shipment
  const generateInvoiceMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const shipment = shipments?.find(s => s.id === shipmentId);
      if (!shipment) throw new Error('Shipment not found');

      // Generate invoice number
      const { data: invoiceNumber } = await supabase
        .rpc('generate_invoice_number');

      // Calculate invoice totals
      let subtotal = 0;
      const invoiceItems = [];

      for (const item of shipment.items) {
        const lineTotal = item.quantity_shipped * item.order_item.unit_price;
        subtotal += lineTotal;

        invoiceItems.push({
          product_id: item.order_item.product_id,
          quantity: item.quantity_shipped,
          unit_price: item.order_item.unit_price,
          line_total: lineTotal
        });
      }

      // Calculate tax
      const taxAmount = subtotal * (order.tax_rate || 0);
      const total = subtotal + taxAmount + (shipment.freight_cost || 0);

      // Determine invoice due date
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      const paymentTerms = order.customers?.payment_terms || 30;
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      // Get master company for billing
      const { data: masterCompanyId } = await supabase
        .rpc('get_master_company', { p_customer_id: order.customer_id });

      // Create invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('sales_invoices')
        .insert({
          invoice_number: invoiceNumber,
          invoice_type: 'invoice',
          sales_order_id: order.id,
          shipment_id: shipmentId,
          customer_id: order.customer_id,
          master_company_id: masterCompanyId || order.customer_id,
          invoice_date: invoiceDate.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          subtotal: subtotal,
          tax_amount: taxAmount,
          freight_amount: shipment.freight_cost || 0,
          total_amount: total,
          balance_due: total,
          payment_status: 'unpaid',
          created_by: userId
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const itemsData = invoiceItems.map(item => ({
        ...item,
        invoice_id: newInvoice.id
      }));

      const { error: itemsError } = await supabase
        .from('sales_invoice_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      // Update sales order items quantity_invoiced
      for (const item of shipment.items) {
        const orderItem = order.sales_order_items.find((oi: any) => oi.id === item.sales_order_item_id);
        if (!orderItem) continue;

        await supabase
          .from('sales_order_items')
          .update({
            quantity_invoiced: (orderItem.quantity_invoiced || 0) + item.quantity_shipped
          })
          .eq('id', item.sales_order_item_id);
      }

      // Update order status
      const allInvoiced = order.sales_order_items.every((item: any) => {
        const invoicedQty = (item.quantity_invoiced || 0) +
          (shipment.items.find((si: any) => si.sales_order_item_id === item.id)?.quantity_shipped || 0);
        return invoicedQty >= item.quantity_shipped;
      });

      await supabase
        .from('sales_orders')
        .update({
          status: allInvoiced ? 'invoiced' : 'partially_invoiced'
        })
        .eq('id', order.id);

      return newInvoice;
    },
    onSuccess: (invoice) => {
      toast({
        title: 'Invoice generated',
        description: `Invoice ${invoice.invoice_number} created successfully`
      });
      setIsGenerateInvoiceOpen(false);
      queryClient.invalidateQueries({ queryKey: ['sales-invoices-for-order'] });
      queryClient.invalidateQueries({ queryKey: ['sales-order'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error generating invoice',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Email invoice (placeholder - would call edge function)
  const emailInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      // Call edge function to send email
      await supabase.functions.invoke('send-invoice-email', {
        body: { invoice_id: invoiceId }
      });

      // Record email sent
      await supabase.rpc('record_invoice_email', {
        p_invoice_id: invoiceId,
        p_email_to: order.customers?.email || 'customer@example.com'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Invoice emailed',
        description: 'Invoice sent to customer successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['sales-invoices-for-order'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Email sending in development',
        description: 'Edge function will handle email sending',
        variant: 'default'
      });
    }
  });

  // Print invoice (placeholder)
  const printInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      // Record print
      await supabase.rpc('record_invoice_print', {
        p_invoice_id: invoiceId
      });

      // In production, would generate PDF and trigger print
      toast({
        title: 'Print queued',
        description: 'PDF generation in development'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoices-for-order'] });
    }
  });

  if (!order) return null;

  const canInvoice = ['shipped', 'partially_shipped', 'invoicing', 'partially_invoiced', 'invoiced'].includes(order.status);

  return (
    <div className="space-y-6">
      {!canInvoice ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Invoicing Not Available</h3>
              <p className="text-muted-foreground">
                Order must have shipped items before invoices can be generated
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Generate Invoice from Uninvoiced Shipments */}
          {uninvoicedShipments.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-blue-900">Uninvoiced Shipments</CardTitle>
                    <CardDescription className="text-blue-700">
                      Generate invoices for shipped items
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uninvoicedShipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="flex items-center justify-between bg-white rounded-lg p-4 border"
                    >
                      <div>
                        <p className="font-medium">{shipment.shipment_number}</p>
                        <p className="text-sm text-muted-foreground">
                          Shipped: {format(new Date(shipment.ship_date), 'PP')} • {shipment.total_cases} cases
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => generateInvoiceMutation.mutate(shipment.id)}
                        disabled={generateInvoiceMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Generate Invoice
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                View and manage invoices for this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoices && invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice: any) => (
                    <Card key={invoice.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {invoice.invoice_number}
                            </CardTitle>
                            <CardDescription>
                              Date: {format(new Date(invoice.invoice_date), 'PP')} •
                              Due: {format(new Date(invoice.due_date), 'PP')}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              invoice.payment_status === 'paid' ? 'default' :
                              invoice.payment_status === 'partially_paid' ? 'secondary' :
                              new Date(invoice.due_date) < new Date() ? 'destructive' :
                              'outline'
                            }>
                              {invoice.payment_status === 'paid' ? 'Paid' :
                               invoice.payment_status === 'partially_paid' ? 'Partial' :
                               new Date(invoice.due_date) < new Date() ? 'Overdue' :
                               'Unpaid'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Subtotal</p>
                            <p className="font-medium">${invoice.subtotal?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Tax</p>
                            <p className="font-medium">${invoice.tax_amount?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="font-medium text-lg">${invoice.total_amount?.toFixed(2) || '0.00'}</p>
                          </div>
                          {invoice.balance_due > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground">Balance Due</p>
                              <p className="font-medium text-red-600">${invoice.balance_due?.toFixed(2) || '0.00'}</p>
                            </div>
                          )}
                          {invoice.freight_amount > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground">Freight</p>
                              <p className="font-medium">${invoice.freight_amount?.toFixed(2) || '0.00'}</p>
                            </div>
                          )}
                        </div>

                        {/* Invoice Items */}
                        {invoice.items && invoice.items.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoice.items.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <div className="font-medium">{item.product.name}</div>
                                    <div className="text-sm text-muted-foreground">{item.product.sku}</div>
                                  </TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">${item.unit_price?.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">${item.line_total?.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        {/* Invoice Actions */}
                        <div className="flex gap-2 mt-4 pt-4 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => emailInvoiceMutation.mutate(invoice.id)}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => printInvoiceMutation.mutate(invoice.id)}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/sales/invoices`)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          {invoice.payment_status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="default"
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Record Payment
                            </Button>
                          )}
                        </div>

                        {/* Email/Print History */}
                        {(invoice.emailed_at || invoice.last_printed_at) && (
                          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground space-y-1">
                            {invoice.emailed_at && (
                              <p>
                                ✓ Emailed {invoice.email_sent_count} time(s), last on {format(new Date(invoice.emailed_at), 'PPp')}
                              </p>
                            )}
                            {invoice.last_printed_at && (
                              <p>
                                ✓ Printed {invoice.print_count} time(s), last on {format(new Date(invoice.last_printed_at), 'PPp')}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No invoices generated yet</p>
                  <p className="text-sm">Generate invoices from shipped items</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items Invoicing Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoicing Status by Item</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Shipped</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.sales_order_items?.map((item: any) => {
                    const invoiced = item.quantity_invoiced || 0;
                    const remaining = item.quantity_shipped - invoiced;
                    const isComplete = remaining <= 0;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.products.name}</div>
                          <div className="text-sm text-muted-foreground">{item.products.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                        <TableCell className="text-right">{item.quantity_shipped}</TableCell>
                        <TableCell className="text-right">{invoiced}</TableCell>
                        <TableCell className="text-right font-medium">{remaining}</TableCell>
                        <TableCell className="text-center">
                          {isComplete ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
