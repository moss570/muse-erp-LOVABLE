import { supabase } from "@/integrations/supabase/client";

interface RecipeItem {
  quantity_required: number;
  listed_material_id: string | null;
  listed_material: {
    id: string;
    name: string;
  } | null;
}

interface Recipe {
  id: string;
  recipe_name: string;
  product_recipe_items: RecipeItem[];
}

interface PrimaryMaterialLink {
  material_id: string;
  materials: {
    id: string;
    name: string;
    label_copy: string | null;
  };
}

/**
 * Generates an ingredient statement from a product's BOM/recipe
 * Ingredients are listed in descending order by quantity (heaviest first)
 * Uses the label_copy field from the PRIMARY material linked to each listed material
 */
export async function generateIngredientStatement(productId: string): Promise<string> {
  // Fetch the recipe and its items for the product
  const { data: recipes, error } = await supabase
    .from("product_recipes")
    .select(`
      id,
      recipe_name,
      product_recipe_items (
        quantity_required,
        listed_material_id,
        listed_material:listed_material_names (
          id,
          name
        )
      )
    `)
    .eq("product_id", productId)
    .eq("is_active", true)
    .eq("recipe_type", "primary")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !recipes || recipes.length === 0) {
    return "";
  }

  const recipe = recipes[0] as unknown as Recipe;
  const items = recipe.product_recipe_items || [];

  if (items.length === 0) {
    return "";
  }

  // Get all listed material IDs from the recipe
  const listedMaterialIds = items
    .map((item) => item.listed_material_id)
    .filter(Boolean) as string[];

  if (listedMaterialIds.length === 0) {
    return "";
  }

  // Fetch primary materials for each listed material
  const { data: primaryLinks, error: linksError } = await supabase
    .from("material_listed_material_links")
    .select(`
      listed_material_id,
      material_id,
      materials (
        id,
        name,
        label_copy
      )
    `)
    .in("listed_material_id", listedMaterialIds)
    .eq("is_primary", true);

  if (linksError) {
    console.error("Error fetching primary materials:", linksError);
    return "";
  }

  // Create a map of listed_material_id -> primary material's label_copy
  const primaryMaterialMap = new Map<string, { label_copy: string | null; name: string }>();
  if (primaryLinks) {
    for (const link of primaryLinks) {
      const material = (link as any).materials;
      if (material) {
        primaryMaterialMap.set(link.listed_material_id, {
          label_copy: material.label_copy,
          name: material.name,
        });
      }
    }
  }

  // Sort by quantity descending (heaviest first)
  const sortedItems = [...items].sort((a, b) => (b.quantity_required || 0) - (a.quantity_required || 0));

  // Build ingredient list using primary material's label_copy, fallback to listed material name
  const ingredients = sortedItems
    .filter((item) => item.listed_material)
    .map((item) => {
      const listedMaterialId = item.listed_material_id;
      
      // Check if we have a primary material for this listed material
      if (listedMaterialId && primaryMaterialMap.has(listedMaterialId)) {
        const primaryMaterial = primaryMaterialMap.get(listedMaterialId)!;
        // Prefer label_copy, fallback to material name
        return primaryMaterial.label_copy || primaryMaterial.name;
      }
      
      // Fallback to listed material name if no primary material found
      if (item.listed_material) {
        return item.listed_material.name;
      }
      
      return null;
    })
    .filter(Boolean);

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
