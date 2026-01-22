import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  GripVertical,
  Calendar as CalendarIcon,
  Factory,
  X,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  TrendingUp,
  ShoppingCart,
  GanttChart,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { aggregateAllergensForRecipe } from "@/lib/bomAggregation";
import { DailyTargetIndicator } from "@/components/manufacturing/DailyTargetIndicator";
import { RequiredCapacityView } from "@/components/manufacturing/RequiredCapacityView";
import { ProcurementScheduleView } from "@/components/manufacturing/ProcurementScheduleView";
import { ScheduleTimelineView } from "@/components/manufacturing/ScheduleTimelineView";
import { ScheduleMonthView } from "@/components/manufacturing/ScheduleMonthView";

type ScheduleViewMode = "grid" | "timeline" | "month";

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

interface WorkOrder {
  id: string;
  wo_number: string;
  target_quantity: number;
  target_uom: string;
  priority: string;
  product_id?: string | null;
  product?: { name: string; sku: string } | null;
  scheduledQuantity?: number;
  recipeData?: RecipeVolumeData | null;
  allergens?: string[] | null;
}

// Draggable Work Order Card
function DraggableCard({ 
  item, 
  type, 
  onUnschedule,
  compact = false,
}: { 
  item: ScheduleItem | WorkOrder; 
  type: "scheduled" | "unscheduled";
  onUnschedule?: (id: string) => void;
  compact?: boolean;
}) {
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

  // Compact card for horizontal unscheduled panel
  if (compact && !isScheduled) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex-shrink-0 w-[200px] p-3 rounded-lg border-l-4 bg-card border shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
          getPriorityColor(item.priority),
          isDragging && "opacity-50 shadow-lg"
        )}
        {...listeners}
        {...attributes}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-sm font-bold">{woItem.wo_number}</span>
          <Badge 
            variant={item.priority === "Rush" ? "destructive" : "secondary"} 
            className="text-xs"
          >
            {item.priority}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mb-1">
          {woItem.product?.name}
        </p>
        <p className="text-xs font-medium">
          {woItem.target_quantity} {woItem.target_uom}
        </p>
        {woItem.scheduledQuantity && woItem.scheduledQuantity > 0 && (
          <div className="flex items-center gap-1 text-primary mt-1">
            <CalendarIcon className="h-3 w-3" />
            <span className="text-xs">{woItem.scheduledQuantity} scheduled</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 mb-2 rounded-lg border-l-4 bg-card border shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md relative",
        getPriorityColor(item.priority),
        isDragging && "opacity-50 shadow-lg"
      )}
      {...listeners}
      {...attributes}
    >
      {isScheduled && onUnschedule && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 absolute top-1 right-1 hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onUnschedule(scheduleItem.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </Button>
      )}

      <div className="flex items-start justify-between gap-2 mb-2 pr-6">
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
            {(() => {
              const qty = isScheduled ? scheduleItem.planned_quantity : woItem.target_quantity;
              const uom = isScheduled ? scheduleItem.planned_uom : woItem.target_uom;
              const recipe = isScheduled ? scheduleItem.recipeData : woItem.recipeData;
              
              if (recipe?.batch_volume && recipe?.batch_volume_unit) {
                const volume = qty * recipe.batch_volume;
                return `${qty} ${uom} / ${volume.toFixed(1)} ${recipe.batch_volume_unit}`;
              }
              return `${qty} ${uom}`;
            })()}
          </span>
        </div>

        {!isScheduled && woItem.scheduledQuantity && woItem.scheduledQuantity > 0 && (
          <div className="flex items-center gap-1 text-primary mt-1">
            <CalendarIcon className="h-3 w-3" />
            <span className="text-xs">
              {woItem.scheduledQuantity} of {woItem.target_quantity} {woItem.target_uom} scheduled
            </span>
          </div>
        )}

        {isScheduled && scheduleItem.allergens && scheduleItem.allergens.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-2">
            {scheduleItem.allergens.map((allergen: string) => (
              <Badge key={allergen} variant="destructive" className="text-xs px-1 py-0">
                {allergen}
              </Badge>
            ))}
          </div>
        )}

        {!isScheduled && woItem.allergens && (woItem.allergens as string[]).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-2">
            {(woItem.allergens as string[]).map((allergen: string) => (
              <Badge key={allergen} variant="outline" className="text-xs px-1 py-0 border-destructive text-destructive">
                {allergen}
              </Badge>
            ))}
          </div>
        )}

        {isScheduled && scheduleItem.exceeds_line_capacity && (
          <div className="flex items-center gap-1 text-destructive mt-1">
            <AlertCircle className="h-3 w-3" />
            <span className="text-xs">Capacity warning</span>
          </div>
        )}

        {isScheduled && scheduleItem.insufficient_labor && (
          <div className="flex items-center gap-1 text-destructive">
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
  laborStatus,
  lineCapacity,
  onUnschedule,
}: { 
  date: string; 
  lineId: string; 
  lineName: string; 
  scheduleItems: ScheduleItem[];
  laborStatus: any;
  lineCapacity: number;
  onUnschedule: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${date}|${lineId}` });

  // Calculate total weight (KG)
  const totalWeightKg = scheduleItems.reduce(
    (sum, item) => sum + (item.planned_quantity || 0),
    0
  );

  // Calculate total volume by summing each item's converted volume
  const { totalVolume, volumeUnit } = scheduleItems.reduce(
    (acc, item) => {
      const recipe = item.recipeData;
      if (recipe?.batch_volume && recipe?.batch_volume_unit && item.planned_quantity) {
        return {
          totalVolume: acc.totalVolume + (item.planned_quantity * recipe.batch_volume),
          volumeUnit: recipe.batch_volume_unit,
        };
      }
      return acc;
    },
    { totalVolume: 0, volumeUnit: "GAL" as string }
  );

  const getLaborStatusColor = (status: string) => {
    if (status === "UNDERSTAFFED") return "text-destructive";
    if (status === "OVERSTAFFED") return "text-orange-600";
    return "text-primary";
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[240px] flex-1 p-3 rounded-lg border transition-colors",
        isOver ? "bg-primary/10 border-primary" : "bg-muted/30"
      )}
    >
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-sm">{format(new Date(date), "EEE M/d")}</p>
        </div>
        
        {/* Daily Target Indicator */}
        <DailyTargetIndicator 
          scheduledVolume={totalVolume} 
          targetVolume={lineCapacity}
          unit="gal"
        />
        
        {laborStatus && laborStatus.status !== "BALANCED" && (
          <div className={cn("flex items-center gap-1 mt-1 text-xs", getLaborStatusColor(laborStatus.status))}>
            <Users className="h-3 w-3" />
            <span>{laborStatus.status}</span>
          </div>
        )}
      </div>

      <div className="space-y-2 min-h-[120px]">
        {scheduleItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs border-2 border-dashed rounded-lg">
            Drop work orders here
          </div>
        ) : (
          scheduleItems.map((item) => (
            <DraggableCard key={item.id} item={item} type="scheduled" onUnschedule={onUnschedule} />
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
  const [isUnscheduledOpen, setIsUnscheduledOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("schedule");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("grid");

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
      const { data: scheduleData, error } = await (supabase.from("production_schedule") as any)
        .select(`
          *,
          work_order:work_orders(
            wo_number,
            target_quantity,
            product:products(name, sku)
          )
        `)
        .gte("schedule_date", weekDates[0])
        .lte("schedule_date", weekDates[6])
        .neq("schedule_status", "Cancelled")
        .order("sort_order");

      if (error) throw error;
      if (!scheduleData || scheduleData.length === 0) return [];

      const productIds = [...new Set(scheduleData.map((s: any) => s.product_id).filter(Boolean))];
      
      const { data: recipes } = await (supabase.from("product_recipes") as any)
        .select("product_id, batch_volume, batch_volume_unit")
        .in("product_id", productIds)
        .eq("is_default", true);
      
      const recipeMap = new Map<string, RecipeVolumeData>();
      (recipes || []).forEach((r: any) => {
        recipeMap.set(r.product_id, { batch_volume: r.batch_volume, batch_volume_unit: r.batch_volume_unit });
      });

      return scheduleData.map((item: any) => ({
        ...item,
        recipeData: item.product_id ? recipeMap.get(item.product_id) : null,
      })) as ScheduleItem[];
    },
    enabled: weekDates.length > 0,
  });

  // Get unscheduled work orders
  const { data: unscheduledWorkOrders = [] } = useQuery({
    queryKey: ["unscheduled-work-orders"],
    queryFn: async () => {
      const { data: allWOs, error } = await (supabase.from("work_orders") as any)
        .select(`
          id,
          wo_number,
          target_quantity,
          target_uom,
          priority,
          product_id,
          product:products(name, sku)
        `)
        .in("wo_status", ["Created", "Released"])
        .order("priority", { ascending: false })
        .limit(30);

      if (error) throw error;
      if (!allWOs) return [];

      const { data: allScheduleTotals } = await (supabase.from("production_schedule") as any)
        .select("work_order_id, planned_quantity")
        .neq("schedule_status", "Cancelled");

      const scheduledByWo = new Map<string, number>();
      (allScheduleTotals || []).forEach((s: { work_order_id: string | null; planned_quantity: number }) => {
        if (s.work_order_id) {
          scheduledByWo.set(
            s.work_order_id, 
            (scheduledByWo.get(s.work_order_id) || 0) + (s.planned_quantity || 0)
          );
        }
      });

      const productIds = [...new Set(allWOs.map((wo: any) => wo.product_id).filter(Boolean))];
      
      const { data: recipes } = productIds.length > 0 
        ? await (supabase.from("product_recipes") as any)
            .select("id, product_id, batch_volume, batch_volume_unit")
            .in("product_id", productIds)
            .eq("is_default", true)
        : { data: [] };
      
      const recipeMap = new Map<string, RecipeVolumeData & { id: string }>();
      (recipes || []).forEach((r: any) => {
        recipeMap.set(r.product_id, { 
          id: r.id, 
          batch_volume: r.batch_volume, 
          batch_volume_unit: r.batch_volume_unit 
        });
      });

      const allergenMap = new Map<string, string[]>();
      for (const recipe of (recipes || [])) {
        try {
          const allergens = await aggregateAllergensForRecipe(recipe.id);
          allergenMap.set(recipe.product_id, allergens);
        } catch (e) {
          // Ignore allergen fetch errors
        }
      }

      return allWOs
        .map((wo: any) => ({
          ...wo,
          scheduledQuantity: scheduledByWo.get(wo.id) || 0,
          recipeData: wo.product_id ? recipeMap.get(wo.product_id) : null,
          allergens: wo.product_id ? allergenMap.get(wo.product_id) || null : null,
        }))
        .filter((wo: WorkOrder) => {
          const remaining = wo.target_quantity - (wo.scheduledQuantity || 0);
          return remaining > 0;
        }) as WorkOrder[];
    },
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
        const { data: wo } = await (supabase.from("work_orders") as any)
          .select("*")
          .eq("id", sourceId)
          .single();

        if (!wo) throw new Error("Work order not found");

        let allergensList: string[] = [];
        if (wo.product_id) {
          const { data: recipe } = await (supabase.from("product_recipes") as any)
            .select("id")
            .eq("product_id", wo.product_id)
            .eq("is_default", true)
            .single();
          
          if (recipe?.id) {
            try {
              allergensList = await aggregateAllergensForRecipe(recipe.id);
            } catch (e) {
              console.error("Failed to fetch allergens:", e);
            }
          }
        }

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
            allergens: allergensList.length > 0 ? allergensList : null,
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

  // Unschedule (delete) mutation
  const unscheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await (supabase.from("production_schedule") as any)
        .delete()
        .eq("id", scheduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["unscheduled-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["labor-status"] });
      toast.success("Work order unscheduled");
    },
    onError: (error: any) => {
      toast.error("Failed to unschedule", { description: error.message });
    },
  });

  const handleUnschedule = (scheduleId: string) => {
    unscheduleMutation.mutate(scheduleId);
  };

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

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
      setCalendarOpen(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Factory className="h-8 w-8" />
            Master Planning
          </h1>
          <p className="text-muted-foreground">
            Production scheduling, capacity planning, and procurement
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="schedule" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Production Schedule
          </TabsTrigger>
          <TabsTrigger value="capacity" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Required Capacity
          </TabsTrigger>
          <TabsTrigger value="procurement" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Procurement
          </TabsTrigger>
        </TabsList>

        {/* Master Production Schedule Tab */}
        <TabsContent value="schedule" className="mt-4 space-y-4">
          {/* Navigation and View Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart(addDays(weekStart, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[220px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Week of {format(weekStart, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={weekStart}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart(addDays(weekStart, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              >
                Today
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-4">
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(v) => v && setViewMode(v as ScheduleViewMode)}
                className="border rounded-lg p-1"
              >
                <ToggleGroupItem value="grid" aria-label="Grid view" className="px-3">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Grid</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="timeline" aria-label="Timeline view" className="px-3">
                  <GanttChart className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Timeline</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="month" aria-label="Month view" className="px-3">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Month</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Conditional View Rendering */}
          {viewMode === "grid" && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Collapsible Unscheduled Panel */}
              <Collapsible open={isUnscheduledOpen} onOpenChange={setIsUnscheduledOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="flex items-center justify-between text-base">
                        <div className="flex items-center gap-2">
                          <Factory className="h-5 w-5" />
                          Unscheduled Work Orders ({unscheduledWorkOrders.length})
                        </div>
                        {isUnscheduledOpen ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      {unscheduledWorkOrders.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-4">
                          All work orders are scheduled
                        </p>
                      ) : (
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {unscheduledWorkOrders.map((wo) => (
                            <DraggableCard key={wo.id} item={wo} type="unscheduled" compact />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Full-Width Schedule Grid */}
              <div className="space-y-4">
                {productionLines.map((line: any) => (
                  <Card key={line.id}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{line.line_name}</span>
                        <Badge variant="outline" className="font-normal">
                          Target: {line.capacity_value || 0} gal/day
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
                            lineCapacity={line.capacity_value || 0}
                            onUnschedule={handleUnschedule}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <DragOverlay>
                {activeId ? (
                  <div className="p-3 rounded-lg border bg-card shadow-lg opacity-90">
                    <p className="text-sm font-medium">Moving...</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {viewMode === "timeline" && (
            <ScheduleTimelineView
              weekStart={weekStart}
              weekDates={weekDates}
              productionLines={productionLines}
              scheduledItems={scheduledItems}
            />
          )}

          {viewMode === "month" && (
            <ScheduleMonthView
              weekStart={weekStart}
              productionLines={productionLines}
              onDayClick={(date) => {
                setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
                setViewMode("grid");
              }}
            />
          )}
        </TabsContent>

        {/* Required Capacity Tab */}
        <TabsContent value="capacity" className="mt-4">
          <RequiredCapacityView />
        </TabsContent>

        {/* Procurement Schedule Tab */}
        <TabsContent value="procurement" className="mt-4">
          <ProcurementScheduleView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
