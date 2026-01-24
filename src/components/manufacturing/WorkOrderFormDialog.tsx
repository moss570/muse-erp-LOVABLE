import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { InputAvailabilityPanel } from "./InputAvailabilityPanel";
import { TubYieldProjectionPanel } from "./TubYieldProjectionPanel";
import { ParLevelSummaryPanel } from "./ParLevelSummaryPanel";
import { VolumeConversionDisplay } from "./VolumeConversionDisplay";
import { UnfulfilledOrdersPanel } from "./UnfulfilledOrdersPanel";

export interface WorkOrder {
  id: string;
  wo_number: string;
  wo_status: string;
  wo_type: string;
  product_id: string | null;
  recipe_id: string | null;
  production_line_id: string | null;
  target_quantity: number;
  target_uom: string;
  priority: string;
  scheduled_date: string | null;
  due_date: string | null;
  special_instructions: string | null;
  target_stage_code: string | null;
  product_size_id: string | null;
  input_lot_id: string | null;
}

interface WorkOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder?: WorkOrder | null;
  canEdit?: boolean;
}

interface ProductionStage {
  id: string;
  stage_code: string;
  stage_name: string;
  sequence_order: number;
  creates_intermediate_lot: boolean;
  default_output_uom: string;
  default_line_id: string | null;
}

interface ProductSize {
  id: string;
  sku: string;
  size_name: string;
  size_value: number;
  size_type: string | null;
  units_per_case: number | null;
  container_size?: { name: string; volume_gallons: number } | null;
}

interface WipLot {
  id: string;
  lot_number: string;
  production_stage: string;
  quantity_available: number;
  volume_uom: string | null;
  approval_status: string;
  product?: { name: string; sku: string } | null;
  product_size?: { sku: string; size_name: string } | null;
}

interface Recipe {
  id: string;
  recipe_name: string;
  recipe_version: string;
  batch_size: number;
  batch_weight_kg: number;
  batch_volume: number | null;
  batch_volume_unit: string | null;
}

interface StageCategoryMapping {
  stage_code: string;
  category_code: string;
}

