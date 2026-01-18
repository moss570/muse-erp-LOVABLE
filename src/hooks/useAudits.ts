import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Audit, AuditFinding } from '@/types/audits';

// ============================================
// AUDITS
// ============================================

export function useAudits(filters?: {
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ['audits', filters],
    queryFn: async () => {
      let query = supabase
        .from('audits')
        .select(`
          *,
          lead_auditor:profiles!audits_lead_auditor_id_fkey(id, first_name, last_name)
        `)
        .order('audit_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('audit_type', filters.type);
      }
      if (filters?.dateFrom) {
        query = query.gte('audit_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('audit_date', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Audit[];
    },
  });
}

export function useAudit(auditId: string | undefined) {
  return useQuery({
    queryKey: ['audit', auditId],
    queryFn: async () => {
      if (!auditId) return null;

      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          lead_auditor:profiles!audits_lead_auditor_id_fkey(id, first_name, last_name)
        `)
        .eq('id', auditId)
        .single();

      if (error) throw error;
      return data as Audit;
    },
    enabled: !!auditId,
  });
}

export function useCreateAudit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<Audit>) => {
      // Generate audit number
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('audits')
        .select('*', { count: 'exact', head: true })
        .like('audit_number', `AUD-${year}-%`);

      const auditNumber = `AUD-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('audits')
        .insert({
          title: input.title || 'Untitled Audit',
          audit_type: input.audit_type || 'internal',
          audit_date: input.audit_date || new Date().toISOString().split('T')[0],
          audit_end_date: input.audit_end_date,
          audit_scope: input.audit_scope,
          description: input.description,
          auditor_type: input.auditor_type,
          auditor_name: input.auditor_name,
          auditor_organization: input.auditor_organization,
          lead_auditor_id: input.lead_auditor_id,
          audit_number: auditNumber,
          status: 'scheduled',
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      toast.success('Audit scheduled successfully');
    },
    onError: (error) => {
      console.error('Failed to create audit:', error);
      toast.error('Failed to schedule audit');
    },
  });
}

export function useUpdateAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Audit>) => {
      const { data, error } = await supabase
        .from('audits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['audit', data.id] });
      toast.success('Audit updated');
    },
    onError: (error) => {
      console.error('Failed to update audit:', error);
      toast.error('Failed to update audit');
    },
  });
}

// ============================================
// AUDIT FINDINGS
// ============================================

export function useAuditFindings(auditId: string | undefined) {
  return useQuery({
    queryKey: ['audit-findings', auditId],
    queryFn: async () => {
      if (!auditId) return [];

      const { data, error } = await supabase
        .from('audit_findings')
        .select(`
          *,
          capa:corrective_actions(id, capa_number, status),
          assigned_to_profile:profiles!audit_findings_assigned_to_fkey(id, first_name, last_name)
        `)
        .eq('audit_id', auditId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as AuditFinding[];
    },
    enabled: !!auditId,
  });
}

export function useFinding(findingId: string | undefined) {
  return useQuery({
    queryKey: ['audit-finding', findingId],
    queryFn: async () => {
      if (!findingId) return null;

      const { data, error } = await supabase
        .from('audit_findings')
        .select(`
          *,
          capa:corrective_actions(id, capa_number, status),
          assigned_to_profile:profiles!audit_findings_assigned_to_fkey(id, first_name, last_name)
        `)
        .eq('id', findingId)
        .single();

      if (error) throw error;
      return data as AuditFinding;
    },
    enabled: !!findingId,
  });
}

export function useCreateFinding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<AuditFinding> & { audit_id: string }) => {
      // Get audit to generate finding number
      const { data: audit } = await supabase
        .from('audits')
        .select('audit_number, total_findings')
        .eq('id', input.audit_id)
        .single();

      const auditData = audit as any;
      const findingNumber = `${auditData?.audit_number}-F${String((auditData?.total_findings || 0) + 1).padStart(2, '0')}`;

      // Determine if CAPA is required
      const capaRequired = input.finding_type === 'non_conformance' && 
        (input.severity === 'critical' || input.severity === 'major');

      const { data, error } = await supabase
        .from('audit_findings')
        .insert({
          audit_id: input.audit_id,
          finding_type: input.finding_type || 'non_conformance',
          category: input.category || 'other',
          title: input.title || 'Untitled Finding',
          description: input.description || '',
          severity: input.severity,
          evidence: input.evidence,
          requirement: input.requirement,
          location: input.location,
          assigned_to: input.assigned_to,
          finding_number: findingNumber,
          status: 'open',
          capa_required: capaRequired,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update audit finding counts
      await updateAuditFindingCounts(input.audit_id);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit-findings', data.audit_id] });
      queryClient.invalidateQueries({ queryKey: ['audit', data.audit_id] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      toast.success('Finding added');
    },
    onError: (error) => {
      console.error('Failed to create finding:', error);
      toast.error('Failed to add finding');
    },
  });
}

export function useUpdateFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<AuditFinding>) => {
      const { data, error } = await supabase
        .from('audit_findings')
        .update(updates)
        .eq('id', id)
        .select('*, audit_id')
        .single();

      if (error) throw error;

      // Update audit finding counts if severity changed
      if (updates.severity || updates.finding_type) {
        await updateAuditFindingCounts(data.audit_id);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit-findings', data.audit_id] });
      queryClient.invalidateQueries({ queryKey: ['audit-finding', data.id] });
      queryClient.invalidateQueries({ queryKey: ['audit', data.audit_id] });
    },
    onError: (error) => {
      console.error('Failed to update finding:', error);
      toast.error('Failed to update finding');
    },
  });
}

export function useCreateCapaFromFinding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ findingId }: { findingId: string }) => {
      // Get finding details
      const { data: finding, error: fetchError } = await supabase
        .from('audit_findings')
        .select('*, audit:audits(audit_number, title)')
        .eq('id', findingId)
        .single();

      if (fetchError) throw fetchError;

      // Generate CAPA number
      const { data: capaNumber } = await supabase.rpc('generate_capa_number');

      // Create CAPA
      const { data: capa, error: capaError } = await supabase
        .from('corrective_actions')
        .insert({
          capa_number: capaNumber || `CAPA-${Date.now()}`,
          capa_type: 'audit',
          title: `Audit Finding: ${finding.finding_number}`,
          description: finding.description,
          severity: finding.severity || 'major',
          source_type: 'audit_finding',
          source_id: findingId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (capaError) throw capaError;

      // Link CAPA to finding
      await supabase
        .from('audit_findings')
        .update({ capa_id: capa.id, capa_required: true })
        .eq('id', findingId);

      return capa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-findings'] });
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      toast.success('CAPA created from finding');
    },
    onError: (error) => {
      console.error('Failed to create CAPA:', error);
      toast.error('Failed to create CAPA');
    },
  });
}

// Helper to update audit finding counts
async function updateAuditFindingCounts(auditId: string) {
  const { data: findings } = await supabase
    .from('audit_findings')
    .select('finding_type, severity')
    .eq('audit_id', auditId);

  if (!findings) return;

  const counts = {
    total_findings: findings.length,
    critical_findings: findings.filter(f => f.finding_type === 'non_conformance' && f.severity === 'critical').length,
    major_findings: findings.filter(f => f.finding_type === 'non_conformance' && f.severity === 'major').length,
    minor_findings: findings.filter(f => f.finding_type === 'non_conformance' && f.severity === 'minor').length,
    observations: findings.filter(f => f.finding_type === 'observation').length,
  };

  await supabase
    .from('audits')
    .update(counts)
    .eq('id', auditId);
}
