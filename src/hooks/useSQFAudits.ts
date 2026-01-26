import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  SQFComplianceAudit,
  SQFComplianceAuditFormData,
  SQFAuditFinding,
  SQFAuditFindingFormData,
  SQFAuditFilters,
  SQFFindingFilters,
} from '@/types/sqf';

// ============================================================================
// QUERY KEYS - AUDITS
// ============================================================================

export const sqfAuditKeys = {
  all: ['sqf-audits'] as const,
  lists: () => [...sqfAuditKeys.all, 'list'] as const,
  list: (filters: SQFAuditFilters) => [...sqfAuditKeys.lists(), filters] as const,
  details: () => [...sqfAuditKeys.all, 'detail'] as const,
  detail: (id: string) => [...sqfAuditKeys.details(), id] as const,
  recent: () => [...sqfAuditKeys.all, 'recent'] as const,
};

// ============================================================================
// QUERY KEYS - FINDINGS
// ============================================================================

export const sqfFindingKeys = {
  all: ['sqf-findings'] as const,
  lists: () => [...sqfFindingKeys.all, 'list'] as const,
  list: (filters: SQFFindingFilters) => [...sqfFindingKeys.lists(), filters] as const,
  details: () => [...sqfFindingKeys.all, 'detail'] as const,
  detail: (id: string) => [...sqfFindingKeys.details(), id] as const,
  byAudit: (auditId: string) => [...sqfFindingKeys.all, 'audit', auditId] as const,
  open: () => [...sqfFindingKeys.all, 'open'] as const,
};

// ============================================================================
// AUDIT QUERIES
// ============================================================================

/**
 * Fetch all SQF compliance audits with optional filters
 */
export function useSQFAudits(filters?: SQFAuditFilters) {
  return useQuery({
    queryKey: sqfAuditKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('sqf_compliance_audits')
        .select(`
          *,
          edition:sqf_edition_id(id, edition_name, edition_number),
          creator:created_by(id, full_name, email)
        `);

      // Apply filters
      if (filters?.audit_type) {
        query = query.eq('audit_type', filters.audit_type);
      }
      if (filters?.certification_status) {
        query = query.eq('certification_status', filters.certification_status);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date_from) {
        query = query.gte('audit_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('audit_date', filters.date_to);
      }

      query = query.order('audit_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as SQFComplianceAudit[];
    },
  });
}

/**
 * Fetch a single SQF audit by ID
 */
export function useSQFAudit(id: string | undefined) {
  return useQuery({
    queryKey: sqfAuditKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Audit ID is required');

      const { data, error } = await supabase
        .from('sqf_compliance_audits')
        .select(`
          *,
          edition:sqf_edition_id(id, edition_name, edition_number),
          creator:created_by(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as SQFComplianceAudit;
    },
    enabled: !!id,
  });
}

/**
 * Fetch recent audits (last 12 months)
 */
export function useRecentSQFAudits() {
  return useQuery({
    queryKey: sqfAuditKeys.recent(),
    queryFn: async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data, error } = await supabase
        .from('sqf_compliance_audits')
        .select(`
          *,
          edition:sqf_edition_id(id, edition_name)
        `)
        .gte('audit_date', oneYearAgo.toISOString())
        .order('audit_date', { ascending: false });

      if (error) throw error;
      return data as SQFComplianceAudit[];
    },
  });
}

// ============================================================================
// FINDING QUERIES
// ============================================================================

/**
 * Fetch all audit findings with optional filters
 */
export function useSQFFindings(filters?: SQFFindingFilters) {
  return useQuery({
    queryKey: sqfFindingKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('sqf_audit_findings')
        .select(`
          *,
          audit:audit_id(id, audit_name, audit_number, audit_date),
          sqf_code:sqf_code_id(id, code_number, title),
          ca_responsible:corrective_action_responsible(id, full_name, email),
          verifier:verified_by(id, full_name, email)
        `);

      // Apply filters
      if (filters?.audit_id) {
        query = query.eq('audit_id', filters.audit_id);
      }
      if (filters?.finding_type) {
        query = query.eq('finding_type', filters.finding_type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.sqf_code_id) {
        query = query.eq('sqf_code_id', filters.sqf_code_id);
      }
      if (filters?.responsible_user_id) {
        query = query.eq('corrective_action_responsible', filters.responsible_user_id);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as SQFAuditFinding[];
    },
  });
}

/**
 * Fetch a single finding by ID
 */
export function useSQFFinding(id: string | undefined) {
  return useQuery({
    queryKey: sqfFindingKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Finding ID is required');

      const { data, error } = await supabase
        .from('sqf_audit_findings')
        .select(`
          *,
          audit:audit_id(*),
          sqf_code:sqf_code_id(*),
          ca_responsible:corrective_action_responsible(id, full_name, email),
          pa_responsible:preventive_action_responsible(id, full_name, email),
          verifier:verified_by(id, full_name, email),
          closer:closed_by(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as SQFAuditFinding;
    },
    enabled: !!id,
  });
}

/**
 * Fetch all findings for an audit
 */
export function useAuditFindings(auditId: string | undefined) {
  return useQuery({
    queryKey: sqfFindingKeys.byAudit(auditId || ''),
    queryFn: async () => {
      if (!auditId) throw new Error('Audit ID is required');

      const { data, error } = await supabase
        .from('sqf_audit_findings')
        .select(`
          *,
          sqf_code:sqf_code_id(id, code_number, title),
          ca_responsible:corrective_action_responsible(id, full_name, email)
        `)
        .eq('audit_id', auditId)
        .order('finding_type', { ascending: true });

      if (error) throw error;
      return data as SQFAuditFinding[];
    },
    enabled: !!auditId,
  });
}

/**
 * Fetch all open findings
 */
export function useOpenSQFFindings() {
  return useQuery({
    queryKey: sqfFindingKeys.open(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sqf_audit_findings')
        .select(`
          *,
          audit:audit_id(id, audit_name, audit_date),
          sqf_code:sqf_code_id(id, code_number, title),
          ca_responsible:corrective_action_responsible(id, full_name, email)
        `)
        .neq('status', 'Closed')
        .order('finding_type', { ascending: true })
        .order('corrective_action_due_date', { ascending: true });

      if (error) throw error;
      return data as SQFAuditFinding[];
    },
  });
}

// ============================================================================
// AUDIT MUTATIONS
// ============================================================================

/**
 * Create a new SQF audit
 */
export function useCreateSQFAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SQFComplianceAuditFormData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: audit, error } = await supabase
        .from('sqf_compliance_audits')
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return audit as SQFComplianceAudit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sqfAuditKeys.lists() });
    },
  });
}

