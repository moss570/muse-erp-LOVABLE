import { NCActivityLog } from '@/types/non-conformities';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Camera, 
  Package,
  RefreshCw,
  Link,
  DollarSign,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NCActivityTimelineProps {
  activityLog: NCActivityLog[];
}

const getProfileName = (profile: any) => {
  if (!profile) return 'System';
  return [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown';
};

const getActionConfig = (action: string) => {
  const configs: Record<string, { icon: React.ComponentType<any>; label: string; color: string }> = {
    created: { icon: AlertTriangle, label: 'Created', color: 'text-blue-600 bg-blue-100' },
    updated: { icon: RefreshCw, label: 'Updated', color: 'text-gray-600 bg-gray-100' },
    status_changed: { icon: Clock, label: 'Status Changed', color: 'text-amber-600 bg-amber-100' },
    disposition_changed: { icon: Package, label: 'Disposition Changed', color: 'text-purple-600 bg-purple-100' },
    attachment_added: { icon: Camera, label: 'Attachment Added', color: 'text-green-600 bg-green-100' },
    attachment_removed: { icon: Trash2, label: 'Attachment Removed', color: 'text-red-600 bg-red-100' },
    closed: { icon: CheckCircle, label: 'Closed', color: 'text-green-600 bg-green-100' },
    reopened: { icon: RefreshCw, label: 'Reopened', color: 'text-orange-600 bg-orange-100' },
    capa_linked: { icon: Link, label: 'CAPA Linked', color: 'text-indigo-600 bg-indigo-100' },
    comment_added: { icon: MessageSquare, label: 'Comment', color: 'text-blue-600 bg-blue-100' },
    cost_updated: { icon: DollarSign, label: 'Cost Updated', color: 'text-emerald-600 bg-emerald-100' },
  };
  return configs[action] || { icon: Clock, label: action, color: 'text-gray-600 bg-gray-100' };
};

export function NCActivityTimeline({ activityLog }: NCActivityTimelineProps) {
  if (activityLog.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activityLog.map((log, index) => {
        const config = getActionConfig(log.action);
        const Icon = config.icon;
        
        return (
          <div key={log.id} className="relative flex gap-4">
            {/* Timeline line */}
            {index < activityLog.length - 1 && (
              <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />
            )}
            
            {/* Icon */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              config.color
            )}>
              <Icon className="h-4 w-4" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  by {getProfileName(log.performed_by_profile)}
                </span>
                <span className="text-xs text-muted-foreground">
                  • {formatDistanceToNow(new Date(log.performed_at), { addSuffix: true })}
                </span>
              </div>
              
              {/* Field change */}
              {log.field_changed && log.old_value && log.new_value && (
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="capitalize">{log.field_changed.replace('_', ' ')}</span>:{' '}
                  <span className="line-through text-destructive">{log.old_value}</span>
                  {' → '}
                  <span className="font-medium text-foreground">{log.new_value}</span>
                </p>
              )}
              
              {/* Comment */}
              {log.comment && (
                <p className="text-sm mt-1 bg-muted rounded-md p-2">
                  {log.comment}
                </p>
              )}
              
              {/* Timestamp */}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(log.performed_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
