import { useState } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Circle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductionLine {
  id: string;
  line_name: string;
  capacity_value: number | null;
}

interface ScheduleMonthViewProps {
  weekStart: Date;
  productionLines: ProductionLine[];
  onDayClick: (date: Date) => void;
}

interface DayScheduleData {
  date: string;
  totalScheduled: number;
  totalCapacity: number;
  woCount: number;
  lineBreakdown: Record<string, { scheduled: number; capacity: number }>;
}

export function ScheduleMonthView({
  weekStart,
  productionLines,
  onDayClick,
}: ScheduleMonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(weekStart));
  const [selectedLine, setSelectedLine] = useState<string>("all");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Fetch schedule data for the month
  const { data: monthScheduleData = [] } = useQuery({
    queryKey: ["month-schedule", format(monthStart, "yyyy-MM"), selectedLine],
    queryFn: async () => {
      const startDate = format(calendarStart, "yyyy-MM-dd");
      const endDate = format(calendarEnd, "yyyy-MM-dd");

      let query = (supabase.from("production_schedule") as any)
        .select(`
          id,
          schedule_date,
          production_line_id,
          planned_quantity,
          planned_uom,
          work_order_id
        `)
        .gte("schedule_date", startDate)
        .lte("schedule_date", endDate)
        .neq("schedule_status", "Cancelled");

      if (selectedLine !== "all") {
        query = query.eq("production_line_id", selectedLine);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Also fetch recipe data to convert quantities to volume
      const productIds = [...new Set(data?.map((s: any) => s.product_id).filter(Boolean))];
      
      let recipeMap = new Map<string, { batch_volume: number; batch_volume_unit: string }>();
      if (productIds.length > 0) {
        const { data: recipes } = await (supabase.from("product_recipes") as any)
          .select("product_id, batch_volume, batch_volume_unit")
          .in("product_id", productIds)
          .eq("is_default", true);
        
        (recipes || []).forEach((r: any) => {
          if (r.batch_volume) {
            recipeMap.set(r.product_id, { 
              batch_volume: r.batch_volume, 
              batch_volume_unit: r.batch_volume_unit 
            });
          }
        });
      }

      // Aggregate by date
      const byDate = new Map<string, DayScheduleData>();

      (data || []).forEach((item: any) => {
        const dateKey = item.schedule_date;
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, {
            date: dateKey,
            totalScheduled: 0,
            totalCapacity: 0,
            woCount: 0,
            lineBreakdown: {},
          });
        }

        const dayData = byDate.get(dateKey)!;
        
        // Use planned quantity directly (assume in volume if unit is GAL, otherwise keep as is)
        const qty = item.planned_quantity || 0;
        dayData.totalScheduled += qty;
        dayData.woCount += 1;

        // Track line breakdown
        if (!dayData.lineBreakdown[item.production_line_id]) {
          const line = productionLines.find((l) => l.id === item.production_line_id);
          dayData.lineBreakdown[item.production_line_id] = {
            scheduled: 0,
            capacity: line?.capacity_value || 0,
          };
        }
        dayData.lineBreakdown[item.production_line_id].scheduled += qty;
      });

      // Calculate total capacity for each day
      byDate.forEach((dayData) => {
        if (selectedLine === "all") {
          dayData.totalCapacity = productionLines.reduce(
            (sum, line) => sum + (line.capacity_value || 0),
            0
          );
        } else {
          const line = productionLines.find((l) => l.id === selectedLine);
          dayData.totalCapacity = line?.capacity_value || 0;
        }
      });

      return Array.from(byDate.values());
    },
    enabled: productionLines.length > 0,
  });

  // Build calendar grid
  const buildCalendarDays = () => {
    const days: Date[] = [];
    let current = calendarStart;
    while (current <= calendarEnd) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  };

  const calendarDays = buildCalendarDays();
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const getScheduleDataForDate = (date: Date): DayScheduleData | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return monthScheduleData.find((d) => d.date === dateStr);
  };

  const getCapacityStatus = (scheduled: number, capacity: number) => {
    if (capacity === 0) return "none";
    const utilization = scheduled / capacity;
    if (utilization >= 1) return "over";
    if (utilization >= 0.8) return "warning";
    if (utilization > 0) return "ok";
    return "none";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "over":
        return "bg-destructive text-destructive-foreground";
      case "warning":
        return "bg-orange-500 text-white";
      case "ok":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "over":
        return <AlertTriangle className="h-3 w-3" />;
      case "warning":
        return <AlertTriangle className="h-3 w-3" />;
      case "ok":
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Month Overview
            </CardTitle>
            
            <div className="flex items-center gap-4">
              {/* Line Filter */}
              <Select value={selectedLine} onValueChange={setSelectedLine}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Lines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lines</SelectItem>
                  {productionLines.map((line) => (
                    <SelectItem key={line.id} value={line.id}>
                      {line.line_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Month Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[140px] text-center">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="space-y-1">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-1">
                {week.map((day) => {
                  const scheduleData = getScheduleDataForDate(day);
                  const status = scheduleData
                    ? getCapacityStatus(scheduleData.totalScheduled, scheduleData.totalCapacity)
                    : "none";
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);

                  return (
                    <Tooltip key={day.toISOString()}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onDayClick(day)}
                          className={cn(
                            "relative h-20 p-2 rounded-lg border transition-all hover:border-primary hover:shadow-sm",
                            isCurrentMonth ? "bg-card" : "bg-muted/30 text-muted-foreground",
                            today && "ring-2 ring-primary ring-offset-2"
                          )}
                        >
                          {/* Date Number */}
                          <div className="text-sm font-medium mb-1">
                            {format(day, "d")}
                          </div>

                          {/* Capacity Indicator */}
                          {scheduleData && scheduleData.woCount > 0 && (
                            <div className="absolute bottom-2 left-2 right-2">
                              <div
                                className={cn(
                                  "flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                  getStatusColor(status)
                                )}
                              >
                                {getStatusIcon(status)}
                                <span>{scheduleData.woCount}</span>
                              </div>
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">{format(day, "EEEE, MMMM d")}</p>
                          {scheduleData ? (
                            <>
                              <p className="text-sm">
                                {scheduleData.woCount} work order{scheduleData.woCount !== 1 ? "s" : ""}
                              </p>
                              <p className="text-sm">
                                Scheduled: {scheduleData.totalScheduled.toFixed(0)} units
                              </p>
                              {scheduleData.totalCapacity > 0 && (
                                <p className="text-sm">
                                  Capacity: {Math.round((scheduleData.totalScheduled / scheduleData.totalCapacity) * 100)}%
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">No production scheduled</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Click to view in Grid
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-muted" />
              <span className="text-muted-foreground">No Production</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-primary" />
              <span className="text-muted-foreground">&lt; 80% Capacity</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">80-100% Capacity</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Over Capacity</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
