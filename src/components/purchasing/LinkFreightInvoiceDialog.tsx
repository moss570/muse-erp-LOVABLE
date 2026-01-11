import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Link2, Truck, Unlink } from 'lucide-react';
import { useAvailableFreightInvoices, useLinkedFreightInvoices, useLinkFreightInvoice } from '@/hooks/useInvoices';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LinkFreightInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialInvoiceId: string;
  supplierId?: string;
}

export function LinkFreightInvoiceDialog({
  open,
  onOpenChange,
  materialInvoiceId,
  supplierId,
}: LinkFreightInvoiceDialogProps) {
  const [selectedFreightId, setSelectedFreightId] = useState<string | null>(null);
  const [allocationAmount, setAllocationAmount] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: freightInvoices, isLoading: loadingAvailable } = useAvailableFreightInvoices(supplierId);
  const { data: linkedInvoices, isLoading: loadingLinked } = useLinkedFreightInvoices(materialInvoiceId);
  const linkFreightInvoice = useLinkFreightInvoice();

  const unlinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('invoice_freight_links')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-freight-links', materialInvoiceId] });
      toast.success('Freight invoice unlinked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlink: ${error.message}`);
    },
  });

  const linkedIds = new Set(linkedInvoices?.map((l) => l.freight_invoice_id) || []);
  const availableToLink = freightInvoices?.filter((f) => !linkedIds.has(f.id)) || [];

  const handleLink = async () => {
    if (!selectedFreightId) return;

    await linkFreightInvoice.mutateAsync({
      materialInvoiceId,
      freightInvoiceId: selectedFreightId,
      allocationAmount: allocationAmount ? parseFloat(allocationAmount) : undefined,
    });

    setSelectedFreightId(null);
    setAllocationAmount('');
  };

  const totalLinkedFreight = linkedInvoices?.reduce((sum, link) => {
    const amount = link.allocation_amount || link.freight_invoice?.total_amount || 0;
    return sum + Number(amount);
  }, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Freight Invoices
          </DialogTitle>
          <DialogDescription>
            Link 3rd party freight invoices to this material invoice for landed cost calculation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Currently Linked */}
          <div>
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Linked Freight Invoices
              {totalLinkedFreight > 0 && (
                <Badge variant="secondary">
                  Total: ${totalLinkedFreight.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Badge>
              )}
            </h3>

            {loadingLinked ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : linkedInvoices && linkedInvoices.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedInvoices.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell className="font-medium">
                          {link.freight_invoice?.invoice_number}
                        </TableCell>
                        <TableCell>{link.freight_invoice?.supplier?.name}</TableCell>
                        <TableCell>
                          {link.freight_invoice?.invoice_date &&
                            format(new Date(link.freight_invoice.invoice_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(link.allocation_amount || link.freight_invoice?.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unlinkMutation.mutate(link.id)}
                            disabled={unlinkMutation.isPending}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No freight invoices linked yet.</p>
            )}
          </div>

          {/* Available to Link */}
          <div>
            <h3 className="font-medium mb-2">Available Freight Invoices</h3>

            {loadingAvailable ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : availableToLink.length > 0 ? (
              <ScrollArea className="h-48 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableToLink.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className={selectedFreightId === invoice.id ? 'bg-muted' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedFreightId === invoice.id}
                            onCheckedChange={(checked) =>
                              setSelectedFreightId(checked ? invoice.id : null)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.supplier?.name}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No freight invoices available. Create a freight invoice first.
              </p>
            )}

            {selectedFreightId && (
              <div className="flex items-end gap-4 mt-4 p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="allocation">Allocation Amount (optional)</Label>
                  <Input
                    id="allocation"
                    type="number"
                    step="0.01"
                    placeholder="Leave blank to use full amount"
                    value={allocationAmount}
                    onChange={(e) => setAllocationAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Specify a portion of the freight invoice to allocate to this material invoice
                  </p>
                </div>
                <Button onClick={handleLink} disabled={linkFreightInvoice.isPending}>
                  {linkFreightInvoice.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Link
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
