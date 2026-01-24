import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Printer, RefreshCw, Lock } from "lucide-react";
import { UnfulfilledItemsTable } from "./UnfulfilledItemsTable";
import { AcknowledgmentModal } from "./AcknowledgmentModal";
import {
  useUnfulfilledSalesOrders,
  UnfulfilledItem,
} from "@/hooks/useUnfulfilledSalesOrders";
import { cn } from "@/lib/utils";

interface UnfulfilledOrdersAlertProps {
  onAcknowledged?: (acknowledgmentId: string) => void;
  isAcknowledged?: boolean;
  className?: string;
}

export function UnfulfilledOrdersAlert({
  onAcknowledged,
  isAcknowledged = false,
  className,
}: UnfulfilledOrdersAlertProps) {
  const { data, isLoading, refetch } = useUnfulfilledSalesOrders();
  const [showAckModal, setShowAckModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const items = data?.items || [];
  const hasUnfulfilled = items.length > 0;

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unfulfilled Sales Orders Report</title>
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
            .legend { margin-top: 20px; font-size: 11px; }
            .legend span { margin-right: 20px; }
            .signature { margin-top: 40px; border-top: 1px solid #000; width: 250px; padding-top: 5px; }
          </style>
        </head>
        <body>
          <h1>UNFULFILLED SALES ORDERS REPORT</h1>
          <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Product Code</th>
                <th>Description</th>
                <th>Shortage</th>
                <th>Due Date</th>
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
                  <td>${item.product_description}</td>
                  <td>${item.shortage_quantity} CS</td>
                  <td>${item.earliest_due_date ? new Date(item.earliest_due_date).toLocaleDateString() : "—"}</td>
                  <td>${item.sales_order_numbers.join(", ")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="legend">
            <strong>Color Legend:</strong><br/>
            <span>🔴 Red: Due within 48 hours</span>
            <span>🟠 Orange: Due 3-7 days</span>
            <span>🟡 Yellow: Due 8-14 days</span>
            <span>🟢 Green: Due 15+ days</span>
          </div>
          <div class="signature">
            <p>Acknowledged by: _______________</p>
            <p>Date: _______________</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleAcknowledged = (acknowledgmentId: string) => {
    onAcknowledged?.(acknowledgmentId);
  };

  // If no unfulfilled items, show success message
  if (!isLoading && !hasUnfulfilled) {
    return (
      <Card className={cn("border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30", className)}>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <span className="text-lg">✅</span>
            <span>All sales orders can be fulfilled with current stock</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={cn(
          "border-amber-300 dark:border-amber-700",
          "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50",
          className
        )}
        ref={printRef}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              ⚠️ ITEMS NEEDED FOR OPEN SALES ORDERS
              {hasUnfulfilled && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({items.length} items)
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
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
        <CardContent>
          <UnfulfilledItemsTable items={items} isLoading={isLoading} />

          {/* Lock overlay when not acknowledged */}
          {hasUnfulfilled && !isAcknowledged && (
            <div className="mt-4 p-4 border border-amber-400 dark:border-amber-600 rounded-lg bg-amber-100/50 dark:bg-amber-900/30">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    You must acknowledge unfulfilled sales orders before creating a work order
                  </p>
                </div>
                <Button
                  onClick={() => setShowAckModal(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Review & Acknowledge
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AcknowledgmentModal
        open={showAckModal}
        onOpenChange={setShowAckModal}
        items={items}
        onAcknowledged={handleAcknowledged}
      />
    </>
  );
}
