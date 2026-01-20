import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, differenceInMinutes } from 'date-fns';

export interface EmployeeTaskMetrics {
  employee_id: string;
  employee_name: string;
  avatar_url?: string;
  total_assigned: number;
  total_completed: number;
  completion_rate: number;
  on_time_rate: number;
  overdue_count: number;
  avg_completion_time_minutes: number;
  food_safety_completion_rate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TeamTaskMetrics {
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  in_progress_tasks: number;
  avg_completion_rate: number;
  avg_completion_time_minutes: number;
  food_safety_compliance: number;
  by_category: { category: string; count: number; completed: number }[];
  by_priority: { priority: string; count: number; completed: number }[];
}

export interface TaskTrend {
  date: string;
  created: number;
  completed: number;
  overdue: number;
}

// ============================================================================
// EMPLOYEE TASK METRICS
// ============================================================================
export function useEmployeeTaskMetrics(employeeId?: string, dateRange?: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ['employee-task-metrics', employeeId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const from = dateRange?.from || startOfMonth(new Date());
      const to = dateRange?.to || endOfMonth(new Date());
      
      let query = supabase
        .from('tasks')
        .select(`
          id, status, priority, is_food_safety,
          assigned_to, claimed_by, created_at, completed_at, due_date, due_time
        `)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());
      
      if (employeeId) {
        query = query.or(`assigned_to.eq.${employeeId},claimed_by.eq.${employeeId}`);
      }
      
      const { data: tasks, error } = await query;
      if (error) throw error;
      
      // Get profiles for assigned users
      const userIds = [...new Set(tasks?.map(t => t.assigned_to || t.claimed_by).filter(Boolean))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);
      
      const profileMap = new Map(profiles?.map(p => [p.id, { 
        ...p, 
        full_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
      }]) || []);
      
      // Group by employee
      const employeeMap = new Map<string, any>();
      
      tasks?.forEach((task) => {
        const empId = task.assigned_to || task.claimed_by;
        if (!empId) return;
        
        const profile = profileMap.get(empId);
        
        if (!employeeMap.has(empId)) {
          employeeMap.set(empId, {
            employee_id: empId,
            employee_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url,
            total_assigned: 0,
            total_completed: 0,
            completed_on_time: 0,
            overdue_count: 0,
            total_completion_time: 0,
            food_safety_total: 0,
            food_safety_completed: 0,
          });
        }
        
        const emp = employeeMap.get(empId);
        emp.total_assigned++;
        
        if (task.status === 'completed' || task.status === 'verified') {
          emp.total_completed++;
          
          if (task.completed_at && task.due_date) {
            const dueDateTime = task.due_time 
              ? new Date(`${task.due_date}T${task.due_time}`)
              : new Date(`${task.due_date}T23:59:59`);
            if (new Date(task.completed_at) <= dueDateTime) {
              emp.completed_on_time++;
            }
            emp.total_completion_time += differenceInMinutes(
              new Date(task.completed_at),
              new Date(task.created_at)
            );
          }
        }
        
        if (task.status === 'overdue') {
          emp.overdue_count++;
        }
        
        if (task.is_food_safety) {
          emp.food_safety_total++;
          if (task.status === 'completed' || task.status === 'verified') {
            emp.food_safety_completed++;
          }
        }
      });
      
      // Calculate metrics
      const metrics: EmployeeTaskMetrics[] = Array.from(employeeMap.values()).map((emp) => ({
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        avatar_url: emp.avatar_url,
        total_assigned: emp.total_assigned,
        total_completed: emp.total_completed,
        completion_rate: emp.total_assigned > 0 ? Math.round((emp.total_completed / emp.total_assigned) * 100) : 0,
        on_time_rate: emp.total_completed > 0 ? Math.round((emp.completed_on_time / emp.total_completed) * 100) : 0,
        overdue_count: emp.overdue_count,
        avg_completion_time_minutes: emp.total_completed > 0 ? Math.round(emp.total_completion_time / emp.total_completed) : 0,
        food_safety_completion_rate: emp.food_safety_total > 0 ? Math.round((emp.food_safety_completed / emp.food_safety_total) * 100) : 100,
        trend: 'stable' as const,
      }));
      
      return metrics.sort((a, b) => b.completion_rate - a.completion_rate);
    },
  });
}

