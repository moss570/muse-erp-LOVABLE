import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PolicyType } from '@/types/policies';

// Fetch all policy types
export function usePolicyTypes() {
  return useQuery({
    queryKey: ['policy-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as PolicyType[];
    },
  });
}

// Fetch single policy type
export function usePolicyType(id: string) {
  return useQuery({
    queryKey: ['policy-type', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as PolicyType;
    },
    enabled: !!id,
  });
}

// Create policy type
export function useCreatePolicyType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policyType: Omit<PolicyType, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('policy_types')
        .insert([policyType])
        .select()
        .single();

      if (error) throw error;
      return data as PolicyType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-types'] });
      toast.success('Policy type created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create policy type: ${error.message}`);
    },
  });
}

// Update policy type
export function useUpdatePolicyType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PolicyType> }) => {
      const { data, error } = await supabase
        .from('policy_types')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PolicyType;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-types'] });
      queryClient.invalidateQueries({ queryKey: ['policy-type', variables.id] });
      toast.success('Policy type updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update policy type: ${error.message}`);
    },
  });
}

// Delete policy type
export function useDeletePolicyType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('policy_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-types'] });
      toast.success('Policy type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete policy type: ${error.message}`);
    },
  });
}

// Count policies by type
export function usePoliciesByType(typeId: string) {
  return useQuery({
    queryKey: ['policies-count-by-type', typeId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('policies')
        .select('*', { count: 'exact', head: true })
        .eq('policy_type_id', typeId)
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!typeId,
  });
}
