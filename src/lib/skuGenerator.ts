import { supabase } from "@/integrations/supabase/client";

/**
 * Generate flavor code from product name
 * Examples:
 * - "Vanilla" → "VAN"
 * - "Chocolate" → "CHOC"
 * - "Strawberry" → "STRA"
 * - "Mint Chip" → "MINT"
 */
export function generateFlavorCode(productName: string): string {
  // Remove special characters and extra spaces
  const cleaned = productName.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
  
  // Split into words
  const words = cleaned.split(/\s+/);
  
  // Use first word, take 3-4 characters
  const firstWord = words[0] || '';
  
  if (firstWord.length <= 3) {
    return firstWord;
  } else if (firstWord.length === 4) {
    return firstWord;
  } else {
    // For longer words, take first 4 chars
    return firstWord.slice(0, 4);
  }
}

/**
 * Generate product SKU from category and product name
 */
export async function generateProductSKU(
  categoryId: string,
  productName: string,
  excludeProductId?: string
): Promise<{ sku: string; isUnique: boolean }> {
  if (!categoryId || !productName.trim()) {
    return { sku: '', isUnique: false };
  }

  // Fetch category to get sku_prefix
  const { data: category } = await supabase
    .from('product_categories')
    .select('sku_prefix')
    .eq('id', categoryId)
    .single();
  
  if (!category?.sku_prefix) {
    return { sku: '', isUnique: false };
  }
  
  const flavorCode = generateFlavorCode(productName);
  const sku = `${category.sku_prefix}-${flavorCode}`;
  
  // Check uniqueness
  let query = supabase
    .from('products')
    .select('id')
    .eq('sku', sku);
  
  // Exclude current product when editing
  if (excludeProductId) {
    query = query.neq('id', excludeProductId);
  }
  
  const { data: existing } = await query.maybeSingle();
  
  return {
    sku,
    isUnique: !existing
  };
}

/**
 * Check if a SKU is unique
 */
export async function checkSkuUniqueness(
  sku: string, 
  excludeProductId?: string
): Promise<boolean> {
  if (!sku.trim()) return false;
  
  let query = supabase
    .from('products')
    .select('id')
    .eq('sku', sku);
  
  if (excludeProductId) {
    query = query.neq('id', excludeProductId);
  }
  
  const { data: existing } = await query.maybeSingle();
  return !existing;
}

/**
 * Generate product size SKU
 * Format: {Product_SKU}-{Container_Code}-CS{Case_Pack}
 * Example: G-VAN-08-CS4
 */
export function generateProductSizeSKU(
  productSku: string,
  containerCode: string,
  casePack: number
): string {
  if (!productSku || !containerCode) return '';
  return `${productSku}-${containerCode}-CS${casePack}`;
}
