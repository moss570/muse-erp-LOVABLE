import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Policy, PolicyFilters, PolicyFormData } from '@/types/policies';

// Fetch policies with optional filters
export function usePolicies(filters?: PolicyFilters) {
  return useQuery({
    queryKey: ['policies', filters],
    queryFn: async () => {
      let query = supabase
        .from('policies')
        .select(`
          *,
          category:policy_categories(*),
          policy_type:policy_types(*),
          created_by_profile:profiles!policies_created_by_fkey(id, first_name, last_name),
          owned_by_profile:profiles!policies_owned_by_fkey(id, first_name, last_name),
          approved_by_profile:profiles!policies_approved_by_fkey(id, first_name, last_name)
        `)
        .order('updated_at', { ascending: false });

      // Apply filters
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters?.policy_type_id) {
        query = query.eq('policy_type_id', filters.policy_type_id);
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.owned_by) {
        query = query.eq('owned_by', filters.owned_by);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.review_due_soon) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query = query.lte('review_date', thirtyDaysFromNow.toISOString());
      }

      // Text search using full-text search
      if (filters?.search) {
        query = query.textSearch('search_vector', filters.search, {
          type: 'websearch',
          config: 'english'
        });
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as Policy[];
    },
  });
}

// Fetch single policy with all relations
export function usePolicy(id: string) {
  return useQuery({
    queryKey: ['policy', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policies')
        .select(`
          *,
          category:policy_categories(*),
          policy_type:policy_types(*),
          created_by_profile:profiles!policies_created_by_fkey(id, first_name, last_name, avatar_url),
          owned_by_profile:profiles!policies_owned_by_fkey(id, first_name, last_name, avatar_url),
          approved_by_profile:profiles!policies_approved_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch aggregated counts
      const [ackCount, commentsCount, sqfCount] = await Promise.all([
        supabase
          .from('policy_acknowledgements')
          .select('*', { count: 'exact', head: true })
          .eq('policy_id', id)
          .eq('is_current', true),
        supabase
          .from('policy_comments')
          .select('*', { count: 'exact', head: true })
          .eq('policy_id', id)
          .eq('is_resolved', false),
        supabase
          .from('policy_sqf_mappings')
          .select('*', { count: 'exact', head: true })
          .eq('policy_id', id)
          .eq('is_current', true),
      ]);

      return {
        ...data,
        acknowledgement_count: ackCount.count || 0,
        open_comments_count: commentsCount.count || 0,
        sqf_codes_mapped_count: sqfCount.count || 0,
      } as Policy;
    },
    enabled: !!id,
  });
}

// Fetch active policies (from view)
export function useActivePolicies() {
  return useQuery({
    queryKey: ['active-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('active_policies_view')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Policy[];
    },
  });
}

// Fetch policies requiring review
export function usePoliciesRequiringReview() {
  return useQuery({
    queryKey: ['policies-requiring-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policies_requiring_review')
        .select('*')
        .order('review_date', { ascending: true });

      if (error) throw error;
      return data as unknown as (Policy & { review_status: string })[];
    },
  });
}

// Fetch my policies (created or owned by current user)
export function useMyPolicies(userId: string) {
  return useQuery({
    queryKey: ['my-policies', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policies')
        .select(`
          *,
          category:policy_categories(*),
          policy_type:policy_types(*)
        `)
        .or(`created_by.eq.${userId},owned_by.eq.${userId}`)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Policy[];
    },
    enabled: !!userId,
  });
}

// Create policy
export function useCreatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policy: PolicyFormData) => {
      const { data, error } = await supabase
        .from('policies')
        .insert([{
          ...policy,
          version_number: 1,
          version_status: 'current',
        }])
        .select(`
          *,
          category:policy_categories(*),
          policy_type:policy_types(*)
        `)
        .single();

      if (error) throw error;
      return data as unknown as Policy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['active-policies'] });
      toast.success('Policy created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create policy: ${error.message}`);
    },
  });
}

// Update policy
export function useUpdatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PolicyFormData> }) => {
      const { data, error } = await supabase
        .from('policies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(`
          *,
          category:policy_categories(*),
          policy_type:policy_types(*)
        `)
        .single();

      if (error) throw error;
      return data as unknown as Policy;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['active-policies'] });
      toast.success('Policy updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update policy: ${error.message}`);
    },
  });
}

// Delete policy (soft delete - set is_active to false)
export function useDeletePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('policies')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['active-policies'] });
      toast.success('Policy deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete policy: ${error.message}`);
    },
  });
}

// Publish policy
export function usePublishPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('policies')
        .update({
          is_published: true,
          status: 'Approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Policy;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy', id] });
      queryClient.invalidateQueries({ queryKey: ['active-policies'] });
      toast.success('Policy published successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to publish policy: ${error.message}`);
    },
  });
}

// Archive policy
export function useArchivePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('policies')
        .update({
          status: 'Archived',
          version_status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Policy;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy', id] });
      queryClient.invalidateQueries({ queryKey: ['active-policies'] });
      toast.success('Policy archived successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive policy: ${error.message}`);
    },
  });
}

// Generate policy number
export async function generatePolicyNumber(
  typeAbbrev: string,
  categoryCode: string,
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `${typeAbbrev}-${year}-${categoryCode}`;

  const { data, error } = await supabase
    .from('policies')
    .select('policy_number')
    .ilike('policy_number', `${prefix}-%`)
    .order('policy_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextSeq = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].policy_number;
    const parts = lastNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}-${String(nextSeq).padStart(3, '0')}`;
}
