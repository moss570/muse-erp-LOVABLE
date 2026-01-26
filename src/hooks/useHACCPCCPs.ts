import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { HACCPCCP, HACCPCCPFormData, HACCPCCPFilters, HACCPCCPVerificationRecord, HACCPCCPVerificationFormData } from '@/types/haccp';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const haccpCCPKeys = {
  all: ['haccp-ccps'] as const,
  lists: () => [...haccpCCPKeys.all, 'list'] as const,
  list: (filters: HACCPCCPFilters) => [...haccpCCPKeys.lists(), filters] as const,
  details: () => [...haccpCCPKeys.all, 'detail'] as const,
  detail: (id: string) => [...haccpCCPKeys.details(), id] as const,
  byPlan: (planId: string) => [...haccpCCPKeys.all, 'plan', planId] as const,
  active: (planId: string) => [...haccpCCPKeys.all, 'active', planId] as const,
};

export const haccpVerificationKeys = {
  all: ['haccp-verifications'] as const,
  byCCP: (ccpId: string) => [...haccpVerificationKeys.all, 'ccp', ccpId] as const,
  byLot: (lotId: string) => [...haccpVerificationKeys.all, 'lot', lotId] as const,
  today: () => [...haccpVerificationKeys.all, 'today'] as const,
};

// ============================================================================
// CCP QUERIES
// ============================================================================

/**
 * Fetch all CCPs with optional filters
 */
export function useHACCPCCPs(filters?: HACCPCCPFilters) {
  return useQuery({
    queryKey: haccpCCPKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('haccp_critical_control_points')
        .select(`
          *,
          process_step:process_step_id(id, step_name, step_number),
          hazard:hazard_id(id, hazard_description, hazard_type),
          responsible_employee:responsible_employee_id(id, full_name, email)
        `);

      if (filters?.haccp_plan_id) {
        query = query.eq('haccp_plan_id', filters.haccp_plan_id);
      }
      if (filters?.ccp_type) {
        query = query.eq('ccp_type', filters.ccp_type);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.requires_verification !== undefined) {
        query = query.eq('requires_manufacturing_verification', filters.requires_verification);
      }

      query = query.order('ccp_number', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as HACCPCCP[];
    },
  });
}

/**
 * Fetch a single CCP by ID
 */
