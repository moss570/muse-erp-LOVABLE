import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  RefreshCw,
  Printer,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PriorityBadge, getPriorityRowClass } from "./PriorityBadge";
import { AcknowledgmentModal } from "./AcknowledgmentModal";
import {
  useUnfulfilledSalesOrders,
  useTodaysAcknowledgment,
  UnfulfilledItem,
} from "@/hooks/useUnfulfilledSalesOrders";
import { cn } from "@/lib/utils";

interface ShopFloorPriorityDashboardProps {
  onCreateWorkOrder?: () => void;
}

export function ShopFloorPriorityDashboard({
  onCreateWorkOrder,
}: ShopFloorPriorityDashboardProps) {
  const navigate = useNavigate();
  const { data, isLoading, refetch, dataUpdatedAt } = useUnfulfilledSalesOrders();
  const { data: todaysAck } = useTodaysAcknowledgment();
  const [showAckModal, setShowAckModal] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const items = data?.items || [];
  const hasUnfulfilled = items.length > 0;
  const isAcknowledgedToday = !!todaysAck;
  const displayItems = showAll ? items : items.slice(0, 10);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Production Priority Dashboard</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            .timestamp { color: #666; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f5f5f5; font-weight: 600; }
            .priority-critical { background: #fef2f2; }
            .priority-high { background: #fff7ed; }
            .priority-medium { background: #fefce8; }
            .priority-low { background: #f0fdf4; }
          </style>
        </head>
        <body>
          <h1>📊 ITEMS NEEDED FOR SALES ORDERS</h1>
          <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Product</th>
                <th>Shortage</th>
                <th>Due By</th>
                <th>Sales Orders</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item, i) => `
                <tr class="priority-${item.priority_level}">
                  <td>${["🔴", "🟠", "🟡", "🟢"][["critical", "high", "medium", "low"].indexOf(item.priority_level)]} ${i + 1}</td>
                  <td>${item.product_code}</td>
                  <td>${item.shortage_quantity} CS</td>
                  <td>${item.earliest_due_date ? new Date(item.earliest_due_date).toLocaleDateString() : "—"}</td>
                  <td>${item.sales_order_numbers.join(", ")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleAcknowledged = () => {
    onCreateWorkOrder?.();
  };

  const handleCreateWOClick = () => {
    if (hasUnfulfilled && !isAcknowledgedToday) {
      setShowAckModal(true);
    } else {
      onCreateWorkOrder?.();
    }
  };

  if (!hasUnfulfilled && !isLoading) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-lg font-medium">
              All sales orders can be fulfilled with current stock
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              📊 ITEMS NEEDED FOR SALES ORDERS
              {hasUnfulfilled && (
                <Badge variant="destructive" className="ml-2">
                  {items.length} items
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {dataUpdatedAt && (
                <span>Last Updated: {format(dataUpdatedAt, "h:mm:ss a")}</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[70px]">PRIO</TableHead>
                      <TableHead>PRODUCT</TableHead>
                      <TableHead className="text-right">SHORTAGE</TableHead>
                      <TableHead>DUE BY</TableHead>
                      <TableHead>STATUS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayItems.map((item, index) => (
                      <TableRow
                        key={item.product_size_id}
                        className={cn(
                          getPriorityRowClass(item.priority_level),
                          "cursor-pointer"
                        )}
                        onClick={() => {
                          // Could navigate to item detail or trigger WO creation
                        }}
                      >
                        <TableCell>
                          <PriorityBadge level={item.priority_level} rank={index + 1} />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {item.product_code}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {item.shortage_quantity} CS
                        </TableCell>
                        <TableCell>
                          {item.earliest_due_date ? (
                            <Badge
                              variant={
                                item.priority_level === "critical"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {format(new Date(item.earliest_due_date), "M/d/yy")}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {/* TODO: Check if WO exists for this product */}
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm">NOT SCHEDULED</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {items.length > 10 && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAll(!showAll)}
                    className="w-full gap-1"
                  >
                    {showAll ? "Show Less" : `View All Items (${items.length})`}
                    <ChevronRight
                      className={cn("h-4 w-4 transition-transform", showAll && "rotate-90")}
                    />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Work Order Button */}
      {hasUnfulfilled && (
        <Button
          onClick={handleCreateWOClick}
          className={cn(
            "w-full gap-2 mt-4",
            !isAcknowledgedToday &&
              "bg-amber-600 hover:bg-amber-700 text-white"
          )}
          size="lg"
        >
          {!isAcknowledgedToday ? (
            <>
              <AlertTriangle className="h-5 w-5" />
              ⚠️ Review Unfulfilled Orders First ({items.length} items)
            </>
          ) : (
            "Create Work Order"
          )}
        </Button>
      )}

      <AcknowledgmentModal
        open={showAckModal}
        onOpenChange={setShowAckModal}
        items={items}
        onAcknowledged={handleAcknowledged}
      />
    </>
  );
}
