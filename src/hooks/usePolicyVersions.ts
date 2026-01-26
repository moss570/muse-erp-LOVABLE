import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface PolicyVersion {
  id: string;
  policy_id: string;
  version_number: number;
  title: string;
  content: string | null;
  summary: string | null;
  change_notes: string | null;
  snapshot: Json | null;
  status: string;
  effective_date: string | null;
  created_at: string;
  created_by: string | null;
  creator?: { id: string; first_name: string; last_name: string } | null;
}

export function usePolicyVersions(policyId: string | undefined) {
  return useQuery({
    queryKey: ["policy-versions", policyId],
    queryFn: async () => {
      if (!policyId) return [];
      const { data, error } = await supabase
        .from("policy_versions")
        .select(`
          *,
          creator:profiles!policy_versions_created_by_fkey(id, first_name, last_name)
        `)
        .eq("policy_id", policyId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data as PolicyVersion[];
    },
    enabled: !!policyId,
  });
}

export function usePolicyVersion(versionId: string | undefined) {
  return useQuery({
    queryKey: ["policy-version", versionId],
    queryFn: async () => {
      if (!versionId) return null;
      const { data, error } = await supabase
        .from("policy_versions")
        .select(`
          *,
          creator:profiles!policy_versions_created_by_fkey(id, first_name, last_name)
        `)
        .eq("id", versionId)
        .single();
      if (error) throw error;
      return data as PolicyVersion;
    },
    enabled: !!versionId,
  });
}

export function useCreatePolicyVersion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (version: Partial<PolicyVersion>) => {
      const { data: user } = await supabase.auth.getUser();
      const insertData = { ...version, created_by: user.user?.id };
      const { data, error } = await supabase
        .from("policy_versions")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["policy-versions", data.policy_id] });
      toast.success("Version created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create version: ${error.message}`);
    },
  });
}

export function useRestorePolicyVersion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ policyId, versionId }: { policyId: string; versionId: string }) => {
      // Get the version to restore
      const { data: version, error: versionError } = await supabase
        .from("policy_versions")
        .select("*")
        .eq("id", versionId)
        .single();
      
      if (versionError) throw versionError;
      
      // Get current policy for creating a new version
      const { data: currentPolicy, error: policyError } = await supabase
        .from("policies")
        .select("*")
        .eq("id", policyId)
        .single();
      
      if (policyError) throw policyError;
      
      // Create a new version with current state before restoring
      const { data: user } = await supabase.auth.getUser();
      const newVersionNumber = currentPolicy.version + 1;
      
      await supabase
        .from("policy_versions")
        .insert({
          policy_id: policyId,
          version_number: currentPolicy.version,
          title: currentPolicy.title,
          content: currentPolicy.content,
          summary: currentPolicy.summary,
          status: currentPolicy.status,
          effective_date: currentPolicy.effective_date,
          change_notes: `Restored from version ${version.version_number}`,
          snapshot: currentPolicy as unknown as Json,
          created_by: user.user?.id,
        });
      
      // Update the policy with the restored version's content
      const { data, error } = await supabase
        .from("policies")
        .update({
          title: version.title,
          content: version.content,
          summary: version.summary,
          version: newVersionNumber,
        })
        .eq("id", policyId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", data.id] });
      queryClient.invalidateQueries({ queryKey: ["policy-versions", data.id] });
      toast.success("Policy restored to previous version");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore version: ${error.message}`);
    },
  });
}