// ============================================================================
// TEAM TASK METRICS
// ============================================================================
export function useTeamTaskMetrics(dateRange?: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ['team-task-metrics', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const from = dateRange?.from || startOfMonth(new Date());
      const to = dateRange?.to || endOfMonth(new Date());
      
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id, status, priority, is_food_safety,
          category_id,
          created_at, completed_at
        `)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());
      
      if (error) throw error;
      
      // Get categories
      const categoryIds = [...new Set(tasks?.map(t => t.category_id).filter(Boolean))] as string[];
      const { data: categories } = await supabase
        .from('task_categories')
        .select('id, name')
        .in('id', categoryIds.length > 0 ? categoryIds : ['00000000-0000-0000-0000-000000000000']);
      
      const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);
      
      const completed = tasks?.filter(t => ['completed', 'verified'].includes(t.status)) || [];
      const overdue = tasks?.filter(t => t.status === 'overdue') || [];
      const inProgress = tasks?.filter(t => t.status === 'in_progress') || [];
      const foodSafety = tasks?.filter(t => t.is_food_safety) || [];
      const foodSafetyCompleted = foodSafety.filter(t => ['completed', 'verified'].includes(t.status));
      
      // By category
      const categoryStats = new Map<string, { count: number; completed: number }>();
      tasks?.forEach((task) => {
        const cat = task.category_id ? (categoryMap.get(task.category_id) || 'Uncategorized') : 'Uncategorized';
        if (!categoryStats.has(cat)) categoryStats.set(cat, { count: 0, completed: 0 });
        const c = categoryStats.get(cat)!;
        c.count++;
        if (['completed', 'verified'].includes(task.status)) c.completed++;
      });
      
      // By priority
      const priorityStats = new Map<string, { count: number; completed: number }>();
      tasks?.forEach((task) => {
        if (!priorityStats.has(task.priority)) priorityStats.set(task.priority, { count: 0, completed: 0 });
        const p = priorityStats.get(task.priority)!;
        p.count++;
        if (['completed', 'verified'].includes(task.status)) p.completed++;
      });
      
      // Average completion time
      let totalTime = 0;
      let completedWithTime = 0;
      completed.forEach((task) => {
        if (task.completed_at && task.created_at) {
          totalTime += differenceInMinutes(new Date(task.completed_at), new Date(task.created_at));
          completedWithTime++;
        }
      });
      
      return {
        total_tasks: tasks?.length || 0,
        completed_tasks: completed.length,
        overdue_tasks: overdue.length,
        in_progress_tasks: inProgress.length,
        avg_completion_rate: tasks?.length ? Math.round((completed.length / tasks.length) * 100) : 0,
        avg_completion_time_minutes: completedWithTime > 0 ? Math.round(totalTime / completedWithTime) : 0,
        food_safety_compliance: foodSafety.length > 0 ? Math.round((foodSafetyCompleted.length / foodSafety.length) * 100) : 100,
        by_category: Array.from(categoryStats.entries()).map(([category, data]) => ({ category, ...data })),
        by_priority: Array.from(priorityStats.entries()).map(([priority, data]) => ({ priority, ...data })),
      } as TeamTaskMetrics;
    },
  });
}

// ============================================================================
// TASK TRENDS (DAILY)
// ============================================================================
export function useTaskTrends(days: number = 30) {
  return useQuery({
    queryKey: ['task-trends', days],
    queryFn: async () => {
      const from = subMonths(new Date(), 1);
      
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, status, created_at, completed_at')
        .gte('created_at', from.toISOString());
      
      if (error) throw error;
      
      // Group by date
      const dateMap = new Map<string, { created: number; completed: number; overdue: number }>();
      
      tasks?.forEach((task) => {
        const createdDate = format(new Date(task.created_at), 'yyyy-MM-dd');
        if (!dateMap.has(createdDate)) dateMap.set(createdDate, { created: 0, completed: 0, overdue: 0 });
        dateMap.get(createdDate)!.created++;
        
        if (task.completed_at) {
          const completedDate = format(new Date(task.completed_at), 'yyyy-MM-dd');
          if (!dateMap.has(completedDate)) dateMap.set(completedDate, { created: 0, completed: 0, overdue: 0 });
          dateMap.get(completedDate)!.completed++;
        }
        
        if (task.status === 'overdue') {
          dateMap.get(createdDate)!.overdue++;
        }
      });
      
      return Array.from(dateMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)) as TaskTrend[];
    },
  });
}

// ============================================================================
// FOOD SAFETY COMPLIANCE REPORT
// ============================================================================
export function useFoodSafetyCompliance(dateRange?: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ['food-safety-compliance', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const from = dateRange?.from || startOfMonth(new Date());
      const to = dateRange?.to || endOfMonth(new Date());
      
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id, title, status, created_at, completed_at, due_date, due_time,
          assigned_to, category_id
        `)
        .eq('is_food_safety', true)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get profiles and categories
      const userIds = [...new Set(tasks?.map(t => t.assigned_to).filter(Boolean))] as string[];
      const categoryIds = [...new Set(tasks?.map(t => t.category_id).filter(Boolean))] as string[];
      
      const [profilesResult, categoriesResult] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name').in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']),
        supabase.from('task_categories').select('id, name').in('id', categoryIds.length > 0 ? categoryIds : ['00000000-0000-0000-0000-000000000000']),
      ]);
      
      const profileMap = new Map(profilesResult.data?.map(p => [p.id, [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown']) || []);
      const categoryMap = new Map(categoriesResult.data?.map(c => [c.id, c.name]) || []);
      
      const completed = tasks?.filter(t => ['completed', 'verified'].includes(t.status)) || [];
      const onTime = completed.filter(t => {
        if (!t.completed_at || !t.due_date) return false;
        const dueDateTime = t.due_time 
          ? new Date(`${t.due_date}T${t.due_time}`)
          : new Date(`${t.due_date}T23:59:59`);
        return new Date(t.completed_at) <= dueDateTime;
      });
      const missed = tasks?.filter(t => {
        if (t.status === 'overdue') return true;
        if (!t.due_date) return false;
        const dueDateTime = t.due_time 
          ? new Date(`${t.due_date}T${t.due_time}`)
          : new Date(`${t.due_date}T23:59:59`);
        return dueDateTime < new Date() && !['completed', 'verified'].includes(t.status);
      }) || [];
      
      // Enrich tasks with names
      const enrichedTasks = tasks?.map(t => ({
        ...t,
        assigned_to_name: t.assigned_to ? profileMap.get(t.assigned_to) : undefined,
        category_name: t.category_id ? categoryMap.get(t.category_id) : undefined,
      }));
      
      return {
        total: tasks?.length || 0,
        completed: completed.length,
        on_time: onTime.length,
        missed: missed.length,
        compliance_rate: tasks?.length ? Math.round((completed.length / tasks.length) * 100) : 100,
        on_time_rate: completed.length ? Math.round((onTime.length / completed.length) * 100) : 100,
        tasks: enrichedTasks || [],
      };
    },
  });
}
