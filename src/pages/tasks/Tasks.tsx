import { useState } from 'react';
import { useTasks, useTaskCategories } from '@/hooks/useTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, Clock, AlertTriangle, CheckCircle, 
  User, Calendar, Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';
import type { TaskStatus } from '@/types/tasks';

const Tasks = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  const { data: categories } = useTaskCategories();
  
  const getStatusFilter = (): string[] | undefined => {
    switch (activeTab) {
      case 'pending': return ['pending', 'available', 'claimed'];
      case 'in_progress': return ['in_progress'];
      case 'overdue': return ['overdue'];
      case 'completed': return ['completed', 'verified'];
      default: return undefined;
    }
  };
  
  const { data: tasks, isLoading } = useTasks({
    status: getStatusFilter(),
    category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    search: search || undefined,
  });
  
  const allTasks = useTasks({});
  const statusCounts = {
    all: allTasks.data?.length || 0,
    pending: allTasks.data?.filter(t => ['pending', 'available', 'claimed'].includes(t.status)).length || 0,
    in_progress: allTasks.data?.filter(t => t.status === 'in_progress').length || 0,
    overdue: allTasks.data?.filter(t => t.status === 'overdue').length || 0,
    completed: allTasks.data?.filter(t => ['completed', 'verified'].includes(t.status)).length || 0,
  };
  
  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      low: { variant: 'secondary', label: 'Low' },
      medium: { variant: 'default', label: 'Medium' },
      high: { variant: 'outline', label: 'High' },
      urgent: { variant: 'destructive', label: 'Urgent' },
    };
    const { variant, label } = config[priority] || config.medium;
    return <Badge variant={variant}>{label}</Badge>;
  };
  
  const getStatusBadge = (status: TaskStatus) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon?: React.ElementType }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      available: { variant: 'outline', label: 'Available' },
      claimed: { variant: 'default', label: 'Claimed' },
      in_progress: { variant: 'default', label: 'In Progress', icon: Clock },
      completed: { variant: 'secondary', label: 'Completed', icon: CheckCircle },
      verified: { variant: 'secondary', label: 'Verified', icon: CheckCircle },
      overdue: { variant: 'destructive', label: 'Overdue', icon: AlertTriangle },
      cancelled: { variant: 'secondary', label: 'Cancelled' },
    };
    const { variant, label, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage and track all tasks</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({statusCounts.pending})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({statusCounts.in_progress})</TabsTrigger>
          <TabsTrigger value="overdue" className={cn(statusCounts.overdue > 0 && "text-destructive")}>
            Overdue ({statusCounts.overdue})
          </TabsTrigger>
          <TabsTrigger value="completed">Completed ({statusCounts.completed})</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
          ) : tasks?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tasks found</div>
          ) : (
            <div className="space-y-2">
              {tasks?.map((task) => (
                <Card 
                  key={task.id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground font-mono">
                            {task.task_number}
                          </span>
                          {task.is_food_safety && (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <Shield className="h-3 w-3" />
                              Food Safety
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium truncate">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {task.category && (
                            <span className="flex items-center gap-1">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: task.category.color }} 
                              />
                              {task.category.name}
                            </span>
                          )}
                          {task.assigned_to_profile && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.assigned_to_profile.full_name}
                            </span>
                          )}
                          {task.due_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(task.due_at), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getPriorityBadge(task.priority)}
                        {getStatusBadge(task.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Dialogs */}
      <CreateTaskDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      {selectedTaskId && (
        <TaskDetailDialog
          taskId={selectedTaskId}
          open={!!selectedTaskId}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
        />
      )}
    </div>
  );
};

export default Tasks;
