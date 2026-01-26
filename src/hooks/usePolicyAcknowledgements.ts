import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PolicyAcknowledgement {
  id: string;
  policy_id: string;
  employee_id: string;
  policy_version: number;
  acknowledged_at: string;
  signature_data: string | null;
  ip_address: string | null;
  notes: string | null;
  expires_at: string | null;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_number: string;
    department?: { id: string; name: string } | null;
  } | null;
}

export interface AcknowledgementStats {
  total_required: number;
  total_acknowledged: number;
  percentage: number;
}

export function usePolicyAcknowledgements(policyId: string | undefined) {
  return useQuery({
    queryKey: ["policy-acknowledgements", policyId],
    queryFn: async () => {
      if (!policyId) return [];
      const { data, error } = await supabase
        .from("policy_acknowledgements")
        .select(`
          *,
          employee:employees(
            id, 
            first_name, 
            last_name, 
            employee_number,
            department:departments(id, name)
          )
        `)
        .eq("policy_id", policyId)
        .order("acknowledged_at", { ascending: false });
      if (error) throw error;
      return data as PolicyAcknowledgement[];
    },
    enabled: !!policyId,
  });
}

export function useAcknowledgePolicy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      policyId,
      employeeId,
      policyVersion,
      signatureData,
      notes,
      expiresAt,
    }: {
      policyId: string;
      employeeId: string;
      policyVersion: number;
      signatureData?: string;
      notes?: string;
      expiresAt?: string;
    }) => {
      const { data, error } = await supabase
        .from("policy_acknowledgements")
        .insert({
          policy_id: policyId,
          employee_id: employeeId,
          policy_version: policyVersion,
          signature_data: signatureData,
          notes,
          expires_at: expiresAt,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["policy-acknowledgements", data.policy_id] });
      toast.success("Policy acknowledged successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to acknowledge policy: ${error.message}`);
    },
  });
}

export function usePolicyAcknowledgementStats(policyId: string | undefined) {
  return useQuery({
    queryKey: ["policy-acknowledgement-stats", policyId],
    queryFn: async () => {
      if (!policyId) return null;
      
      // Get policy to check if acknowledgement is required
      const { data: policy } = await supabase
        .from("policies")
        .select("requires_acknowledgement, version, department_id")
        .eq("id", policyId)
        .single();
      
      if (!policy?.requires_acknowledgement) {
        return { total_required: 0, total_acknowledged: 0, percentage: 100 };
      }
      
      // Get total active employees (optionally filtered by department)
      let employeeQuery = supabase
        .from("employees")
        .select("id", { count: "exact" })
        .eq("employment_status", "active");
      
      if (policy.department_id) {
        employeeQuery = employeeQuery.eq("department_id", policy.department_id);
      }
      
      const { count: totalEmployees } = await employeeQuery;
      
      // Get acknowledged count for current version
      const { count: acknowledged } = await supabase
        .from("policy_acknowledgements")
        .select("id", { count: "exact" })
        .eq("policy_id", policyId)
        .eq("policy_version", policy.version);
      
      const total = totalEmployees || 0;
      const ack = acknowledged || 0;
      
      return {
        total_required: total,
        total_acknowledged: ack,
        percentage: total > 0 ? Math.round((ack / total) * 100) : 0,
      } as AcknowledgementStats;
    },
    enabled: !!policyId,
  });
}

export function useMyPendingAcknowledgements() {
  return useQuery({
    queryKey: ["my-pending-acknowledgements"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      
      // Get employee record for current user
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("profile_id", user.user.id)
        .single();
      
      if (!employee) return [];
      
      // Get policies requiring acknowledgement that haven't been acknowledged
      const { data: policies } = await supabase
        .from("policies")
        .select(`
          *,
          category:policy_categories(*)
        `)
        .eq("requires_acknowledgement", true)
        .eq("status", "approved");
      
      if (!policies) return [];
      
      // Filter out already acknowledged policies
      const pendingPolicies = [];
      for (const policy of policies) {
        const { data: ack } = await supabase
          .from("policy_acknowledgements")
          .select("id")
          .eq("policy_id", policy.id)
          .eq("employee_id", employee.id)
          .eq("policy_version", policy.version)
          .single();
        
        if (!ack) {
          pendingPolicies.push(policy);
        }
      }
      
      return pendingPolicies;
    },
  });
}
