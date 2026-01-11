import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateInvoice } from '@/hooks/useInvoices';

const formSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  invoice_date: z.date(),
  due_date: z.date().optional(),
  tax_amount: z.coerce.number().min(0).optional(),
  freight_amount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId: string;
  supplierId: string;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  purchaseOrderId,
  supplierId,
}: InvoiceFormDialogProps) {
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [itemCosts, setItemCosts] = useState<Record<string, number>>({});

  const createInvoice = useCreateInvoice();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoice_number: '',
      invoice_date: new Date(),
      tax_amount: 0,
      freight_amount: 0,
      notes: '',
    },
  });

  // Fetch PO items with receiving info
  const { data: poItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['po-items-for-invoice', purchaseOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          material:materials(id, name, code),
          unit:units_of_measure(id, code, name),
          receiving_items:po_receiving_items(
            id,
            internal_lot_number,
            quantity_received,
            receiving_lot_id
          )
        `)
        .eq('purchase_order_id', purchaseOrderId)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: open && !!purchaseOrderId,
  });

  // Fetch already invoiced quantities for each PO item
  const { data: invoicedItems } = useQuery({
    queryKey: ['invoiced-quantities', purchaseOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select(`
          po_item_id,
          quantity,
          invoice:purchase_order_invoices!inner(purchase_order_id)
        `)
        .eq('invoice.purchase_order_id', purchaseOrderId);
      if (error) throw error;
      
      // Sum up invoiced quantities per PO item
      const invoicedQty: Record<string, number> = {};
      data?.forEach((item) => {
        if (item.po_item_id) {
          invoicedQty[item.po_item_id] = (invoicedQty[item.po_item_id] || 0) + item.quantity;
        }
      });
      return invoicedQty;
    },
    enabled: open && !!purchaseOrderId,
  });

  // Calculate available quantities (received - already invoiced)
  const getAvailableQty = (item: NonNullable<typeof poItems>[0]) => {
    const received = item.quantity_received || 0;
    const alreadyInvoiced = invoicedItems?.[item.id] || 0;
    return Math.max(0, received - alreadyInvoiced);
  };

  // Filter to only show items with available quantity to invoice
  const invoiceableItems = poItems?.filter((item) => getAvailableQty(item) > 0);

  // Initialize quantities and costs from available items
  useEffect(() => {
    if (invoiceableItems) {
      const quantities: Record<string, number> = {};
      const costs: Record<string, number> = {};
      invoiceableItems.forEach((item) => {
        quantities[item.id] = getAvailableQty(item);
        costs[item.id] = item.unit_cost;
      });
      setItemQuantities(quantities);
      setItemCosts(costs);
    }
  }, [invoiceableItems, invoicedItems]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const selectedPoItems = invoiceableItems?.filter((item) => selectedItems[item.id]) || [];

    if (selectedPoItems.length === 0) {
      return;
    }

    const lineItems = selectedPoItems.map((item) => {
      // Get the first receiving item with a lot for tracking
      const receivingItem = item.receiving_items?.find((ri: { receiving_lot_id: string | null }) => ri.receiving_lot_id);

      return {
        po_item_id: item.id,
        receiving_item_id: receivingItem?.id,
        material_id: item.material_id,
        description: item.material?.name || 'Unknown',
        quantity: itemQuantities[item.id] || item.quantity_received || item.quantity_ordered,
        unit_cost: itemCosts[item.id] || item.unit_cost,
      };
    });

    await createInvoice.mutateAsync({
      purchase_order_id: purchaseOrderId,
      supplier_id: supplierId,
      invoice_number: values.invoice_number,
      invoice_date: format(values.invoice_date, 'yyyy-MM-dd'),
      due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : undefined,
      tax_amount: values.tax_amount,
      freight_amount: values.freight_amount,
      invoice_type: 'material',
      notes: values.notes,
      line_items: lineItems,
    });

    onOpenChange(false);
    form.reset();
    setSelectedItems({});
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const selectAll = () => {
    if (invoiceableItems) {
      const allSelected: Record<string, boolean> = {};
      invoiceableItems.forEach((item) => {
        allSelected[item.id] = true;
      });
      setSelectedItems(allSelected);
    }
  };

  const calculateSubtotal = () => {
    if (!invoiceableItems) return 0;
    return invoiceableItems
      .filter((item) => selectedItems[item.id])
      .reduce((sum, item) => {
        const qty = itemQuantities[item.id] || getAvailableQty(item);
        const cost = itemCosts[item.id] || item.unit_cost;
        return sum + qty * cost;
      }, 0);
  };

  const subtotal = calculateSubtotal();
  const taxValue = form.watch('tax_amount');
  const freightValue = form.watch('freight_amount');
  const tax = typeof taxValue === 'number' ? taxValue : (parseFloat(String(taxValue)) || 0);
  const freight = typeof freightValue === 'number' ? freightValue : (parseFloat(String(freightValue)) || 0);
  const total = subtotal + tax + freight;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Invoice Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="invoice_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="INV-001" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoice_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? format(field.value, 'MMM d, yyyy') : 'Select date'}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? format(field.value, 'MMM d, yyyy') : 'Select date'}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tax_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="freight_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Freight Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  For 3rd party freight invoices, create them separately and link them after the material invoice is created.
                </p>

                {/* Line Items Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-base">Line Items</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                  </div>

                  {itemsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Material</TableHead>
                            <TableHead>Received Qty</TableHead>
                            <TableHead>Invoice Qty</TableHead>
                            <TableHead>Unit Cost</TableHead>
                            <TableHead className="text-right">Line Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(!invoiceableItems || invoiceableItems.length === 0) ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No items available to invoice. Items must be received first, and cannot be invoiced more than once.
                              </TableCell>
                            </TableRow>
                          ) : (
                            invoiceableItems.map((item) => {
                              const availableQty = getAvailableQty(item);
                              const qty = itemQuantities[item.id] || availableQty;
                              const cost = itemCosts[item.id] || item.unit_cost;
                              const alreadyInvoiced = invoicedItems?.[item.id] || 0;
                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedItems[item.id] || false}
                                      onCheckedChange={() => toggleItem(item.id)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{item.material?.name}</div>
                                      <div className="text-xs text-muted-foreground font-mono">
                                        {item.material?.code}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div>{item.quantity_received} / {item.quantity_ordered} {item.unit?.code}</div>
                                      {alreadyInvoiced > 0 && (
                                        <div className="text-xs text-orange-600">
                                          {alreadyInvoiced} already invoiced
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="w-24"
                                      value={qty}
                                      max={availableQty}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        // Don't allow more than available qty
                                        const clampedValue = Math.min(value, availableQty);
                                        setItemQuantities((prev) => ({
                                          ...prev,
                                          [item.id]: clampedValue,
                                        }));
                                      }}
                                      disabled={!selectedItems[item.id]}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="w-24"
                                      value={cost}
                                      onChange={(e) =>
                                        setItemCosts((prev) => ({
                                          ...prev,
                                          [item.id]: parseFloat(e.target.value) || 0,
                                        }))
                                      }
                                      disabled={!selectedItems[item.id]}
                                    />
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    ${(qty * cost).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Freight:</span>
                    <span>${freight.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createInvoice.isPending ||
                  Object.values(selectedItems).filter(Boolean).length === 0
                }
              >
                {createInvoice.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Invoice'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
