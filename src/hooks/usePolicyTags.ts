import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PolicyTag } from '@/types/policies';

// Fetch all policy tags
export function usePolicyTags() {
  return useQuery({
    queryKey: ['policy-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as PolicyTag[];
    },
  });
}

// Fetch tags for a specific policy
export function usePolicyTagsForPolicy(policyId: string) {
  return useQuery({
    queryKey: ['policy-tags', policyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_tag_assignments')
        .select('tag_id, policy_tags(*)')
        .eq('policy_id', policyId);

      if (error) throw error;
      return data.map(item => item.policy_tags).filter(Boolean) as PolicyTag[];
    },
    enabled: !!policyId,
  });
}

// Create policy tag
export function useCreatePolicyTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tag: Omit<PolicyTag, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('policy_tags')
        .insert([tag])
        .select()
        .single();

      if (error) throw error;
      return data as PolicyTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-tags'] });
      toast.success('Tag created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create tag: ${error.message}`);
    },
  });
}

// Update policy tag
export function useUpdatePolicyTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PolicyTag> }) => {
      const { data, error } = await supabase
        .from('policy_tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PolicyTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-tags'] });
      toast.success('Tag updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update tag: ${error.message}`);
    },
  });
}

// Delete policy tag
export function useDeletePolicyTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('policy_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-tags'] });
      toast.success('Tag deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete tag: ${error.message}`);
    },
  });
}

// Assign tag to policy
export function useAssignTagToPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId, tagId }: { policyId: string; tagId: string }) => {
      const { error } = await supabase
        .from('policy_tag_assignments')
        .insert([{ policy_id: policyId, tag_id: tagId }]);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-tags', variables.policyId] });
      queryClient.invalidateQueries({ queryKey: ['policy', variables.policyId] });
      toast.success('Tag assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign tag: ${error.message}`);
    },
  });
}

// Remove tag from policy
export function useRemoveTagFromPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId, tagId }: { policyId: string; tagId: string }) => {
      const { error } = await supabase
        .from('policy_tag_assignments')
        .delete()
        .eq('policy_id', policyId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-tags', variables.policyId] });
      queryClient.invalidateQueries({ queryKey: ['policy', variables.policyId] });
      toast.success('Tag removed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove tag: ${error.message}`);
    },
  });
}
