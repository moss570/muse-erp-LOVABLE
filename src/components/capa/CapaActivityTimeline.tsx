import { useState } from 'react';
import { format } from 'date-fns';
import { 
  MessageSquare, 
  Clock, 
  User, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight,
  Paperclip,
  Trash2,
  Send,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { useCapaActivityLog, useAddCapaComment } from '@/hooks/useCapa';
import type { ActivityAction } from '@/types/capa';

interface CapaActivityTimelineProps {
  capaId: string;
  maxHeight?: string;
}

const ACTION_CONFIG: Record<ActivityAction, { icon: typeof MessageSquare; color: string; label: string }> = {
  created: { icon: FileText, color: 'text-green-600', label: 'Created' },
  updated: { icon: FileText, color: 'text-blue-600', label: 'Updated' },
  status_changed: { icon: ArrowRight, color: 'text-purple-600', label: 'Status Changed' },
  assigned: { icon: User, color: 'text-amber-600', label: 'Assigned' },
  commented: { icon: MessageSquare, color: 'text-gray-600', label: 'Comment' },
  attachment_added: { icon: Paperclip, color: 'text-blue-600', label: 'Attachment Added' },
  attachment_removed: { icon: Trash2, color: 'text-red-600', label: 'Attachment Removed' },
  due_date_changed: { icon: Clock, color: 'text-orange-600', label: 'Due Date Changed' },
  escalated: { icon: AlertCircle, color: 'text-red-600', label: 'Escalated' },
};

export function CapaActivityTimeline({ capaId, maxHeight = '400px' }: CapaActivityTimelineProps) {
  const [newComment, setNewComment] = useState('');
  
  const { data: activities, isLoading } = useCapaActivityLog(capaId);
  const addComment = useAddCapaComment();

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    await addComment.mutateAsync({
      capaId,
      comment: newComment.trim(),
    });
    setNewComment('');
  };

  const formatActivityMessage = (activity: typeof activities extends (infer T)[] ? T : never) => {
    const { action, field_changed, old_value, new_value, comment } = activity;

    if (action === 'commented') {
      return comment;
    }

    if (action === 'status_changed') {
      return (
        <span>
          Status changed from <Badge variant="outline" className="mx-1">{old_value || 'none'}</Badge>
          to <Badge variant="outline" className="mx-1">{new_value}</Badge>
          {comment && <span className="text-muted-foreground block mt-1">{comment}</span>}
        </span>
      );
    }

    if (action === 'assigned') {
      return `Assigned to ${new_value || 'unknown user'}`;
    }

    if (action === 'updated' && field_changed) {
      const fieldLabels: Record<string, string> = {
        root_cause: 'Root Cause',
        corrective_action: 'Corrective Action',
        preventive_action: 'Preventive Action',
        immediate_action: 'Immediate Action',
        root_cause_analysis: 'Root Cause Analysis',
        task_added: 'Task Added',
        approval_requested: 'Approval Requested',
        approval_processed: 'Approval Processed',
      };
      return `${fieldLabels[field_changed] || field_changed} updated${new_value ? `: ${new_value}` : ''}`;
    }

    if (action === 'attachment_added') {
      return `File attached: ${new_value}`;
    }

    if (action === 'attachment_removed') {
      return `File removed: ${old_value}`;
    }

    if (action === 'created') {
      return `CAPA created${new_value ? ` with ${new_value} severity` : ''}`;
    }

    return comment || `${action} performed`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add comment */}
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[60px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || addComment.isPending}
            >
              {addComment.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Comment
            </Button>
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        <ScrollArea style={{ maxHeight }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const config = ACTION_CONFIG[activity.action as ActivityAction] || {
                  icon: FileText,
                  color: 'text-gray-600',
                  label: activity.action,
                };
                const Icon = config.icon;

                return (
                  <div key={activity.id} className="flex gap-3">
                    {/* Timeline line and icon */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center bg-muted',
                        activity.action === 'commented' && 'bg-blue-100'
                      )}>
                        <Icon className={cn('h-4 w-4', config.color)} />
                      </div>
                      {index < activities.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border mt-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {activity.performed_by_profile
                            ? `${activity.performed_by_profile.first_name} ${activity.performed_by_profile.last_name}`
                            : 'System'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.performed_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <div className={cn(
                        'text-sm',
                        activity.action === 'commented' 
                          ? 'p-3 bg-muted rounded-lg' 
                          : 'text-muted-foreground'
                      )}>
                        {formatActivityMessage(activity)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No activity yet</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
