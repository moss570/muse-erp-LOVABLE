import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getIngredientStatementPreview } from "@/lib/ingredientStatement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Loader2,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Package,
  Check,
  ChevronsUpDown,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProductBOMTabProps {
  productId: string;
  productName: string;
}

interface RecipeItem {
  id: string;
  listed_material_id: string | null;
  material_id: string | null;
  quantity_required: number;
  unit_id: string | null;
  wastage_percentage: number | null;
  sort_order: number | null;
  notes: string | null;
  listed_material: {
    id: string;
    name: string;
    code: string;
  } | null;
  material: {
    id: string;
    name: string;
    code: string;
    label_copy: string | null;
  } | null;
  unit: { id: string; code: string; name: string } | null;
}

interface Recipe {
  id: string;
  recipe_name: string;
  recipe_version: string | null;
  batch_size: number;
  batch_unit_id: string | null;
  is_default: boolean | null;
  is_active: boolean | null;
  standard_labor_hours: number | null;
  standard_machine_hours: number | null;
  instructions: string | null;
  created_at: string;
  updated_at: string;
  batch_unit: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export function ProductBOMTab({ productId, productName }: ProductBOMTabProps) {
  const [ingredientStatement, setIngredientStatement] = useState<{
    statement: string;
    itemCount: number;
    hasRecipe: boolean;
  } | null>(null);
  
  const [createRecipeDialogOpen, setCreateRecipeDialogOpen] = useState(false);
  const [editRecipeDialogOpen, setEditRecipeDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecipeItem | null>(null);
  const [deleteRecipeDialogOpen, setDeleteRecipeDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch recipes for this product
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["product-recipes", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_recipes")
        .select(`
          id,
          recipe_name,
          recipe_version,
          batch_size,
          batch_unit_id,
          instructions,
          is_active,
          is_default,
          standard_labor_hours,
          standard_machine_hours,
          created_at,
          updated_at,
          batch_unit:units_of_measure!product_recipes_batch_unit_id_fkey (
            id,
            name,
            code
          )
        `)
        .eq("product_id", productId)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Recipe[];
    },
  });

  const activeRecipe = recipes.find((r) => r.is_active);

  // Fetch recipe items for active recipe
  const { data: recipeItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["recipe-items", activeRecipe?.id],
    queryFn: async () => {
      if (!activeRecipe?.id) return [];
      
      const { data, error } = await supabase
        .from("product_recipe_items")
        .select(`
          id,
          listed_material_id,
          material_id,
          quantity_required,
          unit_id,
          wastage_percentage,
          sort_order,
          notes,
          listed_material:listed_material_names!product_recipe_items_listed_material_id_fkey(
            id, name, code
          ),
          material:materials!product_recipe_items_material_id_fkey(
            id, name, code, label_copy
          ),
          unit:units_of_measure!product_recipe_items_unit_id_fkey(id, code, name)
        `)
        .eq("recipe_id", activeRecipe.id)
        .order("sort_order", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as RecipeItem[];
    },
    enabled: !!activeRecipe?.id,
  });

  // Fetch listed materials for adding items
  const { data: listedMaterials = [] } = useQuery({
    queryKey: ["listed-materials-for-bom"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listed_material_names")
        .select(`
          id, 
          name, 
          code,
          material_listed_material_links!material_listed_material_links_listed_material_id_fkey(id)
        `)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        code: item.code,
        linkedMaterialsCount: item.material_listed_material_links?.length || 0,
      }));
    },
  });

  // Fetch units
  const { data: units = [] } = useQuery({
    queryKey: ["units-for-bom"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units_of_measure")
        .select("id, code, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Load ingredient statement
  useEffect(() => {
    async function loadIngredientStatement() {
      const result = await getIngredientStatementPreview(productId);
      setIngredientStatement(result);
    }
    loadIngredientStatement();
  }, [productId, recipeItems]);

  // Create recipe mutation
  const createRecipeMutation = useMutation({
    mutationFn: async (data: {
      recipe_name: string;
      recipe_version: string;
      batch_size: number;
      batch_unit_id: string | null;
      instructions: string | null;
    }) => {
      const { error } = await supabase
        .from("product_recipes")
        .insert({
          product_id: productId,
          recipe_name: data.recipe_name,
          recipe_version: data.recipe_version,
          batch_size: data.batch_size,
          batch_unit_id: data.batch_unit_id,
          instructions: data.instructions,
          is_active: true,
          is_default: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-recipes", productId] });
      setCreateRecipeDialogOpen(false);
      toast({ title: "Recipe created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating recipe", description: error.message, variant: "destructive" });
    },
  });

  // Update recipe mutation
  const updateRecipeMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      recipe_name: string;
      recipe_version: string;
      batch_size: number;
      batch_unit_id: string | null;
      instructions: string | null;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from("product_recipes")
        .update({
          recipe_name: data.recipe_name,
          recipe_version: data.recipe_version,
          batch_size: data.batch_size,
          batch_unit_id: data.batch_unit_id,
          instructions: data.instructions,
          is_active: data.is_active,
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-recipes", productId] });
      setEditRecipeDialogOpen(false);
      toast({ title: "Recipe updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating recipe", description: error.message, variant: "destructive" });
    },
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const { error } = await supabase
        .from("product_recipes")
        .delete()
        .eq("id", recipeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-recipes", productId] });
      setDeleteRecipeDialogOpen(false);
      toast({ title: "Recipe deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting recipe", description: error.message, variant: "destructive" });
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (item: {
      recipe_id: string;
      listed_material_id: string;
      quantity_required: number;
      unit_id: string | null;
      wastage_percentage: number | null;
      notes: string | null;
    }) => {
      // Get max sort order
      const { data: existing } = await supabase
        .from("product_recipe_items")
        .select("sort_order")
        .eq("recipe_id", item.recipe_id)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = ((existing?.[0]?.sort_order || 0) + 1);

      const { error } = await supabase
        .from("product_recipe_items")
        .insert({
          recipe_id: item.recipe_id,
          listed_material_id: item.listed_material_id,
          quantity_required: item.quantity_required,
          unit_id: item.unit_id,
          wastage_percentage: item.wastage_percentage,
          notes: item.notes,
          sort_order: nextOrder,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-items", activeRecipe?.id] });
      queryClient.invalidateQueries({ queryKey: ["product-recipes", productId] });
      setAddItemDialogOpen(false);
      toast({ title: "Material added to recipe" });
    },
    onError: (error: any) => {
      toast({ title: "Error adding material", description: error.message, variant: "destructive" });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (item: {
      id: string;
      quantity_required: number;
      unit_id: string | null;
      wastage_percentage: number | null;
      notes: string | null;
    }) => {
      const { error } = await supabase
        .from("product_recipe_items")
        .update({
          quantity_required: item.quantity_required,
          unit_id: item.unit_id,
          wastage_percentage: item.wastage_percentage,
          notes: item.notes,
        })
        .eq("id", item.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-items", activeRecipe?.id] });
      setEditingItem(null);
      toast({ title: "Recipe item updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating item", description: error.message, variant: "destructive" });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("product_recipe_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-items", activeRecipe?.id] });
      setDeleteItemId(null);
      toast({ title: "Material removed from recipe" });
    },
    onError: (error: any) => {
      toast({ title: "Error removing material", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ingredient Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ingredient Statement
          </CardTitle>
          <CardDescription>
            Auto-generated from recipe ingredients, sorted by quantity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ingredientStatement?.hasRecipe ? (
            <div className="space-y-2">
              <p className="text-sm leading-relaxed bg-muted p-4 rounded-lg">
                {ingredientStatement.statement}
              </p>
              <p className="text-xs text-muted-foreground">
                {ingredientStatement.itemCount} ingredients from active recipe
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>No recipe found. Create a recipe to generate an ingredient statement.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Recipe / Create Recipe */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {activeRecipe ? activeRecipe.recipe_name : "No Recipe"}
              </CardTitle>
              <CardDescription>
                {activeRecipe
                  ? `Version ${activeRecipe.recipe_version || "1.0"} • Yields ${activeRecipe.batch_size} ${activeRecipe.batch_unit?.code || "units"}`
                  : "Create a recipe to manage the bill of materials for this product"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {activeRecipe ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setEditRecipeDialogOpen(true)}
                  >
                    <Settings2 className="h-4 w-4 mr-1" />
                    Edit Recipe
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setAddItemDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Material
                  </Button>
                </>
              ) : (
                <Button onClick={() => setCreateRecipeDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Recipe
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeRecipe ? (
            itemsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recipeItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No materials added to this recipe yet.</p>
                <p className="text-sm">Click "Add Material" to add ingredients to the BOM.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Wastage %</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.listed_material?.name || item.material?.name || (
                          <span className="text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Unknown
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {item.listed_material?.code || item.material?.code || "-"}
                        </code>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.quantity_required.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.unit?.code || "units"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.wastage_percentage || 0}%
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {item.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteItemId(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recipe has been created for this product.</p>
              <p className="text-sm">Click "Create Recipe" to get started.</p>
            </div>
          )}
          
          {activeRecipe?.instructions && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="font-semibold mb-2">Instructions</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg">
                  {activeRecipe.instructions}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recipe History */}
      {recipes.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Recipe History</CardTitle>
            <CardDescription>Previous versions of this recipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recipes
                .filter((r) => !r.is_active)
                .map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{recipe.recipe_name}</span>
                      <Badge variant="secondary" className="ml-2">
                        v{recipe.recipe_version || "1.0"}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Yields {recipe.batch_size} {recipe.batch_unit?.code || "units"}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Recipe Dialog */}
      <Dialog open={createRecipeDialogOpen} onOpenChange={setCreateRecipeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Recipe</DialogTitle>
            <DialogDescription>
              Create a new recipe for {productName}
            </DialogDescription>
          </DialogHeader>
          <RecipeForm
            defaultValues={{
              recipe_name: `${productName} Recipe`,
              recipe_version: "1.0",
              batch_size: 100,
              batch_unit_id: null,
              instructions: null,
            }}
            units={units}
            onSave={(data) => createRecipeMutation.mutate(data)}
            onCancel={() => setCreateRecipeDialogOpen(false)}
            isLoading={createRecipeMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Recipe Dialog */}
      <Dialog open={editRecipeDialogOpen} onOpenChange={setEditRecipeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Recipe</DialogTitle>
            <DialogDescription>
              Update recipe details for {activeRecipe?.recipe_name}
            </DialogDescription>
          </DialogHeader>
          {activeRecipe && (
            <RecipeForm
              defaultValues={{
                recipe_name: activeRecipe.recipe_name,
                recipe_version: activeRecipe.recipe_version || "1.0",
                batch_size: activeRecipe.batch_size,
                batch_unit_id: activeRecipe.batch_unit_id,
                instructions: activeRecipe.instructions,
                is_active: activeRecipe.is_active ?? true,
              }}
              units={units}
              onSave={(data) => updateRecipeMutation.mutate({ id: activeRecipe.id, ...data, is_active: data.is_active ?? true })}
              onCancel={() => setEditRecipeDialogOpen(false)}
              isLoading={updateRecipeMutation.isPending}
              showActiveToggle
              onDelete={() => {
                setEditRecipeDialogOpen(false);
                setDeleteRecipeDialogOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Recipe Confirmation */}
      <AlertDialog open={deleteRecipeDialogOpen} onOpenChange={setDeleteRecipeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the recipe "{activeRecipe?.recipe_name}" and all its materials. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => activeRecipe && deleteRecipeMutation.mutate(activeRecipe.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRecipeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Material to Recipe</DialogTitle>
            <DialogDescription>
              Add a listed material to {activeRecipe?.recipe_name}. During production, operators will select the actual material to use.
            </DialogDescription>
          </DialogHeader>
          {activeRecipe && (
            <AddItemForm
              recipeId={activeRecipe.id}
              listedMaterials={listedMaterials}
              units={units}
              existingListedMaterialIds={recipeItems.map((i) => i.listed_material_id).filter(Boolean) as string[]}
              onSave={(data) => addItemMutation.mutate(data)}
              onCancel={() => setAddItemDialogOpen(false)}
              isLoading={addItemMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Recipe Item</DialogTitle>
            <DialogDescription>
              Update {editingItem?.listed_material?.name || editingItem?.material?.name} in this recipe
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <EditItemForm
              item={editingItem}
              units={units}
              onSave={(data) => updateItemMutation.mutate({ id: editingItem.id, ...data })}
              onCancel={() => setEditingItem(null)}
              isLoading={updateItemMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation */}
      <AlertDialog open={!!deleteItemId} onOpenChange={(open) => !open && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Material?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this material from the recipe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemId && deleteItemMutation.mutate(deleteItemId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItemMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Recipe Form Component
function RecipeForm({
  defaultValues,
  units,
  onSave,
  onCancel,
  isLoading,
  showActiveToggle = false,
  onDelete,
}: {
  defaultValues: {
    recipe_name: string;
    recipe_version: string;
    batch_size: number;
    batch_unit_id: string | null;
    instructions: string | null;
    is_active?: boolean;
  };
  units: { id: string; code: string; name: string }[];
  onSave: (data: {
    recipe_name: string;
    recipe_version: string;
    batch_size: number;
    batch_unit_id: string | null;
    instructions: string | null;
    is_active?: boolean;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
  showActiveToggle?: boolean;
  onDelete?: () => void;
}) {
  const [recipeName, setRecipeName] = useState(defaultValues.recipe_name);
  const [recipeVersion, setRecipeVersion] = useState(defaultValues.recipe_version);
  const [batchSize, setBatchSize] = useState(defaultValues.batch_size.toString());
  const [batchUnitId, setBatchUnitId] = useState(defaultValues.batch_unit_id || "");
  const [instructions, setInstructions] = useState(defaultValues.instructions || "");
  const [isActive, setIsActive] = useState(defaultValues.is_active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      recipe_name: recipeName,
      recipe_version: recipeVersion,
      batch_size: parseFloat(batchSize) || 0,
      batch_unit_id: batchUnitId || null,
      instructions: instructions || null,
      is_active: isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recipe-name">Recipe Name</Label>
        <Input
          id="recipe-name"
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recipe-version">Version</Label>
          <Input
            id="recipe-version"
            value={recipeVersion}
            onChange={(e) => setRecipeVersion(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="batch-size">Batch Size</Label>
          <Input
            id="batch-size"
            type="number"
            step="0.01"
            value={batchSize}
            onChange={(e) => setBatchSize(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="batch-unit">Batch Unit</Label>
        <Select value={batchUnitId} onValueChange={setBatchUnitId}>
          <SelectTrigger>
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.name} ({unit.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Recipe instructions..."
          rows={4}
        />
      </div>
      {showActiveToggle && (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="is-active">Active</Label>
        </div>
      )}
      <DialogFooter className="flex justify-between">
        <div>
          {onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Recipe
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !recipeName}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

// Add Item Form Component
function AddItemForm({
  recipeId,
  listedMaterials,
  units,
  existingListedMaterialIds,
  onSave,
  onCancel,
  isLoading,
}: {
  recipeId: string;
  listedMaterials: { id: string; name: string; code: string; linkedMaterialsCount: number }[];
  units: { id: string; code: string; name: string }[];
  existingListedMaterialIds: string[];
  onSave: (data: {
    recipe_id: string;
    listed_material_id: string;
    quantity_required: number;
    unit_id: string | null;
    wastage_percentage: number | null;
    notes: string | null;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [listedMaterialId, setListedMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitId, setUnitId] = useState("");
  const [wastage, setWastage] = useState("0");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  const availableMaterials = listedMaterials.filter(
    (m) => !existingListedMaterialIds.includes(m.id)
  );

  const selectedMaterial = listedMaterials.find((m) => m.id === listedMaterialId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      recipe_id: recipeId,
      listed_material_id: listedMaterialId,
      quantity_required: parseFloat(quantity) || 0,
      unit_id: unitId || null,
      wastage_percentage: parseFloat(wastage) || 0,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Listed Material</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between",
                selectedMaterial?.linkedMaterialsCount === 0 && "border-amber-500 bg-amber-50"
              )}
            >
              {selectedMaterial ? (
                <span className="flex items-center gap-2 truncate">
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{selectedMaterial.code}</code>
                  {selectedMaterial.name}
                  {selectedMaterial.linkedMaterialsCount === 0 && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                      No materials linked
                    </Badge>
                  )}
                </span>
              ) : (
                "Select a listed material..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search by name or code..." />
              <CommandList>
                <CommandEmpty>No listed material found.</CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-auto">
                  {availableMaterials.map((mat) => (
                    <CommandItem
                      key={mat.id}
                      value={`${mat.code} ${mat.name}`}
                      onSelect={() => {
                        setListedMaterialId(mat.id);
                        setOpen(false);
                      }}
                      className={cn(
                        mat.linkedMaterialsCount === 0 && "bg-amber-50"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          listedMaterialId === mat.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {mat.code}
                        </code>
                        <span className="truncate">{mat.name}</span>
                        {mat.linkedMaterialsCount === 0 && (
                          <Badge variant="outline" className="ml-auto bg-amber-100 text-amber-800 border-amber-300 text-xs shrink-0">
                            No links
                          </Badge>
                        )}
                        {mat.linkedMaterialsCount > 0 && (
                          <span className="ml-auto text-xs text-muted-foreground shrink-0">
                            {mat.linkedMaterialsCount} linked
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {availableMaterials.length === 0 && (
          <p className="text-sm text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            All listed materials already added to this recipe
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity Required</Label>
          <Input
            id="quantity"
            type="number"
            step="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wastage">Wastage Percentage</Label>
        <Input
          id="wastage"
          type="number"
          step="0.1"
          value={wastage}
          onChange={(e) => setWastage(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !listedMaterialId || !quantity}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add Material
        </Button>
      </DialogFooter>
    </form>
  );
}

// Edit Item Form Component
function EditItemForm({
  item,
  units,
  onSave,
  onCancel,
  isLoading,
}: {
  item: RecipeItem;
  units: { id: string; code: string; name: string }[];
  onSave: (data: {
    quantity_required: number;
    unit_id: string | null;
    wastage_percentage: number | null;
    notes: string | null;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [quantity, setQuantity] = useState(item.quantity_required.toString());
  const [unitId, setUnitId] = useState(item.unit_id || "");
  const [wastage, setWastage] = useState((item.wastage_percentage || 0).toString());
  const [notes, setNotes] = useState(item.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      quantity_required: parseFloat(quantity) || 0,
      unit_id: unitId || null,
      wastage_percentage: parseFloat(wastage) || 0,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity Required</Label>
          <Input
            id="quantity"
            type="number"
            step="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wastage">Wastage Percentage</Label>
        <Input
          id="wastage"
          type="number"
          step="0.1"
          value={wastage}
          onChange={(e) => setWastage(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </form>
  );
}
