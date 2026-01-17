/**
 * FDA Nutrition Facts Rounding Rules
 * Based on 21 CFR 101.9 and FDA guidance documents
 */

export type RoundingType = 'calories' | 'fat_grams' | 'other_grams' | 'milligrams' | 'micrograms' | 'percent';

/**
 * Round calories according to FDA rules
 * - < 5 calories: Express as "0"
 * - 5-50 calories: Round to nearest 5
 * - > 50 calories: Round to nearest 10
 */
export function roundCalories(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (value < 5) return 0;
  if (value <= 50) return Math.round(value / 5) * 5;
  return Math.round(value / 10) * 10;
}

/**
 * Round fat grams according to FDA rules
 * - < 0.5g: Express as "0g"
 * - < 5g: Round to nearest 0.5g
 * - ≥ 5g: Round to nearest 1g
 */
export function roundFatGrams(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (value < 0.5) return 0;
  if (value < 5) return Math.round(value * 2) / 2;
  return Math.round(value);
}

/**
 * Round other gram values (carbs, fiber, sugars, protein)
 * - < 0.5g: Express as "0g" or "less than 1g"
 * - < 1g: Express as "less than 1g" (return 0.5 as indicator)
 * - ≥ 1g: Round to nearest 1g
 */
export function roundOtherGrams(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (value < 0.5) return 0;
  if (value < 1) return 0.5; // Indicates "less than 1g"
  return Math.round(value);
}

/**
 * Round milligram values (cholesterol, sodium, calcium, iron, potassium)
 * - Cholesterol: Round to nearest 5mg (< 2mg = 0)
 * - Sodium: Round to nearest 5mg (< 5mg = 0)
 * - Others: Round to nearest whole number
 */
export function roundMilligrams(value: number | null | undefined, nutrient?: string): number | null {
  if (value === null || value === undefined) return null;
  
  if (nutrient === 'cholesterol') {
    if (value < 2) return 0;
    return Math.round(value / 5) * 5;
  }
  
  if (nutrient === 'sodium') {
    if (value < 5) return 0;
    return Math.round(value / 5) * 5;
  }
  
  return Math.round(value);
}

/**
 * Round microgram values (Vitamin D, B12, etc.)
 * Generally round to nearest whole number
 */
export function roundMicrograms(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Math.round(value);
}

/**
 * Round percent daily value
 * - < 1%: Express as "<1%" (return 0.5 as indicator)
 * - ≥ 1%: Round to nearest whole percent
 */
export function roundPercentDV(value: number | null | undefined): number | string | null {
  if (value === null || value === undefined) return null;
  if (value < 1 && value > 0) return '<1';
  return Math.round(value);
}

/**
 * Format a nutrient value for display on a label
 */
export function formatNutrientValue(
  value: number | null | undefined,
  type: RoundingType,
  nutrient?: string
): string {
  if (value === null || value === undefined) return '—';
  
  let rounded: number | string | null;
  
  switch (type) {
    case 'calories':
      rounded = roundCalories(value);
      return rounded !== null ? String(rounded) : '—';
    
    case 'fat_grams':
      rounded = roundFatGrams(value);
      if (rounded === null) return '—';
      if (rounded === 0) return '0g';
      if (rounded < 1) return `${rounded}g`;
      return `${rounded}g`;
    
    case 'other_grams':
      rounded = roundOtherGrams(value);
      if (rounded === null) return '—';
      if (rounded === 0) return '0g';
      if (rounded === 0.5) return '<1g';
      return `${rounded}g`;
    
    case 'milligrams':
      rounded = roundMilligrams(value, nutrient);
      return rounded !== null ? `${rounded}mg` : '—';
    
    case 'micrograms':
      rounded = roundMicrograms(value);
      return rounded !== null ? `${rounded}mcg` : '—';
    
    case 'percent':
      rounded = roundPercentDV(value);
      if (rounded === null) return '—';
      if (rounded === '<1') return '<1%';
      return `${rounded}%`;
    
    default:
      return String(Math.round(value));
  }
}

/**
 * Calculate calories from macronutrients
 * Fat: 9 cal/g, Carbs: 4 cal/g, Protein: 4 cal/g
 */
export function calculateCaloriesFromMacros(
  fatG: number | null | undefined,
  carbsG: number | null | undefined,
  proteinG: number | null | undefined
): number {
  const fat = (fatG ?? 0) * 9;
  const carbs = (carbsG ?? 0) * 4;
  const protein = (proteinG ?? 0) * 4;
  return fat + carbs + protein;
}
