import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WorkOrderType = "base" | "flavoring" | "freezing" | "case_pack";
export type WorkOrderStatus = "draft" | "scheduled" | "in_progress" | "pending_qa" | "completed" | "cancelled";

export interface WorkOrder {
  id: string;
  work_order_number: string;
  work_order_type: WorkOrderType;
  status: WorkOrderStatus;
  product_id: string | null;
  target_quantity: number;
  actual_quantity: number | null;
  unit_id: string | null;
  scheduled_date: string;
  scheduled_start_time: string | null;
  estimated_duration_hours: number | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  deadline: string | null;
  machine_id: string | null;
  priority: number;
  parent_work_order_id: string | null;
  source_production_lot_id: string | null;
  quantity_to_consume: number | null;
  customer_id: string | null;
  sales_order_reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  product?: { id: string; name: string; sku: string } | null;
  machine?: { id: string; name: string; machine_number: string } | null;
  unit?: { id: string; name: string; code: string } | null;
  customer?: { id: string; name: string; code: string } | null;
  source_production_lot?: { id: string; lot_number: string; quantity_available: number } | null;
  parent_work_order?: { id: string; work_order_number: string } | null;
}

export interface WorkOrderAssignment {
  id: string;
  work_order_id: string;
  employee_id: string;
  role: string | null;
  assigned_at: string;
  employee?: { id: string; first_name: string; last_name: string; employee_number: string };
}

// Fetch all work orders, optionally filtered by type
export function useWorkOrders(type?: WorkOrderType) {
  return useQuery({
    queryKey: ["work-orders", type],
    queryFn: async () => {
      let query = supabase
        .from("production_work_orders")
        .select(`
          *,
          product:products!production_work_orders_product_id_fkey(id, name, sku),
          machine:machines!production_work_orders_machine_id_fkey(id, name, machine_number),
          unit:units_of_measure!production_work_orders_unit_id_fkey(id, name, code),
          customer:customers!production_work_orders_customer_id_fkey(id, name, code),
          source_production_lot:production_lots!production_work_orders_source_production_lot_id_fkey(id, lot_number, quantity_available)
        `)
        .order("scheduled_date", { ascending: true })
        .order("priority", { ascending: true });

      if (type) {
        query = query.eq("work_order_type", type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as WorkOrder[];
    },
  });
}

// Fetch a single work order
export function useWorkOrder(id: string | null) {
  return useQuery({
    queryKey: ["work-order", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("production_work_orders")
        .select(`
          *,
          product:products!production_work_orders_product_id_fkey(id, name, sku),
          machine:machines!production_work_orders_machine_id_fkey(id, name, machine_number),
          unit:units_of_measure!production_work_orders_unit_id_fkey(id, name, code),
          customer:customers!production_work_orders_customer_id_fkey(id, name, code),
          source_production_lot:production_lots!production_work_orders_source_production_lot_id_fkey(id, lot_number, quantity_available)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as WorkOrder;
    },
    enabled: !!id,
  });
}

// Fetch work order assignments
export function useWorkOrderAssignments(workOrderId: string | null) {
  return useQuery({
    queryKey: ["work-order-assignments", workOrderId],
    queryFn: async () => {
      if (!workOrderId) return [];
      
      const { data, error } = await supabase
        .from("work_order_assignments")
        .select(`
          *,
          employee:employees!work_order_assignments_employee_id_fkey(id, first_name, last_name, employee_number)
        `)
        .eq("work_order_id", workOrderId);

      if (error) throw error;
      return data as WorkOrderAssignment[];
    },
    enabled: !!workOrderId,
  });
}

// Generate work order number
export async function generateWorkOrderNumber(type: WorkOrderType, date?: Date): Promise<string> {
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split("T")[0];
  
  const { data, error } = await supabase.rpc("generate_work_order_number", {
    p_type: type,
    p_date: dateStr,
  });
  
  if (error) throw error;
  return data;
}

// Create work order mutation
export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: {
      work_order_type: WorkOrderType;
      product_id?: string;
      target_quantity: number;
      unit_id?: string;
      scheduled_date: string;
      scheduled_start_time?: string;
      estimated_duration_hours?: number;
      deadline?: string;
      machine_id?: string;
      priority?: number;
      parent_work_order_id?: string;
      source_production_lot_id?: string;
      quantity_to_consume?: number;
      customer_id?: string;
      sales_order_reference?: string;
      notes?: string;
    }) => {
      const workOrderNumber = await generateWorkOrderNumber(input.work_order_type, new Date(input.scheduled_date));
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("production_work_orders")
        .insert({
          work_order_number: workOrderNumber,
          work_order_type: input.work_order_type,
          status: "draft",
          product_id: input.product_id,
          target_quantity: input.target_quantity,
          unit_id: input.unit_id,
          scheduled_date: input.scheduled_date,
          scheduled_start_time: input.scheduled_start_time,
          estimated_duration_hours: input.estimated_duration_hours,
          deadline: input.deadline,
          machine_id: input.machine_id,
          priority: input.priority || 5,
          parent_work_order_id: input.parent_work_order_id,
          source_production_lot_id: input.source_production_lot_id,
          quantity_to_consume: input.quantity_to_consume,
          customer_id: input.customer_id,
          sales_order_reference: input.sales_order_reference,
          notes: input.notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      toast.success("Work order created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create work order: ${error.message}`);
    },
  });
}

// Update work order mutation
export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkOrder> & { id: string }) => {
      const { data, error } = await supabase
        .from("production_work_orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["work-order"] });
      toast.success("Work order updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update work order: ${error.message}`);
    },
  });
}

