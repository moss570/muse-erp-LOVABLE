import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  FileEdit, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Archive 
} from 'lucide-react';
import type { ApprovalStatus } from '@/hooks/useApprovalEngine';

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus | string | null | undefined;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: React.ElementType;
}> = {
  Draft: {
    label: 'Draft',
    variant: 'secondary',
    className: 'bg-muted text-muted-foreground border-muted',
    icon: FileEdit,
  },
  Pending_QA: {
    label: 'Pending QA',
    variant: 'outline',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
    icon: Clock,
  },
  Approved: {
    label: 'Approved',
    variant: 'default',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  Rejected: {
    label: 'Rejected',
    variant: 'destructive',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
    icon: XCircle,
  },
  Archived: {
    label: 'Archived',
    variant: 'outline',
    className: 'bg-muted text-muted-foreground border-muted line-through',
    icon: Archive,
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-sm px-3 py-1',
};

export function ApprovalStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: ApprovalStatusBadgeProps) {
  const config = statusConfig[status || 'Draft'] || statusConfig.Draft;
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'font-medium gap-1.5 border',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      {config.label}
    </Badge>
  );
}
