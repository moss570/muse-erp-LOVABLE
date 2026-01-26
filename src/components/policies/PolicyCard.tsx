import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Eye,
  Pencil,
  Archive,
  Copy,
  Download,
  Share,
  FileText,
  MessageSquare,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Policy } from '@/types/policies';
import { PolicyStatusBadge } from './PolicyStatusBadge';
import { PolicyCategoryBadge } from './PolicyCategoryBadge';
import { PolicyTypeBadge } from './PolicyTypeIcon';
import { PolicyMetadataBar } from './PolicyMetadataBar';
import { format } from 'date-fns';

interface PolicyCardProps {
  policy: Policy;
  onView?: (policy: Policy) => void;
  onEdit?: (policy: Policy) => void;
  onArchive?: (policy: Policy) => void;
  onDuplicate?: (policy: Policy) => void;
  onDownload?: (policy: Policy) => void;
  onShare?: (policy: Policy) => void;
  variant?: 'default' | 'compact';
  className?: string;
}

export function PolicyCard({
  policy,
  onView,
  onEdit,
  onArchive,
  onDuplicate,
  onDownload,
  onShare,
  variant = 'default',
  className,
}: PolicyCardProps) {
  const isCompact = variant === 'compact';

  const handleCardClick = () => {
    if (onView) {
      onView(policy);
    }
  };

  const isReviewDueSoon = policy.review_date && new Date(policy.review_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isReviewOverdue = policy.review_date && new Date(policy.review_date) < new Date();

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/30',
        isReviewOverdue && 'border-destructive/50',
        isReviewDueSoon && !isReviewOverdue && 'border-amber-500/50',
        onView && 'cursor-pointer',
        className
      )}
      onClick={onView ? handleCardClick : undefined}
    >
      {/* Card Header with Preview */}
      {!isCompact && (
        <div className="aspect-[16/9] bg-muted/30 relative flex items-center justify-center border-b">
          {/* Document Preview Placeholder */}
          <div className="absolute inset-2 bg-background rounded border shadow-sm overflow-hidden">
            <div className="h-full w-full flex items-start justify-center pt-6 px-4 opacity-60">
              <div className="w-full space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-full" />
                <div className="h-2 bg-muted rounded w-5/6" />
                <div className="h-2 bg-muted rounded w-4/6" />
                <div className="h-4 my-3" />
                <div className="h-2 bg-muted rounded w-full" />
                <div className="h-2 bg-muted rounded w-3/4" />
              </div>
            </div>
          </div>

          {/* Status Badge Overlay */}
          <div className="absolute top-2 right-2">
            <PolicyStatusBadge status={policy.status} size="sm" />
          </div>

          {/* Hover Actions */}
          {onView && (
            <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(policy);
                }}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              {onEdit && policy.status === 'Draft' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(policy);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Card Content */}
      <CardContent className={cn('p-4', isCompact && 'py-3')}>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            {/* Policy Number */}
            <div className="text-xs text-muted-foreground font-mono mb-1">
              {policy.policy_number}
            </div>

            {/* Title */}
            <h3
              className={cn(
                'font-semibold line-clamp-2',
                isCompact ? 'text-sm' : 'text-base'
              )}
            >
              {policy.title}
            </h3>

            {/* Summary */}
            {!isCompact && policy.summary && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {policy.summary}
              </p>
            )}
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(policy)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Policy
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(policy)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Policy
                </DropdownMenuItem>
              )}
              {onDownload && (
                <DropdownMenuItem onClick={() => onDownload(policy)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download as Word
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(policy)}>
                  <Share className="h-4 w-4 mr-2" />
                  Share Policy
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(policy)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onArchive && policy.status !== 'Archived' && (
                <DropdownMenuItem
                  onClick={() => onArchive(policy)}
                  className="text-destructive focus:text-destructive"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {isCompact && (
            <PolicyStatusBadge status={policy.status} size="sm" showIcon={false} />
          )}
          {policy.policy_type && (
            <PolicyTypeBadge
              policyType={policy.policy_type}
              size="sm"
              showLabel={!isCompact}
            />
          )}
          {policy.category && (
            <PolicyCategoryBadge
              category={policy.category}
              size="sm"
              showIcon={!isCompact}
            />
          )}
        </div>

        {/* Metadata Bar */}
        <PolicyMetadataBar
          policy={policy}
          variant={isCompact ? 'compact' : 'full'}
          showAvatar={!isCompact}
          className="text-xs"
        />

        {/* Activity Indicators - Only in default variant */}
        {!isCompact && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
            {policy.require_acknowledgement && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Requires Ack</span>
              </div>
            )}
            {policy.sqf_codes_mapped_count !== undefined && policy.sqf_codes_mapped_count > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                <span>{policy.sqf_codes_mapped_count} SQF codes</span>
              </div>
            )}
            {policy.open_comments_count !== undefined && policy.open_comments_count > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{policy.open_comments_count} comments</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
