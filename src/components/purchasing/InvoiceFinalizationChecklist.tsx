import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Circle,
  Lock,
  Loader2,
  Package,
  Truck,
  DollarSign,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';

interface InvoiceFinalizationChecklistProps {
  invoice: {
    id: string;
    invoice_number: string;
    finalization_status?: string;
    receiving_complete?: boolean;
    freight_complete?: boolean;
    financials_complete?: boolean;
    approval_status?: string;
    closed_at?: string;
  };
  lineItems?: Array<{
    id: string;
    receiving_item_id?: string | null;
    quantity: number;
  }>;
  hasLinkedFreight?: boolean;
  freightAmount?: number;
  onClose?: () => void;
}

export function InvoiceFinalizationChecklist({
  invoice,
  lineItems = [],
  hasLinkedFreight = false,
  freightAmount = 0,
  onClose,
}: InvoiceFinalizationChecklistProps) {
  const queryClient = useQueryClient();
  const [confirmClose, setConfirmClose] = useState(false);

  // Calculate checklist status
  const allItemsReceived = lineItems.every(item => item.receiving_item_id);
  const hasFreight = freightAmount > 0 || hasLinkedFreight;
  const isApproved = invoice.approval_status === 'approved';
  const isClosed = invoice.finalization_status === 'closed';

  // Manual overrides for freight and financials
  const [freightComplete, setFreightComplete] = useState(invoice.freight_complete ?? hasFreight);
  const [financialsComplete, setFinancialsComplete] = useState(invoice.financials_complete ?? false);

  // Check if ready to close
  const canClose = allItemsReceived && freightComplete && financialsComplete && isApproved && !isClosed;

  // Update finalization flags mutation
  const updateFlagsMutation = useMutation({
    mutationFn: async (flags: { receiving_complete?: boolean; freight_complete?: boolean; financials_complete?: boolean }) => {
      const { error } = await supabase
        .from('purchase_order_invoices')
        .update(flags)
        .eq('id', invoice.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['po-invoices'] });
    },
  });

  // Close invoice mutation
  const closeInvoiceMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update invoice to closed
      const { error: invoiceError } = await supabase
        .from('purchase_order_invoices')
        .update({
          finalization_status: 'closed',
          receiving_complete: true,
          freight_complete: freightComplete,
          financials_complete: financialsComplete,
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
        })
        .eq('id', invoice.id);
      
      if (invoiceError) throw invoiceError;

      // Lock receiving lot costs
      const { error: lotError } = await supabase
        .from('receiving_lots')
        .update({ cost_finalized: true })
        .in('id', (
          await supabase
            .from('invoice_line_items')
            .select('receiving_item_id')
            .eq('invoice_id', invoice.id)
            .not('receiving_item_id', 'is', null)
        ).data?.map(item => item.receiving_item_id) || []);

      // Don't throw on lot error, just log it
      if (lotError) {
        console.warn('Could not finalize lot costs:', lotError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['po-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['receiving-lots'] });
      toast.success('Invoice closed successfully', {
        description: 'Inventory costs have been locked.',
      });
      onClose?.();
    },
    onError: (error: Error) => {
      toast.error('Failed to close invoice', {
        description: error.message,
      });
    },
  });

  const handleFreightComplete = (checked: boolean) => {
    setFreightComplete(checked);
    updateFlagsMutation.mutate({ freight_complete: checked });
  };

  const handleFinancialsComplete = (checked: boolean) => {
    setFinancialsComplete(checked);
    updateFlagsMutation.mutate({ financials_complete: checked });
  };

  const handleCloseInvoice = () => {
    closeInvoiceMutation.mutate();
    setConfirmClose(false);
  };

  if (isClosed) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Lock className="h-5 w-5" />
            Invoice Closed
          </CardTitle>
          <CardDescription>
            This invoice was finalized on {invoice.closed_at ? new Date(invoice.closed_at).toLocaleDateString() : 'N/A'}. 
            Inventory costs are locked.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Finalization Checklist
        </CardTitle>
        <CardDescription>
          Complete all items before closing the invoice to lock inventory costs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Checklist Items */}
        <div className="space-y-3">
          {/* 1. All items received */}
          <div className="flex items-start gap-3">
            {allItemsReceived ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">All Items Received</span>
                {allItemsReceived ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">Complete</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    {lineItems.filter(i => i.receiving_item_id).length}/{lineItems.length} linked
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                All invoice line items must be linked to receiving records.
              </p>
            </div>
          </div>

          <Separator />

          {/* 2. Freight complete */}
          <div className="flex items-start gap-3">
            {freightComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Freight Complete</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {hasFreight ? 'Freight costs have been entered.' : 'Confirm no freight is expected, or enter freight amount.'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="freight-complete"
                  checked={freightComplete}
                  onCheckedChange={(checked) => handleFreightComplete(!!checked)}
                />
                <Label htmlFor="freight-complete" className="text-sm">
                  {hasFreight ? 'Freight is final' : 'No freight for this invoice'}
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* 3. Financials complete */}
          <div className="flex items-start gap-3">
            {financialsComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Financials Complete</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                All costs, taxes, and adjustments have been entered.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="financials-complete"
                  checked={financialsComplete}
                  onCheckedChange={(checked) => handleFinancialsComplete(!!checked)}
                />
                <Label htmlFor="financials-complete" className="text-sm">
                  All financial details are final
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* 4. Invoice approved */}
          <div className="flex items-start gap-3">
            {isApproved ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Invoice Approved</span>
                {isApproved ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-600">Pending</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Invoice must be approved before closing.
              </p>
            </div>
          </div>
        </div>

        {/* Close Invoice Button */}
        <div className="pt-4 border-t">
          {!canClose && (
            <div className="flex items-center gap-2 text-sm text-amber-600 mb-3">
              <AlertTriangle className="h-4 w-4" />
              <span>Complete all checklist items to close the invoice.</span>
            </div>
          )}
          
          <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full"
                disabled={!canClose || closeInvoiceMutation.isPending}
              >
                {closeInvoiceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Close Invoice
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Close Invoice?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will finalize the invoice and lock all associated inventory costs. 
                  The landed cost per unit will be frozen and used for manufacturing consumption.
                  <br /><br />
                  <strong>This action cannot be undone.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloseInvoice}>
                  Close Invoice
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}