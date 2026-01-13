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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Factory, Play, Loader2, CheckCircle2, Palette, Snowflake, Package, Link as LinkIcon } from "lucide-react";
import { ProductSelection } from "@/components/manufacturing/ProductSelection";
import { IngredientWeighingCard } from "@/components/manufacturing/IngredientWeighingCard";
import { ProductionCostSummary } from "@/components/manufacturing/ProductionCostSummary";
import { OverrunCalculator } from "@/components/manufacturing/OverrunCalculator";
import { format } from "date-fns";
import {
  useApprovedProducts,
  useProductRecipes,
  useRecipeItems,
  useActiveMachines,
  useCreateProductionLot,
  type WeighedIngredient,
} from "@/hooks/useProductionExecution";
import { useWorkOrder, useCompleteWorkOrder, useApprovedLotsForWorkOrder } from "@/hooks/useWorkOrders";

type FinishingStage = "flavoring" | "freezing" | "case_pack";

export default function FinishingProduction() {
  const [searchParams] = useSearchParams();
  const workOrderId = searchParams.get("wo");
  
  // Fetch work order if provided
  const { data: workOrder } = useWorkOrder(workOrderId);
  
  // Stage selection
  const [selectedStage, setSelectedStage] = useState<FinishingStage>("flavoring");
  
  // Selection state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  
  // Source lot state
  const [selectedSourceLotId, setSelectedSourceLotId] = useState<string | null>(null);
  const [quantityToConsume, setQuantityToConsume] = useState<number>(0);
  
  // Production state
  const [batchMultiplier, setBatchMultiplier] = useState<number>(1);
  const [laborHours, setLaborHours] = useState<string>("1");
  const [machineHours, setMachineHours] = useState<string>("1");
  const [notes, setNotes] = useState<string>("");
  const [isStarted, setIsStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [weighedIngredients, setWeighedIngredients] = useState<WeighedIngredient[]>([]);

  // Data fetching
  const { data: products = [], isLoading: productsLoading } = useApprovedProducts();
  const { data: recipes = [], isLoading: recipesLoading } = useProductRecipes(selectedProductId);
  const { data: recipeItems = [], isLoading: itemsLoading } = useRecipeItems(selectedRecipeId);
  const { data: machines = [], isLoading: machinesLoading } = useActiveMachines();
  const createProductionLot = useCreateProductionLot();
  const completeWorkOrder = useCompleteWorkOrder();
  
  // Fetch approved source lots
  const sourceStage = selectedStage === "flavoring" ? "base" : "flavoring";
  const { data: sourceLots = [], isLoading: sourceLotsLoading } = useApprovedLotsForWorkOrder(sourceStage);
  
  const selectedSourceLot = sourceLots.find((lot: any) => lot.id === selectedSourceLotId);

  // Pre-populate from work order
  useMemo(() => {
    if (workOrder && !selectedProductId) {
      if (workOrder.product_id) setSelectedProductId(workOrder.product_id);
      if (workOrder.machine_id) setSelectedMachineId(workOrder.machine_id);
      if (workOrder.source_production_lot_id) setSelectedSourceLotId(workOrder.source_production_lot_id);
      if (workOrder.quantity_to_consume) setQuantityToConsume(workOrder.quantity_to_consume);
      if (workOrder.notes) setNotes(workOrder.notes);
      if (workOrder.work_order_type && workOrder.work_order_type !== "base") {
        setSelectedStage(workOrder.work_order_type as FinishingStage);
      }
    }
  }, [workOrder]);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);
  const quantityToProduce = (selectedRecipe?.batch_size || 0) * batchMultiplier;

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

  const handleStageChange = (stage: FinishingStage) => {
    setSelectedStage(stage);
    setSelectedSourceLotId(null);
    setQuantityToConsume(0);
    setSelectedProductId(null);
    setSelectedRecipeId(null);
    setIsStarted(false);
    setWeighedIngredients([]);
    setCurrentStep(0);
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setSelectedRecipeId(null);
    setIsStarted(false);
    setWeighedIngredients([]);
    setCurrentStep(0);
  };

  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    const recipe = recipes.find((r) => r.id === recipeId);
    if (recipe?.standard_labor_hours) setLaborHours(recipe.standard_labor_hours.toString());
    if (recipe?.standard_machine_hours) setMachineHours(recipe.standard_machine_hours.toString());
    setIsStarted(false);
    setWeighedIngredients([]);
    setCurrentStep(0);
  };

  const canStart = selectedProductId && selectedRecipeId && selectedMachineId && selectedSourceLotId && quantityToConsume > 0;

  const handleStartProduction = () => {
    if (!canStart) return;
    
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

  const handleIngredientComplete = (data: WeighedIngredient) => {
    setWeighedIngredients((prev) =>
      prev.map((ing) => (ing.recipeItemId === data.recipeItemId ? data : ing))
    );
    if (currentStep < recipeItems.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const allIngredientsCompleted = weighedIngredients.length === 0 || weighedIngredients.every((ing) => ing.isCompleted);
  const canFinish = allIngredientsCompleted && quantityToProduce > 0 && selectedSourceLotId;

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
        isTrialBatch: false,
        productionStage: selectedStage === "case_pack" ? "finished" : selectedStage,
        parentLotId: selectedSourceLotId,
        quantityConsumedFromParent: quantityToConsume,
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
          setSelectedSourceLotId(null);
          setQuantityToConsume(0);
          setBatchMultiplier(1);
          setIsStarted(false);
          setWeighedIngredients([]);
          setCurrentStep(0);
          setNotes("");
        },
      }
    );
  };

  const stageConfig = {
    flavoring: { label: "Flavoring", icon: <Palette className="h-5 w-5" />, sourceLabel: "base", color: "text-purple-600" },
    freezing: { label: "Freezing", icon: <Snowflake className="h-5 w-5" />, sourceLabel: "flavored", color: "text-cyan-600" },
    case_pack: { label: "Case Pack", icon: <Package className="h-5 w-5" />, sourceLabel: "frozen", color: "text-amber-600" },
  };

  const currentStageConfig = stageConfig[selectedStage];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              {currentStageConfig.icon}
              <span className={currentStageConfig.color}>Finishing Production</span>
              {workOrder && (
                <Badge variant="outline" className="ml-2">
                  WO: {workOrder.work_order_number}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              Flavoring, Freezing, and Case Pack workflows using approved base/flavored lots
            </p>
          </div>
          <OverrunCalculator />
        </div>

        {/* Stage Selection */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={selectedStage} onValueChange={(v) => handleStageChange(v as FinishingStage)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="flavoring" className="gap-2" disabled={isStarted}>
                  <Palette className="h-4 w-4" /> Flavoring
                </TabsTrigger>
                <TabsTrigger value="freezing" className="gap-2" disabled={isStarted}>
                  <Snowflake className="h-4 w-4" /> Freezing
                </TabsTrigger>
                <TabsTrigger value="case_pack" className="gap-2" disabled={isStarted}>
                  <Package className="h-4 w-4" /> Case Pack
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Source Lot Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Select Source Lot
            </CardTitle>
            <CardDescription>
              Choose an approved {currentStageConfig.sourceLabel} lot to use for this production
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sourceLotsLoading ? (
              <div className="flex items-center gap-2 p-4 rounded-lg border bg-muted/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Loading approved lots...</span>
              </div>
            ) : sourceLots.length === 0 ? (
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                <p className="text-amber-700 dark:text-amber-400 font-medium">
                  No approved {currentStageConfig.sourceLabel} lots available
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                  Complete and get QA approval for a {currentStageConfig.sourceLabel} batch first.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Source Lot</Label>
                  <Select
                    value={selectedSourceLotId || ""}
                    onValueChange={setSelectedSourceLotId}
                    disabled={isStarted}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select a lot" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceLots.map((lot: any) => (
                        <SelectItem key={lot.id} value={lot.id}>
                          <div className="flex flex-col">
                            <span className="font-mono font-medium">{lot.lot_number}</span>
                            <span className="text-xs text-muted-foreground">
                              {lot.product?.name} • {lot.quantity_available?.toFixed(2)} available
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedSourceLot && (
                  <div className="space-y-2">
                    <Label>Quantity to Consume</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={quantityToConsume || ""}
                        onChange={(e) => setQuantityToConsume(parseFloat(e.target.value) || 0)}
                        max={selectedSourceLot.quantity_available || 0}
                        disabled={isStarted}
                        className="h-12 font-mono"
                      />
                      <div className="h-12 flex items-center px-3 bg-muted rounded-md text-sm">
                        of {selectedSourceLot.quantity_available?.toFixed(2)} available
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Setup - {currentStageConfig.label}</CardTitle>
            <CardDescription>
              Select the output product and recipe for this finishing stage
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

            {!isStarted && canStart && (
              <Button size="lg" className="w-full h-14 text-lg" onClick={handleStartProduction}>
                <Play className="h-5 w-5 mr-2" />
                Start {currentStageConfig.label} Production
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Production Workflow */}
        {isStarted && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Weighing Steps (if recipe has items) */}
            <div className="lg:col-span-2 space-y-4">
              {recipeItems.length > 0 ? (
                <>
                  <h2 className="text-xl font-semibold">Additional Ingredients</h2>
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
                </>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No additional ingredients required for this stage.</p>
                    <p className="text-sm">The source lot will be consumed directly.</p>
                  </CardContent>
                </Card>
              )}

              {/* Finish Card */}
              {allIngredientsCompleted && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Ready to Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Source Lot:</span>
                          <p className="font-mono font-medium">{selectedSourceLot?.lot_number}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Consuming:</span>
                          <p className="font-mono font-medium">{quantityToConsume} units</p>
                        </div>
                      </div>
                    </div>
                    
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
                      Complete {currentStageConfig.label}
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
    </AppLayout>
  );
}
