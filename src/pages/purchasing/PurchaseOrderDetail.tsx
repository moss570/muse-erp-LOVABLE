import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Send, 
  CheckCircle, 
  XCircle, 
  Package,
  Pencil,
  Clock,
  Building2,
  MapPin,
  FileText,
  DollarSign,
  AlertTriangle,
  Loader2,
  Printer,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/usePermission';
import { POFormDialog } from '@/components/purchasing/POFormDialog';

const APPROVAL_THRESHOLD = 5000;

const getStatusBadge = (status: string) => {
  const configs: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
    draft: { variant: 'outline', icon: <Pencil className="h-3 w-3" />, label: 'Draft' },
    pending_approval: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'Pending Approval' },
    approved: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Approved' },
    sent: { variant: 'default', icon: <Send className="h-3 w-3" />, label: 'Sent' },
    partially_received: { variant: 'secondary', icon: <Package className="h-3 w-3" />, label: 'Partially Received' },
    received: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Received' },
    cancelled: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Cancelled' },
  };
  const config = configs[status] || configs.draft;
  return (
    <Badge variant={config.variant} className="gap-1 text-sm">
      {config.icon}
      {config.label}
    </Badge>
  );
};

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, checkPermission } = usePermissions();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isSending, setIsSending] = useState(false);

  const canApprove = isAdmin || checkPermission('purchasing.approve', 'full');
  const canEdit = isAdmin || checkPermission('purchasing.orders', 'full');

  // Fetch PO with related data
  const { data: purchaseOrder, isLoading, refetch } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          delivery_location:locations(id, name, location_code),
          created_by_profile:profiles!purchase_orders_created_by_fkey(first_name, last_name),
          approved_by_profile:profiles!purchase_orders_approved_by_fkey(first_name, last_name)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch line items
  const { data: lineItems } = useQuery({
    queryKey: ['po-items-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          material:materials(id, name, code, allergens),
          unit:units_of_measure(id, code, name)
        `)
        .eq('purchase_order_id', id)
        .order('sort_order');
      if (error) throw error;
      
      // Fetch variant codes from material_purchase_units based on unit_id
      const itemsWithVariantCodes = await Promise.all(
        data.map(async (item) => {
          // Look up if there's a purchase unit variant for this material + unit combination
          const { data: purchaseUnit } = await supabase
            .from('material_purchase_units')
            .select('code')
            .eq('material_id', item.material_id)
            .eq('unit_id', item.unit_id)
            .maybeSingle();
          
          return {
            ...item,
            variant_code: purchaseUnit?.code || null,
          };
        })
      );
      
      return itemsWithVariantCodes;
    },
    enabled: !!id,
  });

  // Fetch receiving sessions
  const { data: receivingSessions } = useQuery({
    queryKey: ['po-receiving-sessions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_receiving_sessions')
        .select(`
          *,
          location:locations(name),
          received_by_profile:profiles!po_receiving_sessions_received_by_fkey(first_name, last_name)
        `)
        .eq('purchase_order_id', id)
        .order('received_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Submit for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'pending_approval' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      toast({ title: 'PO submitted for approval' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Approve/Reject mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ action, notes }: { action: 'approve' | 'reject'; notes: string }) => {
      if (action === 'approve') {
        const { error } = await supabase
          .from('purchase_orders')
          .update({ 
            status: 'approved',
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
            approval_notes: notes || null,
          })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('purchase_orders')
          .update({ 
            status: 'draft',
            approval_notes: notes || null,
          })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      toast({ 
        title: variables.action === 'approve' ? 'PO Approved' : 'PO Rejected',
        description: variables.action === 'approve' 
          ? 'The purchase order has been approved and can now be sent.'
          : 'The purchase order has been sent back for revision.'
      });
      setIsApprovalDialogOpen(false);
      setApprovalNotes('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Send to supplier mutation
  const sendToSupplierMutation = useMutation({
    mutationFn: async () => {
      // TODO: Implement email sending via edge function
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_by: user?.id,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      toast({ 
        title: 'PO Sent',
        description: 'The purchase order has been sent to the supplier.'
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error sending PO', description: error.message, variant: 'destructive' });
    },
  });

  const handleApprovalClick = (action: 'approve' | 'reject') => {
    setApprovalAction(action);
    setIsApprovalDialogOpen(true);
  };

  const handleApprovalSubmit = () => {
    approvalMutation.mutate({ action: approvalAction, notes: approvalNotes });
  };

  const handleSendToSupplier = async () => {
    setIsSending(true);
    try {
      await sendToSupplierMutation.mutateAsync();
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Purchase Order Not Found</h2>
        <Button onClick={() => navigate('/purchasing/orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  const canSubmitForApproval = purchaseOrder.status === 'draft' && purchaseOrder.requires_approval;
  const canApproveReject = purchaseOrder.status === 'pending_approval' && canApprove;
  const canSend = (purchaseOrder.status === 'approved' || (purchaseOrder.status === 'draft' && !purchaseOrder.requires_approval)) && canEdit;
  const canReceive = ['sent', 'partially_received'].includes(purchaseOrder.status);
  
  // Print/Download PO as PDF
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Please allow popups to print', variant: 'destructive' });
      return;
    }
    
    const lineItemsHtml = lineItems?.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.material?.name || ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${item.variant_code || item.material?.code || ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.supplier_item_number || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity_ordered}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.unit?.code || ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.unit_cost).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${Number(item.line_total).toFixed(2)}</td>
      </tr>
    `).join('') || '';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${purchaseOrder.po_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { margin-bottom: 5px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .header-left h1 { font-size: 24px; margin: 0; }
          .header-left p { color: #666; margin: 5px 0 0 0; }
          .header-right { text-align: right; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .info-box h3 { font-size: 14px; color: #666; margin: 0 0 10px 0; text-transform: uppercase; }
          .info-box p { margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; }
          th:nth-child(4), th:nth-child(6), th:nth-child(7) { text-align: right; }
          .totals { text-align: right; margin-top: 20px; }
          .totals p { margin: 5px 0; }
          .totals .total { font-size: 18px; font-weight: bold; }
          .notes { margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px; }
          .notes h4 { margin: 0 0 10px 0; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>PURCHASE ORDER</h1>
            <p>${purchaseOrder.po_number}</p>
          </div>
          <div class="header-right">
            <p><strong>Order Date:</strong> ${format(new Date(purchaseOrder.order_date), 'MMM d, yyyy')}</p>
            ${purchaseOrder.expected_delivery_date ? `<p><strong>Expected Delivery:</strong> ${format(new Date(purchaseOrder.expected_delivery_date), 'MMM d, yyyy')}</p>` : ''}
          </div>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>Supplier</h3>
            <p><strong>${purchaseOrder.supplier?.name || ''}</strong></p>
            <p>${purchaseOrder.supplier?.code || ''}</p>
            ${purchaseOrder.supplier?.address ? `<p>${purchaseOrder.supplier.address}</p>` : ''}
            ${purchaseOrder.supplier?.city ? `<p>${purchaseOrder.supplier.city}, ${purchaseOrder.supplier?.state || ''} ${purchaseOrder.supplier?.zip || ''}</p>` : ''}
            ${purchaseOrder.supplier?.phone ? `<p>Phone: ${purchaseOrder.supplier.phone}</p>` : ''}
            ${purchaseOrder.supplier?.email ? `<p>Email: ${purchaseOrder.supplier.email}</p>` : ''}
          </div>
          <div class="info-box">
            <h3>Ship To</h3>
            ${purchaseOrder.delivery_location ? `
              <p><strong>${purchaseOrder.delivery_location.name}</strong></p>
              <p>${purchaseOrder.delivery_location.location_code}</p>
            ` : '<p>Not specified</p>'}
            ${purchaseOrder.shipping_method ? `<p><strong>Method:</strong> ${purchaseOrder.shipping_method}</p>` : ''}
            ${purchaseOrder.shipping_terms ? `<p><strong>Terms:</strong> ${purchaseOrder.shipping_terms}</p>` : ''}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Code</th>
              <th>Supplier Item #</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Unit Cost</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>
        
        <div class="totals">
          <p><strong>Subtotal:</strong> $${Number(purchaseOrder.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          ${purchaseOrder.shipping_amount ? `<p><strong>Shipping:</strong> $${Number(purchaseOrder.shipping_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>` : ''}
          ${purchaseOrder.tax_amount ? `<p><strong>Tax:</strong> $${Number(purchaseOrder.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>` : ''}
          <p class="total"><strong>Total:</strong> $${Number(purchaseOrder.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        
        ${purchaseOrder.notes ? `
          <div class="notes">
            <h4>Notes</h4>
            <p>${purchaseOrder.notes}</p>
          </div>
        ` : ''}
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchasing/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{purchaseOrder.po_number}</h1>
              {getStatusBadge(purchaseOrder.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {format(new Date(purchaseOrder.created_at), 'MMM d, yyyy')}
              {purchaseOrder.created_by_profile && (
                <> by {purchaseOrder.created_by_profile.first_name} {purchaseOrder.created_by_profile.last_name}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {purchaseOrder.status === 'draft' && canEdit && (
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          
          {canSubmitForApproval && (
            <Button onClick={() => submitForApprovalMutation.mutate()}>
              <Clock className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
          
          {canApproveReject && (
            <>
              <Button variant="outline" onClick={() => handleApprovalClick('reject')}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={() => handleApprovalClick('approve')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          )}
          
          {canSend && (
            <Button onClick={handleSendToSupplier} disabled={isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send to Supplier
            </Button>
          )}
          
          {canReceive && (
            <Button onClick={() => navigate(`/purchasing/receiving/new?po=${purchaseOrder.id}`)}>
              <Package className="h-4 w-4 mr-2" />
              Receive Items
            </Button>
          )}
          
          {/* Print/Download Button - always available */}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Approval Warning */}
      {purchaseOrder.requires_approval && !purchaseOrder.approved_at && purchaseOrder.status !== 'pending_approval' && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5" />
          <span>
            This PO exceeds ${APPROVAL_THRESHOLD.toLocaleString()} and requires approval before sending.
          </span>
        </div>
      )}

      {/* Approved Badge */}
      {purchaseOrder.approved_at && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200">
          <CheckCircle className="h-5 w-5" />
          <span>
            Approved on {format(new Date(purchaseOrder.approved_at), 'MMM d, yyyy')}
            {purchaseOrder.approved_by_profile && (
              <> by {purchaseOrder.approved_by_profile.first_name} {purchaseOrder.approved_by_profile.last_name}</>
            )}
          </span>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Supplier Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{purchaseOrder.supplier?.name}</p>
            <p className="text-sm text-muted-foreground">{purchaseOrder.supplier?.code}</p>
            {purchaseOrder.supplier?.email && (
              <p className="text-sm">{purchaseOrder.supplier.email}</p>
            )}
            {purchaseOrder.supplier?.phone && (
              <p className="text-sm">{purchaseOrder.supplier.phone}</p>
            )}
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium">
                {purchaseOrder.delivery_location?.name || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expected Date</p>
              <p className="font-medium">
                {purchaseOrder.expected_delivery_date 
                  ? format(new Date(purchaseOrder.expected_delivery_date), 'MMM d, yyyy')
                  : 'Not specified'
                }
              </p>
            </div>
            {purchaseOrder.shipping_terms && (
              <div>
                <p className="text-xs text-muted-foreground">Terms</p>
                <p className="font-medium uppercase">{purchaseOrder.shipping_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Order Total
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${Number(purchaseOrder.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            {purchaseOrder.tax_amount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>${Number(purchaseOrder.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {purchaseOrder.shipping_amount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>${Number(purchaseOrder.shipping_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${Number(purchaseOrder.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Line Items
          </CardTitle>
          <CardDescription>
            {lineItems?.length || 0} items on this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Supplier Item #</TableHead>
                <TableHead className="text-right">Qty Ordered</TableHead>
                <TableHead className="text-right">Qty Received</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.material?.name}</p>
                      {item.material?.allergens && item.material.allergens.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.material.allergens.map((a: string) => (
                            <Badge key={a} variant="destructive" className="text-xs">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.variant_code || item.material?.code}</TableCell>
                  <TableCell className="text-muted-foreground">{item.supplier_item_number || '-'}</TableCell>
                  <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                  <TableCell className="text-right">
                    <span className={item.quantity_received >= item.quantity_ordered ? 'text-green-600' : ''}>
                      {item.quantity_received}
                    </span>
                  </TableCell>
                  <TableCell>{item.unit?.code}</TableCell>
                  <TableCell className="text-right">
                    ${Number(item.unit_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(item.line_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Receiving History */}
      {receivingSessions && receivingSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Receiving History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receiving #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivingSessions.map((session) => (
                  <TableRow 
                    key={session.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/purchasing/receiving/${session.id}`)}
                  >
                    <TableCell className="font-mono">{session.receiving_number}</TableCell>
                    <TableCell>{format(new Date(session.received_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{session.location?.name || '-'}</TableCell>
                    <TableCell>
                      {session.received_by_profile 
                        ? `${session.received_by_profile.first_name} ${session.received_by_profile.last_name}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                        {session.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {(purchaseOrder.notes || purchaseOrder.internal_notes) && (
        <div className="grid grid-cols-2 gap-4">
          {purchaseOrder.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes to Supplier</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{purchaseOrder.notes}</p>
              </CardContent>
            </Card>
          )}
          {purchaseOrder.internal_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{purchaseOrder.internal_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <POFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        purchaseOrder={purchaseOrder}
      />

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve Purchase Order' : 'Reject Purchase Order'}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'approve'
                ? 'This will approve the PO and allow it to be sent to the supplier.'
                : 'This will send the PO back to draft status for revision.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder={approvalAction === 'approve' ? 'Approval notes...' : 'Reason for rejection...'}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprovalSubmit}
              variant={approvalAction === 'reject' ? 'destructive' : 'default'}
            >
              {approvalAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
