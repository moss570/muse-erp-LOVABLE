import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PolicyCategory } from '@/types/policies';

// Fetch all policy categories
export function usePolicyCategories() {
  return useQuery({
    queryKey: ['policy-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as PolicyCategory[];
    },
  });
}

// Fetch single policy category
export function usePolicyCategory(id: string) {
  return useQuery({
    queryKey: ['policy-category', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as PolicyCategory;
    },
    enabled: !!id,
  });
}

// Fetch hierarchical category tree
export function usePolicyCategoriesTree() {
  return useQuery({
    queryKey: ['policy-categories-tree'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const categories = data as PolicyCategory[];

      // Build tree structure
      const categoryMap = new Map<string, PolicyCategory & { children?: PolicyCategory[] }>();
      const rootCategories: (PolicyCategory & { children?: PolicyCategory[] })[] = [];

      // First pass: create map
      categories.forEach(cat => {
        categoryMap.set(cat.id, { ...cat, children: [] });
      });

      // Second pass: build tree
      categories.forEach(cat => {
        const node = categoryMap.get(cat.id)!;
        if (cat.parent_category_id) {
          const parent = categoryMap.get(cat.parent_category_id);
          if (parent) {
            parent.children!.push(node);
          }
        } else {
          rootCategories.push(node);
        }
      });

      return rootCategories;
    },
  });
}

// Create policy category
export function useCreatePolicyCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: Omit<PolicyCategory, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('policy_categories')
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      return data as PolicyCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-categories'] });
      queryClient.invalidateQueries({ queryKey: ['policy-categories-tree'] });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

// Update policy category
export function useUpdatePolicyCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PolicyCategory> }) => {
      const { data, error } = await supabase
        .from('policy_categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PolicyCategory;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-categories'] });
      queryClient.invalidateQueries({ queryKey: ['policy-categories-tree'] });
      queryClient.invalidateQueries({ queryKey: ['policy-category', variables.id] });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

// Delete policy category
export function useDeletePolicyCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('policy_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-categories'] });
      queryClient.invalidateQueries({ queryKey: ['policy-categories-tree'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}

// Count policies by category
export function usePoliciesByCategory(categoryId: string) {
  return useQuery({
    queryKey: ['policies-count-by-category', categoryId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('policies')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!categoryId,
  });
}
