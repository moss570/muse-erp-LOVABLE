import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getIngredientStatementPreview } from "@/lib/ingredientStatement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface ProductBOMTabProps {
  productId: string;
  productName: string;
}

interface RecipeItem {
  id: string;
  quantity: number;
  sort_order: number;
  material: {
    id: string;
    name: string;
    code: string;
    label_copy: string | null;
  } | null;
  unit: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  version: number;
  yield_quantity: number | null;
  is_active: boolean;
  product_recipe_items: RecipeItem[];
  yield_unit: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export function ProductBOMTab({ productId, productName }: ProductBOMTabProps) {
  const [ingredientStatement, setIngredientStatement] = useState<{
    statement: string;
    itemCount: number;
    hasRecipe: boolean;
  } | null>(null);

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
          instructions,
          is_active,
          product_recipe_items (
            id,
            quantity_required,
            sort_order,
            material:materials (
              id,
              name,
              code,
              label_copy
            ),
            unit:units_of_measure (
              id,
              name,
              code
            )
          ),
          batch_unit:units_of_measure!product_recipes_batch_unit_id_fkey (
            id,
            name,
            code
          )
        `)
        .eq("product_id", productId)
        .order("recipe_version", { ascending: false });

      if (error) throw error;
      
      // Map to our interface structure
      return (data || []).map(r => ({
        id: r.id,
        name: r.recipe_name,
        description: r.instructions,
        version: r.recipe_version || 1,
        yield_quantity: r.batch_size,
        is_active: r.is_active,
        product_recipe_items: (r.product_recipe_items || []).map((item: any) => ({
          ...item,
          quantity: item.quantity_required,
        })),
        yield_unit: r.batch_unit,
      })) as Recipe[];
    },
  });

  // Load ingredient statement
  useEffect(() => {
    async function loadIngredientStatement() {
      const result = await getIngredientStatementPreview(productId);
      setIngredientStatement(result);
    }
    loadIngredientStatement();
  }, [productId, recipes]);

  const activeRecipe = recipes.find((r) => r.is_active);

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
              <span>No recipe found. Add ingredients to generate an ingredient statement.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Recipe */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {activeRecipe ? activeRecipe.name : "No Active Recipe"}
              </CardTitle>
              <CardDescription>
                {activeRecipe
                  ? `Version ${activeRecipe.version} • Yields ${activeRecipe.yield_quantity || "?"} ${activeRecipe.yield_unit?.code || "units"}`
                  : "Create a recipe in Recipe Management"}
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link to="/manufacturing/recipes">
                <ExternalLink className="h-4 w-4 mr-2" />
                Recipe Management
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeRecipe && activeRecipe.product_recipe_items?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRecipe.product_recipe_items
                  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                  .map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {item.material?.name || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {item.material?.code || "-"}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit?.code || "-"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {activeRecipe
                ? "No ingredients in this recipe yet."
                : "No recipe has been created for this product."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Recipe Versions */}
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
                      <span className="font-medium">{recipe.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        v{recipe.version}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {recipe.product_recipe_items?.length || 0} ingredients
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
