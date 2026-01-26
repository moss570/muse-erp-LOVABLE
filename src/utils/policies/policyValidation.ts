import type { PolicyFormData, PolicyCategoryFormData, PolicyTypeFormData } from '@/types/policies';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate policy form data
 */
export function validatePolicy(policy: Partial<PolicyFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!policy.title || policy.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Policy title is required' });
  }

  if (policy.title && policy.title.length > 255) {
    errors.push({ field: 'title', message: 'Policy title must be 255 characters or less' });
  }

  if (!policy.policy_type_id) {
    errors.push({ field: 'policy_type_id', message: 'Policy type is required' });
  }

  if (!policy.owned_by) {
    errors.push({ field: 'owned_by', message: 'Policy owner is required' });
  }

  // Content validation
  if (!policy.content_html && !policy.content_plain) {
    errors.push({ field: 'content', message: 'Policy content is required' });
  }

  if (policy.content_html && policy.content_html.length > 1000000) {
    errors.push({ field: 'content_html', message: 'Policy content is too large (max 1MB)' });
  }

  // Summary length validation
  if (policy.summary && policy.summary.length > 500) {
    errors.push({ field: 'summary', message: 'Summary must be 500 characters or less' });
  }

  // Review frequency validation
  if (policy.review_frequency_months && (policy.review_frequency_months < 1 || policy.review_frequency_months > 60)) {
    errors.push({ field: 'review_frequency_months', message: 'Review frequency must be between 1 and 60 months' });
  }

  // Date validations
  if (policy.effective_date && policy.review_date) {
    const effectiveDate = new Date(policy.effective_date);
    const reviewDate = new Date(policy.review_date);

    if (reviewDate <= effectiveDate) {
      errors.push({ field: 'review_date', message: 'Review date must be after effective date' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate policy category
 */
export function validatePolicyCategory(category: Partial<PolicyCategoryFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!category.name || category.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Category name is required' });
  }

  if (category.name && category.name.length > 100) {
    errors.push({ field: 'name', message: 'Category name must be 100 characters or less' });
  }

  // Description length
  if (category.description && category.description.length > 500) {
    errors.push({ field: 'description', message: 'Description must be 500 characters or less' });
  }

  // Color hex validation
  if (category.color_hex && !/^#[0-9A-Fa-f]{6}$/.test(category.color_hex)) {
    errors.push({ field: 'color_hex', message: 'Color must be a valid hex code (e.g., #FF0000)' });
  }

  // Icon validation (basic check for emoji or short text)
  if (category.icon_name && category.icon_name.length > 10) {
    errors.push({ field: 'icon_name', message: 'Icon must be 10 characters or less' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate policy type
 */
export function validatePolicyType(type: Partial<PolicyTypeFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!type.type_name || type.type_name.trim().length === 0) {
    errors.push({ field: 'type_name', message: 'Type name is required' });
  }

  if (type.type_name && type.type_name.length > 100) {
    errors.push({ field: 'type_name', message: 'Type name must be 100 characters or less' });
  }

  if (!type.abbreviation || type.abbreviation.trim().length === 0) {
    errors.push({ field: 'abbreviation', message: 'Abbreviation is required' });
  }

  if (type.abbreviation && type.abbreviation.length > 10) {
    errors.push({ field: 'abbreviation', message: 'Abbreviation must be 10 characters or less' });
  }

  // Abbreviation format (uppercase letters and numbers only)
  if (type.abbreviation && !/^[A-Z0-9]+$/.test(type.abbreviation)) {
    errors.push({ field: 'abbreviation', message: 'Abbreviation must contain only uppercase letters and numbers' });
  }

  // Description length
  if (type.description && type.description.length > 500) {
    errors.push({ field: 'description', message: 'Description must be 500 characters or less' });
  }

  // Number format validation
  if (type.number_format) {
    if (!type.number_format.includes('{abbreviation}') && !type.number_format.includes('{number}')) {
      errors.push({ field: 'number_format', message: 'Number format must include {abbreviation} or {number}' });
    }

    if (type.number_format.length > 50) {
      errors.push({ field: 'number_format', message: 'Number format must be 50 characters or less' });
    }
  }

  // Next number validation
  if (type.next_number !== undefined && type.next_number < 1) {
    errors.push({ field: 'next_number', message: 'Next number must be at least 1' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate policy number format
 */
export function validatePolicyNumber(policyNumber: string): boolean {
  // Basic format validation - should have at least one letter or number
  if (!policyNumber || policyNumber.trim().length === 0) {
    return false;
  }

  // Must be between 3 and 50 characters
  if (policyNumber.length < 3 || policyNumber.length > 50) {
    return false;
  }

  // Can only contain letters, numbers, hyphens, and underscores
  return /^[A-Za-z0-9\-_]+$/.test(policyNumber);
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize HTML content (basic XSS prevention)
 */
export function sanitizeHtml(html: string): string {
  // This is a basic implementation - in production, use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const { maxSizeMB = 50, allowedTypes } = options;

  // Size validation
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    errors.push({
      field: 'file',
      message: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
    });
  }

  // Type validation
  if (allowedTypes && allowedTypes.length > 0) {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileType = file.type.toLowerCase();

    const isAllowed = allowedTypes.some(
      type =>
        fileType.includes(type.toLowerCase()) ||
        (fileExt && type.toLowerCase().includes(fileExt))
    );

    if (!isAllowed) {
      errors.push({
        field: 'file',
        message: `File type not allowed. Accepted types: ${allowedTypes.join(', ')}`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check for duplicate policy numbers
 */
export function isDuplicatePolicyNumber(
  policyNumber: string,
  existingNumbers: string[],
  excludeId?: string
): boolean {
  return existingNumbers.some(num => num === policyNumber);
}

/**
 * Validate review frequency is reasonable
 */
export function isReasonableReviewFrequency(months: number): boolean {
  // Between 1 month and 5 years
  return months >= 1 && months <= 60;
}
