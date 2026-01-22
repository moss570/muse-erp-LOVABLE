import { supabase } from "@/integrations/supabase/client";
import { calculateUPCCheckDigit } from "./upcUtils";

/**
 * Generates a unique UPC-A code using the company's GS1 prefix
 * Format: [GS1 Prefix (6-10 digits)][Item Reference (remaining)][Check Digit (1)]
 */
export async function generateUPCCode(itemSequence?: number): Promise<string | null> {
  // Fetch the GS1 company prefix from company settings
  const { data: settings, error } = await supabase
    .from("company_settings")
    .select("gs1_company_prefix")
    .limit(1)
    .single();

  if (error || !settings?.gs1_company_prefix) {
    console.error("GS1 company prefix not configured");
    return null;
  }

  const prefix = settings.gs1_company_prefix;
  
  // UPC-A is 12 digits total: prefix + item reference + check digit
  // Calculate how many digits we have for item reference
  const itemReferenceLength = 11 - prefix.length;
  
  if (itemReferenceLength < 1) {
    console.error("GS1 prefix is too long for UPC-A generation");
    return null;
  }

  // If no sequence provided, get the next available one
  let sequence = itemSequence;
  if (!sequence) {
    sequence = await getNextUPCSequence();
  }

  // Pad the sequence to the required length
  const itemReference = sequence.toString().padStart(itemReferenceLength, "0");
  
  // Combine prefix and item reference (11 digits)
  const upcWithoutCheck = prefix + itemReference;
  
  if (upcWithoutCheck.length !== 11) {
    console.error(`Invalid UPC length: ${upcWithoutCheck.length}`);
    return null;
  }

  // Calculate check digit
  const checkDigit = calculateUPCCheckDigit(upcWithoutCheck);
  
  return upcWithoutCheck + checkDigit.toString();
}

/**
 * Gets the next available UPC sequence number by finding the max used
 */
async function getNextUPCSequence(): Promise<number> {
  // Check product_sizes for existing UPC codes
  const { data: sizes } = await supabase
    .from("product_sizes")
    .select("upc_code, case_upc_code")
    .not("upc_code", "is", null);

  // Also check products table for legacy UPC codes
  const { data: products } = await supabase
    .from("products")
    .select("upc_code, case_upc_code")
    .not("upc_code", "is", null);

  const allUpcs: string[] = [];
  
  sizes?.forEach((s) => {
    if (s.upc_code) allUpcs.push(s.upc_code);
    if (s.case_upc_code) allUpcs.push(s.case_upc_code);
  });
  
  products?.forEach((p) => {
    if (p.upc_code) allUpcs.push(p.upc_code);
    if (p.case_upc_code) allUpcs.push(p.case_upc_code);
  });

  if (allUpcs.length === 0) {
    return 1;
  }

  // Extract sequence numbers from existing UPCs
  // This is a simplified approach - assumes all UPCs use the same prefix
  const { data: settings } = await supabase
    .from("company_settings")
    .select("gs1_company_prefix")
    .limit(1)
    .single();

  if (!settings?.gs1_company_prefix) {
    return 1;
  }

  const prefix = settings.gs1_company_prefix;
  let maxSequence = 0;

  allUpcs.forEach((upc) => {
    if (upc.startsWith(prefix)) {
      // Extract the item reference (everything between prefix and check digit)
      const itemReference = upc.slice(prefix.length, -1);
      const seq = parseInt(itemReference, 10);
      if (!isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  });

  return maxSequence + 1;
}

/**
 * Generates a UPC-A code for a product/tub and derives a GTIN-14 case code from it
 * 
 * @param casePackSize - The number of units per case (used to look up packaging indicator)
 * @param packagingIndicatorOverride - Optional override for packaging indicator
 * @returns Object with tubUpc (12-digit UPC-A) and caseUpc (14-digit GTIN-14)
 */
export async function generateUPCPair(
  casePackSize?: number,
  packagingIndicatorOverride?: string
): Promise<{ tubUpc: string | null; caseUpc: string | null }> {
  // Import the GTIN-14 generator and packaging indicator lookup
  const { generateGTIN14FromUPC } = await import("./upcUtils");
  const { getPackagingIndicatorForSize } = await import("@/hooks/usePackagingIndicators");
  
  // Generate the product UPC-A
  const tubSequence = await getNextUPCSequence();
  const tubUpc = await generateUPCCode(tubSequence);
  
  if (!tubUpc) {
    return { tubUpc: null, caseUpc: null };
  }
  
  // Get packaging indicator - priority: override > lookup by case size > default "1"
  let indicator = packagingIndicatorOverride;
  if (!indicator && casePackSize) {
    indicator = await getPackagingIndicatorForSize(casePackSize);
  }
  if (!indicator) {
    indicator = "1";
  }
  
  // Derive the GTIN-14 case code from the product UPC-A
  const caseUpc = generateGTIN14FromUPC(tubUpc, indicator);
  
  return { tubUpc, caseUpc };
}

/**
 * Generates a GTIN-14 case code from an existing parent tub UPC
 * Used when creating case sizes that inherit the tub UPC from their parent
 * 
 * @param parentTubUpc - The 12-digit UPC-A code from the parent tub size
 * @param casePackSize - The number of units per case (used to look up packaging indicator)
 * @param packagingIndicatorOverride - Optional override for packaging indicator
 * @returns The 14-digit GTIN-14 case code
 */
export async function generateCaseUPCFromParent(
  parentTubUpc: string,
  casePackSize?: number,
  packagingIndicatorOverride?: string
): Promise<string | null> {
  if (!parentTubUpc || parentTubUpc.length !== 12) {
    console.error("Invalid parent tub UPC - must be 12 digits");
    return null;
  }
  
  const { generateGTIN14FromUPC } = await import("./upcUtils");
  const { getPackagingIndicatorForSize } = await import("@/hooks/usePackagingIndicators");
  
  // Get packaging indicator - priority: override > lookup by case size > default "1"
  let indicator = packagingIndicatorOverride;
  if (!indicator && casePackSize) {
    indicator = await getPackagingIndicatorForSize(casePackSize);
  }
  if (!indicator) {
    indicator = "1";
  }
  
  // Derive the GTIN-14 case code from the parent tub UPC
  return generateGTIN14FromUPC(parentTubUpc, indicator);
}

/**
 * Validates if a UPC code is unique across all products
 */
export async function isUPCUnique(upcCode: string, excludeSizeId?: string): Promise<boolean> {
  // Check product_sizes
  let query = supabase
    .from("product_sizes")
    .select("id")
    .or(`upc_code.eq.${upcCode},case_upc_code.eq.${upcCode}`);
  
  if (excludeSizeId) {
    query = query.neq("id", excludeSizeId);
  }
  
  const { data: sizeMatches } = await query;
  
  if (sizeMatches && sizeMatches.length > 0) {
    return false;
  }

  // Check products table for legacy UPCs
  const { data: productMatches } = await supabase
    .from("products")
    .select("id")
    .or(`upc_code.eq.${upcCode},case_upc_code.eq.${upcCode}`);

  return !productMatches || productMatches.length === 0;
}
