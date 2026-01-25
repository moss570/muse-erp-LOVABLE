import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

// Types for unfulfilled sales order items
export interface UnfulfilledItem {
  product_size_id: string;
  product_code: string;
  product_description: string;
  product_id: string | null;
  size_type: string | null;
  total_quantity_needed: number;
  total_available_stock: number;
  shortage_quantity: number;
  earliest_due_date: string | null;
  number_of_sales_orders: number;
  sales_order_numbers: string[];
  due_date_factor: number;
  priority_score: number;
  priority_level: "critical" | "high" | "medium" | "low";
}

export interface UnfulfilledAcknowledgment {
  id: string;
  user_id: string;
  acknowledged_at: string;
  unfulfilled_items_snapshot: UnfulfilledItem[];
  work_order_id: string | null;
  notes: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
  } | null;
}

// Calculate priority level based on due date
function getPriorityLevel(daysUntilDue: number | null): "critical" | "high" | "medium" | "low" {
  if (daysUntilDue === null) return "low";
  if (daysUntilDue < 0) return "critical"; // Overdue
  if (daysUntilDue <= 2) return "critical";
  if (daysUntilDue <= 7) return "high";
  if (daysUntilDue <= 14) return "medium";
  return "low";
}

// Calculate full priority score using the spec formula
function calculatePriorityScore(
  daysUntilDue: number | null,
  shortageQty: number,
  maxShortage: number,
  soCount: number,
  totalOpenSOs: number
): number {
  // Due date factor (50% weight)
  let dueDateFactor: number;
  if (daysUntilDue === null) {
    dueDateFactor = 10;
  } else if (daysUntilDue < 0) {
    dueDateFactor = 100; // Overdue
  } else if (daysUntilDue <= 2) {
    dueDateFactor = 75;
  } else if (daysUntilDue <= 7) {
    dueDateFactor = 50;
  } else if (daysUntilDue <= 14) {
    dueDateFactor = 25;
  } else {
    dueDateFactor = 10;
  }

  // Shortage quantity factor (30% weight)
  const shortageQtyFactor = maxShortage > 0 ? (shortageQty / maxShortage) * 100 : 0;

  // Sales order count factor (20% weight)
  const soCountFactor = totalOpenSOs > 0 ? (soCount / totalOpenSOs) * 100 : 0;

  // Final priority score
  return dueDateFactor * 0.5 + shortageQtyFactor * 0.3 + soCountFactor * 0.2;
}

// Hook to fetch unfulfilled sales order items
export function useUnfulfilledSalesOrders() {
  return useQuery({
    queryKey: ["unfulfilled-sales-orders"],
    queryFn: async () => {
      // Query the view we created
      const { data, error } = await supabase
        .from("vw_unfulfilled_sales_order_items")
        .select("*")
        .order("due_date_factor", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        return { items: [], totalCount: 0, totalOpenSOs: 0 };
      }

      // Calculate max shortage and total SOs for priority scoring
      const maxShortage = Math.max(...data.map((d) => d.shortage_quantity || 0));
      const totalOpenSOs = Math.max(...data.map((d) => d.number_of_sales_orders || 0));

      // Map to typed items with calculated priority
      const items: UnfulfilledItem[] = data.map((row) => {
        const daysUntilDue = row.earliest_due_date
          ? differenceInDays(new Date(row.earliest_due_date), new Date())
          : null;

        return {
          product_size_id: row.product_size_id,
          product_code: row.product_code || "N/A",
          product_description: row.product_description || "Unknown",
          product_id: row.product_id,
          size_type: row.size_type || null,
          total_quantity_needed: row.total_quantity_needed || 0,
          total_available_stock: row.total_available_stock || 0,
          shortage_quantity: row.shortage_quantity || 0,
          earliest_due_date: row.earliest_due_date,
          number_of_sales_orders: row.number_of_sales_orders || 0,
          sales_order_numbers: row.sales_order_numbers || [],
          due_date_factor: row.due_date_factor || 10,
          priority_score: calculatePriorityScore(
            daysUntilDue,
            row.shortage_quantity || 0,
            maxShortage,
            row.number_of_sales_orders || 0,
            totalOpenSOs
          ),
          priority_level: getPriorityLevel(daysUntilDue),
        };
      });

      // Sort by priority score descending
      items.sort((a, b) => b.priority_score - a.priority_score);

      return {
        items,
        totalCount: items.length,
        totalOpenSOs,
      };
    },
    staleTime: 60000, // Cache for 60 seconds per spec
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });
}

// Hook to create an acknowledgment
export function useCreateAcknowledgment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      items,
      notes,
    }: {
      items: UnfulfilledItem[];
      notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("unfulfilled_so_acknowledgments")
        .insert({
          user_id: userData.user.id,
          unfulfilled_items_snapshot: items as any,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unfulfilled-acknowledgments"] });
    },
  });
}

// Hook to link acknowledgment to work order
export function useLinkAcknowledgmentToWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      acknowledgmentId,
      workOrderId,
    }: {
      acknowledgmentId: string;
      workOrderId: string;
    }) => {
      // Update the acknowledgment with work order reference
      const { error: ackError } = await supabase
        .from("unfulfilled_so_acknowledgments")
        .update({ work_order_id: workOrderId })
        .eq("id", acknowledgmentId);

      if (ackError) throw ackError;

      // Update work order to mark as acknowledged
      const { error: woError } = await supabase
        .from("work_orders")
        .update({ acknowledged_unfulfilled_items: true })
        .eq("id", workOrderId);

      if (woError) throw woError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unfulfilled-acknowledgments"] });
      queryClient.invalidateQueries({ queryKey: ["active-work-orders"] });
    },
  });
}

// Hook to fetch acknowledgment history
export function useAcknowledgmentHistory(filters?: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ["unfulfilled-acknowledgments", filters],
    queryFn: async () => {
      let query = supabase
        .from("unfulfilled_so_acknowledgments")
        .select(`
          *,
          profile:profiles!unfulfilled_so_acknowledgments_user_id_fkey(full_name),
          work_order:work_orders(wo_number, wo_status)
        `)
        .order("acknowledged_at", { ascending: false });

      if (filters?.userId) {
        query = query.eq("user_id", filters.userId);
      }
      if (filters?.startDate) {
        query = query.gte("acknowledged_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("acknowledged_at", filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Hook to check if user has acknowledged today
export function useTodaysAcknowledgment() {
  return useQuery({
    queryKey: ["todays-acknowledgment"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("unfulfilled_so_acknowledgments")
        .select("*")
        .eq("user_id", userData.user.id)
        .gte("acknowledged_at", today.toISOString())
        .order("acknowledged_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });
}
