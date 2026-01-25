import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PolicyVersion, PolicyVersionFormData } from '@/types/policies';

// Fetch all versions for a policy
export function usePolicyVersions(policyId: string) {
  return useQuery({
    queryKey: ['policy-versions', policyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_versions')
        .select(`
          *,
          created_by_profile:profiles!policy_versions_created_by_fkey(id, first_name, last_name, avatar_url),
          policy:policies(id, policy_number, title, status)
        `)
        .eq('policy_id', policyId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as unknown as PolicyVersion[];
    },
    enabled: !!policyId,
  });
}

// Fetch single version
export function usePolicyVersion(versionId: string) {
  return useQuery({
    queryKey: ['policy-version', versionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_versions')
        .select(`
          *,
          created_by_profile:profiles!policy_versions_created_by_fkey(id, first_name, last_name, avatar_url),
          policy:policies(id, policy_number, title, status)
        `)
        .eq('id', versionId)
        .single();

      if (error) throw error;
      return data as unknown as PolicyVersion;
    },
    enabled: !!versionId,
  });
}

// Fetch current version for a policy
export function useCurrentPolicyVersion(policyId: string) {
  return useQuery({
    queryKey: ['policy-current-version', policyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_versions')
        .select(`
          *,
          created_by_profile:profiles!policy_versions_created_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('policy_id', policyId)
        .eq('version_status', 'current')
        .single();

      if (error) throw error;
      return data as unknown as PolicyVersion;
    },
    enabled: !!policyId,
  });
}

// Fetch version comparison data (two versions side by side)
export function useVersionComparison(versionId1: string, versionId2: string) {
  return useQuery({
    queryKey: ['version-comparison', versionId1, versionId2],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_versions')
        .select('*')
        .in('id', [versionId1, versionId2])
        .order('version_number', { ascending: true });

      if (error) throw error;

      if (data.length !== 2) {
        throw new Error('Both versions must exist for comparison');
      }

      return {
        older: data[0] as unknown as PolicyVersion,
        newer: data[1] as unknown as PolicyVersion,
      };
    },
    enabled: !!versionId1 && !!versionId2,
  });
}

// Create new policy version (snapshot)
export function useCreatePolicyVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionData: PolicyVersionFormData) => {
      // First, mark all previous versions as 'superseded'
      if (versionData.version_status === 'current') {
        const { error: updateError } = await supabase
          .from('policy_versions')
          .update({ version_status: 'superseded' })
          .eq('policy_id', versionData.policy_id)
          .eq('version_status', 'current');

        if (updateError) throw updateError;
      }

      // Create the new version
      const { data, error } = await supabase
        .from('policy_versions')
        .insert([versionData])
        .select(`
          *,
          created_by_profile:profiles!policy_versions_created_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as unknown as PolicyVersion;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-versions', variables.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy', variables.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy-current-version', variables.policy_id] });
      toast.success('Policy version created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create version: ${error.message}`);
    },
  });
}

// Restore an archived version (create new current version from old one)
export function useRestorePolicyVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      versionId,
      userId,
      versionNotes
    }: {
      versionId: string;
      userId: string;
      versionNotes?: string;
    }) => {
      // Fetch the version to restore
      const { data: versionToRestore, error: fetchError } = await supabase
        .from('policy_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (fetchError) throw fetchError;
      if (!versionToRestore) throw new Error('Version not found');

      // Get the current max version number for this policy
      const { data: versions, error: versionsError } = await supabase
        .from('policy_versions')
        .select('version_number')
        .eq('policy_id', versionToRestore.policy_id)
        .order('version_number', { ascending: false })
        .limit(1);

      if (versionsError) throw versionsError;

      const nextVersionNumber = versions && versions.length > 0
        ? versions[0].version_number + 1
        : 1;

      // Mark all current versions as superseded
      const { error: updateError } = await supabase
        .from('policy_versions')
        .update({ version_status: 'superseded' })
        .eq('policy_id', versionToRestore.policy_id)
        .eq('version_status', 'current');

      if (updateError) throw updateError;

      // Create new version from the restored one
      const restoredVersion = {
        policy_id: versionToRestore.policy_id,
        version_number: nextVersionNumber,
        title: versionToRestore.title,
        content_json: versionToRestore.content_json,
        content_html: versionToRestore.content_html,
        content_plain: versionToRestore.content_plain,
        content_word_count: versionToRestore.content_word_count,
        summary: versionToRestore.summary,
        category_id: versionToRestore.category_id,
        policy_type_id: versionToRestore.policy_type_id,
        status: versionToRestore.status,
        effective_date: versionToRestore.effective_date,
        review_date: versionToRestore.review_date,
        owned_by: versionToRestore.owned_by,
        version_status: 'current',
        version_notes: versionNotes || `Restored from version ${versionToRestore.version_number}`,
        created_by: userId,
      };

      const { data, error } = await supabase
        .from('policy_versions')
        .insert([restoredVersion])
        .select(`
          *,
          created_by_profile:profiles!policy_versions_created_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Also update the main policy record
      const { error: policyUpdateError } = await supabase
        .from('policies')
        .update({
          version_number: nextVersionNumber,
          content_json: versionToRestore.content_json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', versionToRestore.policy_id);

      if (policyUpdateError) throw policyUpdateError;

      return data as unknown as PolicyVersion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policy-versions', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy-current-version', data.policy_id] });
      toast.success('Version restored successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore version: ${error.message}`);
    },
  });
}

// Archive a specific version
export function useArchivePolicyVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data, error } = await supabase
        .from('policy_versions')
        .update({ version_status: 'archived' })
        .eq('id', versionId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PolicyVersion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policy-versions', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy-version', data.id] });
      toast.success('Version archived successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive version: ${error.message}`);
    },
  });
}

// Get version history statistics
export function usePolicyVersionStats(policyId: string) {
  return useQuery({
    queryKey: ['policy-version-stats', policyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_versions')
        .select('id, version_status, created_at')
        .eq('policy_id', policyId);

      if (error) throw error;

      const stats = {
        total_versions: data.length,
        current_version: data.filter(v => v.version_status === 'current').length,
        superseded_versions: data.filter(v => v.version_status === 'superseded').length,
        archived_versions: data.filter(v => v.version_status === 'archived').length,
        oldest_version_date: data.length > 0
          ? new Date(Math.min(...data.map(v => new Date(v.created_at).getTime())))
          : null,
        latest_version_date: data.length > 0
          ? new Date(Math.max(...data.map(v => new Date(v.created_at).getTime())))
          : null,
      };

      return stats;
    },
    enabled: !!policyId,
  });
}
