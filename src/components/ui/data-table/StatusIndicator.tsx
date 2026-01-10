import { cn } from '@/lib/utils';
import { 
  Circle, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle,
  Minus,
  Settings
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type StatusType = 
  | 'active' 
  | 'inactive' 
  | 'pending' 
  | 'complete' 
  | 'warning' 
  | 'error' 
  | 'none'
  | 'pending_setup'
  | 'approved'
  | 'not_approved';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig: Record<StatusType, { 
  icon: typeof Circle; 
  className: string; 
  label: string 
}> = {
  active: { 
    icon: CheckCircle2, 
    className: 'text-emerald-500', 
    label: 'Active' 
  },
  inactive: { 
    icon: XCircle, 
    className: 'text-muted-foreground', 
    label: 'Inactive' 
  },
  pending: { 
    icon: Clock, 
    className: 'text-amber-500', 
    label: 'Pending' 
  },
  complete: { 
    icon: CheckCircle2, 
    className: 'text-emerald-500', 
    label: 'Complete' 
  },
  warning: { 
    icon: AlertCircle, 
    className: 'text-amber-500', 
    label: 'Warning' 
  },
  error: { 
    icon: XCircle, 
    className: 'text-destructive', 
    label: 'Error' 
  },
  none: { 
    icon: Minus, 
    className: 'text-muted-foreground', 
    label: 'None' 
  },
  pending_setup: { 
    icon: Settings, 
    className: 'text-amber-500', 
    label: 'Pending Set-Up' 
  },
  approved: { 
    icon: CheckCircle2, 
    className: 'text-emerald-500', 
    label: 'Approved' 
  },
  not_approved: { 
    icon: XCircle, 
    className: 'text-destructive', 
    label: 'Not Approved' 
  },
};

export function StatusIndicator({ 
  status, 
  label, 
  showLabel = false,
  size = 'sm' 
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayLabel = label || config.label;
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  if (showLabel) {
    return (
      <div className="flex items-center gap-1.5">
        <Icon className={cn(iconSize, config.className)} />
        <span className="text-sm">{displayLabel}</span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon className={cn(iconSize, config.className, 'cursor-help')} />
      </TooltipTrigger>
      <TooltipContent>
        <p>{displayLabel}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Multi-status indicator for workflow states (like Cin7)
interface WorkflowStatusProps {
  statuses: Array<{
    key: string;
    completed: boolean;
    label: string;
  }>;
}

export function WorkflowStatus({ statuses }: WorkflowStatusProps) {
  return (
    <div className="flex items-center gap-0.5">
      {statuses.map((status) => (
        <Tooltip key={status.key}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                status.completed ? 'bg-emerald-500' : 'bg-muted-foreground/30'
              )}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {status.label}: {status.completed ? 'Complete' : 'Pending'}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
