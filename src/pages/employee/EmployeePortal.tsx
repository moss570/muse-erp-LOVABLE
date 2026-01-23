import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMyTasks } from '@/hooks/useTasks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ClipboardList, Calendar, Clock, FileText, GraduationCap, 
  Umbrella, Bell, ChevronRight, AlertTriangle, CheckCircle,
  MessageSquare
} from 'lucide-react';
import { format, isToday, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

const EmployeePortal = () => {
  const { user, profile } = useAuth();
  
  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
  const initials = profile ? `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}` : '';
  
  // Fetch tasks
  const { data: myTasks } = useMyTasks();
  
  // First get the employee_id linked to this profile
  const { data: myEmployee } = useQuery({
    queryKey: ['my-employee', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch upcoming schedule using employee_shifts table
  const { data: schedule } = useQuery({
    queryKey: ['my-schedule-upcoming', myEmployee?.id],
    queryFn: async () => {
      const today = new Date();
      const weekEnd = endOfWeek(today);

      const { data } = await supabase
        .from('employee_shifts')
        .select('id, shift_date, start_time, end_time, notes, location_id')
        .eq('employee_id', myEmployee!.id)
        .gte('shift_date', format(today, 'yyyy-MM-dd'))
        .lte('shift_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('shift_date');

      return data || [];
    },
    enabled: !!myEmployee?.id,
  });
  
  // Fetch PTO balance
  const { data: ptoBalance } = useQuery({
    queryKey: ['my-pto-balance', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_pto_settings')
        .select(`
          *,
          pto_type:pto_types(name, code, color)
        `)
        .eq('employee_id', user?.id);
      
      return data;
    },
    enabled: !!user?.id,
  });
  
  // Fetch pending HR documents
  const { data: pendingDocs } = useQuery({
    queryKey: ['my-pending-docs', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_hr_documents')
        .select(`
          *,
          template:hr_document_templates(name, category)
        `)
        .eq('employee_id', user?.id)
        .eq('status', 'pending');
      
      return data;
    },
    enabled: !!user?.id,
  });
  
  // Fetch training progress
  const { data: trainingStats } = useQuery({
    queryKey: ['my-training-stats', user?.id],
    queryFn: async () => {
      const { data: all } = await supabase
        .from('employee_training_records')
        .select('status')
        .eq('employee_id', user?.id);
      
      const total = all?.length || 0;
      const completed = all?.filter(t => t.status === 'completed').length || 0;
      const inProgress = all?.filter(t => t.status === 'in_progress').length || 0;
      const pending = all?.filter(t => t.status === 'pending').length || 0;
      
      return { total, completed, inProgress, pending, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
    },
    enabled: !!user?.id,
  });
  
  // Fetch unread notifications
  const { data: unreadNotifications } = useQuery({
    queryKey: ['unread-notifications', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);
      
      return count || 0;
    },
    enabled: !!user?.id,
  });
  
  const taskStats = {
    total: myTasks?.length || 0,
    overdue: myTasks?.filter(t => t.status === 'overdue').length || 0,
    dueToday: myTasks?.filter(t => t.due_at && isToday(new Date(t.due_at))).length || 0,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {profile?.first_name || 'User'}!</h1>
            <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/notifications">
              <Bell className="h-4 w-4" />
              {unreadNotifications && unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasks */}
        <Link to="/my/work-queue">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{taskStats.total}</p>
                  <p className="text-sm text-muted-foreground">My Tasks</p>
                </div>
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              </div>
              {taskStats.overdue > 0 && (
                <div className="mt-2 flex items-center gap-1 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {taskStats.overdue} overdue
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
        
        {/* Schedule */}
        <Link to="/my/schedule">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{schedule?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Shifts This Week</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
        
        {/* PTO Balance */}
        <Link to="/my/pto">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    {ptoBalance?.find(p => p.pto_type?.code === 'VAC')?.current_balance || 0}h
                  </p>
                  <p className="text-sm text-muted-foreground">Vacation Balance</p>
                </div>
                <Umbrella className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
        
        {/* Training */}
        <Link to="/my/training">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{trainingStats?.percentage || 0}%</p>
                  <p className="text-sm text-muted-foreground">Training Complete</p>
                </div>
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
              </div>
              <Progress value={trainingStats?.percentage || 0} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </Link>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                My Tasks
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/my/work-queue">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!myTasks?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.due_at && format(new Date(task.due_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Badge variant={task.status === 'overdue' ? 'destructive' : 'secondary'}>
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Upcoming Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                My Schedule
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/my/schedule">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!schedule?.length ? (
              <p className="text-center py-8 text-muted-foreground">No upcoming shifts</p>
            ) : (
              <div className="space-y-3">
                {schedule.slice(0, 5).map((shift: any) => (
                  <div key={shift.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {format(new Date(shift.shift_date), 'EEEE, MMM d')}
                        </p>
                        {isToday(new Date(shift.shift_date)) && (
                          <Badge variant="default" className="text-xs">Today</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {shift.start_time} - {shift.end_time}
                        {shift.location?.name && ` • ${shift.location.name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Pending Documents */}
        {pendingDocs && pendingDocs.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <FileText className="h-5 w-5" />
                Action Required
              </CardTitle>
              <CardDescription className="text-orange-600">
                Documents requiring your signature
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingDocs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-white border">
                    <div>
                      <p className="font-medium">{doc.template?.name}</p>
                      <p className="text-sm text-muted-foreground">{doc.template?.category}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Sign
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Training Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Training Progress
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/my/training">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span className="font-medium">{trainingStats?.percentage || 0}%</span>
                </div>
                <Progress value={trainingStats?.percentage || 0} className="h-3" />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{trainingStats?.completed || 0}</p>
                  <p className="text-xs text-green-600">Completed</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-2xl font-bold text-blue-700">{trainingStats?.inProgress || 0}</p>
                  <p className="text-xs text-blue-600">In Progress</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-2xl font-bold text-gray-700">{trainingStats?.pending || 0}</p>
                  <p className="text-xs text-gray-600">Pending</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeePortal;
