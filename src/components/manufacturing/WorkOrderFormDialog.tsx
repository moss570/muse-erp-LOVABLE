import { useState, useMemo } from "react";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface WorkOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductionStage {
  id: string;
  stage_code: string;
  stage_name: string;
  sequence_order: number;
  creates_intermediate_lot: boolean;
  default_output_uom: string;
}

interface ProductSize {
  id: string;
  sku: string;
  size_name: string;
  size_value: number;
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

export function WorkOrderFormDialog({ open, onOpenChange }: WorkOrderFormDialogProps) {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [productionLineId, setProductionLineId] = useState("");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [targetUom, setTargetUom] = useState("kg");
  const [priority, setPriority] = useState("Standard");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [specialInstructions, setSpecialInstructions] = useState("");
  
  // New fields for multi-stage workflow
  const [targetStageCode, setTargetStageCode] = useState("");
  const [productSizeId, setProductSizeId] = useState("");
  const [inputLotId, setInputLotId] = useState("");

  // Fetch production stages
  const { data: productionStages = [] } = useQuery({
    queryKey: ["production-stages-for-wo"],
    queryFn: async (): Promise<ProductionStage[]> => {
      const { data, error } = await supabase
        .from("production_stages_master")
        .select("id, stage_code, stage_name, sequence_order, creates_intermediate_lot, default_output_uom")
        .eq("is_active", true)
        .order("sequence_order");

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-wo"],
    queryFn: async (): Promise<{ id: string; name: string; sku: string }[]> => {
      const { data, error } = await (supabase.from("products") as any)
        .select("id, name, sku")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch product sizes for the selected product
  const { data: productSizes = [] } = useQuery({
    queryKey: ["product-sizes-for-wo", productId],
    queryFn: async (): Promise<ProductSize[]> => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_sizes")
        .select("id, sku, size_name, size_value, container_size:container_sizes(name, volume_gallons)")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("size_value");

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
    queryFn: async (): Promise<{ id: string; recipe_name: string; recipe_version: number; batch_size: number }[]> => {
      if (!productId) return [];
      const { data, error } = await (supabase.from("product_recipes") as any)
        .select("id, recipe_name, recipe_version, batch_size")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("recipe_version", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId && open,
  });

  // Fetch production lines
  const { data: productionLines = [] } = useQuery({
    queryKey: ["production-lines-for-wo"],
    queryFn: async (): Promise<{ id: string; line_name: string }[]> => {
      const { data, error } = await (supabase.from("production_lines") as any)
        .select("id, line_name")
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

  // Determine if we need product size selection (FREEZE, CASE_PACK, PACKAGE)
  const needsProductSize = useMemo(() => {
    return ["FREEZE", "CASE_PACK", "PACKAGE"].includes(targetStageCode);
  }, [targetStageCode]);

  // Determine if we need input lot selection (everything except BASE_PREP)
  const needsInputLot = useMemo(() => {
    return targetStageCode && targetStageCode !== "BASE_PREP";
  }, [targetStageCode]);

  // Get UOM label based on stage
  const quantityLabel = useMemo(() => {
    if (!selectedStage) return "Target Quantity";
    switch (selectedStage.default_output_uom) {
      case "EA": return "Target Quantity (Units)";
      case "GAL": return "Target Quantity (Gallons)";
      default: return "Target Quantity (KG)";
    }
  }, [selectedStage]);

  // Create work order mutation
  const createWorkOrderMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();

      // Generate WO number using the database function
      const { data: woNumber, error: woNumError } = await supabase.rpc("generate_wo_number");
      if (woNumError) throw woNumError;

      const insertData = {
        wo_number: woNumber as string,
        wo_type: "Make-to-Stock",
        product_id: productId,
        recipe_id: recipeId || null,
        production_line_id: productionLineId || null,
        target_quantity: parseFloat(targetQuantity),
        target_uom: selectedStage?.default_output_uom === "EA" ? "units" : targetUom,
        priority: priority,
        scheduled_date: scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        special_instructions: specialInstructions || null,
        wo_status: "Created",
        created_by: userData?.user?.id,
        // New fields
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
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["active-work-orders"] });
      toast.success("Work order created", {
        description: `${(data as any).wo_number} created successfully`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create work order", { description: error.message });
    },
  });

  const resetForm = () => {
    setProductId("");
    setRecipeId("");
    setProductionLineId("");
    setTargetQuantity("");
    setTargetUom("kg");
    setPriority("Standard");
    setScheduledDate(new Date());
    setDueDate(undefined);
    setSpecialInstructions("");
    setTargetStageCode("");
    setProductSizeId("");
    setInputLotId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error("Please select a product");
      return;
    }
    if (!targetStageCode) {
      toast.error("Please select a target stage");
      return;
    }
    if (!targetQuantity || parseFloat(targetQuantity) <= 0) {
      toast.error("Please enter a valid target quantity");
      return;
    }
    if (needsInputLot && !inputLotId && availableWipLots.length > 0) {
      toast.error("Please select an input lot from the previous stage");
      return;
    }
    createWorkOrderMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
            <DialogDescription>
              Create a new manufacturing work order for a specific production stage
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Target Stage Selection - NEW */}
            <div className="grid gap-2">
              <Label htmlFor="stage">Target Production Stage *</Label>
              <Select value={targetStageCode} onValueChange={(val) => {
                setTargetStageCode(val);
                setInputLotId("");
                setProductSizeId("");
              }}>
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
              <Select value={productId} onValueChange={(val) => {
                setProductId(val);
                setRecipeId("");
                setInputLotId("");
                setProductSizeId("");
              }}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Input Lot Selection - NEW (for stages after BASE_PREP) */}
            {needsInputLot && productId && (
              <div className="grid gap-2">
                <Label htmlFor="inputLot">Input Lot (from previous stage)</Label>
                {availableWipLots.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    No approved WIP lots available from the previous stage. Complete the previous stage first.
                  </p>
                ) : (
                  <Select value={inputLotId} onValueChange={setInputLotId}>
                    <SelectTrigger id="inputLot">
                      <SelectValue placeholder="Select input lot" />
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
                )}
              </div>
            )}

            {/* Product Size Selection - NEW (for FREEZE, CASE_PACK, PACKAGE) */}
            {needsProductSize && productId && (
              <div className="grid gap-2">
                <Label htmlFor="productSize">Output Product Size *</Label>
                {productSizes.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    No sizes configured for this product. Add sizes in Product Settings.
                  </p>
                ) : (
                  <Select value={productSizeId} onValueChange={setProductSizeId}>
                    <SelectTrigger id="productSize">
                      <SelectValue placeholder="Select output size (e.g., G-CHOC-08)" />
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
              <Select value={recipeId} onValueChange={setRecipeId} disabled={!productId}>
                <SelectTrigger id="recipe">
                  <SelectValue placeholder={productId ? "Select recipe" : "Select product first"} />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.recipe_name} v{r.recipe_version} ({r.batch_size})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Production Line */}
            <div className="grid gap-2">
              <Label htmlFor="line">Production Line</Label>
              <Select value={productionLineId} onValueChange={setProductionLineId}>
                <SelectTrigger id="line">
                  <SelectValue placeholder="Select line (optional)" />
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
                <Label htmlFor="quantity">{quantityLabel} *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uom">UOM</Label>
                <Select 
                  value={selectedStage?.default_output_uom === "EA" ? "units" : targetUom} 
                  onValueChange={setTargetUom}
                  disabled={selectedStage?.default_output_uom === "EA"}
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

            {/* Priority */}
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
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
                <Label>Scheduled Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PP") : "Pick date"}
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
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PP") : "Pick date"}
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
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createWorkOrderMutation.isPending}>
              {createWorkOrderMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Work Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
