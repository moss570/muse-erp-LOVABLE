import { useState, useRef, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  useTask, useTaskAttachments, useTaskActivityLog,
  useClaimTask, useStartTask, useCompleteTask, useVerifyTask,
  useUploadTaskAttachment, useAddTaskComment
} from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Clock, User, MapPin, Calendar, Camera, FileText, 
  CheckCircle, AlertTriangle, Play, Upload, MessageSquare,
  Shield, Hand
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SignaturePad from '@/components/shared/SignaturePad';

interface TaskDetailDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskDetailDialog = ({ taskId, open, onOpenChange }: TaskDetailDialogProps) => {
  const { user, isSupervisor } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [completionNotes, setCompletionNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: task, isLoading } = useTask(taskId);
  const { data: attachments } = useTaskAttachments(taskId);
  const { data: activityLog } = useTaskActivityLog(taskId);
  
  const claimTask = useClaimTask();
  const startTask = useStartTask();
  const completeTask = useCompleteTask();
  const verifyTask = useVerifyTask();
  const uploadAttachment = useUploadTaskAttachment();
  const addComment = useAddTaskComment();
  
  // Initialize checklist state from task
  useEffect(() => {
    if (task?.checklist_items) {
      const initial: Record<string, boolean> = {};
      task.checklist_items.forEach((item: any) => {
        const completed = task.checklist_completed?.find((c: any) => c.id === item.id);
        initial[item.id] = completed?.completed || false;
      });
      setChecklistState(initial);
    }
  }, [task]);
  
  const isAssignedToMe = task?.assigned_to === user?.id || task?.claimed_by === user?.id;
  const canClaim = task?.status === 'available';
  const canStart = isAssignedToMe && ['pending', 'claimed'].includes(task?.status || '');
  const canComplete = isAssignedToMe && ['in_progress', 'claimed', 'pending'].includes(task?.status || '');
  const canVerify = task?.status === 'completed' && task?.is_food_safety && isSupervisor;
  
  // Check if completion requirements are met
  const checkRequirements = () => {
    if (!task) return { valid: false, errors: [] as string[] };
    const errors: string[] = [];
    
    if (task.requires_photo && (!attachments || attachments.filter(a => a.attachment_type === 'photo').length < task.photo_min_count)) {
      errors.push(`Requires at least ${task.photo_min_count} photo(s)`);
    }
    if (task.requires_signature && !signature) {
      errors.push('Signature required');
    }
    if (task.requires_notes && !completionNotes.trim()) {
      errors.push('Notes required');
    }
    
    // Check required checklist items
    const requiredItems = task.checklist_items?.filter((i: any) => i.required) || [];
    const uncheckedRequired = requiredItems.filter((i: any) => !checklistState[i.id]);
    if (uncheckedRequired.length > 0) {
      errors.push(`${uncheckedRequired.length} required checklist item(s) not completed`);
    }
    
    return { valid: errors.length === 0, errors };
  };
  
  const handleClaim = async () => {
    await claimTask.mutateAsync(taskId);
  };
  
  const handleStart = async () => {
    await startTask.mutateAsync(taskId);
  };
  
  const handleComplete = async () => {
    const requirements = checkRequirements();
    if (!requirements.valid) {
      return;
    }
    
    await completeTask.mutateAsync({
      task_id: taskId,
      completion_notes: completionNotes,
      completion_signature: signature || undefined,
      checklist_completed: Object.entries(checklistState).map(([id, completed]) => ({
        id,
        completed,
      })),
    });
    onOpenChange(false);
  };
  
