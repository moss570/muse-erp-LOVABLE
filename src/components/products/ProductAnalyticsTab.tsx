import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Calendar, DollarSign, Users } from "lucide-react";
import { format, subDays, subMonths, subQuarters, subYears, startOfDay } from "date-fns";

interface ProductAnalyticsTabProps {
  productId: string;
  productName: string;
}

type DateRange = "7d" | "30d" | "90d" | "1y" | "all";

export function ProductAnalyticsTab({ productId, productName }: ProductAnalyticsTabProps) {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const getStartDate = () => {
    const now = new Date();
    switch (dateRange) {
      case "7d":
        return startOfDay(subDays(now, 7));
      case "30d":
        return startOfDay(subDays(now, 30));
      case "90d":
        return startOfDay(subDays(now, 90));
      case "1y":
        return startOfDay(subYears(now, 1));
      case "all":
        return null;
    }
  };

  // Fetch production statistics
  const { data: productionStats, isLoading: statsLoading } = useQuery({
    queryKey: ["product-analytics", productId, dateRange],
    queryFn: async () => {
      const startDate = getStartDate();
      let query = supabase
        .from("production_lots")
        .select("id, quantity_produced, production_date")
        .eq("product_id", productId);

      if (startDate) {
        query = query.gte("production_date", startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate statistics
      const totalProduced = data.reduce((sum, lot) => sum + (lot.quantity_produced || 0), 0);
      const lotCount = data.length;

      // Group by month for trend
      const byMonth: Record<string, number> = {};
      data.forEach((lot) => {
        const month = format(new Date(lot.production_date), "yyyy-MM");
        byMonth[month] = (byMonth[month] || 0) + (lot.quantity_produced || 0);
      });

      return {
        totalProduced,
        lotCount,
        avgPerLot: lotCount > 0 ? Math.round(totalProduced / lotCount) : 0,
        byMonth,
      };
    },
  });

  // Fetch work orders for frequency
  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery({
    queryKey: ["product-work-orders", productId, dateRange],
    queryFn: async () => {
      const startDate = getStartDate();
      let query = supabase
        .from("work_orders")
        .select("id, wo_number, scheduled_date, wo_status, target_quantity")
        .eq("product_id", productId)
        .order("scheduled_date", { ascending: false })
        .limit(20);

      if (startDate) {
        query = query.gte("scheduled_date", startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // For future: customer purchasing data would come from sales/orders table
  // This is a placeholder structure
  const { data: customers = [] } = useQuery({
    queryKey: ["product-customers", productId],
    queryFn: async () => {
      // Placeholder - would fetch from sales data when available
      return [];
    },
  });

  const isLoading = statsLoading || workOrdersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Product Analytics</h3>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Produced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {productionStats?.totalProduced.toLocaleString() || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Production Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {productionStats?.lotCount || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Per Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {productionStats?.avgPerLot.toLocaleString() || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{workOrders.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production by Month */}
      {productionStats?.byMonth && Object.keys(productionStats.byMonth).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Production Trend</CardTitle>
            <CardDescription>Monthly production volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(productionStats.byMonth)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 12)
                .map(([month, quantity]) => (
                  <div
                    key={month}
                    className="flex items-center justify-between p-2 rounded bg-muted"
                  >
                    <span className="font-medium">
                      {format(new Date(month + "-01"), "MMMM yyyy")}
                    </span>
                    <span className="font-semibold">{quantity.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Work Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Work Orders</CardTitle>
          <CardDescription>Production schedule history</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Order</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead className="text-right">Planned Qty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((wo) => (
                <TableRow key={wo.id}>
                  <TableCell className="font-mono">{wo.wo_number}</TableCell>
                  <TableCell>
                    {format(new Date(wo.scheduled_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {wo.target_quantity?.toLocaleString() || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        wo.wo_status === "Completed"
                          ? "default"
                          : wo.wo_status === "In Progress"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {wo.wo_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {workOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No work orders found for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer List Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customers
          </CardTitle>
          <CardDescription>
            Customers who purchase this product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Customer purchase data will be available once sales orders are implemented.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
