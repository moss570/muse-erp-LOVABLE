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
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSyncProductionJournal, useXeroJournalBatches, useUnsyncedProductionCount } from "@/hooks/useXeroManufacturing";
import { useXeroConnection } from "@/hooks/useXero";

export default function ProductionDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  const { data: xeroConnection } = useXeroConnection();
  const { data: unsyncedCount = 0, isLoading: countLoading } = useUnsyncedProductionCount(formattedDate);
  const { data: journalBatches = [], isLoading: batchesLoading } = useXeroJournalBatches(5);
  const { mutate: syncProductionJournal, isPending: syncing } = useSyncProductionJournal();

  // Fetch production lots for selected date
  const { data: productionLots = [], isLoading: lotsLoading, refetch: refetchLots } = useQuery({
    queryKey: ["production-lots-by-date", formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_lots")
        .select(`
          *,
          product:products(name, sku),
          machine:machines(name, machine_number)
        `)
        .eq("production_date", formattedDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
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
                    <TableHead>Synced</TableHead>
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
                        {lot.is_synced_to_xero ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
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
    </AppLayout>
  );
}
