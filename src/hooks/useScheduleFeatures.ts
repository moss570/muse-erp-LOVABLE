import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type ShiftTemplate = Tables<'shift_templates'>;
export type LaborBudget = Tables<'labor_budgets'>;
export type EmployeeTimeOff = Tables<'employee_time_off'>;

// Shift Templates Hook
export function useShiftTemplates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const templatesQuery = useQuery({
    queryKey: ['shift-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_templates')
        .select(`
          *,
          department:departments(*),
          job_position:job_positions(*)
        `)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: TablesInsert<'shift_templates'>) => {
      const { data, error } = await supabase
        .from('shift_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
      toast({ title: 'Template created successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error creating template', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'shift_templates'> & { id: string }) => {
      const { data, error } = await supabase
        .from('shift_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
      toast({ title: 'Template updated successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error updating template', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shift_templates')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
      toast({ title: 'Template deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error deleting template', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

// Labor Budgets Hook
export function useLaborBudgets(startDate?: string, endDate?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const budgetsQuery = useQuery({
    queryKey: ['labor-budgets', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('labor_budgets')
        .select('*, department:departments(*)')
        .order('budget_date');
      
      if (startDate) {
        query = query.gte('budget_date', startDate);
      }
      if (endDate) {
        query = query.lte('budget_date', endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const upsertBudget = useMutation({
    mutationFn: async (budget: TablesInsert<'labor_budgets'>) => {
      const { data, error } = await supabase
        .from('labor_budgets')
        .upsert(budget, { onConflict: 'budget_date,department_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-budgets'] });
      toast({ title: 'Budget saved successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error saving budget', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    budgets: budgetsQuery.data || [],
    isLoading: budgetsQuery.isLoading,
    upsertBudget,
  };
}

// Employee Time Off Hook
export function useEmployeeTimeOff(startDate?: string, endDate?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const timeOffQuery = useQuery({
    queryKey: ['employee-time-off', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('employee_time_off')
        .select(`
          *,
          employee:employees(id, first_name, last_name, avatar_url)
        `)
        .eq('status', 'approved')
        .order('start_date');
      
      if (startDate) {
        query = query.gte('end_date', startDate);
      }
      if (endDate) {
        query = query.lte('start_date', endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return {
    timeOffRequests: timeOffQuery.data || [],
    isLoading: timeOffQuery.isLoading,
    refetch: timeOffQuery.refetch,
  };
}

// Publish Shifts Hook
export function usePublishShifts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const publishShifts = useMutation({
    mutationFn: async ({ shiftIds }: { shiftIds: string[] }) => {
      const { data, error } = await supabase
        .from('employee_shifts')
        .update({ is_published: true })
        .in('id', shiftIds)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      toast({ title: `${data?.length || 0} shifts published successfully` });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error publishing shifts', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const unpublishShifts = useMutation({
    mutationFn: async ({ shiftIds }: { shiftIds: string[] }) => {
      const { data, error } = await supabase
        .from('employee_shifts')
        .update({ is_published: false })
        .in('id', shiftIds)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      toast({ title: 'Shifts unpublished' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error unpublishing shifts', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    publishShifts,
    unpublishShifts,
  };
}
