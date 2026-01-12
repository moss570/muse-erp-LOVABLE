import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface QualityComplaint {
  id: string;
  complaint_number: string;
  complaint_date: string;
  complaint_type: string;
  severity: string;
  status: string;
  customer_id?: string;
  supplier_id?: string;
  material_id?: string;
  product_id?: string;
  production_lot_id?: string;
  receiving_lot_id?: string;
  title: string;
  description?: string;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  credit_issued?: number;
  replacement_cost?: number;
  created_at: string;
  created_by?: string;
  updated_at: string;
  // Joined data
  customer?: { name: string };
  supplier?: { name: string };
  material?: { name: string };
  product?: { name: string };
}

export interface QualityMetric {
  id: string;
  metric_date: string;
  metric_type: string;
  entity_type?: string;
  entity_id?: string;
  metric_value: number;
  metric_details?: Record<string, unknown>;
}

// Fetch complaints
export function useQualityComplaints(filters?: {
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ['quality-complaints', filters],
    queryFn: async () => {
      let query = supabase
        .from('quality_complaints')
        .select(`
          *,
          customer:customers(name),
          supplier:suppliers(name),
          material:materials(name),
          product:products(name)
        `)
        .order('complaint_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('complaint_type', filters.type);
      }
      if (filters?.dateFrom) {
        query = query.gte('complaint_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('complaint_date', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QualityComplaint[];
    },
  });
}

// Fetch single complaint
export function useQualityComplaint(id: string) {
  return useQuery({
    queryKey: ['quality-complaint', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quality_complaints')
        .select(`
          *,
          customer:customers(name),
          supplier:suppliers(name),
          material:materials(name),
          product:products(name)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as QualityComplaint;
    },
    enabled: !!id,
  });
}

// Create complaint
export function useCreateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<QualityComplaint, 'id' | 'complaint_number' | 'created_at' | 'updated_at'>) => {
      // Generate complaint number
      const { data: numData, error: numError } = await supabase.rpc('generate_complaint_number');
      if (numError) throw numError;

      const { data: result, error } = await supabase
        .from('quality_complaints')
        .insert({ ...data, complaint_number: numData })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-complaints'] });
      toast.success('Complaint created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create complaint: ${error.message}`);
    },
  });
}

// Update complaint
export function useUpdateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<QualityComplaint> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('quality_complaints')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quality-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['quality-complaint', variables.id] });
      toast.success('Complaint updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update complaint: ${error.message}`);
    },
  });
}

// Fetch quality metrics for trends
export function useQualityMetrics(params: {
  metricType: string;
  dateFrom: string;
  dateTo: string;
  entityType?: string;
  entityId?: string;
}) {
  return useQuery({
    queryKey: ['quality-metrics', params],
    queryFn: async () => {
      let query = supabase
        .from('quality_metrics')
        .select('*')
        .eq('metric_type', params.metricType)
        .gte('metric_date', params.dateFrom)
        .lte('metric_date', params.dateTo)
        .order('metric_date', { ascending: true });

      if (params.entityType) {
        query = query.eq('entity_type', params.entityType);
      }
      if (params.entityId) {
        query = query.eq('entity_id', params.entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QualityMetric[];
    },
  });
}

// Calculate supplier scorecards
export function useSupplierScorecard(supplierId?: string) {
  return useQuery({
    queryKey: ['supplier-scorecard', supplierId],
    queryFn: async () => {
      // Get receiving data from po_receiving_items
      let rejectQuery = supabase
        .from('po_receiving_items')
        .select(`
          id,
          quantity_received,
          inspection_status,
          purchase_order_items!inner(
            purchase_orders!inner(supplier_id)
          )
        `);

      if (supplierId) {
        rejectQuery = rejectQuery.eq('purchase_order_items.purchase_orders.supplier_id', supplierId);
      }

      const { data: rejectData } = await rejectQuery;

      // Get complaint data
      let complaintQuery = supabase
        .from('quality_complaints')
        .select('id, severity, supplier_id')
        .eq('complaint_type', 'supplier');

      if (supplierId) {
        complaintQuery = complaintQuery.eq('supplier_id', supplierId);
      }

      const { data: complaintData } = await complaintQuery;

      // Calculate metrics
      const totalReceived = rejectData?.reduce((sum, r) => sum + (Number(r.quantity_received) || 0), 0) || 0;
      // Count rejected items (inspection_status = 'rejected')
      const rejectedItems = rejectData?.filter(r => r.inspection_status === 'rejected') || [];
      const totalRejected = rejectedItems.reduce((sum, r) => sum + (Number(r.quantity_received) || 0), 0);
      const rejectionRate = totalReceived > 0 ? (totalRejected / totalReceived) * 100 : 0;

      const complaintCount = complaintData?.length || 0;
      const criticalComplaints = complaintData?.filter(c => c.severity === 'critical').length || 0;

      // Simple scoring (100 - deductions)
      let score = 100;
      score -= rejectionRate * 2; // -2 points per % rejection
      score -= complaintCount * 5; // -5 points per complaint
      score -= criticalComplaints * 10; // additional -10 for critical
      score = Math.max(0, Math.min(100, score));

      return {
        totalReceived,
        totalRejected,
        rejectionRate: rejectionRate.toFixed(2),
        complaintCount,
        criticalComplaints,
        score: Math.round(score),
        grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
      };
    },
    enabled: supplierId !== undefined,
  });
}

// Training progress hooks
export function useTrainingProgress(moduleKey: string) {
  return useQuery({
    queryKey: ['training-progress', moduleKey],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_training_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_key', moduleKey)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateTrainingProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleKey, step, completed, skipped }: {
      moduleKey: string;
      step?: number;
      completed?: boolean;
      skipped?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData = {
        user_id: user.id,
        module_key: moduleKey,
        updated_at: new Date().toISOString(),
        last_step_viewed: step ?? 0,
        completed_at: completed ? new Date().toISOString() : null,
        skipped_at: skipped ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('user_training_progress')
        .upsert(updateData, { onConflict: 'user_id,module_key' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-progress', variables.moduleKey] });
    },
  });
}
