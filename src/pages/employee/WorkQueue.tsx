import { useState } from 'react';
import { useMyTasks, useAvailableTasks, useTaskCategories, useClaimTask } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardList, Clock, AlertTriangle, CheckCircle, 
  Calendar, MapPin, Play, Shield, Hand
} from 'lucide-react';
import { formatDistanceToNow, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';

const WorkQueue = () => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('my-tasks');
  
  const { data: myTasks, isLoading: loadingMyTasks } = useMyTasks();
  const { data: availableTasks, isLoading: loadingAvailable } = useAvailableTasks();
  const claimTask = useClaimTask();
  
  // Calculate stats
  const stats = {
    total: myTasks?.length || 0,
    overdue: myTasks?.filter(t => t.status === 'overdue').length || 0,
    dueToday: myTasks?.filter(t => t.due_at && isToday(new Date(t.due_at))).length || 0,
    inProgress: myTasks?.filter(t => t.status === 'in_progress').length || 0,
    available: availableTasks?.length || 0,
  };
  
  // Sort tasks by priority and due date
  const sortedMyTasks = [...(myTasks || [])].sort((a, b) => {
    // Overdue first
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (b.status === 'overdue' && a.status !== 'overdue') return 1;
    
    // Then by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - 
                         priorityOrder[b.priority as keyof typeof priorityOrder];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by due date
    if (a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    }
    return 0;
  });
  
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'border-l-gray-400',
      medium: 'border-l-blue-400',
      high: 'border-l-orange-400',
      urgent: 'border-l-red-500',
    };
    return colors[priority] || colors.medium;
  };

  const handleClaim = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    await claimTask.mutateAsync(taskId);
  };

  const TaskCard = ({ task, showClaim = false }: { task: any; showClaim?: boolean }) => (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow border-l-4",
        getPriorityColor(task.priority),
        task.status === 'overdue' && "bg-destructive/5"
      )}
      onClick={() => setSelectedTaskId(task.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {task.is_food_safety && (
                <Shield className="h-4 w-4 text-destructive" />
              )}
              <span className="font-medium truncate">{task.title}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {task.category && (
                <span className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: task.category.color }}
                  />
                  {task.category.name}
                </span>
              )}
              {task.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {task.location.name}
                </span>
              )}
              {task.due_at && (
                <span className={cn(
                  "flex items-center gap-1",
                  task.status === 'overdue' && "text-destructive font-medium"
                )}>
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={task.status === 'overdue' ? 'destructive' : 'secondary'}>
              {task.status.replace('_', ' ')}
            </Badge>
            {showClaim && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => handleClaim(e, task.id)}
                disabled={claimTask.isPending}
              >
                <Hand className="h-4 w-4 mr-1" />
                Claim
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Work Queue</h1>
        <p className="text-muted-foreground">Your assigned and available tasks</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">My Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn(stats.overdue > 0 && "border-destructive")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className={cn("h-8 w-8", stats.overdue > 0 ? "text-destructive" : "text-muted-foreground")} />
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.dueToday}</p>
                <p className="text-sm text-muted-foreground">Due Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Play className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Hand className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tasks */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-tasks">
            My Tasks ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="available">
            Available to Claim ({stats.available})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-tasks" className="space-y-4 mt-4">
          {loadingMyTasks ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sortedMyTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">All caught up!</h3>
                <p className="text-muted-foreground">You have no pending tasks</p>
              </CardContent>
            </Card>
          ) : (
            sortedMyTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="available" className="space-y-4 mt-4">
          {loadingAvailable ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : availableTasks?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No tasks available to claim
              </CardContent>
            </Card>
          ) : (
            availableTasks?.map((task) => (
              <TaskCard key={task.id} task={task} showClaim />
            ))
          )}
        </TabsContent>
      </Tabs>
      
      {/* Task Detail Dialog */}
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

export default WorkQueue;
