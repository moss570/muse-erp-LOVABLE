/**
 * Nutrition Calculator for Products
 * Aggregates nutritional data from recipe ingredients
 */

import { supabase } from '@/integrations/supabase/client';

export interface NutrientTotals {
  calories: number;
  total_fat_g: number;
  saturated_fat_g: number;
  trans_fat_g: number;
  polyunsaturated_fat_g: number;
  monounsaturated_fat_g: number;
  cholesterol_mg: number;
  sodium_mg: number;
  total_carbohydrate_g: number;
  dietary_fiber_g: number;
  total_sugars_g: number;
  added_sugars_g: number;
  protein_g: number;
  vitamin_d_mcg: number;
  calcium_mg: number;
  iron_mg: number;
  potassium_mg: number;
  vitamin_a_mcg: number;
  vitamin_c_mg: number;
}

export interface IngredientContribution extends NutrientTotals {
  material_id: string;
  material_name: string;
  material_code: string;
  quantity_g: number;
  has_nutrition_data: boolean;
}

export interface CalculatedNutrition {
  // Per batch totals
  batch_totals: NutrientTotals;
  batch_weight_g: number;
  
  // Per serving values
  per_serving: NutrientTotals;
  serving_size_g: number;
  serving_size_description: string;
  servings_per_batch: number;
  
  // Ingredient breakdown
  ingredients: IngredientContribution[];
  
  // Warnings
  missing_nutrition_count: number;
  warnings: string[];
}

export interface CalculationOptions {
  yieldLossPercent?: number; // Default 5% for ice cream
  overrunPercent?: number; // Default 50% for ice cream (air incorporation)
  servingSizeG?: number; // Default 95g (FDA 2/3 cup for ice cream)
  servingSizeDescription?: string;
}

const EMPTY_NUTRIENTS: NutrientTotals = {
  calories: 0,
  total_fat_g: 0,
  saturated_fat_g: 0,
  trans_fat_g: 0,
  polyunsaturated_fat_g: 0,
  monounsaturated_fat_g: 0,
  cholesterol_mg: 0,
  sodium_mg: 0,
  total_carbohydrate_g: 0,
  dietary_fiber_g: 0,
  total_sugars_g: 0,
  added_sugars_g: 0,
  protein_g: 0,
  vitamin_d_mcg: 0,
  calcium_mg: 0,
  iron_mg: 0,
  potassium_mg: 0,
  vitamin_a_mcg: 0,
  vitamin_c_mg: 0,
};

// Standard weight conversions to grams
const WEIGHT_CONVERSIONS: Record<string, number> = {
  'G': 1,
  'KG': 1000,
  'LB': 453.592,
  'OZ': 28.3495,
  'MG': 0.001,
};

/**
 * Calculate nutrition for a product based on its recipe
 */
