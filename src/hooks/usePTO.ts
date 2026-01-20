import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { eachDayOfInterval, isWeekend } from 'date-fns';

export interface PTOType {
  id: string;
  name: string;
  code: string;
  description?: string;
  color: string;
  accrual_type: 'none' | 'hourly' | 'per_pay_period' | 'annual';
  default_accrual_rate?: number;
  default_annual_grant?: number;
  max_balance?: number;
  max_carryover?: number;
  waiting_period_days: number;
  requires_approval: boolean;
  advance_notice_days: number;
  is_active: boolean;
}

export interface EmployeePTOSettings {
  id: string;
  employee_id: string;
  pto_type_id: string;
  pto_type?: PTOType;
  accrual_type?: string;
  accrual_rate?: number;
  annual_grant?: number;
  max_balance?: number;
  max_carryover?: number;
  current_balance: number;
  year_start_balance: number;
  year_accrued: number;
  year_used: number;
  eligible_date?: string;
}

export interface PTORequest {
  id: string;
  request_number: string;
  employee_id: string;
  employee?: { id: string; first_name: string; last_name: string; avatar_url?: string };
  pto_type_id: string;
  pto_type?: PTOType;
  start_date: string;
  end_date: string;
  total_hours: number;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  notes?: string;
  reviewed_by?: string;
  reviewer?: { id: string; first_name: string; last_name: string };
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

// ============================================================================
// PTO TYPES
// ============================================================================
export function usePTOTypes() {
  return useQuery({
    queryKey: ['pto-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pto_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as PTOType[];
    },
  });
}

// ============================================================================
// MY PTO BALANCES
// ============================================================================
export function useMyPTOBalances() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-pto-balances', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_pto_settings')
        .select(`*, pto_type:pto_types(*)`)
        .eq('employee_id', user?.id);
      
      if (error) throw error;
      return data as EmployeePTOSettings[];
    },
    enabled: !!user?.id,
  });
}

// ============================================================================
// EMPLOYEE PTO SETTINGS (for admin)
// ============================================================================
export function useEmployeePTOSettings(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-pto-settings', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('employee_pto_settings')
        .select(`*, pto_type:pto_types(*)`)
        .eq('employee_id', employeeId);
      if (error) throw error;
      return data as EmployeePTOSettings[];
    },
    enabled: !!employeeId,
  });
}

// ============================================================================
// MY PTO REQUESTS
// ============================================================================
export function useMyPTORequests() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-pto-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pto_requests')
        .select(`
          *, 
          pto_type:pto_types(*),
          reviewer:profiles!pto_requests_reviewed_by_fkey(id, first_name, last_name)
        `)
        .eq('employee_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PTORequest[];
    },
    enabled: !!user?.id,
  });
}

// ============================================================================
// ALL PTO REQUESTS (for managers)
// ============================================================================
export function usePTORequests(filters?: { status?: string; employee_id?: string }) {
  return useQuery({
    queryKey: ['pto-requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('pto_requests')
        .select(`
          *,
          employee:profiles!pto_requests_employee_id_fkey(id, first_name, last_name, avatar_url),
          pto_type:pto_types(*),
          reviewer:profiles!pto_requests_reviewed_by_fkey(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PTORequest[];
    },
  });
}

// ============================================================================
// CREATE PTO REQUEST
// ============================================================================
export function useCreatePTORequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: {
      pto_type_id: string;
      start_date: string;
      end_date: string;
      total_hours: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('pto_requests')
        .insert({ ...input, employee_id: user?.id, status: 'pending' })
        .select()
        .single();
      
      if (error) throw error;
      
      // Notify managers
      const { data: managers } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'manager'] as any);
      
      if (managers?.length) {
        await supabase.from('notifications').insert(
          managers.map(m => ({
            user_id: m.id,
            title: 'New PTO Request',
            message: `Time off request from ${input.start_date} to ${input.end_date}`,
            notification_type: 'pto_request',
            link_type: 'pto',
            link_id: data.id,
          })) as any
        );
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-pto-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pto-requests'] });
      toast.success(`PTO request ${data.request_number} submitted`);
    },
    onError: (error: Error) => {
      toast.error('Failed to submit request', { description: error.message });
    },
  });
}

// ============================================================================
// CANCEL PTO REQUEST
// ============================================================================
export function useCancelPTORequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('pto_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pto-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pto-requests'] });
      toast.success('Request cancelled');
    },
  });
}

// ============================================================================
// APPROVE/DENY PTO REQUEST
// ============================================================================
export function useReviewPTORequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: { requestId: string; status: 'approved' | 'denied'; notes?: string }) => {
      const { data, error } = await supabase
        .from('pto_requests')
        .update({
          status: input.status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: input.notes,
        })
        .eq('id', input.requestId)
        .select(`*, employee:profiles!pto_requests_employee_id_fkey(id)`)
        .single();
      
      if (error) throw error;
      
      // Notify employee
      await supabase.from('notifications').insert({
        user_id: data.employee.id,
        title: `PTO Request ${input.status.charAt(0).toUpperCase() + input.status.slice(1)}`,
        message: `Your time off request has been ${input.status}`,
        notification_type: input.status === 'approved' ? 'pto_approved' : 'pto_denied',
        link_type: 'pto',
        link_id: data.id,
      });
      
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['pto-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-pto-balances'] });
      toast.success(`Request ${status}`);
    },
  });
}

// ============================================================================
// UPDATE EMPLOYEE PTO SETTINGS (admin)
// ============================================================================
export function useUpdateEmployeePTOSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: { 
      employeeId: string; 
      ptoTypeId: string; 
      accrualRate?: number;
      annualGrant?: number;
      maxBalance?: number;
      maxCarryover?: number;
    }) => {
      const { data, error } = await supabase
        .from('employee_pto_settings')
        .upsert({
          employee_id: input.employeeId,
          pto_type_id: input.ptoTypeId,
          accrual_rate: input.accrualRate,
          annual_grant: input.annualGrant,
          max_balance: input.maxBalance,
          max_carryover: input.maxCarryover,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['employee-pto-settings', employeeId] });
      toast.success('PTO settings updated');
    },
  });
}

// ============================================================================
// MANUAL BALANCE ADJUSTMENT
// ============================================================================
export function useAdjustPTOBalance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: { employeeId: string; ptoTypeId: string; hours: number; notes: string }) => {
      const { data: current } = await supabase
        .from('employee_pto_settings')
        .select('current_balance')
        .eq('employee_id', input.employeeId)
        .eq('pto_type_id', input.ptoTypeId)
        .single();
      
      const newBalance = (current?.current_balance || 0) + input.hours;
      
      await supabase.from('employee_pto_settings').upsert({
        employee_id: input.employeeId,
        pto_type_id: input.ptoTypeId,
        current_balance: newBalance,
      } as any);
      
      const { error } = await supabase.from('pto_accrual_log').insert({
        employee_id: input.employeeId,
        pto_type_id: input.ptoTypeId,
        transaction_type: 'adjustment',
        hours: input.hours,
        balance_after: newBalance,
        notes: input.notes,
        performed_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['employee-pto-settings', employeeId] });
      toast.success('Balance adjusted');
    },
  });
}

// Calculate PTO hours helper
export function calculatePTOHours(startDate: string, endDate: string, hoursPerDay = 8): number {
  const days = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) });
  return days.filter(day => !isWeekend(day)).length * hoursPerDay;
}
