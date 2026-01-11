import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Employee = Tables<'employees'>;
export type EmployeeInsert = TablesInsert<'employees'>;
export type EmployeeUpdate = TablesUpdate<'employees'>;
export type JobPosition = Tables<'job_positions'>;
export type EmployeeShift = Tables<'employee_shifts'>;
export type EmployeeWageHistory = Tables<'employee_wage_history'>;

export interface EmployeeWithRelations extends Employee {
  job_position?: JobPosition | null;
  department?: Tables<'departments'> | null;
  location?: Tables<'locations'> | null;
}

export function useEmployees() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          job_position:job_positions(*),
          department:departments(*),
          location:locations(*)
        `)
        .order('last_name')
        .order('first_name');
      
      if (error) throw error;
      return data as EmployeeWithRelations[];
    },
  });

  const createEmployee = useMutation({
    mutationFn: async (employee: Omit<EmployeeInsert, 'employee_number'>) => {
      // Generate employee number
      const { data: empNum, error: numError } = await supabase
        .rpc('generate_employee_number');
      
      if (numError) throw numError;

      const { data, error } = await supabase
        .from('employees')
        .insert({ ...employee, employee_number: empNum })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Employee created successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error creating employee', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...updates }: EmployeeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Employee updated successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error updating employee', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Employee deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error deleting employee', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    employees: employeesQuery.data || [],
    isLoading: employeesQuery.isLoading,
    error: employeesQuery.error,
    refetch: employeesQuery.refetch,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  };
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          job_position:job_positions(*),
          department:departments(*),
          location:locations(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as EmployeeWithRelations;
    },
    enabled: !!id,
  });
}

export function useJobPositions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const positionsQuery = useQuery({
    queryKey: ['job-positions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_positions')
        .select('*, department:departments(*)')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const createPosition = useMutation({
    mutationFn: async (position: TablesInsert<'job_positions'>) => {
      const { data, error } = await supabase
        .from('job_positions')
        .insert(position)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-positions'] });
      toast({ title: 'Position created successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error creating position', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    positions: positionsQuery.data || [],
    isLoading: positionsQuery.isLoading,
    createPosition,
    refetch: positionsQuery.refetch,
  };
}

export function useEmployeeWageHistory(employeeId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const historyQuery = useQuery({
    queryKey: ['employee-wage-history', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_wage_history')
        .select('*, job_position:job_positions(*)')
        .eq('employee_id', employeeId)
        .order('effective_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  const addWageChange = useMutation({
    mutationFn: async (data: TablesInsert<'employee_wage_history'>) => {
      const { data: result, error } = await supabase
        .from('employee_wage_history')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-wage-history', employeeId] });
      toast({ title: 'Wage history updated' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error updating wage', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
    addWageChange,
  };
}

export function useEmployeeShifts(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['employee-shifts', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('employee_shifts')
        .select(`
          *,
          employee:employees(id, first_name, last_name, avatar_url, hourly_rate, pay_type),
          department:departments(*),
          job_position:job_positions(*)
        `)
        .order('shift_date')
        .order('start_time');
      
      if (startDate) {
        query = query.gte('shift_date', startDate);
      }
      if (endDate) {
        query = query.lte('shift_date', endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!startDate || !!endDate,
  });
}
