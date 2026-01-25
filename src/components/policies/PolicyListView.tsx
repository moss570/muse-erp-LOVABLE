import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Pencil, ChevronRight } from 'lucide-react';
import type { Policy } from '@/types/policies';
import { PolicyStatusBadge } from './PolicyStatusBadge';
import { PolicyCategoryBadge } from './PolicyCategoryBadge';
import { PolicyTypeBadge } from './PolicyTypeIcon';
import { PolicyMetadataBar } from './PolicyMetadataBar';
import { cn } from '@/lib/utils';

interface PolicyListViewProps {
  policies: Policy[];
  isLoading?: boolean;
  onView?: (policyId: string) => void;
  onEdit?: (policyId: string) => void;
}

export function PolicyListView({
  policies,
  isLoading,
  onView,
  onEdit,
}: PolicyListViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!policies || policies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No policies found</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Try adjusting your filters or search terms, or create a new policy to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {policies.map((policy) => {
        const isReviewOverdue = policy.review_date && new Date(policy.review_date) < new Date();
        const isReviewDueSoon = policy.review_date && new Date(policy.review_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        return (
          <Card
            key={policy.id}
            className={cn(
              'p-4 transition-all hover:shadow-md hover:border-primary/30',
              onView && 'cursor-pointer',
              isReviewOverdue && 'border-destructive/50',
              isReviewDueSoon && !isReviewOverdue && 'border-amber-500/50'
            )}
            onClick={onView ? () => onView(policy.id) : undefined}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Title and Policy Number */}
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">
                    {policy.policy_number}
                  </div>
                  <h3 className="font-semibold text-base line-clamp-1">
                    {policy.title}
                  </h3>
                  {policy.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                      {policy.summary}
                    </p>
                  )}
                </div>

                {/* Badges and Metadata */}
                <div className="flex items-center gap-6">
                  {/* Badges */}
                  <div className="flex items-center gap-1.5">
                    <PolicyStatusBadge status={policy.status} size="sm" showIcon={false} />
                    {policy.policy_type && (
                      <PolicyTypeBadge
                        policyType={policy.policy_type}
                        size="sm"
                        showLabel={false}
                      />
                    )}
                    {policy.category && (
                      <PolicyCategoryBadge
                        category={policy.category}
                        size="sm"
                        showIcon={false}
                      />
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="hidden lg:block">
                    <PolicyMetadataBar
                      policy={policy}
                      variant="compact"
                      showAvatar={false}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {onEdit && policy.status === 'Draft' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(policy.id);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                )}
                {onView && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(policy.id);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">View</span>
                  </Button>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