/**
 * Update an existing SQF audit
 */
export function useUpdateSQFAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SQFComplianceAuditFormData> }) => {
      const { data, error } = await supabase
        .from('sqf_compliance_audits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SQFComplianceAudit;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sqfAuditKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfAuditKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete an SQF audit
 */
export function useDeleteSQFAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sqf_compliance_audits').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sqfAuditKeys.lists() });
    },
  });
}

// ============================================================================
// FINDING MUTATIONS
// ============================================================================

/**
 * Create a new audit finding
 */
export function useCreateSQFFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SQFAuditFindingFormData) => {
      const { data: finding, error } = await supabase
        .from('sqf_audit_findings')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      // Update audit totals
      await supabase.rpc('increment_audit_finding_count', {
        audit_id: data.audit_id,
        finding_type: data.finding_type,
      });

      return finding as SQFAuditFinding;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.byAudit(data.audit_id) });
      queryClient.invalidateQueries({ queryKey: sqfAuditKeys.detail(data.audit_id) });
    },
  });
}

/**
 * Update an existing finding
 */
export function useUpdateSQFFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SQFAuditFindingFormData> }) => {
      const { data, error } = await supabase
        .from('sqf_audit_findings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SQFAuditFinding;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.byAudit(data.audit_id) });
    },
  });
}

/**
 * Close a finding
 */
export function useCloseSQFFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('sqf_audit_findings')
        .update({
          status: 'Closed',
          closed_date: new Date().toISOString(),
          closed_by: user.id,
          verification_notes: notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SQFAuditFinding;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.open() });
      queryClient.invalidateQueries({ queryKey: sqfAuditKeys.detail(data.audit_id) });
    },
  });
}

/**
 * Verify a finding
 */
export function useVerifySQFFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, method, notes }: { id: string; method: string; notes?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('sqf_audit_findings')
        .update({
          verified: true,
          verified_date: new Date().toISOString(),
          verified_by: user.id,
          verification_method: method,
          verification_notes: notes,
          status: 'Pending_Verification',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SQFAuditFinding;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete a finding
 */
export function useDeleteSQFFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sqf_audit_findings').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfFindingKeys.open() });
    },
  });
}
