import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CapaTask, CapaTaskType, CapaTaskStatus, RootCauseAnalysis, RcaMethod, FiveWhysEntry, FishboneCategory, CapaApproval, ApprovalStage, ApprovalStatus } from '@/types/capa';
import type { Json } from '@/integrations/supabase/types';

// ============================================
// CAPA TASKS
// ============================================

export function useCapaTasks(capaId: string | undefined) {
  return useQuery({
    queryKey: ['capa-tasks', capaId],
    queryFn: async () => {
      if (!capaId) return [];
      
      const { data, error } = await supabase
        .from('capa_tasks')
        .select(`
          *,
          assigned_to_profile:profiles!capa_tasks_assigned_to_fkey(id, first_name, last_name)
        `)
        .eq('capa_id', capaId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CapaTask[];
    },
    enabled: !!capaId,
  });
}

export function useCreateCapaTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      capa_id: string;
      task_type: CapaTaskType;
      title: string;
      description?: string;
      assigned_to?: string;
      due_date?: string;
      evidence_required?: boolean;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('capa_tasks')
        .insert({
          ...input,
          status: 'pending',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('capa_activity_log').insert({
        capa_id: input.capa_id,
        action: 'updated',
        field_changed: 'task_added',
        new_value: input.title,
        performed_by: user?.id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['capa-tasks', variables.capa_id] });
      queryClient.invalidateQueries({ queryKey: ['capa-activity', variables.capa_id] });
      toast.success('Task created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create task', { description: error.message });
    },
  });
}

export function useUpdateCapaTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, capaId, ...updates }: Partial<CapaTask> & { id: string; capaId: string }) => {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // If completing the task, set completion metadata
      if (updates.status === 'completed') {
        updateData.completed_date = new Date().toISOString().split('T')[0];
        updateData.completed_by = user?.id;
      }

      const { data, error } = await supabase
        .from('capa_tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, capaId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capa-tasks', data.capaId] });
      toast.success('Task updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update task', { description: error.message });
    },
  });
}

export function useDeleteCapaTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, capaId }: { id: string; capaId: string }) => {
      const { error } = await supabase
        .from('capa_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, capaId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capa-tasks', data.capaId] });
      toast.success('Task deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete task', { description: error.message });
    },
  });
}

// ============================================
// ROOT CAUSE ANALYSIS
// ============================================

export function useRootCauseAnalysis(capaId: string | undefined) {
  return useQuery({
    queryKey: ['capa-rca', capaId],
    queryFn: async () => {
      if (!capaId) return null;
      
      const { data, error } = await supabase
        .from('capa_root_cause_analysis')
        .select(`
          *,
          analyzed_by_profile:profiles!capa_root_cause_analysis_analyzed_by_fkey(id, first_name, last_name)
        `)
        .eq('capa_id', capaId)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      // Parse JSONB fields with proper type casting
      return {
        ...data,
        five_whys_data: data.five_whys_data as unknown as FiveWhysEntry[] | null,
        fishbone_data: data.fishbone_data as unknown as { categories: FishboneCategory[] } | null,
      } as RootCauseAnalysis;
    },
    enabled: !!capaId,
  });
}

export function useSaveRootCauseAnalysis() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      capa_id: string;
      method: RcaMethod;
      five_whys_data?: FiveWhysEntry[];
      fishbone_data?: { categories: FishboneCategory[] };
      analysis_summary?: string;
      root_cause_statement?: string;
      contributing_factors?: string[];
    }) => {
      // Check if RCA already exists
      const { data: existing } = await supabase
        .from('capa_root_cause_analysis')
        .select('id')
        .eq('capa_id', input.capa_id)
        .maybeSingle();

      const rcaData = {
        capa_id: input.capa_id,
        method: input.method,
        five_whys_data: input.five_whys_data as unknown as Json || null,
        fishbone_data: input.fishbone_data as unknown as Json || null,
        analysis_summary: input.analysis_summary || null,
        root_cause_statement: input.root_cause_statement || null,
        contributing_factors: input.contributing_factors || null,
        analyzed_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      let data;
      if (existing) {
        const { data: updated, error } = await supabase
          .from('capa_root_cause_analysis')
          .update(rcaData)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        data = updated;
      } else {
        const { data: created, error } = await supabase
          .from('capa_root_cause_analysis')
          .insert({
            ...rcaData,
            analyzed_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        data = created;
      }

      // Log activity
      await supabase.from('capa_activity_log').insert({
        capa_id: input.capa_id,
        action: 'updated',
        field_changed: 'root_cause_analysis',
        new_value: input.method,
        performed_by: user?.id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['capa-rca', variables.capa_id] });
      queryClient.invalidateQueries({ queryKey: ['capa-activity', variables.capa_id] });
      toast.success('Root cause analysis saved');
    },
    onError: (error: Error) => {
      toast.error('Failed to save analysis', { description: error.message });
    },
  });
}

// ============================================
// CAPA APPROVALS
// ============================================

export function useCapaApprovals(capaId: string | undefined) {
  return useQuery({
    queryKey: ['capa-approvals', capaId],
    queryFn: async () => {
      if (!capaId) return [];
      
      const { data, error } = await supabase
        .from('capa_approvals')
        .select(`
          *,
          approved_by_profile:profiles!capa_approvals_approved_by_fkey(id, first_name, last_name),
          requested_by_profile:profiles!capa_approvals_requested_by_fkey(id, first_name, last_name)
        `)
        .eq('capa_id', capaId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data as CapaApproval[];
    },
    enabled: !!capaId,
  });
}

export function useRequestApproval() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      capa_id: string;
      stage: ApprovalStage;
      comments?: string;
    }) => {
      const { data, error } = await supabase
        .from('capa_approvals')
        .insert({
          capa_id: input.capa_id,
          stage: input.stage,
          status: 'pending',
          comments: input.comments || null,
          requested_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('capa_activity_log').insert({
        capa_id: input.capa_id,
        action: 'updated',
        field_changed: 'approval_requested',
        new_value: input.stage,
        performed_by: user?.id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['capa-approvals', variables.capa_id] });
      queryClient.invalidateQueries({ queryKey: ['capa-activity', variables.capa_id] });
      toast.success('Approval requested');
    },
    onError: (error: Error) => {
      toast.error('Failed to request approval', { description: error.message });
    },
  });
}

export function useProcessApproval() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      capa_id: string;
      status: ApprovalStatus;
      comments?: string;
      revision_comments?: string;
    }) => {
      const { data, error } = await supabase
        .from('capa_approvals')
        .update({
          status: input.status,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          comments: input.comments || null,
          revision_comments: input.revision_comments || null,
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('capa_activity_log').insert({
        capa_id: input.capa_id,
        action: 'updated',
        field_changed: 'approval_processed',
        new_value: input.status,
        comment: input.revision_comments || input.comments,
        performed_by: user?.id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['capa-approvals', variables.capa_id] });
      queryClient.invalidateQueries({ queryKey: ['capa-activity', variables.capa_id] });
      toast.success(`Approval ${variables.status}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to process approval', { description: error.message });
    },
  });
}

// ============================================
// PENDING APPROVALS (for work queue)
// ============================================

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['pending-capa-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capa_approvals')
        .select(`
          *,
          capa:corrective_actions(id, capa_number, title, severity, status),
          requested_by_profile:profiles!capa_approvals_requested_by_fkey(id, first_name, last_name)
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
