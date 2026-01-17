import { supabase } from "@/integrations/supabase/client";
import { generateIngredientStatementForRecipe } from "./ingredientStatement";

/**
 * Aggregates allergens from all materials in a specific recipe
 * @param recipeId - The recipe ID to aggregate allergens for
 * @returns Array of unique allergen strings, sorted alphabetically
 */
export async function aggregateAllergensForRecipe(recipeId: string): Promise<string[]> {
  // Fetch recipe items with their linked primary materials
  const { data: items, error } = await supabase
    .from("product_recipe_items")
    .select(`
      listed_material_id,
      listed_material:listed_material_names (
        id,
        material_listed_material_links!material_listed_material_links_listed_material_id_fkey(
          is_primary,
          material:materials(
            id,
            allergens
          )
        )
      )
    `)
    .eq("recipe_id", recipeId);

  if (error || !items) {
    console.error("Error fetching recipe items for allergens:", error);
    return [];
  }

  const allergens = new Set<string>();

  for (const item of items) {
    const listedMaterial = item.listed_material as any;
    if (!listedMaterial?.material_listed_material_links) continue;

    // Find the primary linked material
    const primaryLink = listedMaterial.material_listed_material_links.find(
      (link: any) => link.is_primary
    );

    if (primaryLink?.material?.allergens) {
      const materialAllergens = primaryLink.material.allergens;
      if (Array.isArray(materialAllergens)) {
        materialAllergens.forEach((a: string) => {
          if (a && typeof a === "string") {
            allergens.add(a);
          }
        });
      }
    }
  }

  return Array.from(allergens).sort();
}

/**
 * Aggregates food claims from all materials in a specific recipe
 * @param recipeId - The recipe ID to aggregate food claims for
 * @returns Array of unique food claim strings, sorted alphabetically
 */
export async function aggregateFoodClaimsForRecipe(recipeId: string): Promise<string[]> {
  // Fetch recipe items with their linked primary materials
  const { data: items, error } = await supabase
    .from("product_recipe_items")
    .select(`
      listed_material_id,
      listed_material:listed_material_names (
        id,
        material_listed_material_links!material_listed_material_links_listed_material_id_fkey(
          is_primary,
          material:materials(
            id,
            food_claims
          )
        )
      )
    `)
    .eq("recipe_id", recipeId);

  if (error || !items) {
    console.error("Error fetching recipe items for food claims:", error);
    return [];
  }

  const claims = new Set<string>();

  for (const item of items) {
    const listedMaterial = item.listed_material as any;
    if (!listedMaterial?.material_listed_material_links) continue;

    // Find the primary linked material
    const primaryLink = listedMaterial.material_listed_material_links.find(
      (link: any) => link.is_primary
    );

    if (primaryLink?.material?.food_claims) {
      const materialClaims = primaryLink.material.food_claims;
      if (Array.isArray(materialClaims)) {
        materialClaims.forEach((c: string) => {
          if (c && typeof c === "string") {
            claims.add(c);
          }
        });
      }
    }
  }

  return Array.from(claims).sort();
}

export interface BOMComparisonDifference {
  type: 'ingredient_statement' | 'allergen_added' | 'allergen_removed' | 'claim_added' | 'claim_removed';
  description: string;
}

export interface BOMComparison {
  isExactMatch: boolean;
  ingredientStatementMatch: boolean;
  differences: BOMComparisonDifference[];
}

/**
 * Compares a sub BOM to the primary BOM and returns differences
 * @param subRecipeId - The sub recipe ID to compare
 * @param primaryRecipeId - The primary recipe ID to compare against
 * @returns Comparison result with differences
 */
export async function compareBOMToPrimary(
  subRecipeId: string,
  primaryRecipeId: string
): Promise<BOMComparison> {
  const differences: BOMComparisonDifference[] = [];

  // Compare ingredient statements
  const [subStatement, primaryStatement] = await Promise.all([
    generateIngredientStatementForRecipe(subRecipeId),
    generateIngredientStatementForRecipe(primaryRecipeId),
  ]);

  const ingredientStatementMatch = subStatement === primaryStatement;
  if (!ingredientStatementMatch) {
    differences.push({
      type: 'ingredient_statement',
      description: 'Ingredient statement differs from primary BOM',
    });
  }

  // Compare allergens
  const [subAllergens, primaryAllergens] = await Promise.all([
    aggregateAllergensForRecipe(subRecipeId),
    aggregateAllergensForRecipe(primaryRecipeId),
  ]);

  const addedAllergens = subAllergens.filter((a) => !primaryAllergens.includes(a));
  const removedAllergens = primaryAllergens.filter((a) => !subAllergens.includes(a));

  if (addedAllergens.length > 0) {
    differences.push({
      type: 'allergen_added',
      description: `Additional allergens: ${addedAllergens.join(', ')}`,
    });
  }

  if (removedAllergens.length > 0) {
    differences.push({
      type: 'allergen_removed',
      description: `Missing allergens: ${removedAllergens.join(', ')}`,
    });
  }

  // Compare food claims
  const [subClaims, primaryClaims] = await Promise.all([
    aggregateFoodClaimsForRecipe(subRecipeId),
    aggregateFoodClaimsForRecipe(primaryRecipeId),
  ]);

  const addedClaims = subClaims.filter((c) => !primaryClaims.includes(c));
  const removedClaims = primaryClaims.filter((c) => !subClaims.includes(c));

  if (addedClaims.length > 0) {
    differences.push({
      type: 'claim_added',
      description: `Additional claims: ${addedClaims.join(', ')}`,
    });
  }

  if (removedClaims.length > 0) {
    differences.push({
      type: 'claim_removed',
      description: `Missing claims: ${removedClaims.join(', ')}`,
    });
  }

  return {
    isExactMatch: differences.length === 0,
    ingredientStatementMatch,
    differences,
  };
}