import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Factory, Play, Loader2, CheckCircle2, FlaskConical, Beaker } from "lucide-react";
import { ProductSelection } from "@/components/manufacturing/ProductSelection";
import { IngredientWeighingCard } from "@/components/manufacturing/IngredientWeighingCard";
import { ProductionCostSummary } from "@/components/manufacturing/ProductionCostSummary";
import { OverrunCalculator } from "@/components/manufacturing/OverrunCalculator";
import { TrialBatchToggle } from "@/components/manufacturing/TrialBatchToggle";
import { StylusCanvas } from "@/components/manufacturing/StylusCanvas";
import { AllergenAcknowledgmentDialog } from "@/components/manufacturing/AllergenAcknowledgmentDialog";
import {
  useApprovedProducts,
  useProductRecipes,
  useRecipeItems,
  useActiveMachines,
  useCreateProductionLot,
  type WeighedIngredient,
} from "@/hooks/useProductionExecution";
import { useWorkOrder, useCompleteWorkOrder } from "@/hooks/useWorkOrders";

export default function BaseProduction() {
  const [searchParams] = useSearchParams();
  const workOrderId = searchParams.get("wo");
  
  // Fetch work order if provided
  const { data: workOrder } = useWorkOrder(workOrderId);
  
  // Selection state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  
  // Production state
  const [batchMultiplier, setBatchMultiplier] = useState<number>(1);
  const [laborHours, setLaborHours] = useState<string>("1");
  const [machineHours, setMachineHours] = useState<string>("1");
  const [notes, setNotes] = useState<string>("");
  const [isStarted, setIsStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [weighedIngredients, setWeighedIngredients] = useState<WeighedIngredient[]>([]);
  
  // Trial batch state
  const [isTrialBatch, setIsTrialBatch] = useState(false);
  const [trialCanvasData, setTrialCanvasData] = useState<string | null>(null);
  const [showAllergenDialog, setShowAllergenDialog] = useState(false);
  const [allergenAcknowledged, setAllergenAcknowledged] = useState(false);

  // Data fetching
  const { data: products = [], isLoading: productsLoading } = useApprovedProducts();
  const { data: recipes = [], isLoading: recipesLoading } = useProductRecipes(selectedProductId);
  const { data: recipeItems = [], isLoading: itemsLoading } = useRecipeItems(selectedRecipeId);
  const { data: machines = [], isLoading: machinesLoading } = useActiveMachines();
  const createProductionLot = useCreateProductionLot();
  const completeWorkOrder = useCompleteWorkOrder();

  // Pre-populate from work order
  useMemo(() => {
    if (workOrder && !selectedProductId) {
      if (workOrder.product_id) setSelectedProductId(workOrder.product_id);
      if (workOrder.machine_id) setSelectedMachineId(workOrder.machine_id);
      if (workOrder.notes) setNotes(workOrder.notes);
    }
  }, [workOrder]);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);
  const quantityToProduce = (selectedRecipe?.batch_size || 0) * batchMultiplier;

  // Calculate allergen items for acknowledgment dialog
  const allergenItems = useMemo(() => {
    return recipeItems
      .filter((item) => {
        const allergens = item.material?.allergens || [];
        return allergens.length > 0;
      })
      .map((item) => ({
        materialId: item.material_id,
        materialName: item.material?.name || "",
        materialCode: item.material?.code || "",
        allergens: item.material?.allergens || [],
        isApproved: true,
      }));
  }, [recipeItems]);

  const hasAllergens = allergenItems.length > 0;

  // Initialize weighed ingredients when recipe items load
  useMemo(() => {
    if (recipeItems.length > 0 && weighedIngredients.length === 0 && isStarted) {
      setWeighedIngredients(
        recipeItems.map((item) => ({
          recipeItemId: item.id,
          materialId: item.material_id,
          materialName: item.material?.name || "",
          requiredQuantity: 0,
          unitAbbreviation: item.unit?.code || item.material?.usage_unit?.code || "units",
          weighedQuantity: 0,
          selectedLotId: "",
          selectedLotNumber: "",
          costPerUnit: 0,
          totalCost: 0,
          isCompleted: false,
        }))
      );
    }
  }, [recipeItems, isStarted]);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setSelectedRecipeId(null);
    setIsStarted(false);
    setWeighedIngredients([]);
    setCurrentStep(0);
    setAllergenAcknowledged(false);
  };

  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    const recipe = recipes.find((r) => r.id === recipeId);
    if (recipe?.standard_labor_hours) setLaborHours(recipe.standard_labor_hours.toString());
    if (recipe?.standard_machine_hours) setMachineHours(recipe.standard_machine_hours.toString());
    setIsStarted(false);
    setWeighedIngredients([]);
    setCurrentStep(0);
    setAllergenAcknowledged(false);
  };

  const handleStartProduction = () => {
    if (!selectedProductId || !selectedRecipeId || !selectedMachineId) return;
    
    if (hasAllergens && !allergenAcknowledged) {
      setShowAllergenDialog(true);
      return;
    }
    
    startProductionRun();
  };

  const startProductionRun = () => {
    setIsStarted(true);
    setWeighedIngredients(
      recipeItems.map((item) => ({
        recipeItemId: item.id,
        materialId: item.material_id,
        materialName: item.material?.name || "",
        requiredQuantity: 0,
        unitAbbreviation: item.unit?.code || item.material?.usage_unit?.code || "units",
        weighedQuantity: 0,
        selectedLotId: "",
        selectedLotNumber: "",
        costPerUnit: 0,
        totalCost: 0,
        isCompleted: false,
      }))
    );
  };

  const handleAllergenAcknowledge = () => {
    setAllergenAcknowledged(true);
    startProductionRun();
  };

  const handleIngredientComplete = (data: WeighedIngredient) => {
    setWeighedIngredients((prev) =>
      prev.map((ing) => (ing.recipeItemId === data.recipeItemId ? data : ing))
    );
    if (currentStep < recipeItems.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const allIngredientsCompleted = weighedIngredients.every((ing) => ing.isCompleted);
  const canFinish = allIngredientsCompleted && quantityToProduce > 0;

  const handleFinishProduction = () => {
    if (!canFinish || !selectedProductId || !selectedMachineId || !selectedRecipeId) return;

    createProductionLot.mutate(
      {
        productId: selectedProductId,
        machineId: selectedMachineId,
        recipeId: selectedRecipeId,
        quantityProduced: quantityToProduce,
        weighedIngredients,
        laborHours: parseFloat(laborHours) || 0,
        machineHours: parseFloat(machineHours) || 0,
        notes: notes || undefined,
        isTrialBatch,
        trialCanvasData: isTrialBatch ? trialCanvasData : undefined,
        productionStage: "base",
      },
      {
        onSuccess: () => {
          // Complete work order if linked
          if (workOrderId) {
            completeWorkOrder.mutate({ id: workOrderId, actual_quantity: quantityToProduce });
          }
          
          // Reset form
          setSelectedProductId(null);
          setSelectedRecipeId(null);
          setSelectedMachineId(null);
          setBatchMultiplier(1);
          setIsStarted(false);
          setWeighedIngredients([]);
          setCurrentStep(0);
          setNotes("");
          setIsTrialBatch(false);
          setTrialCanvasData(null);
          setAllergenAcknowledged(false);
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Beaker className="h-8 w-8" />
              Base Manufacturing
              {workOrder && (
                <Badge variant="outline" className="ml-2">
                  WO: {workOrder.work_order_number}
                </Badge>
              )}
              {isTrialBatch && (
                <Badge variant="outline" className="ml-2 border-amber-500 text-amber-700">
                  <FlaskConical className="h-3 w-3 mr-1" />
                  R&D Trial
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              Create base mix from raw materials. QA approval required before use in flavoring.
            </p>
          </div>
          <OverrunCalculator />
        </div>

        {/* Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Setup - Base Mix</CardTitle>
            <CardDescription>
              Select product, recipe, and machine to begin base manufacturing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProductSelection
              products={products}
              recipes={recipes}
              machines={machines}
              selectedProductId={selectedProductId}
              selectedRecipeId={selectedRecipeId}
              selectedMachineId={selectedMachineId}
              onProductChange={handleProductChange}
              onRecipeChange={handleRecipeChange}
              onMachineChange={setSelectedMachineId}
              isLoadingProducts={productsLoading}
              isLoadingRecipes={recipesLoading}
              isLoadingMachines={machinesLoading}
              disabled={isStarted}
            />

            {selectedRecipe && (
              <>
                <Separator />
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Batch Multiplier</Label>
                    <Input
                      type="number"
                      min="1"
                      value={batchMultiplier}
                      onChange={(e) => setBatchMultiplier(parseInt(e.target.value) || 1)}
                      disabled={isStarted}
                      className="h-12 text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity to Produce</Label>
                    <div className="h-12 flex items-center px-3 bg-muted rounded-md text-lg font-bold">
                      {quantityToProduce} {selectedRecipe.batch_unit?.code || "units"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Labor Hours</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={laborHours}
                      onChange={(e) => setLaborHours(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Machine Hours</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={machineHours}
                      onChange={(e) => setMachineHours(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Trial Batch Toggle */}
            {selectedRecipe && (
              <TrialBatchToggle
                isTrialBatch={isTrialBatch}
                onToggle={setIsTrialBatch}
                disabled={isStarted}
              />
            )}

            {!isStarted && selectedProductId && selectedRecipeId && selectedMachineId && (
              <Button size="lg" className="w-full h-14 text-lg" onClick={handleStartProduction}>
                <Play className="h-5 w-5 mr-2" />
                Start Base Production
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Production Workflow */}
        {isStarted && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Weighing Steps */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-semibold">Ingredient Weighing</h2>
              {itemsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {recipeItems.map((item, index) => (
                    <IngredientWeighingCard
                      key={item.id}
                      recipeItem={item}
                      batchMultiplier={batchMultiplier}
                      onComplete={handleIngredientComplete}
                      isActive={index === currentStep}
                      isCompleted={weighedIngredients.find((w) => w.recipeItemId === item.id)?.isCompleted || false}
                      completedData={weighedIngredients.find((w) => w.recipeItemId === item.id)}
                      stepNumber={index + 1}
                    />
                  ))}
                </div>
              )}

              {/* Notes and Finish */}
              {allIngredientsCompleted && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      All Ingredients Weighed
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Trial batch canvas */}
                    {isTrialBatch && (
                      <div className="space-y-2">
                        <Label>Trial Notes (Stylus/Touch)</Label>
                        <StylusCanvas onSave={setTrialCanvasData} />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label>Production Notes</Label>
                      <Textarea
                        placeholder="Add any notes about this batch..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button
                      size="lg"
                      className="w-full h-14 text-lg"
                      onClick={handleFinishProduction}
                      disabled={createProductionLot.isPending}
                    >
                      {createProductionLot.isPending ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                      )}
                      Complete Base Production
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Cost Summary */}
            <div className="space-y-4">
              <ProductionCostSummary
                weighedIngredients={weighedIngredients}
                laborHours={parseFloat(laborHours) || 0}
                machineHours={parseFloat(machineHours) || 0}
                quantityToProduce={quantityToProduce}
              />
            </div>
          </div>
        )}
      </div>

      <AllergenAcknowledgmentDialog
        open={showAllergenDialog}
        onOpenChange={setShowAllergenDialog}
        allergenItems={allergenItems}
        onAcknowledge={handleAllergenAcknowledge}
      />
    </AppLayout>
  );
}
