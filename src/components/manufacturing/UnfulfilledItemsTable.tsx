import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Printer, RefreshCw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PriorityBadge, getPriorityRowClass } from "./PriorityBadge";
import { UnfulfilledItem } from "@/hooks/useUnfulfilledSalesOrders";
import { cn } from "@/lib/utils";

interface UnfulfilledItemsTableProps {
  items: UnfulfilledItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onPrint?: () => void;
  onItemClick?: (item: UnfulfilledItem) => void;
  compact?: boolean;
  maxItems?: number;
}

export function UnfulfilledItemsTable({
  items,
  isLoading,
  onRefresh,
  onPrint,
  onItemClick,
  compact = false,
  maxItems,
}: UnfulfilledItemsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  const toggleRow = (productSizeId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(productSizeId)) {
      newExpanded.delete(productSizeId);
    } else {
      newExpanded.add(productSizeId);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-green-600 dark:text-green-400">
        <span className="text-lg">✅ No unfulfilled orders - all sales orders can be fulfilled with current stock</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Actions */}
      {(onRefresh || onPrint) && (
        <div className="flex justify-end gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          )}
          {onPrint && (
            <Button variant="outline" size="sm" onClick={onPrint} className="gap-1">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[60px]">Priority</TableHead>
              <TableHead>Product Code</TableHead>
              {!compact && <TableHead>Description</TableHead>}
              <TableHead className="text-right">Shortage</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">Needed</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right"># SOs</TableHead>
              {!compact && <TableHead className="w-[40px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayItems.map((item, index) => {
              const isExpanded = expandedRows.has(item.product_size_id);
              const dueDate = item.earliest_due_date
                ? new Date(item.earliest_due_date)
                : null;

              return (
                <Collapsible key={item.product_size_id} asChild open={isExpanded}>
                  <>
                    <TableRow
                      className={cn(
                        getPriorityRowClass(item.priority_level),
                        "cursor-pointer transition-colors"
                      )}
                      onClick={() => onItemClick?.(item)}
                    >
                      <TableCell>
                        <PriorityBadge level={item.priority_level} rank={index + 1} />
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {item.product_code}
                      </TableCell>
                      {!compact && (
                        <TableCell className="max-w-[200px] truncate">
                          {item.product_description}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-bold">
                        {item.shortage_quantity} CS
                      </TableCell>
                      <TableCell className="text-right">
                        {item.total_available_stock} CS
                      </TableCell>
                      <TableCell className="text-right">
                        {item.total_quantity_needed} CS
                      </TableCell>
                      <TableCell>
                        {dueDate ? (
                          <Badge
                            variant={item.priority_level === "critical" ? "destructive" : "outline"}
                          >
                            {format(dueDate, "MMM d, yyyy")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.number_of_sales_orders}
                      </TableCell>
                      {!compact && (
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(item.product_size_id);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                      )}
                    </TableRow>
                    {!compact && (
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9} className="py-3">
                            <div className="pl-8">
                              <span className="text-sm text-muted-foreground">
                                Affected Sales Orders:{" "}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.sales_order_numbers.map((so) => (
                                  <Badge key={so} variant="secondary" className="text-xs">
                                    {so}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    )}
                  </>
                </Collapsible>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {maxItems && items.length > maxItems && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {maxItems} of {items.length} items
        </p>
      )}
    </div>
  );
}
