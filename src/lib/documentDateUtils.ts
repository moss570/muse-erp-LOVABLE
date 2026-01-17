import { addYears, format, parseISO, isValid } from 'date-fns';

/**
 * Calculate expiry date by adding years to the review date
 * @param dateReviewed - The date the document was reviewed (ISO string or Date)
 * @param yearsToAdd - Number of years to add (default: 1)
 * @returns ISO date string (YYYY-MM-DD) or undefined if input is invalid
 */
export function calculateExpiryDate(
  dateReviewed: string | Date | undefined | null,
  yearsToAdd: number = 1
): string | undefined {
  if (!dateReviewed) return undefined;

  try {
    const reviewDate = typeof dateReviewed === 'string' 
      ? parseISO(dateReviewed) 
      : dateReviewed;
    
    if (!isValid(reviewDate)) return undefined;
    
    return format(addYears(reviewDate, yearsToAdd), 'yyyy-MM-dd');
  } catch {
    return undefined;
  }
}

/**
 * Check if expiry date was auto-calculated from review date
 * @param dateReviewed - The review date
 * @param expiryDate - The current expiry date
 * @returns true if expiry date matches review date + 1 year
 */
export function isAutoCalculatedExpiry(
  dateReviewed: string | undefined | null,
  expiryDate: string | undefined | null
): boolean {
  if (!dateReviewed || !expiryDate) return false;
  
  const calculatedExpiry = calculateExpiryDate(dateReviewed, 1);
  return calculatedExpiry === expiryDate;
}
