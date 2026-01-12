import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Package, Clock, Cog, Calculator, FlaskConical } from "lucide-react";
import type { WeighedIngredient } from "@/hooks/useProductionExecution";

interface ProductionCostSummaryProps {
  weighedIngredients: WeighedIngredient[];
  quantityToProduce: number;
  laborHours: number;
  machineHours: number;
  laborRate?: number;
  overheadRate?: number;
  isTrialBatch?: boolean;
}

export function ProductionCostSummary({
  weighedIngredients,
  quantityToProduce,
  laborHours,
  machineHours,
  laborRate = 25,
  overheadRate = 0.5,
  isTrialBatch = false,
}: ProductionCostSummaryProps) {
  const totalMaterialCost = weighedIngredients.reduce(
    (sum, ing) => sum + (ing.isCompleted ? ing.totalCost : 0),
    0
  );
  const completedCount = weighedIngredients.filter((ing) => ing.isCompleted).length;
  const laborCost = laborHours * laborRate;
  const overheadCost = quantityToProduce * overheadRate;
  const totalCost = totalMaterialCost + laborCost + overheadCost;
  const costPerUnit = quantityToProduce > 0 ? totalCost / quantityToProduce : 0;

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Batch Cost Summary
          {isTrialBatch && (
            <Badge variant="outline" className="ml-auto border-amber-500 text-amber-700">
              <FlaskConical className="h-3 w-3 mr-1" />
              R&D
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trial Batch Cost Category Notice */}
        {isTrialBatch && (
          <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
            Costs will be categorized as R&D expense
          </div>
        )}
        {/* Production Quantity */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <span>Quantity to Produce</span>
          </div>
          <span className="font-bold text-xl">{quantityToProduce}</span>
        </div>

        <Separator />

        {/* Material Costs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Material Cost
            </span>
            <span className="font-semibold">${totalMaterialCost.toFixed(2)}</span>
          </div>
          <div className="text-xs text-muted-foreground pl-6">
            {completedCount} of {weighedIngredients.length} ingredients weighed
          </div>
        </div>

        {/* Labor Costs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Labor Cost
            </span>
            <span className="font-semibold">${laborCost.toFixed(2)}</span>
          </div>
          <div className="text-xs text-muted-foreground pl-6">
            {laborHours} hrs @ ${laborRate}/hr
          </div>
        </div>

        {/* Overhead Costs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Cog className="h-4 w-4 text-muted-foreground" />
              Overhead Cost
            </span>
            <span className="font-semibold">${overheadCost.toFixed(2)}</span>
          </div>
          <div className="text-xs text-muted-foreground pl-6">
            {quantityToProduce} units @ ${overheadRate}/unit
          </div>
        </div>

        <Separator />

        {/* Total Cost */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total Batch Cost</span>
            <span className="font-bold text-2xl text-primary">
              ${totalCost.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
            <span>Cost per Unit</span>
            <span className="font-medium">${costPerUnit.toFixed(4)}</span>
          </div>
        </div>

        {/* Ingredient Breakdown */}
        {weighedIngredients.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Ingredient Breakdown</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {weighedIngredients.map((ing) => (
                <div
                  key={ing.recipeItemId}
                  className="flex items-center justify-between text-xs p-2 rounded bg-muted"
                >
                  <span className={ing.isCompleted ? "" : "text-muted-foreground"}>
                    {ing.materialName}
                  </span>
                  <span className={ing.isCompleted ? "font-medium" : "text-muted-foreground"}>
                    {ing.isCompleted ? `$${ing.totalCost.toFixed(2)}` : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
