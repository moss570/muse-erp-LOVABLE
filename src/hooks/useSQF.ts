import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// SQF Editions - use database types directly
export function useSQFEditions() {
  return useQuery({
    queryKey: ["sqf-editions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sqf_editions")
        .select("*")
        .order("effective_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCurrentSQFEdition() {
  return useQuery({
    queryKey: ["sqf-editions", "current"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sqf_editions")
        .select("*")
        .eq("is_active", true)
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSQFEdition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (edition: {
      name: string;
      version?: string;
      edition_date?: string;
      effective_date?: string;
      is_active?: boolean;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("sqf_editions")
        .insert({ ...edition, created_by: user.user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sqf-editions"] });
      toast.success("SQF Edition created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create SQF Edition: ${error.message}`);
    },
  });
}

// SQF Codes
export function useSQFCodes(editionId?: string) {
  return useQuery({
    queryKey: ["sqf-codes", editionId],
    queryFn: async () => {
      let query = supabase
        .from("sqf_codes")
        .select(`*`)
        .order("code_number", { ascending: true });
      
      if (editionId) {
        query = query.eq("edition_id", editionId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSQFCode(id: string | undefined) {
  return useQuery({
    queryKey: ["sqf-code", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("sqf_codes")
        .select(`*`)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSQFCode() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (code: {
      edition_id: string;
      code_number: string;
      title: string;
      category?: string;
      requirement_text?: string;
      is_mandatory?: boolean;
      guidance_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("sqf_codes")
        .insert(code)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sqf-codes"] });
      toast.success("SQF Code created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create SQF Code: ${error.message}`);
    },
  });
}

export function useUpdateSQFCode() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("sqf_codes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sqf-codes"] });
      toast.success("SQF Code updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update SQF Code: ${error.message}`);
    },
  });
}

// Policy SQF Mappings
export function usePolicySQFMappings(policyId?: string) {
  return useQuery({
    queryKey: ["policy-sqf-mappings", policyId],
    queryFn: async () => {
      let query = supabase
        .from("policy_sqf_mappings")
        .select(`*, sqf_code:sqf_codes(*)`)
        .order("created_at", { ascending: false });
      
      if (policyId) {
        query = query.eq("policy_id", policyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePolicySQFMapping() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (mapping: {
      policy_id: string;
      sqf_code_id: string;
      compliance_status?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("policy_sqf_mappings")
        .insert({ ...mapping, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-sqf-mappings"] });
      toast.success("SQF mapping created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create SQF mapping: ${error.message}`);
    },
  });
}

export function useUpdatePolicySQFMapping() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("policy_sqf_mappings")
        .update({ ...updates, reviewed_by: user.user?.id, last_reviewed_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-sqf-mappings"] });
      toast.success("SQF mapping updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update SQF mapping: ${error.message}`);
    },
  });
}

export function useDeletePolicySQFMapping() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("policy_sqf_mappings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-sqf-mappings"] });
      toast.success("SQF mapping deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete SQF mapping: ${error.message}`);
    },
  });
}

// SQF Compliance Audits
export function useSQFComplianceAudits() {
  return useQuery({
    queryKey: ["sqf-compliance-audits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sqf_compliance_audits")
        .select(`*`)
        .order("audit_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSQFComplianceAudit(id: string | undefined) {
  return useQuery({
    queryKey: ["sqf-compliance-audit", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("sqf_compliance_audits")
        .select(`*`)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSQFComplianceAudit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (audit: {
      audit_number: string;
      audit_type: string;
      audit_date: string;
      edition_id?: string;
      auditor_name?: string;
      auditor_organization?: string;
      scope?: string;
      status?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("sqf_compliance_audits")
        .insert({ ...audit, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sqf-compliance-audits"] });
      toast.success("SQF Audit created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create SQF Audit: ${error.message}`);
    },
  });
}

export function useUpdateSQFComplianceAudit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("sqf_compliance_audits")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sqf-compliance-audits"] });
      queryClient.invalidateQueries({ queryKey: ["sqf-compliance-audit", data.id] });
      toast.success("SQF Audit updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update SQF Audit: ${error.message}`);
    },
  });
}

// SQF Audit Findings
export function useSQFAuditFindings(auditId?: string) {
  return useQuery({
    queryKey: ["sqf-audit-findings", auditId],
    queryFn: async () => {
      let query = supabase
        .from("sqf_audit_findings")
        .select(`*, sqf_code:sqf_codes(*)`)
        .order("created_at", { ascending: false });
      
      if (auditId) {
        query = query.eq("audit_id", auditId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSQFAuditFinding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (finding: {
      audit_id: string;
      sqf_code_id?: string;
      finding_type: string;
      description: string;
      evidence?: string;
      root_cause?: string;
      corrective_action?: string;
      due_date?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from("sqf_audit_findings")
        .insert(finding as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sqf-audit-findings"] });
      toast.success("Audit finding created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create audit finding: ${error.message}`);
    },
  });
}

export function useUpdateSQFAuditFinding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("sqf_audit_findings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sqf-audit-findings"] });
      toast.success("Audit finding updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update audit finding: ${error.message}`);
    },
  });
}

// SQF Compliance Summary (view)
export function useSQFComplianceSummary() {
  return useQuery({
    queryKey: ["sqf-compliance-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sqf_compliance_summary")
        .select("*");
      if (error) throw error;
      return data;
    },
  });
}