export function useHACCPCCP(id: string | undefined) {
  return useQuery({
    queryKey: haccpCCPKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('CCP ID is required');

      const { data, error } = await supabase
        .from('haccp_critical_control_points')
        .select(`
          *,
          process_step:process_step_id(*),
          hazard:hazard_id(*),
          responsible_employee:responsible_employee_id(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as HACCPCCP;
    },
    enabled: !!id,
  });
}

/**
 * Fetch active CCPs for a HACCP plan (for manufacturing integration)
 */
export function useActiveCCPs(planId: string | undefined) {
  return useQuery({
    queryKey: haccpCCPKeys.active(planId || ''),
    queryFn: async () => {
      if (!planId) throw new Error('Plan ID is required');

      const { data, error } = await supabase
        .from('haccp_critical_control_points')
        .select('*')
        .eq('haccp_plan_id', planId)
        .eq('is_active', true)
        .eq('requires_manufacturing_verification', true)
        .order('ccp_number', { ascending: true });

      if (error) throw error;
      return data as HACCPCCP[];
    },
    enabled: !!planId,
  });
}

// ============================================================================
// CCP MUTATIONS
// ============================================================================

/**
 * Create a new CCP
 */
export function useCreateHACCPCCP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: HACCPCCPFormData) => {
      const { data: ccp, error } = await supabase
        .from('haccp_critical_control_points')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return ccp as HACCPCCP;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: haccpCCPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: haccpCCPKeys.byPlan(data.haccp_plan_id) });
    },
  });
}

/**
 * Update an existing CCP
 */
export function useUpdateHACCPCCP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HACCPCCPFormData> }) => {
      const { data, error } = await supabase
        .from('haccp_critical_control_points')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HACCPCCP;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: haccpCCPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: haccpCCPKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete a CCP
 */
export function useDeleteHACCPCCP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('haccp_critical_control_points').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: haccpCCPKeys.lists() });
    },
  });
}

// ============================================================================
// VERIFICATION QUERIES
// ============================================================================

/**
 * Fetch verification records for a CCP
 */
export function useCCPVerifications(ccpId: string | undefined) {
  return useQuery({
    queryKey: haccpVerificationKeys.byCCP(ccpId || ''),
    queryFn: async () => {
      if (!ccpId) throw new Error('CCP ID is required');

      const { data, error } = await supabase
        .from('haccp_ccp_verification_records')
        .select(`
          *,
          ccp:ccp_id(id, ccp_number, ccp_name),
          verifier:verified_by(id, full_name, email)
        `)
        .eq('ccp_id', ccpId)
        .order('verified_at', { ascending: false });

      if (error) throw error;
      return data as HACCPCCPVerificationRecord[];
    },
    enabled: !!ccpId,
  });
}

/**
 * Fetch verification records for a production lot
 */
export function useLotCCPVerifications(lotId: string | undefined) {
  return useQuery({
    queryKey: haccpVerificationKeys.byLot(lotId || ''),
    queryFn: async () => {
      if (!lotId) throw new Error('Lot ID is required');

      const { data, error } = await supabase
        .from('haccp_ccp_verification_records')
        .select(`
          *,
          ccp:ccp_id(*),
          verifier:verified_by(id, full_name, email)
        `)
        .eq('production_lot_id', lotId)
        .order('verified_at', { ascending: false });

      if (error) throw error;
      return data as HACCPCCPVerificationRecord[];
    },
    enabled: !!lotId,
  });
}

/**
 * Fetch today's CCP verifications
 */
export function useTodayCCPVerifications() {
  return useQuery({
    queryKey: haccpVerificationKeys.today(),
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('haccp_ccp_verification_records')
        .select(`
          *,
          ccp:ccp_id(id, ccp_number, ccp_name)
        `)
        .gte('verified_at', `${today}T00:00:00`)
        .order('verified_at', { ascending: false });

      if (error) throw error;
      return data as HACCPCCPVerificationRecord[];
    },
  });
}

// ============================================================================
// VERIFICATION MUTATIONS
// ============================================================================

/**
 * Record a CCP verification
 */
export function useRecordCCPVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: HACCPCCPVerificationFormData & { haccp_plan_id: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get CCP to check limits
      const { data: ccp } = await supabase
        .from('haccp_critical_control_points')
        .select('critical_limit_min, critical_limit_max')
        .eq('id', data.ccp_id)
        .single();

      let isWithinLimits = null;
      let deviationDetected = false;

      if (ccp && data.measured_value !== null) {
        isWithinLimits = true;
        if (ccp.critical_limit_min !== null && data.measured_value < ccp.critical_limit_min) {
          isWithinLimits = false;
          deviationDetected = true;
        }
        if (ccp.critical_limit_max !== null && data.measured_value > ccp.critical_limit_max) {
          isWithinLimits = false;
          deviationDetected = true;
        }
      }

      const { data: verification, error } = await supabase
        .from('haccp_ccp_verification_records')
        .insert({
          ...data,
          verified_by: user.id,
          is_within_limits: isWithinLimits,
          deviation_detected: deviationDetected,
        })
        .select()
        .single();

      if (error) throw error;
      return verification as HACCPCCPVerificationRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: haccpVerificationKeys.byCCP(data.ccp_id) });
      queryClient.invalidateQueries({ queryKey: haccpVerificationKeys.today() });
      if (data.production_lot_id) {
        queryClient.invalidateQueries({ queryKey: haccpVerificationKeys.byLot(data.production_lot_id) });
      }
    },
  });
}
