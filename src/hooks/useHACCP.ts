import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Use database types directly to avoid type mismatches
export function useHACCPPlans() {
  return useQuery({
    queryKey: ["haccp-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("haccp_plans")
        .select(`*`)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useHACCPPlan(id: string | undefined) {
  return useQuery({
    queryKey: ["haccp-plan", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("haccp_plans")
        .select(`*`)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateHACCPPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (plan: {
      plan_number: string;
      name: string;
      intended_use?: string;
      target_consumer?: string;
      version?: number;
      status?: string;
      effective_date?: string;
      review_date?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("haccp_plans")
        .insert({ ...plan, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["haccp-plans"] });
      toast.success("HACCP Plan created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create HACCP Plan: ${error.message}`);
    },
  });
}

export function useUpdateHACCPPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("haccp_plans")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-plans"] });
      queryClient.invalidateQueries({ queryKey: ["haccp-plan", data.id] });
      toast.success("HACCP Plan updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update HACCP Plan: ${error.message}`);
    },
  });
}

export function useDeleteHACCPPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("haccp_plans")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["haccp-plans"] });
      toast.success("HACCP Plan deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete HACCP Plan: ${error.message}`);
    },
  });
}

// HACCP Process Steps
export function useHACCPProcessSteps(planId?: string) {
  return useQuery({
    queryKey: ["haccp-process-steps", planId],
    queryFn: async () => {
      let query = supabase
        .from("haccp_process_steps")
        .select("*")
        .order("step_number", { ascending: true });
      
      if (planId) {
        query = query.eq("haccp_plan_id", planId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!planId,
  });
}

export function useCreateHACCPProcessStep() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (step: {
      haccp_plan_id: string;
      step_number: number;
      name: string;
      description?: string;
      step_type?: string;
      is_ccp?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("haccp_process_steps")
        .insert(step)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-process-steps", data.haccp_plan_id] });
      toast.success("Process step created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create process step: ${error.message}`);
    },
  });
}

export function useUpdateHACCPProcessStep() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("haccp_process_steps")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-process-steps", data.haccp_plan_id] });
      toast.success("Process step updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update process step: ${error.message}`);
    },
  });
}

export function useDeleteHACCPProcessStep() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("haccp_process_steps")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["haccp-process-steps"] });
      toast.success("Process step deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete process step: ${error.message}`);
    },
  });
}

// HACCP Hazards
export function useHACCPHazards(planId?: string) {
  return useQuery({
    queryKey: ["haccp-hazards", planId],
    queryFn: async () => {
      let query = supabase
        .from("haccp_hazards")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (planId) {
        query = query.eq("haccp_plan_id", planId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!planId,
  });
}

export function useCreateHACCPHazard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (hazard: {
      haccp_plan_id: string;
      hazard_type: string;
      hazard_name: string;
      description?: string;
      source?: string;
      likelihood?: string;
      severity?: string;
      is_significant?: boolean;
      justification?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("haccp_hazards")
        .insert({ ...hazard, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-hazards", data.haccp_plan_id] });
      toast.success("Hazard created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create hazard: ${error.message}`);
    },
  });
}

export function useUpdateHACCPHazard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("haccp_hazards")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-hazards", data.haccp_plan_id] });
      toast.success("Hazard updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update hazard: ${error.message}`);
    },
  });
}

// HACCP Critical Control Points
export function useHACCPCCPs(planId?: string) {
  return useQuery({
    queryKey: ["haccp-ccps", planId],
    queryFn: async () => {
      let query = supabase
        .from("haccp_critical_control_points")
        .select(`*, process_step:haccp_process_steps(*)`)
        .order("ccp_number", { ascending: true });
      
      if (planId) {
        query = query.eq("haccp_plan_id", planId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!planId,
  });
}

export function useCreateHACCPCCP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ccp: {
      haccp_plan_id: string;
      process_step_id: string;
      ccp_number: string;
      hazard_id?: string;
      critical_limit_text?: string;
      monitoring_procedure?: string;
      monitoring_frequency?: string;
      corrective_action?: string;
      verification_procedure?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("haccp_critical_control_points")
        .insert({ ...ccp, created_by: user.user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-ccps", data.haccp_plan_id] });
      toast.success("CCP created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create CCP: ${error.message}`);
    },
  });
}

export function useUpdateHACCPCCP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("haccp_critical_control_points")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-ccps", data.haccp_plan_id] });
      toast.success("CCP updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update CCP: ${error.message}`);
    },
  });
}

// CCP Verification Records
export function useHACCPCCPVerifications(ccpId?: string) {
  return useQuery({
    queryKey: ["haccp-ccp-verifications", ccpId],
    queryFn: async () => {
      let query = supabase
        .from("haccp_ccp_verification_records")
        .select("*")
        .order("verification_time", { ascending: false });
      
      if (ccpId) {
        query = query.eq("ccp_id", ccpId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!ccpId,
  });
}

export function useCreateHACCPCCPVerification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (record: {
      ccp_id: string;
      verification_time?: string;
      measured_value?: number;
      measured_unit?: string;
      is_within_limits?: boolean;
      corrective_action_taken?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("haccp_ccp_verification_records")
        .insert({ ...record, verified_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-ccp-verifications", data.ccp_id] });
      toast.success("Verification record created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create verification record: ${error.message}`);
    },
  });
}

// CCP Deviations
export function useHACCPCCPDeviations(ccpId?: string) {
  return useQuery({
    queryKey: ["haccp-ccp-deviations", ccpId],
    queryFn: async () => {
      let query = supabase
        .from("haccp_ccp_deviations")
        .select("*")
        .order("occurred_at", { ascending: false });
      
      if (ccpId) {
        query = query.eq("ccp_id", ccpId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateHACCPCCPDeviation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (deviation: {
      ccp_id: string;
      verification_record_id?: string;
      description: string;
      product_lot_number?: string;
      quantity_affected?: number;
      immediate_action?: string;
      root_cause?: string;
      corrective_action?: string;
      status?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("haccp_ccp_deviations")
        .insert({ ...deviation, created_by: user.user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-ccp-deviations", data.ccp_id] });
      toast.success("Deviation recorded successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to record deviation: ${error.message}`);
    },
  });
}

export function useUpdateHACCPCCPDeviation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("haccp_ccp_deviations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-ccp-deviations", data.ccp_id] });
      toast.success("Deviation updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update deviation: ${error.message}`);
    },
  });
}

// HACCP Plan Validations
export function useHACCPPlanValidations(planId?: string) {
  return useQuery({
    queryKey: ["haccp-plan-validations", planId],
    queryFn: async () => {
      let query = supabase
        .from("haccp_plan_validations")
        .select("*")
        .order("validation_date", { ascending: false });
      
      if (planId) {
        query = query.eq("haccp_plan_id", planId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!planId,
  });
}

export function useCreateHACCPPlanValidation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (validation: {
      haccp_plan_id: string;
      validation_type: string;
      validation_date: string;
      scope?: string;
      methodology?: string;
      findings?: string;
      conclusions?: string;
      next_validation_date?: string;
      status?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("haccp_plan_validations")
        .insert({ ...validation, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-plan-validations", data.haccp_plan_id] });
      toast.success("Validation created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create validation: ${error.message}`);
    },
  });
}

export function useUpdateHACCPPlanValidation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("haccp_plan_validations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["haccp-plan-validations", data.haccp_plan_id] });
      toast.success("Validation updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update validation: ${error.message}`);
    },
  });
}
