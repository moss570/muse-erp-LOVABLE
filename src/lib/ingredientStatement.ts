import { supabase } from "@/integrations/supabase/client";

interface RecipeItem {
  quantity: number;
  material: {
    id: string;
    name: string;
    label_copy: string | null;
  } | null;
}

interface Recipe {
  id: string;
  name: string;
  product_recipe_items: RecipeItem[];
}

/**
 * Generates an ingredient statement from a product's BOM/recipe
 * Ingredients are listed in descending order by quantity used
 * Uses the label_copy field from materials
 */
export async function generateIngredientStatement(productId: string): Promise<string> {
  // Fetch the recipe and its items for the product
  const { data: recipes, error } = await supabase
    .from("product_recipes")
    .select(`
      id,
      name,
      product_recipe_items (
        quantity,
        material:materials (
          id,
          name,
          label_copy
        )
      )
    `)
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !recipes || recipes.length === 0) {
    return "";
  }

  const recipe = recipes[0] as unknown as Recipe;
  const items = recipe.product_recipe_items || [];

  // Sort by quantity descending (largest first)
  const sortedItems = [...items].sort((a, b) => (b.quantity || 0) - (a.quantity || 0));

  // Build ingredient list using label_copy or fallback to name
  const ingredients = sortedItems
    .filter((item) => item.material)
    .map((item) => {
      const material = item.material!;
      return material.label_copy || material.name;
    });

  // Join with commas
  return ingredients.join(", ");
}

/**
 * Gets a preview of the ingredient statement for display
 * Returns the statement or a placeholder message
 */
export async function getIngredientStatementPreview(productId: string): Promise<{
  statement: string;
  itemCount: number;
  hasRecipe: boolean;
}> {
  const statement = await generateIngredientStatement(productId);
  
  if (!statement) {
    return {
      statement: "No recipe found. Add ingredients to the BOM to generate an ingredient statement.",
      itemCount: 0,
      hasRecipe: false,
    };
  }

  const itemCount = statement.split(",").length;
  
  return {
    statement,
    itemCount,
    hasRecipe: true,
  };
}
