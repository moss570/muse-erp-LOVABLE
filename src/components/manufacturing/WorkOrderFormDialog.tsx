import { useState } from "react";
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WorkOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkOrderFormDialog({ open, onOpenChange }: WorkOrderFormDialogProps) {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [productionLineId, setProductionLineId] = useState("");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [targetUom, setTargetUom] = useState("kg");
  const [priority, setPriority] = useState("5");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Fetch products (finished goods)
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-wo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, code")
        .eq("material_type", "finished_good")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch recipes for selected product
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes-for-wo", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_recipes")
        .select("id, recipe_name, recipe_version, batch_size, batch_unit_id")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("recipe_version", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!productId && open,
  });

  // Fetch production lines
  const { data: productionLines = [] } = useQuery({
    queryKey: ["production-lines-for-wo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_lines")
        .select("id, line_name")
        .eq("is_active", true)
        .order("line_name");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Create work order mutation
  const createWorkOrderMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();

      // Generate WO number using the database function
      const { data: woNumber, error: woNumError } = await supabase.rpc("generate_wo_number");
      if (woNumError) throw woNumError;

      const insertData = {
        wo_number: woNumber as string,
        product_id: productId,
        recipe_id: recipeId || null,
        production_line_id: productionLineId || null,
        target_quantity: parseFloat(targetQuantity),
        target_uom: targetUom,
        priority: parseInt(priority),
        scheduled_date: scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        special_instructions: specialInstructions || null,
        wo_status: "Created",
        created_by: userData?.user?.id,
      };

      const { data, error } = await supabase
        .from("work_orders")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
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
    setPriority("5");
    setScheduledDate(new Date());
    setDueDate(undefined);
    setSpecialInstructions("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error("Please select a product");
      return;
    }
    if (!targetQuantity || parseFloat(targetQuantity) <= 0) {
      toast.error("Please enter a valid target quantity");
      return;
    }
    createWorkOrderMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
            <DialogDescription>
              Create a new manufacturing work order
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Product Selection */}
            <div className="grid gap-2">
              <Label htmlFor="product">Product *</Label>
              <Select value={productId} onValueChange={(val) => {
                setProductId(val);
                setRecipeId("");
              }}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                <Label htmlFor="quantity">Target Quantity *</Label>
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
                <Select value={targetUom} onValueChange={setTargetUom}>
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
                  <SelectItem value="1">Low (1)</SelectItem>
                  <SelectItem value="5">Normal (5)</SelectItem>
                  <SelectItem value="8">High (8)</SelectItem>
                  <SelectItem value="10">Rush (10)</SelectItem>
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
