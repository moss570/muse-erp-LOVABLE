import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Package, 
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import { format, addDays, subDays, isBefore, isToday, startOfDay } from "date-fns";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface ProcurementItem {
  materialId: string;
  materialName: string;
  materialSku: string;
  supplierId: string | null;
  supplierName: string;
  leadTimeDays: number;
  requiredDate: string;
  orderByDate: string;
  requiredQuantity: number;
  unit: string;
  status: "ok" | "urgent" | "late";
  workOrders: string[];
}

export function ProcurementScheduleView() {
  const [horizon, setHorizon] = useState<string>("14");
  const today = startOfDay(new Date());
  const endDate = addDays(today, parseInt(horizon));

  // Get scheduled work orders in the horizon
  const { data: scheduledWOs = [], isLoading: wosLoading } = useQuery({
    queryKey: ["procurement-schedule-wos", format(today, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await (supabase.from("production_schedule") as any)
        .select(`
          id,
          schedule_date,
          planned_quantity,
          product_id,
          work_order:work_orders(wo_number, recipe_id)
        `)
        .gte("schedule_date", format(today, "yyyy-MM-dd"))
        .lte("schedule_date", format(endDate, "yyyy-MM-dd"))
        .neq("schedule_status", "Cancelled");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Get recipes and their BOM items
  const productIds = [...new Set(scheduledWOs.map((wo: any) => wo.product_id).filter(Boolean))];
  
  const { data: recipeBOMs = [], isLoading: bomsLoading } = useQuery({
    queryKey: ["procurement-boms", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      
      // Get default recipes for products
      const { data: recipes, error: recipeError } = await (supabase.from("product_recipes") as any)
        .select("id, product_id, batch_size")
        .in("product_id", productIds)
        .eq("is_default", true);
      
      if (recipeError) throw recipeError;
      if (!recipes || recipes.length === 0) return [];
      
      const recipeIds = recipes.map((r: any) => r.id);
      
      // Get BOM items
      const { data: bomItems, error: bomError } = await (supabase.from("product_recipe_items") as any)
        .select(`
          recipe_id,
          quantity_required,
          material:materials(
            id,
            name,
            sku,
            lead_time_days,
            default_supplier_id
          ),
          unit:units_of_measure(code, name)
        `)
        .in("recipe_id", recipeIds);
      
      if (bomError) throw bomError;
      
      // Map recipe to product
      const recipeToProduct = new Map<string, { productId: string; batchSize: number }>(
        recipes.map((r: any) => [r.id, { productId: r.product_id, batchSize: r.batch_size || 1 }])
      );
      
      return (bomItems || []).map((item: any) => {
        const recipeInfo = recipeToProduct.get(item.recipe_id);
        return {
          ...item,
          productId: recipeInfo?.productId,
          batchSize: recipeInfo?.batchSize || 1,
        };
      });
    },
    enabled: productIds.length > 0,
  });

  // Get suppliers
  const materialIds = [...new Set(recipeBOMs.map((b: any) => b.material?.id).filter(Boolean))];
  
  const { data: suppliers = {}, isLoading: suppliersLoading } = useQuery({
    queryKey: ["procurement-suppliers", materialIds],
    queryFn: async () => {
      if (materialIds.length === 0) return {};
      
      const { data, error } = await (supabase.from("material_suppliers") as any)
        .select(`
          material_id,
          lead_time_days,
          is_preferred,
          supplier:suppliers(id, name)
        `)
        .in("material_id", materialIds);
      
      if (error) throw error;
      
      // Map material to preferred supplier
      const result: Record<string, { supplierId: string; supplierName: string; leadTime: number }> = {};
      
      (data || []).forEach((item: any) => {
        const matId = item.material_id;
        // Prefer the preferred supplier or first one found
        if (!result[matId] || item.is_preferred) {
          result[matId] = {
            supplierId: item.supplier?.id,
            supplierName: item.supplier?.name || "Unknown",
            leadTime: item.lead_time_days || 7,
          };
        }
      });
      
      return result;
    },
    enabled: materialIds.length > 0,
  });

  // Calculate procurement requirements
  const procurementItems = useMemo(() => {
    const requirements = new Map<string, ProcurementItem>();
    
    scheduledWOs.forEach((schedule: any) => {
      const scheduleDate = schedule.schedule_date;
      const woNumber = schedule.work_order?.wo_number || "Direct";
      
      // Find BOM items for this product
      const bomItems = recipeBOMs.filter((b: any) => b.productId === schedule.product_id);
      
      bomItems.forEach((bom: any) => {
        const material = bom.material;
        if (!material) return;
        
        const supplierInfo = suppliers[material.id];
        const leadTime = supplierInfo?.leadTime || material.lead_time_days || 7;
        const requiredDate = scheduleDate;
        const orderByDate = format(subDays(new Date(scheduleDate), leadTime), "yyyy-MM-dd");
        
        // Calculate scaled quantity based on batch size
        const scaleFactor = schedule.planned_quantity / (bom.batchSize || 1);
        const quantity = bom.quantity_required * scaleFactor;
        
        const key = `${material.id}-${requiredDate}`;
        
        if (requirements.has(key)) {
          const existing = requirements.get(key)!;
          existing.requiredQuantity += quantity;
          if (!existing.workOrders.includes(woNumber)) {
            existing.workOrders.push(woNumber);
          }
        } else {
          // Determine status
          const orderByDateObj = new Date(orderByDate);
          let status: "ok" | "urgent" | "late" = "ok";
          
          if (isBefore(orderByDateObj, today)) {
            status = "late";
          } else if (isBefore(orderByDateObj, addDays(today, 3))) {
            status = "urgent";
          }
          
          requirements.set(key, {
            materialId: material.id,
            materialName: material.name,
            materialSku: material.sku || "",
            supplierId: supplierInfo?.supplierId || null,
            supplierName: supplierInfo?.supplierName || "Not assigned",
            leadTimeDays: leadTime,
            requiredDate,
            orderByDate,
            requiredQuantity: quantity,
            unit: bom.unit?.code || "EA",
            status,
            workOrders: [woNumber],
          });
        }
      });
    });
    
    // Sort by order-by date (most urgent first)
    return Array.from(requirements.values()).sort((a, b) => 
      a.orderByDate.localeCompare(b.orderByDate)
    );
  }, [scheduledWOs, recipeBOMs, suppliers, today]);

  const isLoading = wosLoading || bomsLoading || suppliersLoading;

  const getStatusBadge = (status: ProcurementItem["status"]) => {
    switch (status) {
      case "late":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            LATE
          </Badge>
        );
      case "urgent":
        return (
          <Badge variant="outline" className="gap-1 border-warning text-warning">
            <AlertTriangle className="h-3 w-3" />
            URGENT
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 border-primary text-primary">
            <CheckCircle2 className="h-3 w-3" />
            OK
          </Badge>
        );
    }
  };

  const lateCount = procurementItems.filter(i => i.status === "late").length;
  const urgentCount = procurementItems.filter(i => i.status === "urgent").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Procurement Schedule</h2>
          <p className="text-sm text-muted-foreground">
            Material requirements based on scheduled production and lead times
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Planning horizon:</span>
            <Select value={horizon} onValueChange={setHorizon}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{procurementItems.length}</p>
                <p className="text-sm text-muted-foreground">Material Requirements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn(urgentCount > 0 && "border-warning")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/20 rounded-lg">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{urgentCount}</p>
                <p className="text-sm text-muted-foreground">Order Within 3 Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn(lateCount > 0 && "border-destructive")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lateCount}</p>
                <p className="text-sm text-muted-foreground">Past Order Date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Procurement Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Material Order Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : procurementItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No material requirements for the selected period</p>
              <p className="text-sm">Schedule work orders to see procurement needs</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-center">Lead Time</TableHead>
                  <TableHead className="text-center">Required Date</TableHead>
                  <TableHead className="text-center">Order By</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Work Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procurementItems.map((item, index) => (
                  <TableRow 
                    key={`${item.materialId}-${item.requiredDate}-${index}`}
                    className={cn(
                      item.status === "late" && "bg-destructive/5",
                      item.status === "urgent" && "bg-warning/10"
                    )}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.materialName}</p>
                        <p className="text-xs text-muted-foreground">{item.materialSku}</p>
                      </div>
                    </TableCell>
                    <TableCell>{item.supplierName}</TableCell>
                    <TableCell className="text-center">{item.leadTimeDays} days</TableCell>
                    <TableCell className="text-center">
                      {format(new Date(item.requiredDate), "MMM d")}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {format(new Date(item.orderByDate), "MMM d")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.requiredQuantity.toFixed(2)} {item.unit}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.workOrders.slice(0, 3).map((wo) => (
                          <Badge key={wo} variant="secondary" className="text-xs">
                            {wo}
                          </Badge>
                        ))}
                        {item.workOrders.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.workOrders.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
