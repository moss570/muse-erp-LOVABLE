import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { format, addDays, startOfWeek } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Users,
  DollarSign,
  GripVertical,
  Calendar,
  Factory,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScheduleItem {
  id: string;
  work_order_id: string | null;
  schedule_date: string;
  production_line_id: string;
  planned_quantity: number;
  planned_uom: string;
  priority: string;
  schedule_status: string;
  allergens: string[] | null;
  exceeds_line_capacity: boolean;
  insufficient_labor: boolean;
  work_order?: {
    wo_number: string;
    product?: { name: string; sku: string } | null;
  } | null;
}

interface WorkOrder {
  id: string;
  wo_number: string;
  target_quantity: number;
  target_uom: string;
  priority: string;
  product?: { name: string; sku: string } | null;
}

// Draggable Work Order Card
function DraggableCard({ item, type }: { item: ScheduleItem | WorkOrder; type: "scheduled" | "unscheduled" }) {
  // Use a delimiter that won't conflict with UUIDs (which contain "-")
  const id =
    type === "scheduled"
      ? `schedule:${(item as ScheduleItem).id}`
      : `wo:${(item as WorkOrder).id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      Low: "border-l-muted",
      Standard: "border-l-primary",
      High: "border-l-orange-500",
      Rush: "border-l-destructive",
    };
    return colors[priority] || colors.Standard;
  };

  const isScheduled = type === "scheduled";
  const scheduleItem = item as ScheduleItem;
  const woItem = item as WorkOrder;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 mb-2 rounded-lg border-l-4 bg-card border shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
        getPriorityColor(item.priority),
        isDragging && "opacity-50 shadow-lg"
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-mono font-bold text-sm">
              {isScheduled ? scheduleItem.work_order?.wo_number || "Direct" : woItem.wo_number}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {isScheduled 
                ? scheduleItem.work_order?.product?.name 
                : woItem.product?.name}
            </p>
          </div>
        </div>
        <Badge 
          variant={item.priority === "Rush" ? "destructive" : "secondary"} 
          className="text-xs shrink-0"
        >
          {item.priority}
        </Badge>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Quantity:</span>
          <span className="font-medium">
            {isScheduled ? scheduleItem.planned_quantity : woItem.target_quantity}{" "}
            {isScheduled ? scheduleItem.planned_uom : woItem.target_uom}
          </span>
        </div>

        {isScheduled && scheduleItem.allergens && scheduleItem.allergens.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-2">
            {scheduleItem.allergens.map((allergen: string) => (
              <Badge key={allergen} variant="destructive" className="text-xs px-1 py-0">
                {allergen}
              </Badge>
            ))}
          </div>
        )}

        {isScheduled && scheduleItem.exceeds_line_capacity && (
          <div className="flex items-center gap-1 text-orange-600 mt-1">
            <AlertCircle className="h-3 w-3" />
            <span className="text-xs">Capacity warning</span>
          </div>
        )}

        {isScheduled && scheduleItem.insufficient_labor && (
          <div className="flex items-center gap-1 text-orange-600">
            <Users className="h-3 w-3" />
            <span className="text-xs">Labor warning</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Droppable Daily Column
function DroppableColumn({ 
  date, 
  lineId, 
  lineName, 
  scheduleItems,
  laborStatus 
}: { 
  date: string; 
  lineId: string; 
  lineName: string; 
  scheduleItems: ScheduleItem[];
  laborStatus: any;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${date}|${lineId}` });

  const totalQuantity = scheduleItems.reduce(
    (sum, item) => sum + (item.planned_quantity || 0),
    0
  );

  const getLaborStatusColor = (status: string) => {
    if (status === "UNDERSTAFFED") return "text-destructive";
    if (status === "OVERSTAFFED") return "text-orange-600";
    return "text-green-600";
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[260px] p-3 rounded-lg border transition-colors",
        isOver ? "bg-primary/10 border-primary" : "bg-muted/30"
      )}
    >
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-sm">{format(new Date(date), "EEE M/d")}</p>
          <Badge variant="outline" className="text-xs">
            {totalQuantity.toFixed(0)} gal
          </Badge>
        </div>
        
        {laborStatus && laborStatus.status !== "BALANCED" && (
          <div className={cn("flex items-center gap-1 mt-1 text-xs", getLaborStatusColor(laborStatus.status))}>
            <Users className="h-3 w-3" />
            <span>{laborStatus.status}</span>
          </div>
        )}
      </div>

      <div className="space-y-2 min-h-[150px]">
        {scheduleItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs border-2 border-dashed rounded-lg">
            Drop work orders here
          </div>
        ) : (
          scheduleItems.map((item) => (
            <DraggableCard key={item.id} item={item} type="scheduled" />
          ))
        )}
      </div>
    </div>
  );
}