export function WorkOrderFormDialog({ open, onOpenChange, workOrder, canEdit = false }: WorkOrderFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!workOrder;
  const isInProgress = workOrder?.wo_status === "In Progress";
  const isCompleted = workOrder?.wo_status === "Completed";

  const [productId, setProductId] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [productionLineId, setProductionLineId] = useState("");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [targetUom, setTargetUom] = useState("kg");
  const [priority, setPriority] = useState("Standard");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [specialInstructions, setSpecialInstructions] = useState("");
  
  // Multi-stage workflow fields
  const [targetStageCode, setTargetStageCode] = useState("");
  const [productSizeId, setProductSizeId] = useState("");
  const [inputLotId, setInputLotId] = useState("");
  
  // Track if edit mode data has been initialized
  const [editDataInitialized, setEditDataInitialized] = useState(false);

  // Pre-populate form when editing - set fields that don't depend on queries first
  useEffect(() => {
    if (open && workOrder) {
      // Set independent fields immediately
      setProductionLineId(workOrder.production_line_id || "");
      setTargetQuantity(workOrder.target_quantity?.toString() || "");
      setTargetUom(workOrder.target_uom || "kg");
      setPriority(workOrder.priority || "Standard");
      setScheduledDate(workOrder.scheduled_date ? parseISO(workOrder.scheduled_date) : undefined);
      setDueDate(workOrder.due_date ? parseISO(workOrder.due_date) : undefined);
      setSpecialInstructions(workOrder.special_instructions || "");
      setProductSizeId(workOrder.product_size_id || "");
      setInputLotId(workOrder.input_lot_id || "");
      
      // Set the stage code which triggers the products query
      setTargetStageCode(workOrder.target_stage_code || "");
      
      // Mark that we need to set dependent values once queries load
      setEditDataInitialized(false);
    } else if (open && !workOrder) {
      resetForm();
      setEditDataInitialized(true);
    }
  }, [open, workOrder]);

  // Fetch production stages
  const { data: productionStages = [] } = useQuery({
    queryKey: ["production-stages-for-wo"],
    queryFn: async (): Promise<ProductionStage[]> => {
      const { data, error } = await supabase
        .from("production_stages_master")
        .select("id, stage_code, stage_name, sequence_order, creates_intermediate_lot, default_output_uom, default_line_id")
        .eq("is_active", true)
        .order("sequence_order");

      if (error) throw error;
      return (data || []) as unknown as ProductionStage[];
    },
    enabled: open,
  });

  // Fetch stage-category mappings
  const { data: stageCategoryMappings = [] } = useQuery({
    queryKey: ["stage-category-mappings"],
    queryFn: async (): Promise<StageCategoryMapping[]> => {
      const { data, error } = await supabase
        .from("stage_category_mapping")
        .select("stage_code, category_code");

      if (error) throw error;
      return (data || []) as StageCategoryMapping[];
    },
    enabled: open,
  });

  // Fetch production lines
  const { data: productionLines = [] } = useQuery({
    queryKey: ["production-lines-for-wo"],
    queryFn: async (): Promise<{ id: string; line_name: string; line_code: string }[]> => {
      const { data, error } = await (supabase.from("production_lines") as any)
        .select("id, line_name, line_code")
        .eq("is_active", true)
        .order("line_name");

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Get current stage configuration
  const selectedStage = useMemo(() => {
    return productionStages.find(s => s.stage_code === targetStageCode);
  }, [productionStages, targetStageCode]);

  // Auto-set default production line when stage changes
  useEffect(() => {
    if (selectedStage?.default_line_id && !productionLineId && !isEditMode) {
      setProductionLineId(selectedStage.default_line_id);
    }
  }, [selectedStage, productionLineId, isEditMode]);

  // Get allowed category codes for the selected stage
  const allowedCategories = useMemo(() => {
    if (!targetStageCode) return [];
    return stageCategoryMappings
      .filter(m => m.stage_code === targetStageCode)
      .map(m => m.category_code);
  }, [targetStageCode, stageCategoryMappings]);

  // Fetch products - filtered by stage/category using product_categories.code
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-wo", targetStageCode, allowedCategories, isEditMode ? workOrder?.product_id : null],
    queryFn: async (): Promise<{ id: string; name: string; sku: string; category_code: string | null; is_family_head: boolean }[]> => {
      // First, get products with their category codes
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, 
          name, 
          sku, 
          is_family_head,
          product_category:product_categories(code)
        `)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      
      // Map and filter based on stage
      const productsWithCategory = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category_code: p.product_category?.code || null,
        is_family_head: p.is_family_head || false,
      }));

      // Filter by stage
      let filteredProducts: typeof productsWithCategory;
      if (targetStageCode === "BASE_PREP") {
        filteredProducts = productsWithCategory.filter(p => p.category_code === "BASE");
      } else if (targetStageCode === "FLAVOR" && allowedCategories.length > 0) {
        filteredProducts = productsWithCategory.filter(p => 
          allowedCategories.includes(p.category_code || "") && p.is_family_head
        );
      } else if ((targetStageCode === "FREEZE" || targetStageCode === "CASE_PACK") && allowedCategories.length > 0) {
        filteredProducts = productsWithCategory.filter(p => 
          allowedCategories.includes(p.category_code || "")
        );
      } else {
        filteredProducts = productsWithCategory;
      }
      
      // In edit mode, ensure the current product is always included in the list
      if (isEditMode && workOrder?.product_id) {
        const currentProductExists = filteredProducts.some(p => p.id === workOrder.product_id);
        if (!currentProductExists) {
          const currentProduct = productsWithCategory.find(p => p.id === workOrder.product_id);
          if (currentProduct) {
            filteredProducts = [currentProduct, ...filteredProducts];
          }
        }
      }
      
      return filteredProducts;
    },
    enabled: open && !!targetStageCode,
  });

  // Fetch product sizes for the selected product - WITH SMART FILTERING BY STAGE
  const { data: productSizes = [] } = useQuery({
    queryKey: ["product-sizes-for-wo", productId, targetStageCode],
    queryFn: async (): Promise<ProductSize[]> => {
      if (!productId) return [];
      
      let query = supabase
        .from("product_sizes")
        .select("id, sku, size_name, size_value, size_type, units_per_case, container_size:container_sizes(name, volume_gallons)")
        .eq("product_id", productId)
        .eq("is_active", true);
      
      // Filter by size_type based on selected stage
      if (targetStageCode === "FREEZE") {
        query = query.eq("size_type", "unit");
      } else if (targetStageCode === "CASE_PACK") {
        query = query.eq("size_type", "case");
      }

      const { data, error } = await query.order("size_value");
      if (error) throw error;
      return (data || []) as unknown as ProductSize[];
    },
    enabled: !!productId && open,
  });

  // Fetch available WIP lots for input (based on selected stage)
  const { data: availableWipLots = [] } = useQuery({
    queryKey: ["wip-lots-for-wo", productId, targetStageCode],
    queryFn: async (): Promise<WipLot[]> => {
      if (!productId || !targetStageCode) return [];
      
      // Determine which stage's output we need as input
      const currentStageIndex = productionStages.findIndex(s => s.stage_code === targetStageCode);
      if (currentStageIndex <= 0) return []; // BASE_PREP doesn't need input lots
      
      const previousStage = productionStages[currentStageIndex - 1];
      
      const { data, error } = await supabase
        .from("production_lots")
        .select(`
          id,
          lot_number,
          production_stage,
          quantity_available,
          volume_uom,
          approval_status,
          product:products(name, sku),
          product_size:product_sizes(sku, size_name)
        `)
        .eq("product_id", productId)
        .eq("production_stage", previousStage.stage_code)
        .eq("approval_status", "Approved")
        .gt("quantity_available", 0)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as WipLot[];
    },
    enabled: !!productId && !!targetStageCode && open,
  });

  // Fetch recipes for selected product
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes-for-wo", productId],
    queryFn: async (): Promise<Recipe[]> => {
      if (!productId) return [];
      const { data, error } = await (supabase.from("product_recipes") as any)
        .select("id, recipe_name, recipe_version, batch_size, batch_weight_kg, batch_volume, batch_volume_unit")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("recipe_version", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId && open,
  });

  // Set productId once products query loads in edit mode
  useEffect(() => {
    if (open && workOrder && !editDataInitialized && products.length > 0 && workOrder.product_id) {
      // Products are loaded, set the product ID
      const productExists = products.some(p => p.id === workOrder.product_id);
      if (productExists || products.length > 0) {
        setProductId(workOrder.product_id);
      }
    }
  }, [open, workOrder, products, editDataInitialized]);

  // Set recipeId once recipes query loads in edit mode
  useEffect(() => {
    if (open && workOrder && !editDataInitialized && productId && recipes.length > 0 && workOrder.recipe_id) {
      // Recipes are loaded, set the recipe ID
      const recipeExists = recipes.some(r => r.id === workOrder.recipe_id);
      if (recipeExists) {
        setRecipeId(workOrder.recipe_id);
        setEditDataInitialized(true);
      }
    } else if (open && workOrder && !editDataInitialized && productId && recipes.length === 0 && !workOrder.recipe_id) {
      // No recipe was set, mark as initialized
      setEditDataInitialized(true);
    }
  }, [open, workOrder, productId, recipes, editDataInitialized]);

  // Get selected recipe for volume calculation
  const selectedRecipe = useMemo(() => {
    return recipes.find(r => r.id === recipeId);
  }, [recipes, recipeId]);

  // Determine if we need product size selection (FREEZE, CASE_PACK)
  const needsProductSize = useMemo(() => {
    return ["FREEZE", "CASE_PACK"].includes(targetStageCode);
  }, [targetStageCode]);

  // Get dynamic label for product size based on stage
  const productSizeLabel = useMemo(() => {
    if (targetStageCode === "FREEZE") return "Output Tub Size (individual units)";
    if (targetStageCode === "CASE_PACK") return "Output Case Configuration";
    return "Output Product Size";
  }, [targetStageCode]);

  // Determine if we need input lot selection (everything except BASE_PREP)
  const needsInputLot = useMemo(() => {
    return targetStageCode && targetStageCode !== "BASE_PREP";
  }, [targetStageCode]);

  // Get UOM settings based on stage
  const stageUomSettings = useMemo(() => {
    if (!selectedStage) return { uom: "kg", label: "Target Quantity", isLocked: false };
    
    switch (targetStageCode) {
      case "BASE_PREP":
      case "FLAVOR":
        return { uom: "kg", label: "Target Quantity (KG)", isLocked: true };
      case "FREEZE":
      case "CASE_PACK":
        return { uom: "units", label: "Target Quantity (Units)", isLocked: true };
      default:
        return { uom: selectedStage.default_output_uom === "EA" ? "units" : "kg", label: "Target Quantity", isLocked: false };
    }
  }, [selectedStage, targetStageCode]);

  // Create work order mutation
  const createWorkOrderMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();

      // Generate WO number using the database function
      const { data: woNumber, error: woNumError } = await supabase.rpc("generate_wo_number");
      if (woNumError) throw woNumError;

      const finalUom = stageUomSettings.isLocked ? stageUomSettings.uom : targetUom;

      const insertData = {
        wo_number: woNumber as string,
        wo_type: "Make-to-Stock",
        product_id: productId,
        recipe_id: recipeId || null,
        production_line_id: productionLineId || null,
        target_quantity: parseFloat(targetQuantity),
        target_uom: finalUom,
        priority: priority,
        scheduled_date: scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        special_instructions: specialInstructions || null,
        wo_status: "Created",
        created_by: userData?.user?.id,
        target_stage_code: targetStageCode || null,
        product_size_id: productSizeId || null,
        input_lot_id: inputLotId || null,
      };

      const { data, error } = await supabase
        .from("work_orders")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;

      // Initialize stages for this work order
      if (data) {
        const { error: stageError } = await supabase.rpc("initialize_wo_stages", {
          p_work_order_id: (data as any).id,
        });
        if (stageError) {
          console.warn("Failed to initialize stages:", stageError.message);
        }

        // Auto-create schedule entry if scheduled_date is provided
        if (scheduledDate && productionLineId) {
          const scheduleInsert = {
            work_order_id: (data as any).id,
            schedule_date: format(scheduledDate, "yyyy-MM-dd"),
            production_line_id: productionLineId,
            product_id: productId,
            recipe_id: recipeId || null,
            planned_quantity: parseFloat(targetQuantity),
            planned_uom: finalUom,
            priority: priority,
            schedule_status: "Scheduled",
            created_by: userData?.user?.id,
          };

          const { error: schedError } = await supabase
            .from("production_schedule")
            .insert(scheduleInsert as any);

          if (schedError) {
            console.warn("Failed to create schedule entry:", schedError.message);
          }
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["active-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["production-schedule"] });
      toast.success("Work order created", {
        description: `${(data as any).wo_number} created successfully${scheduledDate ? " and added to schedule" : ""}`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create work order", { description: error.message });
    },
  });

  // Update work order mutation
  const updateWorkOrderMutation = useMutation({
    mutationFn: async () => {
      if (!workOrder) throw new Error("No work order to update");

      const finalUom = stageUomSettings.isLocked ? stageUomSettings.uom : targetUom;

      // Build update payload based on status
      const updateData: Record<string, any> = {
        target_quantity: parseFloat(targetQuantity),
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        priority: priority,
        special_instructions: specialInstructions || null,
      };

      // Only allow full edits if not in progress
      if (!isInProgress) {
        updateData.product_id = productId;
        updateData.recipe_id = recipeId || null;
        updateData.production_line_id = productionLineId || null;
        updateData.target_uom = finalUom;
        updateData.scheduled_date = scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null;
        updateData.target_stage_code = targetStageCode || null;
        updateData.product_size_id = productSizeId || null;
        updateData.input_lot_id = inputLotId || null;
      }

      const { data, error } = await supabase
        .from("work_orders")
        .update(updateData)
        .eq("id", workOrder.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["active-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrder?.id] });
      toast.success("Work order updated", {
        description: `${(data as any).wo_number} updated successfully`,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to update work order", { description: error.message });
    },
  });

  const resetForm = () => {
    setProductId("");
    setRecipeId("");
    setProductionLineId("");
    setTargetQuantity("");
    setTargetUom("kg");
    setPriority("Standard");
    setScheduledDate(undefined);
    setDueDate(undefined);
    setSpecialInstructions("");
    setTargetStageCode("");
    setProductSizeId("");
    setInputLotId("");
    setEditDataInitialized(true);
  };

  const handleStageChange = (val: string) => {
    setTargetStageCode(val);
    setInputLotId("");
    setProductSizeId("");
    setProductId("");
    setRecipeId("");
    
    // Set default production line for the stage
    const stage = productionStages.find(s => s.stage_code === val);
    if (stage?.default_line_id) {
      setProductionLineId(stage.default_line_id);
    } else {
      setProductionLineId("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCompleted) {
      toast.error("Cannot edit a completed work order");
      return;
    }
    
    if (!isEditMode) {
      if (!productId) {
        toast.error("Please select a product");
        return;
      }
      if (!targetStageCode) {
        toast.error("Please select a target stage");
        return;
      }
      if (!productionLineId) {
        toast.error("Please select a production line");
        return;
      }
    }
    
    if (!targetQuantity || parseFloat(targetQuantity) <= 0) {
      toast.error("Please enter a valid target quantity");
      return;
    }
    
    if (!isEditMode && needsInputLot && !inputLotId && availableWipLots.length > 0) {
      // Allow proceeding without input lot for planning purposes
      // toast.warning("No input lot selected - this can be assigned later");
    }
    
    if (isEditMode) {
      updateWorkOrderMutation.mutate();
    } else {
      createWorkOrderMutation.mutate();
    }
  };

  const isPending = createWorkOrderMutation.isPending || updateWorkOrderMutation.isPending;

  // Check if we should show planning panels
  const showFlavorPlanningPanels = targetStageCode === "FLAVOR" && productId;
  const showFreezePlanningPanels = targetStageCode === "FREEZE" && productId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? `Edit Work Order ${workOrder?.wo_number}` : "Create Work Order"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? isInProgress 
                  ? "Limited editing available for in-progress work orders"
                  : isCompleted
                    ? "This work order is completed and cannot be edited"
                    : "Update work order details"
                : "Create a new manufacturing work order for a specific production stage"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Target Stage Selection */}
            <div className="grid gap-2">
              <Label htmlFor="stage">Target Production Stage *</Label>
              <Select 
                value={targetStageCode} 
                onValueChange={handleStageChange}
                disabled={isEditMode && isInProgress}
              >
                <SelectTrigger id="stage">
                  <SelectValue placeholder="Select production stage" />
                </SelectTrigger>
                <SelectContent>
                  {productionStages.map((s) => (
                    <SelectItem key={s.stage_code} value={s.stage_code}>
                      <div className="flex items-center gap-2">
                        <span>{s.stage_name}</span>
                        {s.creates_intermediate_lot && (
                          <Badge variant="outline" className="text-xs">WIP</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStage?.creates_intermediate_lot && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  This stage creates a WIP lot that feeds into the next stage
                </p>
              )}
            </div>

            {/* Product Selection */}
            <div className="grid gap-2">
              <Label htmlFor="product">Product *</Label>
              <Select 
                value={productId} 
                onValueChange={(val) => {
                  setProductId(val);
                  setRecipeId("");
                  setInputLotId("");
                  setProductSizeId("");
                }}
                disabled={isEditMode && isInProgress || !targetStageCode}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder={targetStageCode ? "Select product" : "Select stage first"} />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {products.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No products found for this stage
                    </div>
                  ) : (
                    products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {targetStageCode === "FLAVOR" && (
                <p className="text-xs text-muted-foreground">
                  Showing flavor family products only
                </p>
              )}
            </div>

            {/* Input Availability Panel - Smart Planning Info */}
            {needsInputLot && productId && (
              <InputAvailabilityPanel
                stageCode={targetStageCode}
                productId={productId}
                recipeId={recipeId}
                targetQuantity={parseFloat(targetQuantity) || 0}
              />
            )}

            {/* Input Lot Selection - for stages after BASE_PREP */}
            {needsInputLot && productId && availableWipLots.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="inputLot">Input Lot (from previous stage)</Label>
                <Select 
                  value={inputLotId} 
                  onValueChange={setInputLotId}
                  disabled={isEditMode && isInProgress}
                >
                  <SelectTrigger id="inputLot">
                    <SelectValue placeholder="Select input lot (optional for planning)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWipLots.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{lot.lot_number}</span>
                          <span className="text-muted-foreground">
                            ({lot.quantity_available} {lot.volume_uom || "units"} available)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Product Size Selection - for FREEZE, CASE_PACK with smart filtering */}
            {needsProductSize && productId && (
              <div className="grid gap-2">
                <Label htmlFor="productSize">{productSizeLabel} *</Label>
                {productSizes.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {targetStageCode === "FREEZE" 
                      ? "No tub sizes (size_type = 'unit') configured for this product. Add sizes in Product Settings."
                      : targetStageCode === "CASE_PACK"
                        ? "No case sizes (size_type = 'case') configured for this product. Add sizes in Product Settings."
                        : "No sizes configured for this product."
                    }
                  </p>
                ) : (
                  <Select 
                    value={productSizeId} 
                    onValueChange={setProductSizeId}
                    disabled={isEditMode && isInProgress}
                  >
                    <SelectTrigger id="productSize">
                      <SelectValue placeholder={`Select ${targetStageCode === "FREEZE" ? "tub size" : "case configuration"}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {productSizes.map((size) => (
                        <SelectItem key={size.id} value={size.id}>
                          {size.sku} - {size.size_name} ({size.container_size?.name || `${size.size_value}`})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Recipe Selection */}
            <div className="grid gap-2">
              <Label htmlFor="recipe">Recipe</Label>
              <Select 
                value={recipeId} 
                onValueChange={setRecipeId} 
                disabled={!productId || (isEditMode && isInProgress)}
              >
                <SelectTrigger id="recipe">
                  <SelectValue placeholder={productId ? "Select recipe" : "Select product first"} />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.recipe_name} v{r.recipe_version} ({r.batch_size} kg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Production Line */}
            <div className="grid gap-2">
              <Label htmlFor="line">Production Line *</Label>
              <Select 
                value={productionLineId} 
                onValueChange={setProductionLineId}
                disabled={isEditMode && isInProgress}
              >
                <SelectTrigger id="line">
                  <SelectValue placeholder="Select production line" />
                </SelectTrigger>
                <SelectContent>
                  {productionLines.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.line_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity and UOM */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">{stageUomSettings.label} *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  disabled={isCompleted}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uom">UOM</Label>
                <Select 
                  value={stageUomSettings.isLocked ? stageUomSettings.uom : targetUom} 
                  onValueChange={setTargetUom}
                  disabled={stageUomSettings.isLocked || (isEditMode && isInProgress)}
                >
                  <SelectTrigger id="uom">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="gal">gal</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="units">units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Volume Conversion Display */}
            {selectedRecipe && (targetStageCode === "BASE_PREP" || targetStageCode === "FLAVOR") && (
              <VolumeConversionDisplay
                targetQuantityKg={parseFloat(targetQuantity) || 0}
                batchSize={selectedRecipe.batch_weight_kg || selectedRecipe.batch_size}
                batchVolume={selectedRecipe.batch_volume}
                batchVolumeUnit={selectedRecipe.batch_volume_unit}
              />
            )}

            {/* Tub Yield Projection Panel - FLAVOR stage */}
            {showFlavorPlanningPanels && (
              <TubYieldProjectionPanel
                productId={productId}
                targetQuantityKg={parseFloat(targetQuantity) || 0}
              />
            )}

            {/* Par Level Summary Panel - FREEZE stage */}
            {showFreezePlanningPanels && (
              <ParLevelSummaryPanel productId={productId} />
            )}

            {/* Priority */}
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority} disabled={isCompleted}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Rush">Rush</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Schedule Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                      disabled={isEditMode && isInProgress}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PP") : "Pick date (optional)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {scheduledDate && (
                  <p className="text-xs text-muted-foreground">
                    WO will be auto-placed on the production schedule
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                      disabled={isCompleted}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PP") : "Pick date (optional)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Special Instructions */}
            <div className="grid gap-2">
              <Label htmlFor="instructions">Special Instructions</Label>
              <Textarea
                id="instructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special instructions or notes..."
                rows={2}
                disabled={isCompleted}
              />
            </div>

            {/* Unfulfilled Orders Panel - Placeholder */}
            {(showFlavorPlanningPanels || showFreezePlanningPanels) && (
              <UnfulfilledOrdersPanel productId={productId} />
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isCompleted}>
              {isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {isEditMode ? "Update Work Order" : "Create Work Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
