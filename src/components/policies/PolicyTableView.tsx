import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Pencil, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import type { Policy } from '@/types/policies';
import { PolicyStatusBadge } from './PolicyStatusBadge';
import { PolicyCategoryBadge } from './PolicyCategoryBadge';
import { PolicyTypeBadge } from './PolicyTypeIcon';
import { cn } from '@/lib/utils';

interface PolicyTableViewProps {
  policies: Policy[];
  isLoading?: boolean;
  onView?: (policyId: string) => void;
  onEdit?: (policyId: string) => void;
}

type SortField = 'policy_number' | 'title' | 'status' | 'effective_date' | 'review_date' | 'updated_at';
type SortDirection = 'asc' | 'desc';

export function PolicyTableView({
  policies,
  isLoading,
  onView,
  onEdit,
}: PolicyTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPolicies = [...(policies || [])].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    // Convert dates to timestamps for comparison
    if (sortField.includes('date') || sortField === 'updated_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Compare
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return 'Invalid';
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Review Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!policies || policies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No policies found</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Try adjusting your filters or search terms, or create a new policy to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={() => handleSort('policy_number')}
              >
                Policy #
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={() => handleSort('title')}
              >
                Title
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={() => handleSort('status')}
              >
                Status
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={() => handleSort('effective_date')}
              >
                Effective Date
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={() => handleSort('review_date')}
              >
                Review Date
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPolicies.map((policy) => {
            const isReviewOverdue = policy.review_date && new Date(policy.review_date) < new Date();
            const isReviewDueSoon = policy.review_date && new Date(policy.review_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            return (
              <TableRow
                key={policy.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/50',
                  isReviewOverdue && 'bg-destructive/5',
                  isReviewDueSoon && !isReviewOverdue && 'bg-amber-500/5'
                )}
                onClick={onView ? () => onView(policy.id) : undefined}
              >
                <TableCell className="font-mono text-sm">
                  {policy.policy_number}
                </TableCell>
                <TableCell>
                  <div className="max-w-md">
                    <div className="font-medium line-clamp-1">{policy.title}</div>
                    {policy.summary && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {policy.summary}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {policy.policy_type && (
                    <PolicyTypeBadge
                      policyType={policy.policy_type}
                      size="sm"
                      showLabel={false}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {policy.category && (
                    <PolicyCategoryBadge
                      category={policy.category}
                      size="sm"
                      showIcon={false}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <PolicyStatusBadge status={policy.status} size="sm" />
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(policy.effective_date)}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'text-sm',
                      isReviewOverdue && 'text-destructive font-medium',
                      isReviewDueSoon && !isReviewOverdue && 'text-amber-600 font-medium'
                    )}
                  >
                    {formatDate(policy.review_date)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {onEdit && policy.status === 'Draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(policy.id);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(policy.id);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