  const handleVerify = async () => {
    await verifyTask.mutateAsync({ taskId });
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      await uploadAttachment.mutateAsync({
        taskId,
        file,
        attachmentType: file.type.startsWith('image/') ? 'photo' : 'document',
      });
    }
  };
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment.mutateAsync({ taskId, comment: newComment });
    setNewComment('');
  };
  
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-secondary text-secondary-foreground',
      medium: 'bg-primary/10 text-primary',
      high: 'bg-accent text-accent-foreground',
      urgent: 'bg-destructive/10 text-destructive',
    };
    return colors[priority] || colors.medium;
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-secondary text-secondary-foreground',
      available: 'bg-accent text-accent-foreground',
      claimed: 'bg-primary/20 text-primary',
      in_progress: 'bg-muted text-muted-foreground',
      completed: 'bg-primary/10 text-primary',
      verified: 'bg-primary/20 text-primary',
      overdue: 'bg-destructive/10 text-destructive',
    };
    return colors[status] || colors.pending;
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!task) return null;

  const requirements = checkRequirements();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{task.task_number}</p>
                <DialogTitle className="text-xl">{task.title}</DialogTitle>
              </div>
              <div className="flex gap-2">
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.is_food_safety && (
                  <Badge variant="destructive" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Food Safety
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="complete" className="gap-1">
              Complete
              {!requirements.valid && canComplete && (
                <AlertTriangle className="h-3 w-3 text-orange-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="attachments">
              Attachments ({attachments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1">
            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 m-0 p-4">
              {task.description && (
                <p className="text-muted-foreground">{task.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    {task.assigned_to_profile && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Assigned to: {task.assigned_to_profile.full_name}
                      </div>
                    )}
                    {task.claimed_by_profile && (
                      <div className="flex items-center gap-2 text-sm">
                        <Hand className="h-4 w-4 text-muted-foreground" />
                        Claimed by: {task.claimed_by_profile.full_name}
                      </div>
                    )}
                    {task.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {task.location.name}
                      </div>
                    )}
                    {task.due_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Due: {format(new Date(task.due_at), 'PPp')}
                      </div>
                    )}
                    {task.estimated_duration_minutes && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Est: {task.estimated_duration_minutes} minutes
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-medium mb-2">Requirements</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        {task.requires_photo ? `Photo required (min ${task.photo_min_count})` : 'No photo required'}
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {task.requires_signature ? 'Signature required' : 'No signature required'}
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {task.requires_notes ? 'Notes required' : 'No notes required'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Checklist Preview */}
              {task.checklist_items?.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-medium mb-2">Checklist ({task.checklist_items.length} items)</h4>
                    <div className="space-y-2">
                      {task.checklist_items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm">
                          <CheckCircle className={cn(
                            "h-4 w-4",
                            checklistState[item.id] ? "text-green-500" : "text-muted-foreground"
                          )} />
                          <span className={cn(checklistState[item.id] && "line-through text-muted-foreground")}>
                            {item.label}
                          </span>
                          {item.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Complete Tab */}
            <TabsContent value="complete" className="space-y-4 m-0 p-4">
              {/* Checklist */}
              {task.checklist_items?.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3">Checklist</h4>
                    <div className="space-y-3">
                      {task.checklist_items.map((item: any) => (
                        <div key={item.id} className="flex items-start gap-3">
                          <Checkbox
                            id={item.id}
                            checked={checklistState[item.id] || false}
                            onCheckedChange={(checked) => {
                              setChecklistState(prev => ({ ...prev, [item.id]: !!checked }));
                            }}
                            disabled={!canComplete}
                          />
                          <div className="flex-1">
                            <label htmlFor={item.id} className="text-sm cursor-pointer">
                              {item.label}
                            </label>
                            {item.required && (
                              <Badge variant="outline" className="ml-2 text-xs">Required</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Notes */}
              <div>
                <Label>Completion Notes {task.requires_notes && '*'}</Label>
                <Textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Add notes about task completion..."
                  rows={4}
                  disabled={!canComplete}
                  className="mt-2"
                />
              </div>
              
              {/* Photo Upload */}
              {task.requires_photo && (
                <div>
                  <Label>Photos {task.requires_photo && `(min ${task.photo_min_count})`}</Label>
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!canComplete}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                    <p className="text-sm text-muted-foreground mt-1">
                      {attachments?.filter(a => a.attachment_type === 'photo').length || 0} photo(s) uploaded
                    </p>
                  </div>
                </div>
              )}
              
              {/* Signature */}
              {task.requires_signature && (
                <div>
                  <Label>Signature *</Label>
                  <div className="mt-2">
                    <SignaturePad
                      value={signature}
                      onChange={setSignature}
                      disabled={!canComplete}
                    />
                  </div>
                </div>
              )}
              
              {/* Requirements Check */}
              {!requirements.valid && canComplete && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="pt-4">
                    <h4 className="font-medium text-destructive mb-2">Requirements Not Met</h4>
                    <ul className="text-sm text-destructive/80 space-y-1">
                      {requirements.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Attachments Tab */}
            <TabsContent value="attachments" className="space-y-4 m-0 p-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Attachments</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
              
              {attachments?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No attachments</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {attachments?.map((att) => (
                    <Card key={att.id} className="overflow-hidden">
                      {att.attachment_type === 'photo' ? (
                        <img 
                          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/task-attachments/${att.file_path}`}
                          alt={att.file_name}
                          className="w-full h-32 object-cover"
                        />
                      ) : (
                        <div className="h-32 flex items-center justify-center bg-muted">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <CardContent className="p-2">
                        <p className="text-xs truncate">{att.file_name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-4 m-0 p-4">
              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
              
              <Separator />
              
              {/* Activity Log */}
              <div className="space-y-3">
                {activityLog?.map((log: any) => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p>
                        <span className="font-medium">{log.performed_by_profile?.full_name || 'System'}</span>
                        {' '}{log.action.replace('_', ' ')}
                        {log.new_value && ` → ${log.new_value}`}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(log.performed_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {task.status === 'completed' && task.completed_by_profile && (
              <p className="text-sm text-muted-foreground">
                Completed by {task.completed_by_profile.full_name}
                {task.completed_at && ` on ${format(new Date(task.completed_at), 'PPp')}`}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {canClaim && (
              <Button onClick={handleClaim} disabled={claimTask.isPending}>
                <Hand className="h-4 w-4 mr-2" />
                Claim Task
              </Button>
            )}
            {canStart && (
              <Button onClick={handleStart} disabled={startTask.isPending}>
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            )}
            {canComplete && (
              <Button 
                onClick={handleComplete} 
                disabled={completeTask.isPending || !requirements.valid}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}
            {canVerify && (
              <Button onClick={handleVerify} variant="secondary" disabled={verifyTask.isPending}>
                <Shield className="h-4 w-4 mr-2" />
                Verify
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