export async function calculateProductNutrition(
  productId: string,
  options: CalculationOptions = {}
): Promise<CalculatedNutrition> {
  const {
    yieldLossPercent = 5,
    overrunPercent = 50,
    servingSizeG = 95,
    servingSizeDescription = '2/3 cup (95g)',
  } = options;

  // Fetch active recipe for product
  const { data: recipe, error: recipeError } = await supabase
    .from('product_recipes')
    .select('id, recipe_name, batch_size, batch_unit_id')
    .eq('product_id', productId)
    .eq('is_active', true)
    .maybeSingle();

  if (recipeError) throw recipeError;
  
  if (!recipe) {
    return {
      batch_totals: { ...EMPTY_NUTRIENTS },
      batch_weight_g: 0,
      per_serving: { ...EMPTY_NUTRIENTS },
      serving_size_g: servingSizeG,
      serving_size_description: servingSizeDescription,
      servings_per_batch: 0,
      ingredients: [],
      missing_nutrition_count: 0,
      warnings: ['No active recipe found for this product.'],
    };
  }

  // Fetch recipe items with material info
  const { data: recipeItems, error: itemsError } = await supabase
    .from('product_recipe_items')
    .select(`
      id,
      material_id,
      quantity_required,
      unit_id,
      materials (
        id,
        code,
        name,
        base_unit_id,
        usage_unit_id,
        usage_unit_conversion
      )
    `)
    .eq('recipe_id', recipe.id);

  if (itemsError) throw itemsError;

  // Fetch nutrition data for all materials
  const materialIds = (recipeItems || [])
    .map(item => item.material_id)
    .filter((id): id is string => !!id);
  
  let nutritionData: Array<{
    material_id: string;
    calories: number | null;
    total_fat_g: number | null;
    saturated_fat_g: number | null;
    trans_fat_g: number | null;
    polyunsaturated_fat_g: number | null;
    monounsaturated_fat_g: number | null;
    cholesterol_mg: number | null;
    sodium_mg: number | null;
    total_carbohydrate_g: number | null;
    dietary_fiber_g: number | null;
    total_sugars_g: number | null;
    added_sugars_g: number | null;
    protein_g: number | null;
    vitamin_d_mcg: number | null;
    calcium_mg: number | null;
    iron_mg: number | null;
    potassium_mg: number | null;
    vitamin_a_mcg: number | null;
    vitamin_c_mg: number | null;
  }> = [];

  if (materialIds.length > 0) {
    const { data, error: nutritionError } = await supabase
      .from('material_nutrition')
      .select('*')
      .in('material_id', materialIds);

    if (nutritionError) throw nutritionError;
    nutritionData = data || [];
  }

  // Create a map of material_id -> nutrition
  const nutritionMap = new Map(
    nutritionData.map(n => [n.material_id, n])
  );

  // Fetch units for code lookup
  const { data: units } = await supabase
    .from('units_of_measure')
    .select('id, code, name');

  const unitMap = new Map((units || []).map(u => [u.id, u]));

  // Calculate contributions from each ingredient
  const ingredients: IngredientContribution[] = [];
  const totals: NutrientTotals = { ...EMPTY_NUTRIENTS };
  let totalWeightG = 0;
  let missingCount = 0;
  const warnings: string[] = [];

  for (const item of recipeItems || []) {
    if (!item.material_id) continue;

    const material = item.materials as {
      id: string;
      code: string;
      name: string;
      base_unit_id: string | null;
      usage_unit_id: string | null;
      usage_unit_conversion: number | null;
    } | null;

    if (!material) continue;

    // Convert quantity to grams using unit code
    const unit = unitMap.get(item.unit_id);
    const unitCode = unit?.code?.toUpperCase() || '';
    const conversionFactor = WEIGHT_CONVERSIONS[unitCode];
    
    let quantityG = item.quantity_required;
    
    if (conversionFactor) {
      quantityG = item.quantity_required * conversionFactor;
    } else {
      // If no conversion found, assume it's already in grams
      warnings.push(`Unknown unit "${unit?.code || item.unit_id}" for ${material.name} - assuming grams`);
    }

    const nutrition = nutritionMap.get(material.id);
    const hasNutrition = !!nutrition;

    if (!hasNutrition) {
      missingCount++;
    }

    // Scale nutrition from per-100g to actual quantity
    const scaleFactor = quantityG / 100;
    
    const contribution: IngredientContribution = {
      material_id: material.id,
      material_name: material.name,
      material_code: material.code,
      quantity_g: quantityG,
      has_nutrition_data: hasNutrition,
      calories: (nutrition?.calories ?? 0) * scaleFactor,
      total_fat_g: (nutrition?.total_fat_g ?? 0) * scaleFactor,
      saturated_fat_g: (nutrition?.saturated_fat_g ?? 0) * scaleFactor,
      trans_fat_g: (nutrition?.trans_fat_g ?? 0) * scaleFactor,
      polyunsaturated_fat_g: (nutrition?.polyunsaturated_fat_g ?? 0) * scaleFactor,
      monounsaturated_fat_g: (nutrition?.monounsaturated_fat_g ?? 0) * scaleFactor,
      cholesterol_mg: (nutrition?.cholesterol_mg ?? 0) * scaleFactor,
      sodium_mg: (nutrition?.sodium_mg ?? 0) * scaleFactor,
      total_carbohydrate_g: (nutrition?.total_carbohydrate_g ?? 0) * scaleFactor,
      dietary_fiber_g: (nutrition?.dietary_fiber_g ?? 0) * scaleFactor,
      total_sugars_g: (nutrition?.total_sugars_g ?? 0) * scaleFactor,
      added_sugars_g: (nutrition?.added_sugars_g ?? 0) * scaleFactor,
      protein_g: (nutrition?.protein_g ?? 0) * scaleFactor,
      vitamin_d_mcg: (nutrition?.vitamin_d_mcg ?? 0) * scaleFactor,
      calcium_mg: (nutrition?.calcium_mg ?? 0) * scaleFactor,
      iron_mg: (nutrition?.iron_mg ?? 0) * scaleFactor,
      potassium_mg: (nutrition?.potassium_mg ?? 0) * scaleFactor,
      vitamin_a_mcg: (nutrition?.vitamin_a_mcg ?? 0) * scaleFactor,
      vitamin_c_mg: (nutrition?.vitamin_c_mg ?? 0) * scaleFactor,
    };

    ingredients.push(contribution);
    totalWeightG += quantityG;

    // Add to totals
    for (const key of Object.keys(EMPTY_NUTRIENTS) as (keyof NutrientTotals)[]) {
      totals[key] += contribution[key];
    }
  }

  // Apply yield loss (processing loss)
  const yieldFactor = 1 - (yieldLossPercent / 100);
  const adjustedWeightG = totalWeightG * yieldFactor;

  // For ice cream, overrun adds air volume but not weight
  // Final product volume increases but nutrition per gram stays same
  // Servings are by volume, so overrun affects servings per batch
  const volumeFactor = 1 + (overrunPercent / 100);
  
  // Calculate servings per batch based on final volume
  // For ice cream: 1g mix ≈ 1ml, with overrun 1g mix becomes (1 + overrun%) ml
  const effectiveVolumeML = adjustedWeightG * volumeFactor;
  const servingsPerBatch = effectiveVolumeML / servingSizeG;

  // Per-serving values (nutrition is based on weight, serving is by volume)
  // Need to adjust because serving is measured by volume after overrun
  const nutritionPerServingFactor = adjustedWeightG > 0 
    ? (servingSizeG / volumeFactor) / adjustedWeightG 
    : 0;
  
  const perServing: NutrientTotals = { ...EMPTY_NUTRIENTS };
  for (const key of Object.keys(EMPTY_NUTRIENTS) as (keyof NutrientTotals)[]) {
    perServing[key] = totals[key] * nutritionPerServingFactor;
  }

  if (missingCount > 0) {
    warnings.push(`${missingCount} ingredient(s) missing nutrition data.`);
  }

  return {
    batch_totals: totals,
    batch_weight_g: adjustedWeightG,
    per_serving: perServing,
    serving_size_g: servingSizeG,
    serving_size_description: servingSizeDescription,
    servings_per_batch: Math.round(servingsPerBatch * 10) / 10,
    ingredients,
    missing_nutrition_count: missingCount,
    warnings,
  };
}
