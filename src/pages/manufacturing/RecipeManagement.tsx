import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Eye,
  ChevronRight,
  Package,
  Scale,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  product: {
    id: string;
    name: string;
    sku: string;
  } | null;
  batch_unit: {
    id: string;
    code: string;
    name: string;
  } | null;
  _count?: { items: number };
}

interface RecipeItem {
  id: string;
  material_id: string;
  quantity_required: number;
  unit_id: string | null;
  wastage_percentage: number | null;
  sort_order: number | null;
  notes: string | null;
  material: {
    id: string;
    name: string;
    code: string;
    usage_unit: { code: string; name: string } | null;
  } | null;
  unit: { id: string; code: string; name: string } | null;
}

export default function RecipeManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecipeItem | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch all recipes
  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ["all-recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_recipes")
        .select(`
          id,
          recipe_name,
          recipe_version,
          batch_size,
          batch_unit_id,
          is_default,
          is_active,
          standard_labor_hours,
          standard_machine_hours,
          instructions,
          product:products!product_recipes_product_id_fkey(id, name, sku),
          batch_unit:units_of_measure!product_recipes_batch_unit_id_fkey(id, code, name)
        `)
        .order("recipe_name");

      if (error) throw error;
      return data as Recipe[];
    },
  });

  // Fetch recipe items for selected recipe
  const { data: recipeItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["recipe-items-detail", selectedRecipeId],
    queryFn: async () => {
      if (!selectedRecipeId) return [];
      
      const { data, error } = await supabase
        .from("product_recipe_items")
        .select(`
          id,
          material_id,
          quantity_required,
          unit_id,
          wastage_percentage,
          sort_order,
          notes,
          material:materials!product_recipe_items_material_id_fkey(
            id, name, code,
            usage_unit:units_of_measure!materials_usage_unit_id_fkey(code, name)
          ),
          unit:units_of_measure!product_recipe_items_unit_id_fkey(id, code, name)
        `)
        .eq("recipe_id", selectedRecipeId)
        .order("sort_order", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as RecipeItem[];
    },
    enabled: !!selectedRecipeId,
  });

  // Fetch materials for adding items
  const { data: materials = [] } = useQuery({
    queryKey: ["materials-for-recipe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select(`
          id, name, code,
          usage_unit:units_of_measure!materials_usage_unit_id_fkey(id, code, name)
        `)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch units
  const { data: units = [] } = useQuery({
    queryKey: ["units-for-recipe"],
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

  // Update recipe item mutation
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
      queryClient.invalidateQueries({ queryKey: ["recipe-items-detail", selectedRecipeId] });
      setEditingItem(null);
      toast({ title: "Recipe item updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating item", description: error.message, variant: "destructive" });
    },
  });

  // Add recipe item mutation
  const addItemMutation = useMutation({
    mutationFn: async (item: {
      recipe_id: string;
      material_id: string;
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
          ...item,
          sort_order: nextOrder,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-items-detail", selectedRecipeId] });
      setAddItemDialogOpen(false);
      toast({ title: "Material added to recipe" });
    },
    onError: (error: any) => {
      toast({ title: "Error adding material", description: error.message, variant: "destructive" });
    },
  });

  // Delete recipe item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("product_recipe_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-items-detail", selectedRecipeId] });
      toast({ title: "Material removed from recipe" });
    },
    onError: (error: any) => {
      toast({ title: "Error removing material", description: error.message, variant: "destructive" });
    },
  });

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  const filteredRecipes = recipes.filter(
    (recipe) =>
      recipe.recipe_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.product?.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewRecipe = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setViewDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Recipe / BOM Management
            </h1>
            <p className="text-muted-foreground">
              Manage product recipes and bills of materials
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search recipes by name, product, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipes Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Recipes</CardTitle>
            <CardDescription>
              Click on a recipe to view and edit its bill of materials
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recipesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recipes found. Create recipes from the Products page.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe Name</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Batch Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecipes.map((recipe) => (
                    <TableRow
                      key={recipe.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewRecipe(recipe.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {recipe.recipe_name}
                          {recipe.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{recipe.product?.name}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {recipe.product?.sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{recipe.recipe_version || "1.0"}</TableCell>
                      <TableCell>
                        {recipe.batch_size} {recipe.batch_unit?.code || "units"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={recipe.is_active ? "default" : "secondary"}>
                          {recipe.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewRecipe(recipe.id);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recipe Detail Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {selectedRecipe?.recipe_name}
              </DialogTitle>
              <DialogDescription>
                {selectedRecipe?.product?.name} ({selectedRecipe?.product?.sku}) • 
                Batch Size: {selectedRecipe?.batch_size} {selectedRecipe?.batch_unit?.code || "units"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Bill of Materials
                </h3>
                <Button size="sm" onClick={() => setAddItemDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Material
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                {itemsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : recipeItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No materials added to this recipe yet.
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
                            {item.material?.name}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.material?.code}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.quantity_required.toFixed(4)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.unit?.code || item.material?.usage_unit?.code || "units"}
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
                                onClick={() => {
                                  if (confirm("Remove this material from the recipe?")) {
                                    deleteItemMutation.mutate(item.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </div>

            {selectedRecipe?.instructions && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedRecipe.instructions}
                  </p>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Recipe Item</DialogTitle>
              <DialogDescription>
                Update {editingItem?.material?.name} in this recipe
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

        {/* Add Item Dialog */}
        <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Material to Recipe</DialogTitle>
              <DialogDescription>
                Add a new material to {selectedRecipe?.recipe_name}
              </DialogDescription>
            </DialogHeader>
            {selectedRecipeId && (
              <AddItemForm
                recipeId={selectedRecipeId}
                materials={materials}
                units={units}
                existingMaterialIds={recipeItems.map((i) => i.material_id)}
                onSave={(data) => addItemMutation.mutate(data)}
                onCancel={() => setAddItemDialogOpen(false)}
                isLoading={addItemMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
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
  const [unitId, setUnitId] = useState(item.unit_id || item.material?.usage_unit?.code || "");
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

// Add Item Form Component
function AddItemForm({
  recipeId,
  materials,
  units,
  existingMaterialIds,
  onSave,
  onCancel,
  isLoading,
}: {
  recipeId: string;
  materials: any[];
  units: { id: string; code: string; name: string }[];
  existingMaterialIds: string[];
  onSave: (data: {
    recipe_id: string;
    material_id: string;
    quantity_required: number;
    unit_id: string | null;
    wastage_percentage: number | null;
    notes: string | null;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitId, setUnitId] = useState("");
  const [wastage, setWastage] = useState("0");
  const [notes, setNotes] = useState("");

  const availableMaterials = materials.filter(
    (m) => !existingMaterialIds.includes(m.id)
  );

  const selectedMaterial = materials.find((m) => m.id === materialId);

  // Auto-select material's usage unit
  const handleMaterialChange = (id: string) => {
    setMaterialId(id);
    const mat = materials.find((m) => m.id === id);
    if (mat?.usage_unit?.id) {
      setUnitId(mat.usage_unit.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      recipe_id: recipeId,
      material_id: materialId,
      quantity_required: parseFloat(quantity) || 0,
      unit_id: unitId || null,
      wastage_percentage: parseFloat(wastage) || 0,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="material">Material</Label>
        <Select value={materialId} onValueChange={handleMaterialChange} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a material" />
          </SelectTrigger>
          <SelectContent>
            {availableMaterials.map((mat) => (
              <SelectItem key={mat.id} value={mat.id}>
                {mat.name} ({mat.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {availableMaterials.length === 0 && (
          <p className="text-sm text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            All materials already added to this recipe
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
        <Button type="submit" disabled={isLoading || !materialId || !quantity}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add Material
        </Button>
      </DialogFooter>
    </form>
  );
}
