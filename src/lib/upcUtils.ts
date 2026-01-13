/**
 * UPC-A Check Digit Calculator
 * UPC-A format: 12 digits total (11 data digits + 1 check digit)
 */
export function calculateUPCCheckDigit(digits: string): number {
  // Remove any non-digit characters and ensure we have 11 digits
  const cleanDigits = digits.replace(/\D/g, '').slice(0, 11);
  if (cleanDigits.length !== 11) {
    throw new Error('UPC-A requires exactly 11 digits before check digit');
  }

  let oddSum = 0;
  let evenSum = 0;

  for (let i = 0; i < 11; i++) {
    const digit = parseInt(cleanDigits[i], 10);
    if (i % 2 === 0) {
      oddSum += digit;
    } else {
      evenSum += digit;
    }
  }

  const total = (oddSum * 3) + evenSum;
  const checkDigit = (10 - (total % 10)) % 10;
  
  return checkDigit;
}

/**
 * Generate a complete UPC-A code from company prefix and item number
 */
export function generateUPCCode(companyPrefix: string, itemNumber: string): string {
  // Clean inputs
  const cleanPrefix = companyPrefix.replace(/\D/g, '');
  const cleanItem = itemNumber.replace(/\D/g, '');
  
  // UPC-A has 11 data digits (prefix + item)
  const totalDataDigits = 11;
  const itemDigits = totalDataDigits - cleanPrefix.length;
  
  if (cleanPrefix.length < 6 || cleanPrefix.length > 10) {
    throw new Error('Company prefix must be 6-10 digits');
  }
  
  // Pad item number with leading zeros
  const paddedItem = cleanItem.padStart(itemDigits, '0').slice(0, itemDigits);
  const dataDigits = cleanPrefix + paddedItem;
  
  const checkDigit = calculateUPCCheckDigit(dataDigits);
  
  return dataDigits + checkDigit.toString();
}

/**
 * Validate a UPC-A code
 */
export function validateUPCCode(upc: string): boolean {
  const cleanUPC = upc.replace(/\D/g, '');
  if (cleanUPC.length !== 12) return false;
  
  const dataDigits = cleanUPC.slice(0, 11);
  const providedCheck = parseInt(cleanUPC[11], 10);
  const calculatedCheck = calculateUPCCheckDigit(dataDigits);
  
  return providedCheck === calculatedCheck;
}

/**
 * Generate SSCC-18 (Serial Shipping Container Code) for pallets
 * Format: Extension digit (1) + GS1 Company Prefix (variable) + Serial Reference (variable) + Check Digit (1)
 */
export function generateSSCC(companyPrefix: string, serialNumber: string, extensionDigit: string = '0'): string {
  const cleanPrefix = companyPrefix.replace(/\D/g, '');
  const cleanSerial = serialNumber.replace(/\D/g, '');
  
  // SSCC has 18 digits total: 1 extension + 16 data + 1 check
  const serialDigits = 16 - cleanPrefix.length;
  const paddedSerial = cleanSerial.padStart(serialDigits, '0').slice(0, serialDigits);
  
  const dataDigits = extensionDigit.slice(0, 1) + cleanPrefix + paddedSerial;
  
  // Calculate check digit using mod 10 algorithm
  let oddSum = 0;
  let evenSum = 0;
  
  for (let i = 0; i < 17; i++) {
    const digit = parseInt(dataDigits[i], 10);
    if (i % 2 === 0) {
      oddSum += digit;
    } else {
      evenSum += digit;
    }
  }
  
  const total = (oddSum * 3) + evenSum;
  const checkDigit = (10 - (total % 10)) % 10;
  
  return dataDigits + checkDigit.toString();
}

/**
 * Format UPC for display with dashes
 */
export function formatUPCForDisplay(upc: string): string {
  const clean = upc.replace(/\D/g, '');
  if (clean.length === 12) {
    // UPC-A format: X-XXXXX-XXXXX-X
    return `${clean[0]}-${clean.slice(1, 6)}-${clean.slice(6, 11)}-${clean[11]}`;
  }
  if (clean.length === 14) {
    // GTIN-14 format: X-X-XXXXX-XXXXX-X
    return `${clean[0]}-${clean[1]}-${clean.slice(2, 7)}-${clean.slice(7, 12)}-${clean[13]}`;
  }
  return upc;
}

