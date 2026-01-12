import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Factory, 
  CalendarIcon, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  TrendingUp,
  Package,
  DollarSign,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSyncProductionJournal, useXeroJournalBatches, useUnsyncedProductionCount } from "@/hooks/useXeroManufacturing";
import { useXeroConnection } from "@/hooks/useXero";
import { ApprovalStatusBadge } from "@/components/approval";
import { useUnapprovedProductionLots } from "@/hooks/useProductionGatekeeping";

export default function ProductionDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  const { data: xeroConnection } = useXeroConnection();
  const { data: unsyncedCount = 0, isLoading: countLoading } = useUnsyncedProductionCount(formattedDate);
  const { data: journalBatches = [], isLoading: batchesLoading } = useXeroJournalBatches(5);
  const { mutate: syncProductionJournal, isPending: syncing } = useSyncProductionJournal();
  const { data: unapprovedLots = [] } = useUnapprovedProductionLots(formattedDate);

  // Fetch production lots for selected date
  const { data: productionLots = [], isLoading: lotsLoading, refetch: refetchLots } = useQuery({
    queryKey: ["production-lots-by-date", formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_lots")
        .select(`
          *,
          product:products(name, sku),
          machine:machines(name, machine_number),
          recipe:product_recipes(
            id,
            recipe_name,
            recipe_version,
            batch_size
          )
        `)
        .eq("production_date", formattedDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch recipe items and consumed materials for selected lot
  const { data: lotDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["production-lot-details", selectedLot?.id],
    queryFn: async () => {
      if (!selectedLot?.id) return null;

      // Fetch recipe items (BOM)
      const { data: recipeItems, error: recipeError } = await supabase
        .from("product_recipe_items")
        .select(`
          id,
          quantity_required,
          wastage_percentage,
          sort_order,
          notes,
          material:materials(id, name, code),
          unit:units_of_measure(id, name)
        `)
        .eq("recipe_id", selectedLot.recipe_id)
        .order("sort_order");

      if (recipeError) throw recipeError;

      // Fetch consumed materials (actual lot consumption)
      const { data: consumedMaterials, error: consumedError } = await supabase
        .from("production_lot_materials")
        .select(`
          id,
          quantity_used,
          created_at,
          receiving_lot:receiving_lots(
            id,
            internal_lot_number,
            supplier_lot_number,
            expiry_date,
            material:materials(id, name, code)
          )
        `)
        .eq("production_lot_id", selectedLot.id);

      if (consumedError) throw consumedError;

      return {
        recipeItems: recipeItems || [],
        consumedMaterials: consumedMaterials || [],
      };
    },
    enabled: !!selectedLot?.id && detailDialogOpen,
  });

  // Calculate summary stats
  const totalProduced = productionLots.reduce((sum, lot) => sum + (lot.quantity_produced || 0), 0);
  const totalMaterialCost = productionLots.reduce((sum, lot) => sum + (Number(lot.material_cost) || 0), 0);
  const totalLaborCost = productionLots.reduce((sum, lot) => sum + (Number(lot.labor_cost) || 0), 0);
  const totalOverheadCost = productionLots.reduce((sum, lot) => sum + (Number(lot.overhead_cost) || 0), 0);
  const totalCost = totalMaterialCost + totalLaborCost + totalOverheadCost;

  const handleCloseProductionDay = () => {
    syncProductionJournal(formattedDate);
  };

  const isConnectedToXero = !!xeroConnection;
  const hasUnsyncedLots = unsyncedCount > 0;
  const completedLots = productionLots.filter(
    (lot) => ["completed", "Completed", "COMPLETED"].includes(lot.status || "")
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Factory className="h-8 w-8" />
              Production Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage daily production runs and sync to accounting
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={() => refetchLots()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Production Runs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productionLots.length}</div>
              <p className="text-xs text-muted-foreground">
                {completedLots.length} completed, {unsyncedCount} unsynced
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Units Produced</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProduced.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total quantity for the day</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Material + Labor + Overhead
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Xero Sync</CardTitle>
              {isConnectedToXero ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {hasUnsyncedLots ? (
                  <span className="text-amber-600">{unsyncedCount} pending</span>
                ) : (
                  <span className="text-green-600">Synced</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isConnectedToXero ? "Connected to Xero" : "Not connected"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Unapproved Lots Warning */}
        {unapprovedLots.length > 0 && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                <strong>{unapprovedLots.length} production lot(s)</strong> pending QA approval for shipment on this date.
              </span>
              <Badge variant="outline" className="border-amber-500 text-amber-700">
                QA Action Required
              </Badge>
            </AlertDescription>
          </Alert>
        )}

        {/* Close Production Day Card */}
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Close Production Day
            </CardTitle>
            <CardDescription>
              Sync all completed production runs to Xero as a single daily journal entry
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnectedToXero ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please connect to Xero in Settings → Xero Configuration before syncing.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Material Cost</div>
                    <div className="text-xl font-semibold">
                      ${totalMaterialCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Labor Cost</div>
                    <div className="text-xl font-semibold">
                      ${totalLaborCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Overhead Cost</div>
                    <div className="text-xl font-semibold">
                      ${totalOverheadCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {unsyncedCount} unsynced production run(s) for {format(selectedDate, "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This will create a Manual Journal in Xero moving costs to WIP Inventory
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleCloseProductionDay}
                    disabled={!hasUnsyncedLots || syncing}
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Close Production Day
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Production Lots Table */}
        <Card>
          <CardHeader>
            <CardTitle>Production Runs - {format(selectedDate, "MMM d, yyyy")}</CardTitle>
            <CardDescription>{productionLots.length} production run(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {lotsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : productionLots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No production runs for this date
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Material</TableHead>
                    <TableHead className="text-right">Labor</TableHead>
                    <TableHead className="text-right">Overhead</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>QA Status</TableHead>
                    <TableHead>Synced</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionLots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-mono text-sm">{lot.lot_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lot.product?.name}</div>
                          <div className="text-xs text-muted-foreground">{lot.product?.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>{lot.machine?.name || "-"}</TableCell>
                      <TableCell className="text-right">{lot.quantity_produced}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${(Number(lot.material_cost) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${(Number(lot.labor_cost) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${(Number(lot.overhead_cost) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${(Number(lot.total_cost) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ["completed", "Completed", "COMPLETED"].includes(lot.status || "")
                              ? "default"
                              : "secondary"
                          }
                        >
                          {lot.status || "draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <ApprovalStatusBadge 
                                status={(lot as any).approval_status || 'Draft'} 
                                size="sm" 
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              {(lot as any).approval_status === 'Approved' 
                                ? 'Approved for shipment' 
                                : 'Not yet approved for shipment'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {lot.is_synced_to_xero ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedLot(lot);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Sync History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Xero Sync History</CardTitle>
            <CardDescription>Last 5 journal batches synced to Xero</CardDescription>
          </CardHeader>
          <CardContent>
            {batchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : journalBatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sync history yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">WIP Amount</TableHead>
                    <TableHead className="text-right">Lots</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Xero Journal ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>{format(new Date(batch.batch_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="capitalize">{batch.batch_type}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${(Number(batch.total_wip_amount) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {batch.production_lot_ids?.length || 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={batch.status === "synced" ? "default" : "destructive"}
                        >
                          {batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {batch.xero_journal_id ? batch.xero_journal_id.substring(0, 12) + "..." : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Production Lot Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Production Lot Details
            </DialogTitle>
            <DialogDescription>
              {selectedLot?.lot_number} - {selectedLot?.product?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLot && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Lot Number</div>
                  <div className="font-mono font-medium">{selectedLot.lot_number}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Production Date</div>
                  <div className="font-medium">
                    {format(new Date(selectedLot.production_date), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Product</div>
                  <div>
                    <div className="font-medium">{selectedLot.product?.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedLot.product?.sku}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Machine</div>
                  <div className="font-medium">{selectedLot.machine?.name || "N/A"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Quantity Produced</div>
                  <div className="text-xl font-bold">{selectedLot.quantity_produced}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Quantity Available</div>
                  <div className="text-xl font-bold">{selectedLot.quantity_available}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Expiry Date</div>
                  <div className="font-medium">
                    {selectedLot.expiry_date 
                      ? format(new Date(selectedLot.expiry_date), "MMM d, yyyy")
                      : "Not set"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedLot.status === "available" ? "default" : "secondary"}>
                      {selectedLot.status}
                    </Badge>
                    <ApprovalStatusBadge status={selectedLot.approval_status || "Draft"} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Recipe / BOM Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    Recipe / Bill of Materials
                  </h4>
                  {selectedLot.recipe && (
                    <Badge variant="outline">
                      {selectedLot.recipe.recipe_name} v{selectedLot.recipe.recipe_version}
                    </Badge>
                  )}
                </div>
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : lotDetails?.recipeItems && lotDetails.recipeItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-right">Qty Required</TableHead>
                        <TableHead className="text-right">Wastage %</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lotDetails.recipeItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.material?.name}</TableCell>
                          <TableCell className="font-mono text-xs">{item.material?.code}</TableCell>
                          <TableCell className="text-right">{item.quantity_required}</TableCell>
                          <TableCell className="text-right">{item.wastage_percentage || 0}%</TableCell>
                          <TableCell>{item.unit?.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No recipe items found
                  </div>
                )}
              </div>

              <Separator />

              {/* Consumed Materials / Lots Section */}
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4" />
                  Consumed Material Lots
                </h4>
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : lotDetails?.consumedMaterials && lotDetails.consumedMaterials.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Internal Lot #</TableHead>
                        <TableHead>Supplier Lot #</TableHead>
                        <TableHead className="text-right">Qty Used</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Used At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lotDetails.consumedMaterials.map((consumed: any) => (
                        <TableRow key={consumed.id}>
                          <TableCell>
                            <div className="font-medium">{consumed.receiving_lot?.material?.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {consumed.receiving_lot?.material?.code}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {consumed.receiving_lot?.internal_lot_number || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {consumed.receiving_lot?.supplier_lot_number || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {consumed.quantity_used}
                          </TableCell>
                          <TableCell>
                            {consumed.receiving_lot?.expiry_date
                              ? format(new Date(consumed.receiving_lot.expiry_date), "MMM d, yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(consumed.created_at), "MMM d, h:mm a")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg">
                    No material consumption recorded yet
                  </div>
                )}
              </div>

              <Separator />

              {/* Cost Breakdown */}
              <div>
                <h4 className="font-medium mb-3">Cost Breakdown</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Material</div>
                    <div className="text-lg font-semibold font-mono">
                      ${(Number(selectedLot.material_cost) || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Labor</div>
                    <div className="text-lg font-semibold font-mono">
                      ${(Number(selectedLot.labor_cost) || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Overhead</div>
                    <div className="text-lg font-semibold font-mono">
                      ${(Number(selectedLot.overhead_cost) || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 bg-primary/5">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-lg font-bold font-mono text-primary">
                      ${(Number(selectedLot.total_cost) || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Labor Hours</div>
                  <div className="text-lg font-semibold">
                    {Number(selectedLot.labor_hours || 0).toFixed(2)} hrs
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Machine Hours</div>
                  <div className="text-lg font-semibold">
                    {Number(selectedLot.machine_hours || 0).toFixed(2)} hrs
                  </div>
                </div>
              </div>

              {/* Xero Sync Status */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {selectedLot.is_synced_to_xero ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-medium">
                      {selectedLot.is_synced_to_xero ? "Synced to Xero" : "Not Synced"}
                    </div>
                    {selectedLot.synced_at && (
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(selectedLot.synced_at), "MMM d, yyyy h:mm a")}
                      </div>
                    )}
                  </div>
                </div>
                {selectedLot.xero_journal_id && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {selectedLot.xero_journal_id}
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedLot.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {selectedLot.notes}
                  </p>
                </div>
              )}

              {/* Trial Batch Info */}
              {selectedLot.is_trial_batch && (
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription>
                    <strong>Trial Batch</strong>
                    {selectedLot.trial_notes && (
                      <p className="mt-1 text-sm">{selectedLot.trial_notes}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
