import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Play, 
  XCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { useCapaTasks, useCreateCapaTask, useUpdateCapaTask, useDeleteCapaTask } from '@/hooks/useCapaTasks';
import { useProfiles } from '@/hooks/useReceivingCapa';
import type { CapaTask, CapaTaskType, CapaTaskStatus, CAPA_TASK_TYPE_CONFIG } from '@/types/capa';

interface CapaTaskListProps {
  capaId: string;
  readOnly?: boolean;
}

const TASK_TYPE_CONFIG: Record<CapaTaskType, { label: string; color: string }> = {
  containment: { label: 'Containment', color: 'bg-red-100 text-red-800 border-red-300' },
  investigation: { label: 'Investigation', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  corrective: { label: 'Corrective', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  preventive: { label: 'Preventive', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  verification: { label: 'Verification', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  effectiveness: { label: 'Effectiveness', color: 'bg-green-100 text-green-800 border-green-300' },
};

const STATUS_CONFIG: Record<CapaTaskStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', icon: Play, color: 'text-blue-600' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-green-600' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-gray-400' },
  overdue: { label: 'Overdue', icon: AlertTriangle, color: 'text-red-600' },
};

export function CapaTaskList({ capaId, readOnly = false }: CapaTaskListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    task_type: 'corrective' as CapaTaskType,
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    evidence_required: false,
  });

  const { data: tasks, isLoading } = useCapaTasks(capaId);
  const { data: profiles } = useProfiles();
  const createTask = useCreateCapaTask();
  const updateTask = useUpdateCapaTask();
  const deleteTask = useDeleteCapaTask();

  const handleCreateTask = async () => {
    await createTask.mutateAsync({
      capa_id: capaId,
      task_type: newTask.task_type,
      title: newTask.title,
      description: newTask.description || undefined,
      assigned_to: newTask.assigned_to || undefined,
      due_date: newTask.due_date || undefined,
      evidence_required: newTask.evidence_required,
    });
    setShowAddDialog(false);
    setNewTask({
      task_type: 'corrective',
      title: '',
      description: '',
      assigned_to: '',
      due_date: '',
      evidence_required: false,
    });
  };

  const handleStatusChange = async (task: CapaTask, newStatus: CapaTaskStatus) => {
    await updateTask.mutateAsync({
      id: task.id,
      capaId,
      status: newStatus,
    });
  };

  const groupedTasks = tasks?.reduce((acc, task) => {
    if (!acc[task.task_type]) acc[task.task_type] = [];
    acc[task.task_type].push(task);
    return acc;
  }, {} as Record<CapaTaskType, CapaTask[]>) || {};

  const completedCount = tasks?.filter(t => t.status === 'completed').length || 0;
  const totalCount = tasks?.length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Action Tasks</CardTitle>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} tasks completed
            </p>
          </div>
          {!readOnly && (
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(TASK_TYPE_CONFIG).map(([type, config]) => {
            const typeTasks = groupedTasks[type as CapaTaskType] || [];
            if (typeTasks.length === 0) return null;

            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn('text-xs', config.color)}>
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {typeTasks.filter(t => t.status === 'completed').length}/{typeTasks.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {typeTasks.map((task) => {
                    const statusConfig = STATUS_CONFIG[task.status];
                    const StatusIcon = statusConfig.icon;
                    const isExpanded = expandedTask === task.id;
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

                    return (
                      <Collapsible
                        key={task.id}
                        open={isExpanded}
                        onOpenChange={() => setExpandedTask(isExpanded ? null : task.id)}
                      >
                        <div className={cn(
                          'rounded-lg border p-3',
                          task.status === 'completed' && 'bg-muted/50',
                          isOverdue && 'border-red-300 bg-red-50'
                        )}>
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center gap-3">
                              {!readOnly && (
                                <Checkbox
                                  checked={task.status === 'completed'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(task, task.status === 'completed' ? 'pending' : 'completed');
                                  }}
                                />
                              )}
                              
                              <div className="flex-1 text-left">
                                <p className={cn(
                                  'font-medium text-sm',
                                  task.status === 'completed' && 'line-through text-muted-foreground'
                                )}>
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  {task.assigned_to_profile && (
                                    <span>
                                      {task.assigned_to_profile.first_name} {task.assigned_to_profile.last_name}
                                    </span>
                                  )}
                                  {task.due_date && (
                                    <span className={cn(isOverdue && 'text-red-600 font-medium')}>
                                      Due: {format(new Date(task.due_date), 'MMM d')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <StatusIcon className={cn('h-5 w-5', statusConfig.color)} />
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent className="pt-3 space-y-3">
                            {task.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}

                            {task.completion_notes && (
                              <div className="p-2 bg-green-50 rounded text-sm">
                                <Label className="text-green-700 text-xs">Completion Notes</Label>
                                <p className="text-green-900">{task.completion_notes}</p>
                              </div>
                            )}

                            {!readOnly && (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={task.status}
                                  onValueChange={(value) => handleStatusChange(task, value as CapaTaskStatus)}
                                >
                                  <SelectTrigger className="h-8 w-36">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => deleteTask.mutate({ id: task.id, capaId })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {totalCount === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tasks yet</p>
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Task
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>
              Create a new action task for this CAPA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Select
                  value={newTask.task_type}
                  onValueChange={(value) => setNewTask({ ...newTask, task_type: value as CapaTaskType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_TYPE_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select
                  value={newTask.assigned_to}
                  onValueChange={(value) => setNewTask({ ...newTask, assigned_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.first_name} {profile.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title..."
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-2 flex items-end">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="evidence_required"
                    checked={newTask.evidence_required}
                    onCheckedChange={(checked) => setNewTask({ ...newTask, evidence_required: !!checked })}
                  />
                  <Label htmlFor="evidence_required">Evidence Required</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={!newTask.title || createTask.isPending}
            >
              {createTask.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
