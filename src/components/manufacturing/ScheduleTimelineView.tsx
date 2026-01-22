import { format, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { AlertCircle, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeVolumeData {
  batch_volume: number | null;
  batch_volume_unit: string | null;
}

interface ScheduleItem {
  id: string;
  work_order_id: string | null;
  product_id: string | null;
  schedule_date: string;
  production_line_id: string;
  planned_quantity: number;
  planned_uom: string;
  priority: string;
  schedule_status: string;
  allergens: string[] | null;
  exceeds_line_capacity: boolean;
  insufficient_labor: boolean;
  recipeData?: RecipeVolumeData | null;
  work_order?: {
    wo_number: string;
    target_quantity?: number;
    product?: { name: string; sku: string } | null;
  } | null;
}

interface ProductionLine {
  id: string;
  line_name: string;
  capacity_value: number | null;
}

interface ScheduleTimelineViewProps {
  weekStart: Date;
  weekDates: string[];
  productionLines: ProductionLine[];
  scheduledItems: ScheduleItem[];
  onWOClick?: (woId: string) => void;
}

export function ScheduleTimelineView({
  weekStart,
  weekDates,
  productionLines,
  scheduledItems,
  onWOClick,
}: ScheduleTimelineViewProps) {
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      Low: "bg-muted text-muted-foreground",
      Standard: "bg-primary/80 text-primary-foreground",
      High: "bg-orange-500 text-white",
      Rush: "bg-destructive text-destructive-foreground",
    };
    return colors[priority] || colors.Standard;
  };

  const getItemsForLine = (lineId: string) => {
    return scheduledItems.filter((item) => item.production_line_id === lineId);
  };

  const getItemsForLineAndDate = (lineId: string, date: string) => {
    return scheduledItems.filter(
      (item) => item.production_line_id === lineId && item.schedule_date === date
    );
  };

  // Calculate column width percentage
  const columnWidth = 100 / weekDates.length;

  // Get date index for positioning
  const getDateIndex = (dateStr: string) => {
    return weekDates.indexOf(dateStr);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline View
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Timeline Header */}
          <div className="flex border-b">
            <div className="w-40 flex-shrink-0 p-2 font-medium text-sm text-muted-foreground">
              Production Line
            </div>
            <div className="flex-1 flex">
              {weekDates.map((date) => (
                <div
                  key={date}
                  className="flex-1 p-2 text-center text-sm font-medium border-l"
                  style={{ minWidth: 120 }}
                >
                  <div>{format(new Date(date), "EEE")}</div>
                  <div className="text-muted-foreground text-xs">
                    {format(new Date(date), "M/d")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Rows */}
          {productionLines.map((line) => {
            const lineItems = getItemsForLine(line.id);
            
            return (
              <div key={line.id} className="flex border-b last:border-b-0 min-h-[80px]">
                {/* Line Name Column */}
                <div className="w-40 flex-shrink-0 p-3 bg-muted/30 flex flex-col justify-center">
                  <span className="font-medium text-sm">{line.line_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {line.capacity_value || 0} gal/day
                  </span>
                </div>

                {/* Timeline Grid */}
                <div className="flex-1 flex relative">
                  {/* Grid columns for visual reference */}
                  {weekDates.map((date, idx) => (
                    <div
                      key={date}
                      className={cn(
                        "flex-1 border-l p-1 relative",
                        idx % 2 === 0 ? "bg-muted/10" : "bg-background"
                      )}
                      style={{ minWidth: 120 }}
                    >
                      {/* Render items for this date/line */}
                      {getItemsForLineAndDate(line.id, date).map((item, itemIdx) => (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "rounded px-2 py-1 mb-1 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md text-xs",
                                getPriorityColor(item.priority)
                              )}
                              onClick={() => item.work_order_id && onWOClick?.(item.work_order_id)}
                            >
                              <div className="font-medium truncate">
                                {item.work_order?.wo_number || "Direct"}
                              </div>
                              <div className="truncate opacity-90">
                                {item.work_order?.product?.name}
                              </div>
                              {item.allergens && item.allergens.length > 0 && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <AlertCircle className="h-3 w-3" />
                                  <span className="text-[10px]">
                                    {item.allergens.length} allergen{item.allergens.length > 1 ? "s" : ""}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">
                                {item.work_order?.wo_number || "Direct Schedule"}
                              </p>
                              <p className="text-sm">
                                {item.work_order?.product?.name || "No product"}
                              </p>
                              <p className="text-sm">
                                Qty: {item.planned_quantity} {item.planned_uom}
                                {item.recipeData?.batch_volume && (
                                  <> / {(item.planned_quantity * item.recipeData.batch_volume).toFixed(1)} {item.recipeData.batch_volume_unit}</>
                                )}
                              </p>
                              <p className="text-sm">Priority: {item.priority}</p>
                              {item.allergens && item.allergens.length > 0 && (
                                <p className="text-sm text-destructive">
                                  Allergens: {item.allergens.join(", ")}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {productionLines.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No production lines configured</p>
            </div>
          )}

          {scheduledItems.length === 0 && productionLines.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No work orders scheduled for this week</p>
              <p className="text-xs mt-1">Switch to Grid view to schedule work orders</p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
