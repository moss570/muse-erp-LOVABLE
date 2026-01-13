import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Scale,
  Package,
  Calendar,
  DollarSign,
  Loader2,
  Edit3,
  Link as LinkIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { RecipeItem, AvailableLot, WeighedIngredient, LinkedMaterial } from "@/hooks/useProductionExecution";
import { useAvailableLots, useLinkedMaterials } from "@/hooks/useProductionExecution";
import { AdjustmentDialog } from "@/components/inventory/AdjustmentDialog";

interface IngredientWeighingCardProps {
  recipeItem: RecipeItem;
  batchMultiplier: number;
  onComplete: (data: WeighedIngredient) => void;
  isActive: boolean;
  isCompleted: boolean;
  completedData?: WeighedIngredient;
  stepNumber: number;
}

export function IngredientWeighingCard({
  recipeItem,
  batchMultiplier,
  onComplete,
  isActive,
  isCompleted,
  completedData,
  stepNumber,
}: IngredientWeighingCardProps) {
  // Selected material from linked materials (for new listed_material workflow)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [selectedLotId, setSelectedLotId] = useState<string>("");
  const [weighedQuantity, setWeighedQuantity] = useState<string>("");
  const [showAllergenWarning, setShowAllergenWarning] = useState(false);
  const [allergenAcknowledged, setAllergenAcknowledged] = useState(false);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);

  // Fetch linked materials for the listed material (new workflow)
  const { data: linkedMaterials = [], isLoading: linkedMaterialsLoading } = useLinkedMaterials(
    isActive ? recipeItem.listed_material_id : null
  );

  // Determine which material to use for lot lookup
  // - If user selected a material from linked materials, use that
  // - Otherwise fall back to the legacy direct material_id
  const effectiveMaterialId = selectedMaterialId || recipeItem.material_id || 
    (linkedMaterials.length === 1 ? linkedMaterials[0].id : "");

  const { data: availableLots = [], isLoading: lotsLoading } = useAvailableLots(
    isActive && effectiveMaterialId ? effectiveMaterialId : null
  );

  // Calculate required quantity with wastage
  const wastageMultiplier = 1 + (recipeItem.wastage_percentage || 0) / 100;
  const requiredQuantity = recipeItem.quantity_required * batchMultiplier * wastageMultiplier;
  
  // Get the selected material details (from linked materials or legacy direct material)
  const selectedMaterial = linkedMaterials.find(m => m.id === selectedMaterialId) || recipeItem.material;
  const unitAbbreviation = selectedMaterial?.usage_unit?.code || recipeItem.unit?.code || "units";

  // Get selected lot details
  const selectedLot = availableLots.find((lot) => lot.id === selectedLotId);
  const costPerUnit = selectedLot?.landed_cost?.cost_per_base_unit || 0;

  // Check for allergens from the selected material
  const allergens = selectedMaterial?.allergens || [];
  const hasAllergens = allergens.length > 0;

  // Display name: prefer listed material name, fall back to material name
  const displayName = recipeItem.listed_material?.name || recipeItem.material?.name || "Unknown";
  const displayCode = recipeItem.listed_material?.code || recipeItem.material?.code || "";

  // Determine if we need material selection (has listed_material with multiple linked materials)
  const needsMaterialSelection = recipeItem.listed_material_id && linkedMaterials.length > 1;
  const hasSingleLinkedMaterial = recipeItem.listed_material_id && linkedMaterials.length === 1;

  // Auto-select if only one linked material
  useEffect(() => {
    if (hasSingleLinkedMaterial && !selectedMaterialId && isActive) {
      setSelectedMaterialId(linkedMaterials[0].id);
    }
  }, [hasSingleLinkedMaterial, linkedMaterials, selectedMaterialId, isActive]);

  useEffect(() => {
    if (hasAllergens && isActive && !allergenAcknowledged) {
      setShowAllergenWarning(true);
    }
  }, [hasAllergens, isActive, allergenAcknowledged]);

  // Auto-select first lot (FEFO) when material is selected
  useEffect(() => {
    if (availableLots.length > 0 && !selectedLotId && isActive && effectiveMaterialId) {
      setSelectedLotId(availableLots[0].id);
    }
  }, [availableLots, selectedLotId, isActive, effectiveMaterialId]);

  // Pre-fill required quantity
  useEffect(() => {
    if (isActive && !weighedQuantity) {
      setWeighedQuantity(requiredQuantity.toFixed(2));
    }
  }, [isActive, requiredQuantity, weighedQuantity]);

  const handleConfirm = () => {
    if (!selectedLot || !weighedQuantity || !effectiveMaterialId) return;

    const qty = parseFloat(weighedQuantity);
    onComplete({
      recipeItemId: recipeItem.id,
      materialId: effectiveMaterialId,
      materialName: selectedMaterial?.name || displayName,
      requiredQuantity,
      unitAbbreviation,
      weighedQuantity: qty,
      selectedLotId: selectedLot.id,
      selectedLotNumber: selectedLot.internal_lot_number,
      costPerUnit,
      totalCost: qty * costPerUnit,
      isCompleted: true,
    });
  };

  const isQuantityValid = () => {
    const qty = parseFloat(weighedQuantity);
    return !isNaN(qty) && qty > 0 && selectedLot && qty <= (selectedLot.current_quantity || 0);
  };

  const getQuantityWarning = () => {
    const qty = parseFloat(weighedQuantity);
    if (isNaN(qty)) return null;
    
    const diff = qty - requiredQuantity;
    const percentDiff = (diff / requiredQuantity) * 100;
    
    if (Math.abs(percentDiff) > 5) {
      return {
        type: diff > 0 ? "over" : "under",
        percent: Math.abs(percentDiff).toFixed(1),
      };
    }
    return null;
  };

  const quantityWarning = getQuantityWarning();

  if (isCompleted && completedData) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white font-bold">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">{displayName}</CardTitle>
            </div>
            <Badge variant="outline" className="border-green-500 text-green-700">
              Completed
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Weighed:</span>
              <span className="ml-2 font-semibold">
                {completedData.weighedQuantity.toFixed(2)} {completedData.unitAbbreviation}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Lot:</span>
              <span className="ml-2 font-mono">{completedData.selectedLotNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cost:</span>
              <span className="ml-2 font-semibold">${completedData.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all",
      isActive ? "border-primary shadow-lg" : "opacity-60"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full font-bold",
              isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {stepNumber}
            </div>
            <div>
              <CardTitle className="text-lg">{displayName}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono">{displayCode}</p>
            </div>
          </div>
          {hasAllergens && (
            <div className="flex flex-wrap gap-1">
              {allergens.map((allergen) => (
                <Badge key={allergen} variant="destructive" className="text-xs">
                  {allergen}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Allergen Warning Modal */}
        {showAllergenWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full border-amber-500 bg-amber-50 dark:bg-amber-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-6 w-6" />
                  Allergen Warning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>This ingredient contains the following allergens:</p>
                <div className="flex flex-wrap gap-2">
                  {allergens.map((allergen) => (
                    <Badge key={allergen} variant="destructive" className="text-sm">
                      {allergen}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Please ensure proper handling procedures are followed.
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    setAllergenAcknowledged(true);
                    setShowAllergenWarning(false);
                  }}
                >
                  I Acknowledge
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Required Quantity */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
          <Scale className="h-5 w-5 text-muted-foreground" />
          <span className="text-muted-foreground">Required:</span>
          <span className="font-bold text-lg">
            {requiredQuantity.toFixed(2)} {unitAbbreviation}
          </span>
          {recipeItem.wastage_percentage && recipeItem.wastage_percentage > 0 && (
            <span className="text-xs text-muted-foreground">
              (includes {recipeItem.wastage_percentage}% wastage)
            </span>
          )}
        </div>

        {/* Material Selection (for Listed Materials with multiple linked materials) */}
        {needsMaterialSelection && (
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Select Material Supplier
            </Label>
            {linkedMaterialsLoading ? (
              <div className="flex items-center gap-2 h-12 px-3 border rounded-md bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Loading linked materials...</span>
              </div>
            ) : (
              <Select
                value={selectedMaterialId}
                onValueChange={(id) => {
                  setSelectedMaterialId(id);
                  setSelectedLotId(""); // Reset lot when material changes
                }}
                disabled={!isActive}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a material supplier" />
                </SelectTrigger>
                <SelectContent>
                  {linkedMaterials.map((mat) => (
                    <SelectItem key={mat.id} value={mat.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{mat.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{mat.code}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Lot Selection */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Select Lot (FEFO Order)</Label>
          {lotsLoading ? (
            <div className="flex items-center gap-2 h-12 px-3 border rounded-md bg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Loading available lots...</span>
            </div>
          ) : availableLots.length === 0 ? (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              No available lots found for this material
            </div>
          ) : (
            <Select
              value={selectedLotId}
              onValueChange={setSelectedLotId}
              disabled={!isActive}
            >
              <SelectTrigger className="h-14">
                <SelectValue placeholder="Select a lot" />
              </SelectTrigger>
              <SelectContent>
                {availableLots.map((lot, index) => (
                  <SelectItem key={lot.id} value={lot.id} className="py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{lot.internal_lot_number}</span>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">FEFO</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {lot.current_quantity?.toFixed(2)} avail
                        </span>
                        {lot.expiry_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Exp: {format(new Date(lot.expiry_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Weighed Quantity Input */}
        <div className="space-y-2">
          <Label htmlFor="quantity" className="text-base font-semibold">
            Actual Weighed Quantity
          </Label>
          <div className="flex gap-2">
            <Input
              id="quantity"
              type="number"
              step="0.01"
              value={weighedQuantity}
              onChange={(e) => setWeighedQuantity(e.target.value)}
              className="h-14 text-2xl font-mono"
              disabled={!isActive}
              placeholder="0.00"
            />
            <div className="flex items-center px-4 bg-muted rounded-md text-lg font-medium">
              {unitAbbreviation}
            </div>
          </div>
          {quantityWarning && (
            <div className={cn(
              "text-sm font-medium",
              quantityWarning.type === "over" ? "text-amber-600" : "text-blue-600"
            )}>
              {quantityWarning.type === "over" ? "+" : "-"}{quantityWarning.percent}% from recipe
            </div>
          )}
          {selectedLot && parseFloat(weighedQuantity) > (selectedLot.current_quantity || 0) && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-destructive font-medium">
                Exceeds available quantity ({selectedLot.current_quantity?.toFixed(2)})
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdjustmentDialog(true)}
                className="gap-1"
              >
                <Edit3 className="h-3 w-3" />
                Correct Inventory
              </Button>
            </div>
          )}
        </div>

        {/* Cost Preview */}
        {selectedLot && weighedQuantity && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-muted-foreground">Material Cost:</span>
            <span className="font-bold text-lg text-primary">
              ${(parseFloat(weighedQuantity || "0") * costPerUnit).toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">
              (@ ${costPerUnit.toFixed(4)}/{unitAbbreviation})
            </span>
          </div>
        )}

        {/* Notes */}
        {recipeItem.notes && (
          <div className="text-sm text-muted-foreground italic p-2 bg-muted rounded">
            Note: {recipeItem.notes}
          </div>
        )}

        {/* Confirm Button */}
        <Button
          className="w-full h-14 text-lg"
          onClick={handleConfirm}
          disabled={!isActive || !isQuantityValid() || (hasAllergens && !allergenAcknowledged)}
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Confirm Weighed
        </Button>

        {/* Adjustment Dialog */}
        {selectedLot && (
          <AdjustmentDialog
            open={showAdjustmentDialog}
            onOpenChange={setShowAdjustmentDialog}
            lotId={selectedLot.id}
          />
        )}
      </CardContent>
    </Card>
  );
}
