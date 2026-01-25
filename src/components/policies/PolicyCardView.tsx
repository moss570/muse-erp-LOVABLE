import { PolicyCard } from './PolicyCard';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import type { Policy } from '@/types/policies';

interface PolicyCardViewProps {
  policies: Policy[];
  isLoading?: boolean;
  onView?: (policyId: string) => void;
  onEdit?: (policyId: string) => void;
  onArchive?: (policyId: string) => void;
  onDuplicate?: (policyId: string) => void;
  onDownload?: (policyId: string) => void;
  onShare?: (policyId: string) => void;
}

export function PolicyCardView({
  policies,
  isLoading,
  onView,
  onEdit,
  onArchive,
  onDuplicate,
  onDownload,
  onShare,
}: PolicyCardViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[16/9] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {policies.map((policy) => (
        <PolicyCard
          key={policy.id}
          policy={policy}
          onView={onView ? () => onView(policy.id) : undefined}
          onEdit={onEdit && policy.status === 'Draft' ? () => onEdit(policy.id) : undefined}
          onArchive={onArchive ? () => onArchive(policy.id) : undefined}
          onDuplicate={onDuplicate ? () => onDuplicate(policy.id) : undefined}
          onDownload={onDownload ? () => onDownload(policy.id) : undefined}
          onShare={onShare ? () => onShare(policy.id) : undefined}
        />
      ))}
    </div>
  );
}
