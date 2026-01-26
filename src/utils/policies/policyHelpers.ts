import type { Policy, PolicyStatus } from '@/types/policies';
import { differenceInDays, addMonths, isAfter, isBefore } from 'date-fns';

/**
 * Check if a policy review is overdue
 */
export function isPolicyReviewOverdue(policy: Policy): boolean {
  if (!policy.review_date) return false;
  return new Date(policy.review_date) < new Date();
}

/**
 * Check if a policy review is due soon (within specified days)
 */
export function isPolicyReviewDueSoon(policy: Policy, daysThreshold: number = 30): boolean {
  if (!policy.review_date) return false;
  const reviewDate = new Date(policy.review_date);
  const now = new Date();
  const daysUntilReview = differenceInDays(reviewDate, now);
  return daysUntilReview > 0 && daysUntilReview <= daysThreshold;
}

/**
 * Calculate next review date based on review frequency
 */
export function calculateNextReviewDate(effectiveDate: Date | string, frequencyMonths: number): Date {
  return addMonths(new Date(effectiveDate), frequencyMonths);
}

/**
 * Check if a policy is currently effective
 */
export function isPolicyEffective(policy: Policy): boolean {
  if (!policy.effective_date) return false;
  return !isAfter(new Date(policy.effective_date), new Date());
}

/**
 * Get policy status color
 */
export function getPolicyStatusColor(status: PolicyStatus): string {
  const colors: Record<PolicyStatus, string> = {
    Draft: 'muted',
    Under_Review: 'blue',
    Pending_Approval: 'amber',
    Approved: 'emerald',
    Archived: 'muted',
  };
  return colors[status] || 'muted';
}

/**
 * Get policy status priority (for sorting)
 */
export function getPolicyStatusPriority(status: PolicyStatus): number {
  const priorities: Record<PolicyStatus, number> = {
    Draft: 1,
    Under_Review: 2,
    Pending_Approval: 3,
    Approved: 4,
    Archived: 5,
  };
  return priorities[status] || 99;
}

/**
 * Sort policies by status priority
 */
export function sortPoliciesByStatus(policies: Policy[]): Policy[] {
  return [...policies].sort((a, b) => {
    const priorityA = getPolicyStatusPriority(a.status);
    const priorityB = getPolicyStatusPriority(b.status);
    return priorityA - priorityB;
  });
}

/**
 * Sort policies by review urgency (overdue first, then due soon, then by date)
 */
export function sortPoliciesByReviewUrgency(policies: Policy[]): Policy[] {
  return [...policies].sort((a, b) => {
    const aOverdue = isPolicyReviewOverdue(a);
    const bOverdue = isPolicyReviewOverdue(b);
    const aDueSoon = isPolicyReviewDueSoon(a);
    const bDueSoon = isPolicyReviewDueSoon(b);

    // Overdue policies first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then due soon policies
    if (aDueSoon && !bDueSoon) return -1;
    if (!aDueSoon && bDueSoon) return 1;

    // Then by review date
    if (!a.review_date && !b.review_date) return 0;
    if (!a.review_date) return 1;
    if (!b.review_date) return -1;

    return new Date(a.review_date).getTime() - new Date(b.review_date).getTime();
  });
}

/**
 * Filter policies that require review
 */
export function getPoliciesRequiringReview(policies: Policy[], daysThreshold: number = 30): Policy[] {
  return policies.filter(
    policy =>
      policy.status === 'Approved' &&
      (isPolicyReviewOverdue(policy) || isPolicyReviewDueSoon(policy, daysThreshold))
  );
}

/**
 * Group policies by category
 */
export function groupPoliciesByCategory(policies: Policy[]): Record<string, Policy[]> {
  return policies.reduce((groups, policy) => {
    const categoryName = policy.category?.name || 'Uncategorized';
    if (!groups[categoryName]) {
      groups[categoryName] = [];
    }
    groups[categoryName].push(policy);
    return groups;
  }, {} as Record<string, Policy[]>);
}

/**
 * Group policies by type
 */
export function groupPoliciesByType(policies: Policy[]): Record<string, Policy[]> {
  return policies.reduce((groups, policy) => {
    const typeName = policy.policy_type?.type_name || 'Other';
    if (!groups[typeName]) {
      groups[typeName] = [];
    }
    groups[typeName].push(policy);
    return groups;
  }, {} as Record<string, Policy[]>);
}

/**
 * Get policy completion percentage (for policies with checklists or requirements)
 */
export function getPolicyCompletionPercentage(policy: Policy): number {
  // This is a placeholder - implement based on actual requirements
  // For now, consider a policy 100% complete if approved
  if (policy.status === 'Approved') return 100;
  if (policy.status === 'Pending_Approval') return 75;
  if (policy.status === 'Under_Review') return 50;
  if (policy.status === 'Draft') return 25;
  return 0;
}

/**
 * Check if policy has required metadata
 */
export function hasRequiredMetadata(policy: Partial<Policy>): boolean {
  return !!(
    policy.title &&
    policy.policy_type_id &&
    policy.owned_by &&
    policy.content_html
  );
}

/**
 * Extract keywords from policy content for search indexing
 */
export function extractKeywords(content: string, maxKeywords: number = 10): string[] {
  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, ' ');

  // Split into words and filter
  const words = plainText
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3) // Only words longer than 3 characters
    .filter(word => !/^(the|and|for|with|from|this|that|have|been|will)$/.test(word)); // Remove common words

  // Count word frequency
  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Sort by frequency and return top keywords
  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Generate policy summary from content
 */
export function generateSummary(content: string, maxLength: number = 200): string {
  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, ' ').trim();

  // Get first sentence or up to maxLength characters
  const sentences = plainText.split(/[.!?]+/);
  const firstSentence = sentences[0]?.trim() || '';

  if (firstSentence.length <= maxLength) {
    return firstSentence + '.';
  }

  return firstSentence.substring(0, maxLength).trim() + '...';
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(wordCount: number, wordsPerMinute: number = 200): number {
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Check if two policy versions have significant changes
 */
export function hasSignificantChanges(
  oldContent: string,
  newContent: string,
  threshold: number = 0.1
): boolean {
  const oldLength = oldContent.length;
  const newLength = newContent.length;

  if (oldLength === 0) return true;

  const changeRatio = Math.abs(newLength - oldLength) / oldLength;
  return changeRatio > threshold;
}
