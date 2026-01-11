import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Fixed Costs
export function useFixedCosts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fixedCosts, isLoading } = useQuery({
    queryKey: ['fixed_costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_costs')
        .select('*')
        .order('category', { ascending: true })
        .order('cost_name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createCost = useMutation({
    mutationFn: async (cost: {
      cost_name: string;
      category: string;
      monthly_amount: number;
      gl_account?: string;
      description?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('fixed_costs')
        .insert(cost)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_costs'] });
      toast({ title: 'Fixed cost created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating fixed cost', description: error.message, variant: 'destructive' });
    },
  });

  const updateCost = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('fixed_costs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_costs'] });
      toast({ title: 'Fixed cost updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating fixed cost', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fixed_costs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_costs'] });
      toast({ title: 'Fixed cost deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting fixed cost', description: error.message, variant: 'destructive' });
    },
  });

  return { fixedCosts, isLoading, createCost, updateCost, deleteCost };
}

// Overhead Settings
export function useOverheadSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['overhead_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('overhead_settings').select('*');
      if (error) throw error;
      return data;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ setting_key, setting_value }: { setting_key: string; setting_value: number }) => {
      const { data, error } = await supabase
        .from('overhead_settings')
        .update({ setting_value, updated_at: new Date().toISOString() })
        .eq('setting_key', setting_key)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overhead_settings'] });
      toast({ title: 'Overhead rate updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating setting', description: error.message, variant: 'destructive' });
    },
  });

  const overheadRate = settings?.find((s) => s.setting_key === 'overhead_rate_per_hour')?.setting_value ?? 0;

  return { settings, overheadRate, isLoading, updateSetting };
}

// GL Accounts
export function useGLAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: glAccounts, isLoading } = useQuery({
    queryKey: ['gl_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gl_accounts')
        .select('*')
        .order('account_code', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createAccount = useMutation({
    mutationFn: async (account: {
      account_code: string;
      account_name: string;
      account_type: string;
      xero_account_id?: string | null;
      mapping_purpose?: string | null;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase.from('gl_accounts').insert(account).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl_accounts'] });
      toast({ title: 'GL Account created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating GL account', description: error.message, variant: 'destructive' });
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('gl_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl_accounts'] });
      toast({ title: 'GL Account updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating GL account', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gl_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl_accounts'] });
      toast({ title: 'GL Account deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting GL account', description: error.message, variant: 'destructive' });
    },
  });

  return { glAccounts, isLoading, createAccount, updateAccount, deleteAccount };
}

// Accounting Periods
export function useAccountingPeriods() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: periods, isLoading } = useQuery({
    queryKey: ['accounting_periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*, closed_by_profile:profiles!accounting_periods_closed_by_fkey(first_name, last_name)')
        .order('period_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createPeriod = useMutation({
    mutationFn: async (period: { period_date: string; period_type: string }) => {
      const { data, error } = await supabase
        .from('accounting_periods')
        .insert(period)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_periods'] });
      toast({ title: 'Period created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating period', description: error.message, variant: 'destructive' });
    },
  });

  const closePeriod = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('accounting_periods')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
          notes,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_periods'] });
      toast({ title: 'Period closed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error closing period', description: error.message, variant: 'destructive' });
    },
  });

  const reopenPeriod = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('accounting_periods')
        .update({ status: 'open', closed_at: null, closed_by: null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_periods'] });
      toast({ title: 'Period reopened' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error reopening period', description: error.message, variant: 'destructive' });
    },
  });

  return { periods, isLoading, createPeriod, closePeriod, reopenPeriod };
}

// Period Close Items (incomplete items for a period)
export function usePeriodCloseItems(periodId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: closeItems, isLoading } = useQuery({
    queryKey: ['period_close_items', periodId],
    queryFn: async () => {
      let query = supabase.from('period_close_items').select('*');
      if (periodId) {
        query = query.eq('period_id', periodId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!periodId,
  });

  const resolveItem = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('period_close_items')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period_close_items'] });
      toast({ title: 'Item resolved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error resolving item', description: error.message, variant: 'destructive' });
    },
  });

  return { closeItems, isLoading, resolveItem };
}
