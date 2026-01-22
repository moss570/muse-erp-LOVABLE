import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, Package, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface InputAvailabilityPanelProps {
  stageCode: string;
  productId: string;
  recipeId: string | null;
  targetQuantity: number;
}

interface AvailabilityData {
  needs_input: boolean;
  input_stage?: string;
  inventory_available?: number;
  inventory_lots?: Array<{
    lot_id: string;
    lot_number: string;
    quantity: number;
    uom: string;
  }>;
  scheduled_quantity?: number;
  scheduled_work_orders?: Array<{
    wo_id: string;
    wo_number: string;
    quantity: number;
    uom: string;
    scheduled_date: string;
  }>;
  total_available?: number;
  status?: "inventory_available" | "scheduled_only" | "none_available";
  message?: string;
}

const stageLabels: Record<string, string> = {
  BASE_PREP: "Base",
  FLAVOR: "Flavored Mix",
  FREEZE: "Tubs",
  CASE_PACK: "Cases",
};

export function InputAvailabilityPanel({
  stageCode,
  productId,
  recipeId,
  targetQuantity,
}: InputAvailabilityPanelProps) {
  const { data: availability, isLoading } = useQuery({
    queryKey: ["input-availability", stageCode, productId, recipeId],
    queryFn: async (): Promise<AvailabilityData> => {
      const { data, error } = await supabase.rpc("check_wo_input_availability", {
        p_stage_code: stageCode,
        p_product_id: productId,
        p_recipe_id: recipeId,
      });

      if (error) throw error;
      return data as unknown as AvailabilityData;
    },
    enabled: !!stageCode && !!productId && stageCode !== "BASE_PREP",
  });

  // Don't show for BASE_PREP stage
  if (stageCode === "BASE_PREP" || !stageCode) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground animate-pulse">
            Checking input availability...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!availability || !availability.needs_input) {
    return null;
  }

  const inputLabel = stageLabels[availability.input_stage || ""] || "Input Material";
  const hasInventory = (availability.inventory_available || 0) > 0;
  const hasScheduled = (availability.scheduled_quantity || 0) > 0;

  // Determine status and styling
  let statusIcon;
  let statusColor;
  let statusMessage;

  if (availability.status === "inventory_available") {
    statusIcon = <CheckCircle className="h-4 w-4 text-green-600" />;
    statusColor = "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800";
    const inventoryLots = availability.inventory_lots || [];
    const firstLot = inventoryLots[0];
    statusMessage = (
      <div className="space-y-1">
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          {availability.inventory_available} {firstLot?.uom || "KG"} of {inputLabel} available in inventory
        </p>
        {firstLot && (
          <p className="text-xs text-muted-foreground">
            Lot #{firstLot.lot_number} - {firstLot.quantity} {firstLot.uom}
          </p>
        )}
        {targetQuantity > 0 && (
          <p className="text-xs text-muted-foreground">
            You can produce up to {Math.floor(availability.inventory_available || 0)} KG with current inventory
          </p>
        )}
      </div>
    );
  } else if (availability.status === "scheduled_only") {
    statusIcon = <Clock className="h-4 w-4 text-blue-600" />;
    statusColor = "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800";
    const scheduledWOs = availability.scheduled_work_orders || [];
    const firstWO = scheduledWOs[0];
    statusMessage = (
      <div className="space-y-1">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
          {availability.scheduled_quantity} {firstWO?.uom || "KG"} of {inputLabel} scheduled for production
        </p>
        {firstWO && (
          <p className="text-xs text-muted-foreground">
            {firstWO.wo_number} - {firstWO.quantity} {firstWO.uom}
            {firstWO.scheduled_date && ` on ${format(parseISO(firstWO.scheduled_date), "MMM d, yyyy")}`}
          </p>
        )}
      </div>
    );
  } else {
    statusIcon = <AlertTriangle className="h-4 w-4 text-amber-600" />;
    statusColor = "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800";
    statusMessage = (
      <div className="space-y-1">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          No {inputLabel} in inventory or scheduled
        </p>
        <p className="text-xs text-muted-foreground">
          Please schedule {inputLabel} production before proceeding
        </p>
      </div>
    );
  }

  return (
    <Card className={`${statusColor} border`}>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4" />
          Input Material Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-start gap-3">
          {statusIcon}
          {statusMessage}
        </div>
        
        {/* Show combined availability if both inventory and scheduled exist */}
        {hasInventory && hasScheduled && (
          <div className="mt-2 pt-2 border-t border-dashed">
            <p className="text-xs text-muted-foreground">
              Total available: {availability.total_available} KG (inventory + scheduled)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
