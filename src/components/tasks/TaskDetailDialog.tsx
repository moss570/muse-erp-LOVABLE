import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  useTask, 
  useTaskAttachments, 
  useTaskActivityLog,
  useStartTask,
  useCompleteTask,
  useVerifyTask,
  useCancelTask,
} from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { 
  Clock, User, MapPin, Calendar, CheckCircle, AlertTriangle,
  Play, Check, X, Shield, FileText, MessageSquare, History
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskDetailDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskDetailDialog = ({ taskId, open, onOpenChange }: TaskDetailDialogProps) => {
  const { user, isSupervisor } = useAuth();
  const { data: task, isLoading } = useTask(taskId);
  const { data: attachments } = useTaskAttachments(taskId);
  const { data: activityLog } = useTaskActivityLog(taskId);
  
  const startTask = useStartTask();
  const completeTask = useCompleteTask();
  const verifyTask = useVerifyTask();
  const cancelTask = useCancelTask();
  
  const [completionNotes, setCompletionNotes] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  if (isLoading || !task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            Loading...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified': return 'success';
      case 'in_progress': return 'default';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  const canStart = ['pending', 'claimed'].includes(task.status) && 
    (task.assigned_to === user?.id || task.claimed_by === user?.id);
  const canComplete = task.status === 'in_progress' && 
    (task.assigned_to === user?.id || task.claimed_by === user?.id);
  const canVerify = task.status === 'completed' && task.is_food_safety && isSupervisor;
  const canCancel = ['pending', 'available', 'claimed'].includes(task.status) && isSupervisor;

  const handleStart = async () => {
    await startTask.mutateAsync(taskId);
  };

  const handleComplete = async () => {
    await completeTask.mutateAsync({
      task_id: taskId,
      completion_notes: completionNotes || undefined,
    });
  };

  const handleVerify = async () => {
    await verifyTask.mutateAsync({ taskId, notes: verificationNotes || undefined });
  };

  const handleCancel = async () => {
    await cancelTask.mutateAsync({ taskId });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{task.task_number}</p>
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Badge variant={getPriorityColor(task.priority) as 'default'}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Badge>
              <Badge variant={getStatusColor(task.status) as 'default'}>
                {task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList>
            <TabsTrigger value="details" className="gap-2">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <History className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Task Info */}
            <div className="grid grid-cols-2 gap-4">
              {task.category && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: task.category.color }}
                  />
                  <span className="text-sm">{task.category.name}</span>
                </div>
              )}
              {task.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {task.location.name}
                </div>
              )}
              {task.due_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Due: {format(new Date(task.due_at), 'MMM d, yyyy h:mm a')}
                </div>
              )}
              {task.estimated_duration_minutes && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Est. {task.estimated_duration_minutes} min
                </div>
              )}
            </div>

            {task.is_food_safety && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <Shield className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">Food Safety Task - Requires Verification</span>
              </div>
            )}

            {task.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{task.description}</p>
              </div>
            )}

            {/* Assignment Info */}
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              {task.assigned_to_profile && (
                <div>
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{task.assigned_to_profile.full_name}</span>
                  </div>
                </div>
              )}
              {task.created_by_profile && (
                <div>
                  <p className="text-xs text-muted-foreground">Created By</p>
                  <span className="text-sm">{task.created_by_profile.full_name}</span>
                </div>
              )}
            </div>

            {/* Checklist */}
            {task.checklist_items && task.checklist_items.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Checklist</h4>
                  <div className="space-y-2">
                    {task.checklist_items.map((item) => {
                      const completed = task.checklist_completed?.find(c => c.id === item.id)?.completed;
                      return (
                        <div key={item.id} className="flex items-center gap-2">
                          <div className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center",
                            completed ? "bg-primary border-primary" : "border-muted-foreground"
                          )}>
                            {completed && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span className={cn(
                            "text-sm",
                            completed && "line-through text-muted-foreground"
                          )}>
                            {item.label}
                            {item.required && <span className="text-destructive">*</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Attachments ({attachments.length})</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="border rounded-lg p-2 text-sm">
                        {att.file_name}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Completion Notes */}
            {task.completion_notes && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-1">Completion Notes</h4>
                  <p className="text-sm text-muted-foreground">{task.completion_notes}</p>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <Separator />
            <div className="flex gap-2">
              {canStart && (
                <Button onClick={handleStart} disabled={startTask.isPending}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Task
                </Button>
              )}
              {canComplete && (
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Completion notes (optional)..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                  />
                  <Button onClick={handleComplete} disabled={completeTask.isPending} className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Task
                  </Button>
                </div>
              )}
              {canVerify && (
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Verification notes (optional)..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                  />
                  <Button onClick={handleVerify} disabled={verifyTask.isPending} className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Verify Task
                  </Button>
                </div>
              )}
              {canCancel && (
                <Button variant="destructive" onClick={handleCancel} disabled={cancelTask.isPending}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <div className="space-y-3">
              {activityLog?.map((log) => (
                <div key={log.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 mt-2 rounded-full bg-muted-foreground" />
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">{log.performed_by_profile?.full_name || 'System'}</span>
                      {' '}{log.action.replace('_', ' ')}
                      {log.new_value && <span className="text-muted-foreground"> → {log.new_value}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.performed_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
              {(!activityLog || activityLog.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
