import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PolicySQFMapping, PolicySQFMappingFormData, SQFMappingFilters } from '@/types/sqf';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const policySQFMappingKeys = {
  all: ['policy-sqf-mappings'] as const,
  lists: () => [...policySQFMappingKeys.all, 'list'] as const,
  list: (filters: SQFMappingFilters) => [...policySQFMappingKeys.lists(), filters] as const,
  details: () => [...policySQFMappingKeys.all, 'detail'] as const,
  detail: (id: string) => [...policySQFMappingKeys.details(), id] as const,
  byPolicy: (policyId: string) => [...policySQFMappingKeys.all, 'policy', policyId] as const,
  bySQFCode: (codeId: string) => [...policySQFMappingKeys.all, 'sqf-code', codeId] as const,
  gaps: () => [...policySQFMappingKeys.all, 'gaps'] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all policy-SQF mappings with optional filters
 */
export function usePolicySQFMappings(filters?: SQFMappingFilters) {
  return useQuery({
    queryKey: policySQFMappingKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('policy_sqf_mappings')
        .select(`
          *,
          policy:policy_id(id, policy_number, title, status),
          sqf_code:sqf_code_id(*),
          mapper:mapped_by(id, full_name, email),
          verifier:verified_by(id, full_name, email)
        `);

      // Apply filters
      if (filters?.policy_id) {
        query = query.eq('policy_id', filters.policy_id);
      }
      if (filters?.sqf_code_id) {
        query = query.eq('sqf_code_id', filters.sqf_code_id);
      }
      if (filters?.compliance_status) {
        query = query.eq('compliance_status', filters.compliance_status);
      }
      if (filters?.has_gaps !== undefined) {
        query = query.eq('has_gaps', filters.has_gaps);
      }
      if (filters?.gap_severity) {
        query = query.eq('gap_severity', filters.gap_severity);
      }

      query = query.order('mapped_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as PolicySQFMapping[];
    },
  });
}

/**
 * Fetch a single policy-SQF mapping by ID
 */
export function usePolicySQFMapping(id: string | undefined) {
  return useQuery({
    queryKey: policySQFMappingKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Mapping ID is required');

      const { data, error } = await supabase
        .from('policy_sqf_mappings')
        .select(`
          *,
          policy:policy_id(id, policy_number, title, status),
          sqf_code:sqf_code_id(*),
          mapper:mapped_by(id, full_name, email),
          verifier:verified_by(id, full_name, email),
          gap_resolver:gap_resolved_by(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as PolicySQFMapping;
    },
    enabled: !!id,
  });
}

/**
 * Fetch all SQF code mappings for a specific policy
 */
export function usePolicyMappings(policyId: string | undefined) {
  return useQuery({
    queryKey: policySQFMappingKeys.byPolicy(policyId || ''),
    queryFn: async () => {
      if (!policyId) throw new Error('Policy ID is required');

      const { data, error } = await supabase
        .from('policy_sqf_mappings')
        .select(`
          *,
          sqf_code:sqf_code_id(*)
        `)
        .eq('policy_id', policyId)
        .order('sqf_code.code_number', { ascending: true } as any);

      if (error) throw error;
      return data as PolicySQFMapping[];
    },
    enabled: !!policyId,
  });
}

/**
 * Fetch all policy mappings for a specific SQF code
 */
export function useSQFCodeMappings(codeId: string | undefined) {
  return useQuery({
    queryKey: policySQFMappingKeys.bySQFCode(codeId || ''),
    queryFn: async () => {
      if (!codeId) throw new Error('Code ID is required');

      const { data, error } = await supabase
        .from('policy_sqf_mappings')
        .select(`
          *,
          policy:policy_id(id, policy_number, title, status)
        `)
        .eq('sqf_code_id', codeId)
        .order('mapped_at', { ascending: false });

      if (error) throw error;
      return data as PolicySQFMapping[];
    },
    enabled: !!codeId,
  });
}

/**
 * Fetch all mappings with gaps
 */
export function useMappingsWithGaps(severity?: string) {
  return useQuery({
    queryKey: [...policySQFMappingKeys.gaps(), severity],
    queryFn: async () => {
      let query = supabase
        .from('policy_sqf_mappings')
        .select(`
          *,
          policy:policy_id(id, policy_number, title, status),
          sqf_code:sqf_code_id(*)
        `)
        .eq('has_gaps', true)
        .eq('gap_resolved', false);

      if (severity) {
        query = query.eq('gap_severity', severity);
      }

      query = query.order('gap_severity', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as PolicySQFMapping[];
    },
  });
}

/**
 * Fetch compliance statistics for a policy
 */
export function usePolicyComplianceStats(policyId: string | undefined) {
  return useQuery({
    queryKey: [...policySQFMappingKeys.byPolicy(policyId || ''), 'stats'],
    queryFn: async () => {
      if (!policyId) throw new Error('Policy ID is required');

      const { data, error } = await supabase
        .from('policy_sqf_mappings')
        .select('compliance_status, has_gaps, gap_severity')
        .eq('policy_id', policyId);

      if (error) throw error;

      // Calculate statistics
      const total = data.length;
      const compliant = data.filter(m => m.compliance_status === 'Compliant').length;
      const partial = data.filter(m => m.compliance_status === 'Partial').length;
      const nonCompliant = data.filter(m => m.compliance_status === 'Non_Compliant').length;
      const withGaps = data.filter(m => m.has_gaps).length;
      const criticalGaps = data.filter(m => m.gap_severity === 'Critical').length;

      return {
        total,
        compliant,
        partial,
        nonCompliant,
        withGaps,
        criticalGaps,
        compliancePercentage: total > 0 ? Math.round((compliant / total) * 100) : 0,
      };
    },
    enabled: !!policyId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new policy-SQF mapping
 */
export function useCreatePolicySQFMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PolicySQFMappingFormData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: mapping, error } = await supabase
        .from('policy_sqf_mappings')
        .insert({
          ...data,
          mapped_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return mapping as PolicySQFMapping;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.byPolicy(data.policy_id) });
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.bySQFCode(data.sqf_code_id) });
    },
  });
}

/**
 * Update an existing policy-SQF mapping
 */
export function useUpdatePolicySQFMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PolicySQFMappingFormData> }) => {
      const { data, error } = await supabase
        .from('policy_sqf_mappings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PolicySQFMapping;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.byPolicy(data.policy_id) });
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.bySQFCode(data.sqf_code_id) });
    },
  });
}

/**
 * Delete a policy-SQF mapping
 */
export function useDeletePolicySQFMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('policy_sqf_mappings').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.lists() });
    },
  });
}

/**
 * Mark a gap as resolved
 */
export function useResolveGap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('policy_sqf_mappings')
        .update({
          gap_resolved: true,
          gap_resolved_date: new Date().toISOString(),
          gap_resolved_by: user.id,
          verification_notes: notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PolicySQFMapping;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.gaps() });
    },
  });
}

/**
 * Verify compliance for a mapping
 */
export function useVerifyCompliance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('policy_sqf_mappings')
        .update({
          compliance_status: status,
          last_verified_date: new Date().toISOString(),
          verified_by: user.id,
          verification_notes: notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PolicySQFMapping;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.byPolicy(data.policy_id) });
    },
  });
}

/**
 * Bulk create mappings for a policy
 */
export function useBulkCreateMappings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId, codeIds, mappingType }: {
      policyId: string;
      codeIds: string[];
      mappingType: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const mappings = codeIds.map(codeId => ({
        policy_id: policyId,
        sqf_code_id: codeId,
        mapping_type: mappingType,
        compliance_status: 'Partial' as const,
        mapped_by: user.id,
      }));

      const { data, error } = await supabase
        .from('policy_sqf_mappings')
        .insert(mappings)
        .select();

      if (error) throw error;
      return data as PolicySQFMapping[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: policySQFMappingKeys.byPolicy(variables.policyId) });
    },
  });
}