/**
 * Calculate check digit for GTIN-14 (13 data digits + 1 check)
 * Uses the same Mod-10 algorithm as UPC-A but with 13 digits
 */
export function calculateGTIN14CheckDigit(digits: string): number {
  const cleanDigits = digits.replace(/\D/g, '').slice(0, 13);
  if (cleanDigits.length !== 13) {
    throw new Error('GTIN-14 requires exactly 13 digits before check digit');
  }

  let oddSum = 0;
  let evenSum = 0;

  for (let i = 0; i < 13; i++) {
    const digit = parseInt(cleanDigits[i], 10);
    // For GTIN-14, positions are 1-indexed and odd positions (1,3,5...) are multiplied by 3
    // When 0-indexed, these are positions 0,2,4... (even indices)
    if (i % 2 === 0) {
      oddSum += digit;
    } else {
      evenSum += digit;
    }
  }

  const total = (oddSum * 3) + evenSum;
  const checkDigit = (10 - (total % 10)) % 10;
  
  return checkDigit;
}

/**
 * Generate GTIN-14 (Case UPC) from a product's UPC-A code
 * 
 * Format: [Packaging Indicator (1)][Padding Zero (1)][Company Prefix + Item Ref (11)][Check Digit (1)]
 * 
 * @param productUpc - The 12-digit UPC-A of the individual product
 * @param packagingIndicator - Packaging level indicator (1-8). Use 0 for mixed assortments only.
 *   - 1 = Standard inner carton
 *   - 2 = Outer case
 *   - 3-8 = Higher packaging levels
 */
export function generateGTIN14FromUPC(productUpc: string, packagingIndicator: string = '1'): string {
  const cleanUpc = productUpc.replace(/\D/g, '');
  
  if (cleanUpc.length !== 12) {
    throw new Error('Product UPC must be exactly 12 digits (UPC-A format)');
  }
  
  // Validate packaging indicator (should be 0-8)
  const indicator = packagingIndicator.slice(0, 1);
  if (!/^[0-8]$/.test(indicator)) {
    throw new Error('Packaging indicator must be a single digit 0-8');
  }
  
  // Step 1: Packaging Indicator (1 digit)
  // Step 2: Padding Zero (1 digit) - required for UPC-A to GTIN-14 conversion
  // Step 3: First 11 digits of UPC-A (excluding check digit)
  const dataDigits = indicator + '0' + cleanUpc.slice(0, 11);
  
  // Step 4: Calculate new check digit for all 13 data digits
  const checkDigit = calculateGTIN14CheckDigit(dataDigits);
  
  return dataDigits + checkDigit.toString();
}

/**
 * Format GTIN-14 for display
 */
export function formatGTIN14ForDisplay(gtin14: string): string {
  const clean = gtin14.replace(/\D/g, '');
  if (clean.length !== 14) return gtin14;
  // Format: (X) 0 XXXXX XXXXX X
  return `(${clean[0]}) ${clean[1]} ${clean.slice(2, 7)} ${clean.slice(7, 12)} ${clean[13]}`;
}

/**
 * Validate a GTIN-14 code
 */
export function validateGTIN14(gtin14: string): boolean {
  const clean = gtin14.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  
  const dataDigits = clean.slice(0, 13);
  const providedCheck = parseInt(clean[13], 10);
  const calculatedCheck = calculateGTIN14CheckDigit(dataDigits);
  
  return providedCheck === calculatedCheck;
}

/**
 * Generate next item number based on existing products
 */
export function getNextItemNumber(existingProducts: { upc_code?: string | null }[], companyPrefix: string): string {
  const prefixLength = companyPrefix.length;
  const itemDigits = 11 - prefixLength;
  
  let maxItemNumber = 0;
  
  for (const product of existingProducts) {
    if (!product.upc_code) continue;
    const cleanUPC = product.upc_code.replace(/\D/g, '');
    if (cleanUPC.length !== 12) continue;
    if (!cleanUPC.startsWith(companyPrefix)) continue;
    
    const itemPart = cleanUPC.slice(prefixLength, 11);
    const itemNum = parseInt(itemPart, 10);
    if (itemNum > maxItemNumber) {
      maxItemNumber = itemNum;
    }
  }
  
  return (maxItemNumber + 1).toString().padStart(itemDigits, '0');
}