export default function ProductionScheduler() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), "yyyy-MM-dd")
  );

  // Get production lines
  const { data: productionLines = [] } = useQuery({
    queryKey: ["production-lines-scheduler"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("production_lines") as any)
        .select("id, line_name, capacity_value")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Get scheduled items for the week
  const { data: scheduledItems = [] } = useQuery({
    queryKey: ["production-schedule", weekDates[0], weekDates[6]],
    queryFn: async () => {
      const { data, error } = await (supabase.from("production_schedule") as any)
        .select(`
          *,
          work_order:work_orders(
            wo_number,
            product:products(name, sku)
          )
        `)
        .gte("schedule_date", weekDates[0])
        .lte("schedule_date", weekDates[6])
        .neq("schedule_status", "Cancelled")
        .order("sort_order");

      if (error) throw error;
      return (data || []) as ScheduleItem[];
    },
    enabled: weekDates.length > 0,
  });

  // Get unscheduled work orders
  const { data: unscheduledWorkOrders = [] } = useQuery({
    queryKey: ["unscheduled-work-orders"],
    queryFn: async () => {
      // Get work orders that don't have a schedule entry
      const { data: allWOs, error } = await (supabase.from("work_orders") as any)
        .select(`
          id,
          wo_number,
          target_quantity,
          target_uom,
          priority,
          product:products(name, sku)
        `)
        .in("wo_status", ["Created", "Released"])
        .order("priority", { ascending: false })
        .limit(30);

      if (error) throw error;

      // Filter out work orders that already have schedules
      const scheduledWoIds = scheduledItems
        .filter(s => s.work_order_id)
        .map(s => s.work_order_id);

      return ((allWOs || []) as WorkOrder[]).filter(wo => !scheduledWoIds.includes(wo.id));
    },
    enabled: scheduledItems !== undefined,
  });

  // Get labor status for each day/line
  const { data: laborStatus = {} } = useQuery({
    queryKey: ["labor-status", weekDates[0], weekDates[6], productionLines.length],
    queryFn: async () => {
      const statuses: Record<string, any> = {};
      
      for (const date of weekDates) {
        for (const line of productionLines) {
          try {
            const { data } = await supabase.rpc("check_labor_balance", {
              p_date: date,
              p_production_line_id: line.id,
            });
            
            if (data) {
              statuses[`${date}|${line.id}`] = data;
            }
          } catch (e) {
            // Ignore errors for individual cells
          }
        }
      }
      
      return statuses;
    },
    enabled: productionLines.length > 0 && weekDates.length > 0,
  });

  // Create/move schedule mutation
  const moveScheduleMutation = useMutation({
    mutationFn: async ({ 
      sourceId, 
      sourceType, 
      targetDate, 
      targetLineId 
    }: { 
      sourceId: string; 
      sourceType: "schedule" | "wo"; 
      targetDate: string; 
      targetLineId: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      if (sourceType === "schedule") {
        // Move existing schedule
        const { error } = await (supabase.from("production_schedule") as any)
          .update({
            schedule_date: targetDate,
            production_line_id: targetLineId,
            updated_at: new Date().toISOString(),
            updated_by: userData?.user?.id,
          })
          .eq("id", sourceId);

        if (error) throw error;
      } else {
        // Create new schedule from work order
        const { data: wo } = await (supabase.from("work_orders") as any)
          .select("*")
          .eq("id", sourceId)
          .single();

        if (!wo) throw new Error("Work order not found");

        const { error } = await (supabase.from("production_schedule") as any)
          .insert({
            work_order_id: sourceId,
            schedule_date: targetDate,
            production_line_id: targetLineId,
            product_id: wo.product_id,
            recipe_id: wo.recipe_id,
            planned_quantity: wo.target_quantity,
            planned_uom: wo.target_uom,
            priority: wo.priority,
            schedule_status: "Scheduled",
            created_by: userData?.user?.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["unscheduled-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["labor-status"] });
      toast.success("Schedule updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update schedule", { description: error.message });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const overId = over.id as string;
    const [targetDate, targetLineId] = overId.split("|");

    if (!targetDate || !targetLineId) return;

    const activeIdStr = String(active.id);
    const [sourceTypeRaw, ...rest] = activeIdStr.split(":");
    const sourceId = rest.join(":");
    const sourceType = sourceTypeRaw as "schedule" | "wo";

    if ((sourceType === "schedule" || sourceType === "wo") && sourceId) {
      moveScheduleMutation.mutate({
        sourceId,
        sourceType,
        targetDate,
        targetLineId,
      });
    }
  };

  const getScheduleItemsForCell = (date: string, lineId: string) => {
    return scheduledItems.filter(
      (item) => item.schedule_date === date && item.production_line_id === lineId
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Production Scheduler
          </h1>
          <p className="text-muted-foreground">
            Drag work orders to schedule production across lines and dates
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-12 gap-6">
          {/* Unscheduled Work Orders Sidebar */}
          <div className="col-span-3">
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Factory className="h-5 w-5" />
                  Unscheduled ({unscheduledWorkOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {unscheduledWorkOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    All work orders are scheduled
                  </p>
                ) : (
                  unscheduledWorkOrders.map((wo) => (
                    <DraggableCard key={wo.id} item={wo} type="unscheduled" />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scheduler Grid */}
          <div className="col-span-9">
            {productionLines.map((line: any) => (
              <Card key={line.id} className="mb-4">
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{line.line_name}</span>
                    <Badge variant="outline" className="font-normal">
                      Capacity: {line.capacity_value || "N/A"} gal/day
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {weekDates.map((date) => (
                      <DroppableColumn
                        key={`${date}|${line.id}`}
                        date={date}
                        lineId={line.id}
                        lineName={line.line_name}
                        scheduleItems={getScheduleItemsForCell(date, line.id)}
                        laborStatus={laborStatus[`${date}|${line.id}`]}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="p-3 rounded-lg border bg-card shadow-lg opacity-90">
              <p className="text-sm font-medium">Moving...</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
