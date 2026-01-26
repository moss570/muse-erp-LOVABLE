import type { Policy, PolicyStatus, UserProfile, PolicyTag } from '@/types/policies';
import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow } from 'date-fns';

/**
 * Format file size from bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Format policy number for display
 */
export function formatPolicyNumber(policyNumber: string | null | undefined): string {
  if (!policyNumber) return 'N/A';
  return policyNumber.toUpperCase();
}

/**
 * Format policy status to readable text
 */
export function formatPolicyStatus(status: PolicyStatus): string {
  const statusMap: Record<PolicyStatus, string> = {
    Draft: 'Draft',
    Under_Review: 'Under Review',
    Pending_Approval: 'Pending Approval',
    Approved: 'Approved',
    Archived: 'Archived',
  };
  return statusMap[status] || status;
}

/**
 * Format version number for display
 */
export function formatVersionNumber(version: number | null | undefined): string {
  if (version === null || version === undefined) return '1.0';
  return version.toFixed(1);
}

/**
 * Format user name from profile
 */
export function formatUserName(user: UserProfile | null | undefined, fallback = 'Unknown'): string {
  if (!user) return fallback;

  if (user.full_name) return user.full_name;
  if (user.email) return user.email.split('@')[0];

  return fallback;
}

/**
 * Format user initials from profile
 */
export function formatUserInitials(user: UserProfile | null | undefined): string {
  if (!user) return '??';

  if (user.full_name) {
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return user.full_name.substring(0, 2).toUpperCase();
  }

  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }

  return '??';
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string | null | undefined, formatString = 'PPP'): string {
  if (!date) return 'N/A';

  try {
    return format(new Date(date), formatString);
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format date to short format (MM/DD/YYYY)
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  return formatDate(date, 'MM/dd/yyyy');
}

/**
 * Format date to long format (January 1, 2024)
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  return formatDate(date, 'MMMM d, yyyy');
}

/**
 * Format date to relative time (e.g., "2 days ago")
 */
export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';

  try {
    const dateObj = new Date(date);

    if (isToday(dateObj)) {
      return 'Today';
    }
    if (isYesterday(dateObj)) {
      return 'Yesterday';
    }
    if (isTomorrow(dateObj)) {
      return 'Tomorrow';
    }

    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format reading time in minutes to readable string
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than a minute';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format word count to readable string
 */
export function formatWordCount(count: number): string {
  if (count === 0) return 'No words';
  if (count === 1) return '1 word';
  if (count < 1000) return `${count} words`;

  const thousands = (count / 1000).toFixed(1);
  return `${thousands}k words`;
}

/**
 * Format tag list to comma-separated string
 */
export function formatTagList(tags: PolicyTag[] | null | undefined, maxTags = 3): string {
  if (!tags || tags.length === 0) return 'No tags';

  const tagNames = tags.slice(0, maxTags).map(tag => tag.tag_name);
  const remaining = tags.length - maxTags;

  if (remaining > 0) {
    return `${tagNames.join(', ')} +${remaining} more`;
  }

  return tagNames.join(', ');
}

/**
 * Format content summary with truncation
 */
export function formatSummary(content: string | null | undefined, maxLength = 200): string {
  if (!content) return 'No summary available';

  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, '').trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Truncate at word boundary
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Format review urgency to readable text
 */
export function formatReviewUrgency(policy: Policy): string {
  if (!policy.review_date) return 'No review scheduled';

  const reviewDate = new Date(policy.review_date);
  const now = new Date();
  const daysUntil = Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    const daysOverdue = Math.abs(daysUntil);
    if (daysOverdue === 1) return 'Overdue by 1 day';
    return `Overdue by ${daysOverdue} days`;
  }

  if (daysUntil === 0) return 'Due today';
  if (daysUntil === 1) return 'Due tomorrow';
  if (daysUntil <= 7) return `Due in ${daysUntil} days`;
  if (daysUntil <= 30) return `Due in ${Math.ceil(daysUntil / 7)} weeks`;
  if (daysUntil <= 90) return `Due in ${Math.ceil(daysUntil / 30)} months`;

  return 'Not due soon';
}

/**
 * Format acknowledgement percentage
 */
export function formatAcknowledgementPercentage(acknowledged: number, total: number): string {
  if (total === 0) return '0%';
  const percentage = Math.round((acknowledged / total) * 100);
  return `${percentage}%`;
}

/**
 * Format acknowledgement status
 */
export function formatAcknowledgementStatus(acknowledged: number, total: number): string {
  if (total === 0) return 'No employees assigned';
  if (acknowledged === 0) return 'None acknowledged';
  if (acknowledged === total) return 'Fully acknowledged';
  return `${acknowledged} of ${total} acknowledged`;
}

/**
 * Format quiz score
 */
export function formatQuizScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'N/A';
  return `${Math.round(score)}%`;
}

/**
 * Format attachment type to readable text
 */
export function formatAttachmentType(type: string): string {
  const typeMap: Record<string, string> = {
    form: 'Form',
    supporting_document: 'Supporting Document',
    reference: 'Reference',
    template: 'Template',
    flowchart: 'Flowchart',
    checklist: 'Checklist',
  };
  return typeMap[type] || type.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Format relationship type to readable text
 */
export function formatRelationshipType(type: string): string {
  const typeMap: Record<string, string> = {
    supersedes: 'Supersedes',
    superseded_by: 'Superseded By',
    references: 'References',
    referenced_by: 'Referenced By',
    related_to: 'Related To',
  };
  return typeMap[type] || type.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Format comment count
 */
export function formatCommentCount(count: number): string {
  if (count === 0) return 'No comments';
  if (count === 1) return '1 comment';
  return `${count} comments`;
}

/**
 * Format version count
 */
export function formatVersionCount(count: number): string {
  if (count === 0) return 'No versions';
  if (count === 1) return '1 version';
  return `${count} versions`;
}

/**
 * Format attachment count
 */
export function formatAttachmentCount(count: number): string {
  if (count === 0) return 'No attachments';
  if (count === 1) return '1 attachment';
  return `${count} attachments`;
}

/**
 * Format policy number with type prefix
 */
export function formatPolicyNumberWithType(
  abbreviation: string,
  number: number,
  numberFormat = '{abbreviation}-{number:4}'
): string {
  return numberFormat
    .replace('{abbreviation}', abbreviation)
    .replace('{number:4}', String(number).padStart(4, '0'))
    .replace('{number:3}', String(number).padStart(3, '0'))
    .replace('{number}', String(number));
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format category path (for hierarchical categories)
 */
export function formatCategoryPath(categories: string[]): string {
  return categories.join(' > ');
}

/**
 * Format boolean to Yes/No
 */
export function formatBoolean(value: boolean | null | undefined, yesText = 'Yes', noText = 'No'): string {
  if (value === null || value === undefined) return 'N/A';
  return value ? yesText : noText;
}

/**
 * Format list with proper grammar
 */
export function formatList(items: string[], conjunction = 'and'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

  const allButLast = items.slice(0, -1).join(', ');
  const last = items[items.length - 1];

  return `${allButLast}, ${conjunction} ${last}`;
}
