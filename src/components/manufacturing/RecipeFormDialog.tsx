import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  recipe_code: z.string().min(1, "Recipe code is required"),
  recipe_name: z.string().min(1, "Recipe name is required"),
  recipe_version: z.string().default("1.0"),
  product_id: z.string().optional(),
  batch_size: z.number().min(0.01, "Batch size must be greater than 0"),
  batch_uom: z.string().default("kg"),
  standard_labor_hours: z.number().default(0),
  approval_status: z.string().default("Draft"),
  notes: z.string().optional(),
  batch_volume: z.number().nullable().optional(),
  batch_volume_unit: z.string().default("GAL"),
});

type FormValues = z.infer<typeof formSchema>;

interface RecipeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: any;
}

export function RecipeFormDialog({ open, onOpenChange, recipe }: RecipeFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!recipe;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipe_code: "",
      recipe_name: "",
      recipe_version: "1.0",
      batch_size: 1,
      batch_uom: "kg",
      standard_labor_hours: 0,
      approval_status: "Draft",
      notes: "",
      batch_volume: null,
      batch_volume_unit: "GAL",
    },
  });

  // Fetch materials for product selection
  const { data: materials = [] } = useQuery({
    queryKey: ["materials-for-recipe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, sku")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (recipe) {
      form.reset({
        recipe_code: recipe.recipe_code || "",
        recipe_name: recipe.recipe_name || "",
        recipe_version: recipe.recipe_version || "1.0",
        product_id: recipe.product_id || undefined,
        batch_size: recipe.batch_size || 1,
        batch_uom: recipe.batch_uom || "kg",
        standard_labor_hours: recipe.standard_labor_hours || 0,
        approval_status: recipe.approval_status || "Draft",
        notes: recipe.notes || "",
        batch_volume: recipe.batch_volume ?? null,
        batch_volume_unit: recipe.batch_volume_unit || "GAL",
      });
    } else {
      form.reset({
        recipe_code: "",
        recipe_name: "",
        recipe_version: "1.0",
        batch_size: 1,
        batch_uom: "kg",
        standard_labor_hours: 0,
        approval_status: "Draft",
        notes: "",
        batch_volume: null,
        batch_volume_unit: "GAL",
      });
    }
  }, [recipe, form]);

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const insertData = {
        recipe_code: values.recipe_code,
        recipe_name: values.recipe_name,
        recipe_version: values.recipe_version,
        product_id: values.product_id || null,
        batch_size: values.batch_size,
        batch_uom: values.batch_uom,
        standard_labor_hours: values.standard_labor_hours,
        approval_status: values.approval_status,
        notes: values.notes || null,
        batch_weight_kg: 1,
        batch_volume: values.batch_volume,
        batch_volume_unit: values.batch_volume_unit,
      };
      const { data, error } = await supabase
        .from("recipes")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe created successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create recipe", { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("recipes")
        .update({
          recipe_code: values.recipe_code,
          recipe_name: values.recipe_name,
          recipe_version: values.recipe_version,
          product_id: values.product_id || null,
          batch_size: values.batch_size,
          batch_uom: values.batch_uom,
          standard_labor_hours: values.standard_labor_hours,
          approval_status: values.approval_status,
          notes: values.notes || null,
          batch_volume: values.batch_volume,
          batch_volume_unit: values.batch_volume_unit,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipe.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe updated successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to update recipe", { description: error.message });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Recipe" : "Create Recipe"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update recipe details" : "Create a new manufacturing recipe"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recipe_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="RCP-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recipe_version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input placeholder="1.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="recipe_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipe Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Vanilla Ice Cream Base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product (Output)</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {materials.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.sku || 'N/A'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batch_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Size *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="batch_uom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measure</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="lb">lb</SelectItem>
                        <SelectItem value="gal">gal</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="ea">each</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Volume Yield Section */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Batch Yield</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">1 KG (fixed)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Each batch yields 1 KG weight. Specify volume yield for UOM conversions.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="batch_volume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume Yield</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 2.75"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="batch_volume_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume Unit</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="GAL">Gallons (GAL)</SelectItem>
                          <SelectItem value="L">Liters (L)</SelectItem>
                          <SelectItem value="FL_OZ">Fluid Ounces (FL OZ)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {form.watch("batch_volume") && (
                <p className="text-xs text-muted-foreground">
                  1 KG = {form.watch("batch_volume")} {form.watch("batch_volume_unit")}
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="standard_labor_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Standard Labor Hours</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="approval_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Pending Review">Pending Review</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Recipe notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
