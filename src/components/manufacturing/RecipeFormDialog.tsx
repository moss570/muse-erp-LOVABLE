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
          ...values,
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
