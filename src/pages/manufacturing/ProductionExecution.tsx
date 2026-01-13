import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Factory, Play, Loader2, CheckCircle2, FlaskConical, Beaker, Palette, Package } from "lucide-react";
import { ProductSelection } from "@/components/manufacturing/ProductSelection";
import { IngredientWeighingCard } from "@/components/manufacturing/IngredientWeighingCard";
import { ProductionCostSummary } from "@/components/manufacturing/ProductionCostSummary";
import { OverrunCalculator } from "@/components/manufacturing/OverrunCalculator";
import { TrialBatchToggle } from "@/components/manufacturing/TrialBatchToggle";
import { StylusCanvas } from "@/components/manufacturing/StylusCanvas";
import { AllergenAcknowledgmentDialog } from "@/components/manufacturing/AllergenAcknowledgmentDialog";
import { ProductionStageSelector } from "@/components/manufacturing/ProductionStageSelector";
import { ParentLotSelector } from "@/components/manufacturing/ParentLotSelector";
import {
  useApprovedProducts,
  useProductRecipes,
  useRecipeItems,
  useActiveMachines,
  useCreateProductionLot,
  type WeighedIngredient,
} from "@/hooks/useProductionExecution";
import {
  useApprovedBaseLots,
  useApprovedFlavoredLots,
  type ProductionStage,
} from "@/hooks/useProductionStages";

export default function ProductionExecution() {
  // Stage selection
  const [selectedStage, setSelectedStage] = useState<ProductionStage>("base");
  
  // Selection state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  
  // Parent lot state (for flavoring and finished stages)
  const [selectedParentLotId, setSelectedParentLotId] = useState<string | null>(null);
  const [quantityFromParent, setQuantityFromParent] = useState<number>(0);
  
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
  
  // Get the base product ID for fetching parent lots
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const baseProductId = (selectedProduct as any)?.base_product_id;
  
  // Fetch approved parent lots based on stage
  const { data: approvedBaseLots = [], isLoading: baseLotsLoading } = useApprovedBaseLots(
    selectedStage === "flavoring" ? baseProductId : null
  );
  const { data: approvedFlavoredLots = [], isLoading: flavoredLotsLoading } = useApprovedFlavoredLots(
    selectedStage === "finished" ? selectedProductId : null
  );

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
        isApproved: true, // From approved products, but could check material approval_status
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

  const handleStageChange = (stage: ProductionStage) => {
    setSelectedStage(stage);
    // Reset selections when stage changes
    setSelectedProductId(null);
    setSelectedRecipeId(null);
    setSelectedParentLotId(null);
    setQuantityFromParent(0);
    setIsStarted(false);
    setWeighedIngredients([]);
    setCurrentStep(0);
    setAllergenAcknowledged(false);
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setSelectedRecipeId(null);
    setSelectedParentLotId(null);
    setQuantityFromParent(0);
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
    
    // Check if allergen acknowledgment is needed
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
  
  // For flavoring/finished stages, also need parent lot selected
  const needsParentLot = selectedStage === "flavoring" || selectedStage === "finished";
  const parentLotReady = !needsParentLot || (selectedParentLotId && quantityFromParent > 0);
  
  const canFinish = allIngredientsCompleted && quantityToProduce > 0 && parentLotReady;

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
        productionStage: selectedStage,
        parentLotId: selectedParentLotId,
        quantityConsumedFromParent: quantityFromParent || undefined,
      },
      {
        onSuccess: () => {
          // Reset form
          setSelectedProductId(null);
          setSelectedRecipeId(null);
          setSelectedMachineId(null);
          setSelectedParentLotId(null);
          setQuantityFromParent(0);
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

  // Get stage icon and label for header
  const stageInfo = {
    base: { icon: <Beaker className="h-4 w-4" />, label: "Base Manufacturing", color: "border-blue-500 text-blue-700" },
    flavoring: { icon: <Palette className="h-4 w-4" />, label: "Flavoring", color: "border-purple-500 text-purple-700" },
    finished: { icon: <Package className="h-4 w-4" />, label: "Freezing & Tubbing", color: "border-green-500 text-green-700" },
  }[selectedStage];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Factory className="h-8 w-8" />
              Production Execution
              <Badge variant="outline" className={`ml-2 ${stageInfo.color}`}>
                {stageInfo.icon}
                <span className="ml-1">{stageInfo.label}</span>
              </Badge>
              {isTrialBatch && (
                <Badge variant="outline" className="ml-2 border-amber-500 text-amber-700">
                  <FlaskConical className="h-3 w-3 mr-1" />
                  R&D Trial
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              Multi-stage batch production: Base → Flavoring → Freezing & Tubbing
            </p>
          </div>
          <OverrunCalculator />
        </div>

        {/* Stage Selection */}
        <Card>
          <CardContent className="pt-6">
            <ProductionStageSelector
              selectedStage={selectedStage}
              onStageChange={handleStageChange}
              disabled={isStarted}
            />
          </CardContent>
        </Card>

        {/* Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Setup - {stageInfo.label}</CardTitle>
            <CardDescription>
              {selectedStage === "base" && "Create base mix from raw materials"}
              {selectedStage === "flavoring" && "Add flavors to an approved base lot"}
              {selectedStage === "finished" && "Package flavored product into finished goods"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Parent Lot Selection for Flavoring Stage */}
            {selectedStage === "flavoring" && selectedProductId && (
              <ParentLotSelector
                parentLots={approvedBaseLots}
                selectedLotId={selectedParentLotId}
                onLotSelect={setSelectedParentLotId}
                quantityToConsume={quantityFromParent}
                onQuantityChange={setQuantityFromParent}
                isLoading={baseLotsLoading}
                disabled={isStarted}
                stageLabel="base"
              />
            )}

            {/* Parent Lot Selection for Finished Stage */}
            {selectedStage === "finished" && selectedProductId && (
              <ParentLotSelector
                parentLots={approvedFlavoredLots}
                selectedLotId={selectedParentLotId}
                onLotSelect={setSelectedParentLotId}
                quantityToConsume={quantityFromParent}
                onQuantityChange={setQuantityFromParent}
                isLoading={flavoredLotsLoading}
                disabled={isStarted}
                stageLabel="flavored"
              />
            )}

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
                Start Production Run
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
                      Complete Production Run
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Production Notes (Optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any notes about this batch..."
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
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          Complete & Save Production Lot
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Cost Summary Sidebar */}
            <div className="space-y-4">
              <ProductionCostSummary
                weighedIngredients={weighedIngredients}
                quantityToProduce={quantityToProduce}
                laborHours={parseFloat(laborHours) || 0}
                machineHours={parseFloat(machineHours) || 0}
                isTrialBatch={isTrialBatch}
              />

              {/* Trial Canvas for R&D batches */}
              {isTrialBatch && (
                <StylusCanvas
                  onSave={setTrialCanvasData}
                  initialImage={trialCanvasData || undefined}
                />
              )}
            </div>
          </div>
        )}

        {/* Allergen Acknowledgment Dialog */}
        <AllergenAcknowledgmentDialog
          open={showAllergenDialog}
          onOpenChange={setShowAllergenDialog}
          allergenItems={allergenItems}
          onAcknowledge={handleAllergenAcknowledge}
          isTrialBatch={isTrialBatch}
        />
      </div>
    </AppLayout>
  );
}
