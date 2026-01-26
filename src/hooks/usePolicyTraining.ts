import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Policy Training Requirements
export function usePolicyTrainingRequirements(policyId?: string) {
  return useQuery({
    queryKey: ["policy-training-requirements", policyId],
    queryFn: async () => {
      let query = supabase
        .from("policy_training_requirements")
        .select(`*, policy:policies(id, title, policy_number)`)
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

export function useCreatePolicyTrainingRequirement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requirement: {
      policy_id: string;
      training_type?: string;
      is_required?: boolean;
      passing_score?: number;
      max_attempts?: number;
      initial_due_days?: number;
      recurrence_days?: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("policy_training_requirements")
        .insert({ ...requirement, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-training-requirements"] });
      toast.success("Training requirement created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create training requirement: ${error.message}`);
    },
  });
}

export function useUpdatePolicyTrainingRequirement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("policy_training_requirements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-training-requirements"] });
      toast.success("Training requirement updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update training requirement: ${error.message}`);
    },
  });
}

export function useDeletePolicyTrainingRequirement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("policy_training_requirements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-training-requirements"] });
      toast.success("Training requirement deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete training requirement: ${error.message}`);
    },
  });
}

// Employee Policy Training
export function useEmployeePolicyTrainings(filters?: { employeeId?: string; policyId?: string; status?: string }) {
  return useQuery({
    queryKey: ["employee-policy-trainings", filters],
    queryFn: async () => {
      let query = supabase
        .from("employee_policy_training")
        .select(`
          *,
          employee:employees(id, first_name, last_name, employee_number),
          policy:policies(id, title, policy_number)
        `)
        .order("due_date", { ascending: true });
      
      if (filters?.employeeId) {
        query = query.eq("employee_id", filters.employeeId);
      }
      if (filters?.policyId) {
        query = query.eq("policy_id", filters.policyId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useEmployeePolicyTraining(id: string | undefined) {
  return useQuery({
    queryKey: ["employee-policy-training", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("employee_policy_training")
        .select(`
          *,
          employee:employees(id, first_name, last_name, employee_number),
          policy:policies(id, title, policy_number)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useAssignPolicyTraining() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (training: {
      employee_id: string;
      policy_id: string;
      training_requirement_id?: string;
      due_date?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from("employee_policy_training")
        .insert(training as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-policy-trainings"] });
      toast.success("Training assigned successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign training: ${error.message}`);
    },
  });
}

export function useUpdateEmployeePolicyTraining() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("employee_policy_training")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employee-policy-trainings"] });
      queryClient.invalidateQueries({ queryKey: ["employee-policy-training", data.id] });
      toast.success("Training updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update training: ${error.message}`);
    },
  });
}

export function useStartTraining() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("employee_policy_training")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employee-policy-trainings"] });
      queryClient.invalidateQueries({ queryKey: ["employee-policy-training", data.id] });
      toast.success("Training started");
    },
    onError: (error: Error) => {
      toast.error(`Failed to start training: ${error.message}`);
    },
  });
}

export function useCompleteTraining() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, score }: { id: string; score?: number }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("employee_policy_training")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          quiz_score: score,
          certified_by: user.user?.id,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employee-policy-trainings"] });
      queryClient.invalidateQueries({ queryKey: ["employee-policy-training", data.id] });
      queryClient.invalidateQueries({ queryKey: ["policy-training-compliance"] });
      toast.success("Training completed successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete training: ${error.message}`);
    },
  });
}

export function useBulkAssignTraining() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ policyId, employeeIds, dueDate }: { policyId: string; employeeIds: string[]; dueDate?: string }) => {
      const trainings = employeeIds.map(employeeId => ({
        policy_id: policyId,
        employee_id: employeeId,
        status: "not_started",
        assigned_at: new Date().toISOString(),
        due_date: dueDate || null,
      }));
      
      const { data, error } = await supabase
        .from("employee_policy_training")
        .insert(trainings as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-policy-trainings"] });
      toast.success("Training assigned to all selected employees");
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign training: ${error.message}`);
    },
  });
}

// Training Reminders
export function useTrainingReminders(trainingId?: string) {
  return useQuery({
    queryKey: ["training-reminders", trainingId],
    queryFn: async () => {
      let query = supabase
        .from("training_reminders")
        .select("*")
        .order("scheduled_for", { ascending: true });
      
      if (trainingId) {
        query = query.eq("employee_training_id", trainingId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTrainingReminder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reminder: {
      employee_training_id: string;
      reminder_type: string;
      scheduled_for: string;
      delivery_method?: string;
    }) => {
      const { data, error } = await supabase
        .from("training_reminders")
        .insert(reminder)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training-reminders", data.employee_training_id] });
      toast.success("Reminder created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create reminder: ${error.message}`);
    },
  });
}

// Policy Training Compliance View
export function usePolicyTrainingCompliance() {
  return useQuery({
    queryKey: ["policy-training-compliance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_training_compliance")
        .select("*");
      if (error) throw error;
      return data;
    },
  });
}

// Get overdue trainings count
export function useOverdueTrainingsCount() {
  return useQuery({
    queryKey: ["overdue-trainings-count"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count, error } = await supabase
        .from("employee_policy_training")
        .select("*", { count: "exact", head: true })
        .lt("due_date", today)
        .in("status", ["not_started", "in_progress"]);
      if (error) throw error;
      return count || 0;
    },
  });
}

// Get expiring trainings (next 30 days)
export function useExpiringTrainings(days: number = 30) {
  return useQuery({
    queryKey: ["expiring-trainings", days],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);
      
      const { data, error } = await supabase
        .from("employee_policy_training")
        .select(`
          *,
          employee:employees(id, first_name, last_name, employee_number),
          policy:policies(id, title, policy_number)
        `)
        .eq("status", "completed")
        .gte("expires_at", today.toISOString())
        .lte("expires_at", futureDate.toISOString())
        .order("expires_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
