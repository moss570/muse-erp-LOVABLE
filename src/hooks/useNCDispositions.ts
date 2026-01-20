import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Check if disposition requires approval
export function useCheckDispositionApproval(
  disposition: string | null,
  severity: string | null,
  estimatedCost: number | null
) {
  return useQuery({
    queryKey: ['disposition-approval-check', disposition, severity, estimatedCost],
    queryFn: async () => {
      if (!disposition || !severity) return null;

      const { data, error } = await supabase.rpc(
        'check_nc_disposition_approval_required',
        {
          p_disposition: disposition,
          p_severity: severity,
          p_estimated_cost: estimatedCost,
        }
      );

      if (error) throw error;
      return data as {
        requires_approval: boolean;
        requires_justification: boolean;
        approver_role?: string;
        approval_threshold_amount?: number;
        reason?: string;
      };
    },
    enabled: !!disposition && !!severity,
  });
}

// Apply disposition (orchestrates all actions)
export function useApplyDisposition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ncId,
      disposition,
      justification,
      approvedBy,
    }: {
      ncId: string;
      disposition: string;
      justification?: string;
      approvedBy?: string;
    }) => {
      const { data, error } = await supabase.rpc('apply_nc_disposition', {
        p_nc_id: ncId,
        p_disposition: disposition,
        p_justification: justification,
        p_approved_by: approvedBy,
      });

      if (error) throw error;
      return data as {
        success: boolean;
        nc_id: string;
        disposition: string;
        actions_executed: Array<{ action: string; hold_log_id?: string }>;
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['non-conformities'] });
      queryClient.invalidateQueries({ queryKey: ['non-conformity', variables.ncId] });
      queryClient.invalidateQueries({ queryKey: ['nc-disposition-actions', variables.ncId] });
      
      if (data.actions_executed && Array.isArray(data.actions_executed)) {
        queryClient.invalidateQueries({ queryKey: ['receiving-lots'] });
        queryClient.invalidateQueries({ queryKey: ['qa-work-queue'] });
      }

      toast.success('Disposition applied successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply disposition: ${error.message}`);
    },
  });
}

// Get disposition actions for an NC
export function useNCDispositionActions(ncId: string | null) {
  return useQuery({
    queryKey: ['nc-disposition-actions', ncId],
    queryFn: async () => {
      if (!ncId) return [];

      const { data, error } = await supabase
        .from('nc_disposition_actions')
        .select(`
          *,
          executed_by_profile:profiles!nc_disposition_actions_executed_by_fkey(id, first_name, last_name),
          hold_log:receiving_hold_log(id, action, reason)
        `)
        .eq('nc_id', ncId)
        .order('executed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!ncId,
  });
}

// Get disposition rules
export function useDispositionRules() {
  return useQuery({
    queryKey: ['nc-disposition-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nc_disposition_rules')
        .select('*')
        .order('disposition', { ascending: true })
        .order('severity', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}
