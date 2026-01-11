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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calculator, Package, TrendingUp, DollarSign, Truck, Receipt, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  useInvoice, 
  useInvoiceLineItems, 
  useAdditionalCosts, 
  useLandedCostAllocations,
  useCalculateLandedCosts,
  COST_TYPES,
  ALLOCATION_METHODS 
} from '@/hooks/useInvoices';

interface LandedCostsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}

export function LandedCostsDialog({
  open,
  onOpenChange,
  invoiceId,
}: LandedCostsDialogProps) {
  const { data: invoice, isLoading: invoiceLoading } = useInvoice(invoiceId);
  const { data: lineItems, isLoading: itemsLoading } = useInvoiceLineItems(invoiceId);
  const { data: additionalCosts } = useAdditionalCosts(invoiceId);
  const { data: allocations, isLoading: allocationsLoading } = useLandedCostAllocations(invoiceId);
  const recalculate = useCalculateLandedCosts();

  const isLoading = invoiceLoading || itemsLoading || allocationsLoading;

  const totalMaterialCost = lineItems?.reduce((sum, item) => sum + (item.line_total || item.quantity * item.unit_cost), 0) || 0;
  const taxAmount = Number(invoice?.tax_amount) || 0;
  const freightAmount = Number(invoice?.freight_amount) || 0;
  const otherCosts = additionalCosts?.reduce((sum, c) => sum + c.amount, 0) || 0;
  const totalCostsToAllocate = taxAmount + freightAmount + otherCosts;
  const totalLandedCost = allocations?.reduce((sum, a) => sum + a.total_landed_cost, 0) || (totalMaterialCost + totalCostsToAllocate);

  const handleRecalculate = () => {
    recalculate.mutate(invoiceId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Landed Cost Calculation
              {invoice && (
                <Badge variant="outline" className="ml-2">
                  Invoice #{invoice.invoice_number}
                </Badge>
              )}
            </DialogTitle>
            {invoice?.approval_status === 'approved' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRecalculate}
                disabled={recalculate.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? 'animate-spin' : ''}`} />
                Recalculate
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : invoice ? (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Material Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${totalMaterialCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Freight
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${freightAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Tax + Other
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${(taxAmount + otherCosts).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Total Landed Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      ${totalLandedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Step 1: Invoice Line Items */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                  Material Purchases
                </h3>
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
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={3} className="font-medium">Subtotal</TableCell>
                        <TableCell className="text-right font-bold">
                          ${totalMaterialCost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Step 2: Costs to Allocate */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                  Costs to Allocate
                </h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cost Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {freightAmount > 0 && (
                        <TableRow>
                          <TableCell>
                            <Badge variant="secondary">Freight</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            Invoice freight charge
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${freightAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )}
                      {taxAmount > 0 && (
                        <TableRow>
                          <TableCell>
                            <Badge variant="secondary">Tax/Duty</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            Invoice tax amount
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${taxAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )}
                      {additionalCosts?.map((cost) => (
                        <TableRow key={cost.id}>
                          <TableCell>
                            <Badge variant="secondary">
                              {COST_TYPES.find((t) => t.value === cost.cost_type)?.label || cost.cost_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {cost.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${Number(cost.amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {totalCostsToAllocate === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                            No additional costs to allocate
                          </TableCell>
                        </TableRow>
                      )}
                      {totalCostsToAllocate > 0 && (
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={2} className="font-medium">Total to Allocate</TableCell>
                          <TableCell className="text-right font-bold">
                            ${totalCostsToAllocate.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {totalCostsToAllocate > 0 && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <strong>Allocation Method:</strong> Costs are distributed proportionally based on each line item's <strong>usage quantity</strong> (quantity × usage unit conversion).
                  </div>
                )}
              </div>

              {/* Step 3: Landed Cost Per Lot */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                  Landed Cost Per Receiving Lot
                </h3>
                {allocations && allocations.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Lot Number</TableHead>
                          <TableHead className="text-right">Qty (Base)</TableHead>
                          <TableHead className="text-right">Material</TableHead>
                          <TableHead className="text-right">Freight</TableHead>
                          <TableHead className="text-right">Tax/Duty</TableHead>
                          <TableHead className="text-right">Other</TableHead>
                          <TableHead className="text-right">Landed</TableHead>
                          <TableHead className="text-right">$/Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocations.map((alloc) => (
                          <TableRow key={alloc.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{alloc.receiving_lot?.material?.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {alloc.receiving_lot?.material?.code}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {alloc.receiving_lot?.internal_lot_number}
                            </TableCell>
                            <TableCell className="text-right">
                              {Number(alloc.quantity_in_base_unit).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              ${Number(alloc.material_cost).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              ${Number(alloc.freight_allocated || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              ${Number(alloc.duty_allocated || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              ${Number(alloc.other_costs_allocated || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${Number(alloc.total_landed_cost).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-bold text-primary">
                                ${Number(alloc.cost_per_base_unit).toFixed(4)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/30">
                    <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No landed cost allocations calculated yet.</p>
                    <p className="text-sm mt-1">
                      Approve the invoice to calculate landed costs, or click "Recalculate" above.
                    </p>
                  </div>
                )}
              </div>

              {/* Calculation Formula */}
              <div className="bg-muted/30 p-4 rounded-lg border">
                <h4 className="font-medium mb-2">How Landed Cost is Calculated</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>1. Usage Quantity:</strong> Each line's base unit quantity × material's usage conversion factor</p>
                  <p><strong>2. Cost Allocation:</strong> (Line's Usage Qty ÷ Total Usage Qty) × Total Costs to Allocate</p>
                  <p><strong>3. Total Landed Cost:</strong> Material Cost + Freight Allocated + Tax Allocated + Other Costs</p>
                  <p><strong>4. Cost Per Unit:</strong> Total Landed Cost ÷ Quantity in Base Units</p>
                </div>
              </div>
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