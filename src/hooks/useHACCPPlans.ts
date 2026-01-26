import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { HACCPPlan, HACCPPlanFormData, HACCPPlanFilters } from '@/types/haccp';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const haccpPlanKeys = {
  all: ['haccp-plans'] as const,
  lists: () => [...haccpPlanKeys.all, 'list'] as const,
  list: (filters: HACCPPlanFilters) => [...haccpPlanKeys.lists(), filters] as const,
  details: () => [...haccpPlanKeys.all, 'detail'] as const,
  detail: (id: string) => [...haccpPlanKeys.details(), id] as const,
  byPolicy: (policyId: string) => [...haccpPlanKeys.all, 'policy', policyId] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all HACCP plans with optional filters
 */
export function useHACCPPlans(filters?: HACCPPlanFilters) {
  return useQuery({
    queryKey: haccpPlanKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('haccp_plans')
        .select(`
          *,
          policy:policy_id(id, policy_number, title, status),
          team_leader:haccp_team_leader(id, full_name, email)
        `);

      if (filters?.policy_id) {
        query = query.eq('policy_id', filters.policy_id);
      }
      if (filters?.team_leader) {
        query = query.eq('haccp_team_leader', filters.team_leader);
      }
      if (filters?.verification_overdue) {
        query = query.lt('next_verification_due', new Date().toISOString().split('T')[0]);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as HACCPPlan[];
    },
  });
}

/**
 * Fetch a single HACCP plan by ID
 */
export function useHACCPPlan(id: string | undefined) {
  return useQuery({
    queryKey: haccpPlanKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('HACCP Plan ID is required');

      const { data, error } = await supabase
        .from('haccp_plans')
        .select(`
          *,
          policy:policy_id(id, policy_number, title, status),
          team_leader:haccp_team_leader(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as HACCPPlan;
    },
    enabled: !!id,
  });
}

/**
 * Fetch HACCP plan by policy ID
 */
export function useHACCPPlanByPolicy(policyId: string | undefined) {
  return useQuery({
    queryKey: haccpPlanKeys.byPolicy(policyId || ''),
    queryFn: async () => {
      if (!policyId) throw new Error('Policy ID is required');

      const { data, error } = await supabase
        .from('haccp_plans')
        .select(`
          *,
          policy:policy_id(id, policy_number, title, status),
          team_leader:haccp_team_leader(id, full_name, email)
        `)
        .eq('policy_id', policyId)
        .maybeSingle();

      if (error) throw error;
      return data as HACCPPlan | null;
    },
    enabled: !!policyId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new HACCP plan
 */
export function useCreateHACCPPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: HACCPPlanFormData) => {
      const { data: plan, error } = await supabase
        .from('haccp_plans')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return plan as HACCPPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: haccpPlanKeys.lists() });
    },
  });
}

/**
 * Update an existing HACCP plan
 */
export function useUpdateHACCPPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HACCPPlanFormData> }) => {
      const { data, error } = await supabase
        .from('haccp_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HACCPPlan;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: haccpPlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: haccpPlanKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete an HACCP plan
 */
export function useDeleteHACCPPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('haccp_plans').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: haccpPlanKeys.lists() });
    },
  });
}
