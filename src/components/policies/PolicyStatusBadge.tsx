import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  FileEdit,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  AlertCircle,
} from 'lucide-react';

interface PolicyStatusBadgeProps {
  status: 'Draft' | 'Under_Review' | 'Pending_Approval' | 'Approved' | 'Archived' | string;
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
  Under_Review: {
    label: 'Under Review',
    variant: 'outline',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400',
    icon: Clock,
  },
  Pending_Approval: {
    label: 'Pending Approval',
    variant: 'outline',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
    icon: AlertCircle,
  },
  Approved: {
    label: 'Approved',
    variant: 'default',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  Archived: {
    label: 'Archived',
    variant: 'outline',
    className: 'bg-muted text-muted-foreground border-muted',
    icon: Archive,
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-sm px-3 py-1',
};

export function PolicyStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: PolicyStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.Draft;
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
