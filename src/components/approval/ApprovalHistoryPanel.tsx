import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  SendHorizontal, 
  Archive, 
  FileEdit,
  RotateCcw,
  User
} from 'lucide-react';
import { useApprovalLogs, type RelatedTableName, type ApprovalAction } from '@/hooks/useApprovalEngine';
import { cn } from '@/lib/utils';

interface ApprovalHistoryPanelProps {
  recordId: string;
  tableName: RelatedTableName;
  className?: string;
}

const actionConfig: Record<ApprovalAction, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  Created: {
    icon: FileEdit,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  Submitted: {
    icon: SendHorizontal,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  Approved: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  Rejected: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  Archived: {
    icon: Archive,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  Updated: {
    icon: FileEdit,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  Restored: {
    icon: RotateCcw,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

export function ApprovalHistoryPanel({
  recordId,
  tableName,
  className,
}: ApprovalHistoryPanelProps) {
  const { data: logs, isLoading } = useApprovalLogs(recordId, tableName);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <FileEdit className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No approval history yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-[400px]', className)}>
      <div className="space-y-4 pr-4">
        {logs.map((log, index) => {
          const config = actionConfig[log.action as ApprovalAction] || actionConfig.Updated;
          const Icon = config.icon;
          const userName = log.profiles
            ? `${log.profiles.first_name || ''} ${log.profiles.last_name || ''}`.trim() || 'Unknown User'
            : 'System';

          return (
            <div key={log.id} className="relative flex gap-3">
              {/* Timeline line */}
              {index < logs.length - 1 && (
                <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
              )}

              {/* Icon */}
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                config.bgColor
              )}>
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{log.action}</span>
                  {log.previous_status && log.new_status && (
                    <span className="text-xs text-muted-foreground">
                      {log.previous_status} → {log.new_status}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <User className="h-3 w-3" />
                  <span>{userName}</span>
                  <span>•</span>
                  <span>{format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}</span>
                </div>

                {log.notes && (
                  <div className="mt-2 p-2 rounded-md bg-muted text-sm">
                    {log.notes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
