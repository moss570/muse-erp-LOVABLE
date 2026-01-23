import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, ClipboardList } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface ScheduleEntry {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  location_id?: string;
  location?: { name: string };
  notes?: string;
  break_minutes?: number;
}

const MySchedule = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

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
  
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['my-schedule', myEmployee?.id, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_shifts')
        .select('id, shift_date, start_time, end_time, notes, break_minutes, location_id')
        .eq('employee_id', myEmployee!.id)
        .gte('shift_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('shift_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('shift_date')
        .order('start_time');

      return (data || []) as ScheduleEntry[];
    },
    enabled: !!myEmployee?.id,
  });
  
  // Fetch tasks for scheduled shifts
  const { data: scheduledTasks } = useQuery({
    queryKey: ['my-scheduled-tasks', user?.id, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .eq('assigned_to', user?.id)
        .eq('source_type', 'schedule')
        .gte('due_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('due_date', format(weekEnd, 'yyyy-MM-dd'));
      
      return data;
    },
    enabled: !!user?.id,
  });
  
  const getShiftForDay = (date: Date) => {
    return schedule?.filter(s => isSameDay(new Date(s.shift_date), date)) || [];
  };
  
  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduledTasks?.filter(t => t.due_date === dateStr) || [];
  };
  
  const calculateHours = (start: string, end: string, breakMinutes?: number) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const workMinutes = endMinutes - startMinutes - (breakMinutes || 0);
    return (workMinutes / 60).toFixed(1);
  };
  
  // Calculate weekly hours
  const weeklyHours = schedule?.reduce((total, shift) => {
    return total + parseFloat(calculateHours(shift.start_time, shift.end_time, shift.break_minutes));
  }, 0) || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">My Schedule</h1>
          </div>
          <p className="text-muted-foreground">View your upcoming shifts and assigned tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Week Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">
                {format(weekStart, 'MMMM d')} - {format(weekEnd, 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <p className="text-2xl font-bold">{weeklyHours.toFixed(1)} hours</p>
              <p className="text-muted-foreground">scheduled this week</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Week Grid - Desktop */}
      <div className="hidden md:grid grid-cols-7 gap-4">
        {daysOfWeek.map((day) => {
          const shifts = getShiftForDay(day);
          const tasks = getTasksForDay(day);
          const isCurrentDay = isToday(day);
          
          return (
            <Card key={day.toISOString()} className={cn(isCurrentDay && "ring-2 ring-primary")}>
              <CardHeader className="pb-2 pt-4 px-3">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-sm font-medium",
                    isCurrentDay ? "text-primary" : "text-muted-foreground"
                  )}>
                    {format(day, 'EEE')}
                  </span>
                  {isCurrentDay && <Badge variant="default" className="text-xs">Today</Badge>}
                </div>
                <p className={cn(
                  "text-2xl font-bold",
                  isCurrentDay && "text-primary"
                )}>
                  {format(day, 'd')}
                </p>
              </CardHeader>
              <CardContent className="px-3 pb-4">
                {shifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Off</p>
                ) : (
                  shifts.map((shift) => (
                    <div key={shift.id} className="space-y-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-1 text-sm font-medium text-primary">
                        <Clock className="h-3 w-3" />
                        {shift.start_time} - {shift.end_time}
                      </div>
                      {shift.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {shift.location.name}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {calculateHours(shift.start_time, shift.end_time, shift.break_minutes)} hours
                      </p>
                    </div>
                  ))
                )}
                
                {/* Tasks for the day */}
                {tasks.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <ClipboardList className="h-3 w-3" />
                      Tasks ({tasks.length})
                    </div>
                    {tasks.map((task) => (
                      <p key={task.id} className="text-xs truncate">{task.title}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* List View for Mobile */}
      <div className="md:hidden space-y-3">
        <h3 className="font-semibold">Upcoming Shifts</h3>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : schedule?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No shifts scheduled this week
            </CardContent>
          </Card>
        ) : (
          schedule?.map((shift) => (
            <Card key={shift.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{format(new Date(shift.shift_date), 'EEEE, MMMM d')}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-4 w-4" />
                      {shift.start_time} - {shift.end_time}
                    </div>
                    {shift.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {shift.location.name}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {calculateHours(shift.start_time, shift.end_time, shift.break_minutes)}h
                    </p>
                    {isToday(new Date(shift.shift_date)) && (
                      <Badge variant="default">Today</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MySchedule;
