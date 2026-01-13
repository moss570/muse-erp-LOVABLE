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
 * Generates a pair of UPC codes (tub and case) for a product size
 */
export async function generateUPCPair(): Promise<{ tubUpc: string | null; caseUpc: string | null }> {
  const tubSequence = await getNextUPCSequence();
  const tubUpc = await generateUPCCode(tubSequence);
  
  // Case UPC is typically the next sequence
  const caseUpc = await generateUPCCode(tubSequence + 1);
  
  return { tubUpc, caseUpc };
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
