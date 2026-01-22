import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Factory } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductionLine {
  id: string;
  line_name: string;
  capacity_value: number | null;
}

export function RequiredCapacityView() {
  const [startMonth, setStartMonth] = useState(startOfMonth(new Date()));
  
  // Generate 4 month periods
  const periods = Array.from({ length: 4 }, (_, i) => {
    const monthStart = addMonths(startMonth, i);
    return {
      label: format(monthStart, "MMM yyyy"),
      start: format(monthStart, "yyyy-MM-dd"),
      end: format(endOfMonth(monthStart), "yyyy-MM-dd"),
      workingDays: eachDayOfInterval({
        start: monthStart,
        end: endOfMonth(monthStart),
      }).filter(d => d.getDay() !== 0 && d.getDay() !== 6).length,
    };
  });

  // Get production lines
  const { data: productionLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ["production-lines-capacity"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("production_lines") as any)
        .select("id, line_name, capacity_value")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as ProductionLine[];
    },
  });

  // Get scheduled quantities for all periods
  const { data: scheduledData = {}, isLoading: scheduleLoading } = useQuery({
    queryKey: ["capacity-schedule", periods[0].start, periods[3].end],
    queryFn: async () => {
      const { data, error } = await (supabase.from("production_schedule") as any)
        .select("production_line_id, schedule_date, planned_quantity")
        .gte("schedule_date", periods[0].start)
        .lte("schedule_date", periods[3].end)
        .neq("schedule_status", "Cancelled");
      
      if (error) throw error;
      
      // Aggregate by line and period
      const result: Record<string, Record<string, number>> = {};
      
      (data || []).forEach((item: any) => {
        const lineId = item.production_line_id;
        if (!result[lineId]) result[lineId] = {};
        
        // Find which period this date belongs to
        for (const period of periods) {
          if (item.schedule_date >= period.start && item.schedule_date <= period.end) {
            result[lineId][period.label] = (result[lineId][period.label] || 0) + (item.planned_quantity || 0);
            break;
          }
        }
      });
      
      return result;
    },
    enabled: periods.length > 0,
  });

  const getCapacityStatus = (required: number, capacity: number) => {
    if (capacity <= 0) return "neutral";
    const utilization = required / capacity;
    if (utilization > 1) return "over";
    if (utilization >= 0.8) return "warning";
    return "ok";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "over": return "bg-destructive/10 text-destructive";
      case "warning": return "bg-warning/20 text-warning";
      case "ok": return "bg-primary/10 text-primary";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const isLoading = linesLoading || scheduleLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Required Capacity</h2>
          <p className="text-sm text-muted-foreground">
            Monthly capacity utilization by production line
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartMonth(addMonths(startMonth, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartMonth(startOfMonth(new Date()))}
          >
            Current
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartMonth(addMonths(startMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Production Line</th>
                  {periods.map((period) => (
                    <th key={period.label} className="text-center p-4 font-medium min-w-[140px]">
                      {period.label}
                      <div className="text-xs font-normal text-muted-foreground">
                        {period.workingDays} working days
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><Skeleton className="h-6 w-32" /></td>
                      {periods.map((period) => (
                        <td key={period.label} className="p-4 text-center">
                          <Skeleton className="h-12 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : productionLines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No production lines configured
                    </td>
                  </tr>
                ) : (
                  productionLines.map((line) => {
                    const lineSchedule = scheduledData[line.id] || {};
                    
                    return (
                      <tr key={line.id} className="border-b hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{line.line_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {line.capacity_value ? `${line.capacity_value} gal/day` : "No capacity set"}
                              </p>
                            </div>
                          </div>
                        </td>
                        {periods.map((period) => {
                          const required = lineSchedule[period.label] || 0;
                          const totalCapacity = (line.capacity_value || 0) * period.workingDays;
                          const status = getCapacityStatus(required, totalCapacity);
                          const utilization = totalCapacity > 0 
                            ? Math.round((required / totalCapacity) * 100) 
                            : 0;
                          
                          return (
                            <td key={period.label} className="p-4 text-center">
                              <div className={cn(
                                "rounded-lg p-2",
                                getStatusColor(status)
                              )}>
                                <p className="text-lg font-semibold">
                                  {required.toLocaleString()}
                                </p>
                                <p className="text-xs">
                                  of {totalCapacity.toLocaleString()} gal
                                </p>
                                <Badge 
                                  variant="secondary" 
                                  className={cn("mt-1", getStatusColor(status))}
                                >
                                  {utilization}%
                                </Badge>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/20" />
          <span>Under 80% utilized</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-warning/20" />
          <span>80-100% utilized</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive/10" />
          <span>Over capacity</span>
        </div>
      </div>
    </div>
  );
}