// Delete work order mutation
export function useDeleteWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("production_work_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      toast.success("Work order deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete work order: ${error.message}`);
    },
  });
}

// Start work order
export function useStartWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("production_work_orders")
        .update({
          status: "in_progress",
          actual_start_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["work-order"] });
      toast.success("Work order started");
    },
    onError: (error) => {
      toast.error(`Failed to start work order: ${error.message}`);
    },
  });
}

// Complete work order (move to pending QA)
export function useCompleteWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, actual_quantity }: { id: string; actual_quantity: number }) => {
      const { data, error } = await supabase
        .from("production_work_orders")
        .update({
          status: "pending_qa",
          actual_quantity,
          actual_end_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["work-order"] });
      toast.success("Work order completed, pending QA approval");
    },
    onError: (error) => {
      toast.error(`Failed to complete work order: ${error.message}`);
    },
  });
}

// Fetch approved base lots for flavoring/freezing work orders
export function useApprovedLotsForWorkOrder(stage: "base" | "flavoring", productId?: string | null) {
  return useQuery({
    queryKey: ["approved-lots-for-wo", stage, productId],
    queryFn: async () => {
      const targetStage = stage === "base" ? "base" : "flavoring";
      
      let query = supabase
        .from("production_lots")
        .select(`
          id,
          lot_number,
          production_date,
          quantity_available,
          production_stage,
          product:products!production_lots_product_id_fkey(id, name, sku)
        `)
        .eq("production_stage", targetStage)
        .eq("approval_status", "Approved")
        .gt("quantity_available", 0)
        .order("production_date", { ascending: true });
      
      if (productId) {
        query = query.eq("product_id", productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Add employee assignment
export function useAddWorkOrderAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: {
      work_order_id: string;
      employee_id: string;
      role?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("work_order_assignments")
        .insert({
          work_order_id: input.work_order_id,
          employee_id: input.employee_id,
          role: input.role,
          assigned_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["work-order-assignments", variables.work_order_id] });
      toast.success("Employee assigned to work order");
    },
    onError: (error) => {
      toast.error(`Failed to assign employee: ${error.message}`);
    },
  });
}

// Remove employee assignment
export function useRemoveWorkOrderAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, work_order_id }: { id: string; work_order_id: string }) => {
      const { error } = await supabase
        .from("work_order_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return work_order_id;
    },
    onSuccess: (work_order_id) => {
      queryClient.invalidateQueries({ queryKey: ["work-order-assignments", work_order_id] });
      toast.success("Assignment removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove assignment: ${error.message}`);
    },
  });
}
