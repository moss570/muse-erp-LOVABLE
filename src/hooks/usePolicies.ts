import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Policy {
  id: string;
  policy_number: string;
  title: string;
  content: string | null;
  summary: string | null;
  category_id: string | null;
  type_id: string | null;
  status: "draft" | "review" | "approved" | "archived" | "superseded";
  version: number;
  effective_date: string | null;
  review_date: string | null;
  expiry_date: string | null;
  owner_id: string | null;
  reviewer_id: string | null;
  approver_id: string | null;
  approved_at: string | null;
  approved_by: string | null;
  department_id: string | null;
  requires_acknowledgement: boolean;
  acknowledgement_frequency_days: number | null;
  supersedes_id: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined relations
  category?: PolicyCategory | null;
  type?: PolicyType | null;
  owner?: { id: string; name: string } | null; // Now references job_positions (role/position)
  department?: { id: string; name: string } | null;
  tags?: PolicyTag[];
}

export interface PolicyCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PolicyType {
  id: string;
  name: string;
  description: string | null;
  code_prefix: string;
  number_format: string;
  next_sequence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PolicyTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface PolicyFilters {
  status?: string;
  category_id?: string;
  type_id?: string;
  department_id?: string;
  search?: string;
}

export function usePolicies(filters?: PolicyFilters) {
  return useQuery({
    queryKey: ["policies", filters],
    queryFn: async () => {
      let query = supabase
        .from("policies")
        .select(`
          *,
          category:policy_categories(*),
          type:policy_types(*),
          owner:job_positions!policies_owner_id_fkey(id, name),
          department:departments(id, name)
        `)
        .order("updated_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.category_id) {
        query = query.eq("category_id", filters.category_id);
      }
      if (filters?.type_id) {
        query = query.eq("type_id", filters.type_id);
      }
      if (filters?.department_id) {
        query = query.eq("department_id", filters.department_id);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,policy_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Policy[];
    },
  });
}

export function usePolicy(id: string | undefined) {
  return useQuery({
    queryKey: ["policy", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("policies")
        .select(`
          *,
          category:policy_categories(*),
          type:policy_types(*),
          owner:job_positions!policies_owner_id_fkey(id, name),
          approver:profiles!policies_approver_id_fkey(id, first_name, last_name),
          department:departments(id, name)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Policy;
    },
    enabled: !!id,
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (policy: Partial<Policy>) => {
      const { data: user } = await supabase.auth.getUser();
      const insertData = {
        ...policy,
        created_by: user.user?.id,
      };
      const { data, error } = await supabase
        .from("policies")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create policy: ${error.message}`);
    },
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Policy> & { id: string }) => {
      const { data, error } = await supabase
        .from("policies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", data.id] });
      toast.success("Policy updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update policy: ${error.message}`);
    },
  });
}

/**
 * Updates a policy while automatically creating a version snapshot of the current state.
 * This ensures edit history is preserved with every save.
 */
export function useUpdatePolicyWithVersion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      changeNotes,
      ...updates 
    }: Partial<Policy> & { id: string; changeNotes?: string }) => {
      // Get the current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      // Fetch current policy state before updating
      const { data: currentPolicy, error: fetchError } = await supabase
        .from("policies")
        .select("*")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentVersion = currentPolicy.version || 1;
      const newVersion = currentVersion + 1;
      
      // Create a version snapshot of the current state BEFORE applying updates
      const { error: versionError } = await supabase
        .from("policy_versions")
        .insert({
          policy_id: id,
          version_number: currentVersion,
          title: currentPolicy.title,
          content: currentPolicy.content,
          summary: currentPolicy.summary,
          status: currentPolicy.status,
          effective_date: currentPolicy.effective_date,
          change_notes: changeNotes || `Updated on ${new Date().toLocaleDateString()}`,
          snapshot: currentPolicy,
          created_by: userId,
        } as any);
      
      if (versionError) {
        console.error("Failed to create version snapshot:", versionError);
        // Continue with update even if version creation fails
      }
      
      // Now apply the updates with incremented version number
      const { data, error } = await supabase
        .from("policies")
        .update({ ...updates, version: newVersion })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", data.id] });
      queryClient.invalidateQueries({ queryKey: ["policy-versions", data.id] });
      toast.success("Policy updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update policy: ${error.message}`);
    },
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("policies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete policy: ${error.message}`);
    },
  });
}

export function useArchivePolicy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("policies")
        .update({ status: "archived" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", data.id] });
      toast.success("Policy archived successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive policy: ${error.message}`);
    },
  });
}

// Policy Categories
export function usePolicyCategories() {
  return useQuery({
    queryKey: ["policy-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as PolicyCategory[];
    },
  });
}

export function useCreatePolicyCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Partial<PolicyCategory>) => {
      const { data: user } = await supabase.auth.getUser();
      const insertData = { ...category, created_by: user.user?.id };
      const { data, error } = await supabase
        .from("policy_categories")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-categories"] });
      toast.success("Category created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

export function useUpdatePolicyCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PolicyCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from("policy_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-categories"] });
      toast.success("Category updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

export function useDeletePolicyCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("policy_categories")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}

// Policy Types
export function usePolicyTypes() {
  return useQuery({
    queryKey: ["policy-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_types")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as PolicyType[];
    },
  });
}

export function useCreatePolicyType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (type: Partial<PolicyType>) => {
      const { data: user } = await supabase.auth.getUser();
      const insertData = { ...type, created_by: user.user?.id };
      const { data, error } = await supabase
        .from("policy_types")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-types"] });
      toast.success("Type created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create type: ${error.message}`);
    },
  });
}

export function useUpdatePolicyType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PolicyType> & { id: string }) => {
      const { data, error } = await supabase
        .from("policy_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-types"] });
      toast.success("Type updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update type: ${error.message}`);
    },
  });
}

// Policy Tags
export function usePolicyTags() {
  return useQuery({
    queryKey: ["policy-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_tags")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as PolicyTag[];
    },
  });
}

export function useCreatePolicyTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tag: Partial<PolicyTag>) => {
      const { data: user } = await supabase.auth.getUser();
      const insertData = { ...tag, created_by: user.user?.id };
      const { data, error } = await supabase
        .from("policy_tags")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-tags"] });
      toast.success("Tag created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create tag: ${error.message}`);
    },
  });
}

// Generate Policy Number
export function useGeneratePolicyNumber(typeId: string | undefined) {
  return useQuery({
    queryKey: ["policy-number", typeId],
    queryFn: async () => {
      if (!typeId) return null;
      
      const { data: type, error } = await supabase
        .from("policy_types")
        .select("code_prefix, number_format, next_sequence")
        .eq("id", typeId)
        .single();
      
      if (error) throw error;
      
      const year = new Date().getFullYear();
      const seq = String(type.next_sequence).padStart(4, "0");
      
      let number = type.number_format
        .replace("{PREFIX}", type.code_prefix)
        .replace("{YEAR}", String(year))
        .replace(/\{SEQ:\d+\}/, seq);
      
      return number;
    },
    enabled: !!typeId,
  });
}
