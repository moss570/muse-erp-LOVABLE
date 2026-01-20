import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, MoreVertical, Eye, Edit, Calculator, Copy, Archive, Search, Loader2, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { RecipeFormDialog } from "@/components/manufacturing/RecipeFormDialog";

interface Recipe {
  id: string;
  recipe_code: string;
  recipe_name: string;
  recipe_version: string;
  batch_size: number;
  batch_uom: string;
  material_cost_per_batch: number;
  labor_cost_per_batch: number;
  overhead_cost_per_batch: number;
  total_cost_per_batch: number;
  cost_per_unit: number;
  approval_status: string;
  is_active: boolean;
  created_at: string;
  product?: { id: string; name: string; material_code: string } | null;
}

export default function Recipes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("recipes")
        .select(`
          *,
          product:materials!recipes_product_id_fkey(id, name, material_code)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`recipe_name.ilike.%${searchTerm}%,recipe_code.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("approval_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Recipe[];
    },
  });

  const recalculateCostMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const { data, error } = await supabase.rpc("calculate_recipe_cost", {
        p_recipe_id: recipeId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe cost updated", {
        description: `Total: $${data.total_cost?.toFixed(2) || '0.00'} | Per Unit: $${data.cost_per_unit?.toFixed(4) || '0.0000'}`,
      });
    },
    onError: (error: any) => {
      toast.error("Failed to calculate cost", { description: error.message });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      Draft: { variant: "outline", label: "Draft" },
      "Pending Review": { variant: "secondary", label: "Pending Review" },
      Approved: { variant: "default", label: "Approved" },
      Archived: { variant: "destructive", label: "Archived" },
    };
    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRecipe(null);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Recipes & Formulas
            </h1>
            <p className="text-muted-foreground">Manage product recipes and BOMs with cost tracking</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Recipe
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipe name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 max-w-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending Review">Pending Review</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recipes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recipes found</p>
                <p className="text-sm">Create a new recipe to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Batch Size</TableHead>
                    <TableHead className="text-right">Cost/Batch</TableHead>
                    <TableHead className="text-right">Cost/Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-mono font-medium">
                        {recipe.recipe_code}
                      </TableCell>
                      <TableCell>{recipe.recipe_name}</TableCell>
                      <TableCell>
                        {recipe.product ? (
                          <div>
                            <p className="font-medium">{recipe.product.name}</p>
                            <p className="text-xs text-muted-foreground">{recipe.product.material_code}</p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>v{recipe.recipe_version}</TableCell>
                      <TableCell>
                        {recipe.batch_size} {recipe.batch_uom}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${recipe.total_cost_per_batch?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${recipe.cost_per_unit?.toFixed(4) || '0.0000'}
                      </TableCell>
                      <TableCell>{getStatusBadge(recipe.approval_status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/manufacturing/recipes/${recipe.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(recipe)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => recalculateCostMutation.mutate(recipe.id)}
                              disabled={recalculateCostMutation.isPending}
                            >
                              <Calculator className="h-4 w-4 mr-2" />
                              Recalculate Cost
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <RecipeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recipe={editingRecipe}
      />
    </>
  );
}
