import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Get NC metrics for date range
export function useNCMetrics(
  startDate: string,
  endDate: string,
  filters?: {
    ncType?: string;
    severity?: string;
    locationId?: string;
  }
) {
  return useQuery({
    queryKey: ['nc-metrics', startDate, endDate, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_nc_metrics', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_nc_type: filters?.ncType || null,
        p_severity: filters?.severity || null,
        p_location_id: filters?.locationId || null,
      });

      if (error) throw error;
      return data as {
        metrics: {
          total_ncs: number;
          open_ncs: number;
          closed_ncs: number;
          critical_ncs: number;
          food_safety_ncs: number;
          capa_required_ncs: number;
          capa_created_ncs: number;
          total_estimated_cost: number;
          total_actual_cost: number;
          avg_days_to_close: number;
        };
        by_type: Array<{
          nc_type: string;
          count: number;
          cost: number;
        }>;
        by_disposition: Array<{
          disposition: string;
          count: number;
        }>;
        by_month: Array<{
          month: string;
          count: number;
        }>;
      };
    },
  });
}

// Pareto analysis
export function useNCParetoAnalysis(
  startDate: string,
  endDate: string,
  groupBy: 'nc_type' | 'material_id' | 'supplier_id' | 'equipment_id' = 'nc_type'
) {
  return useQuery({
    queryKey: ['nc-pareto', startDate, endDate, groupBy],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_nc_pareto_analysis', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_group_by: groupBy,
      });

      if (error) throw error;
      return data as Array<{
        category: string;
        nc_count: number;
        total_cost: number;
        percentage: number;
        cumulative_percentage: number;
      }>;
    },
  });
}

// Generate SQF audit report
export function useSQFAuditReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['sqf-nc-report', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('generate_sqf_nc_report', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data as {
        report_period: {
          start_date: string;
          end_date: string;
        };
        summary: {
          total_ncs: number;
          critical_ncs: number;
          food_safety_ncs: number;
          open_ncs: number;
          total_cost: number;
          with_capa: number;
          with_photos: number;
        };
        non_conformities: Array<{
          nc_number: string;
          discovered_date: string;
          nc_type: string;
          severity: string;
          impact_level: string;
          title: string;
          description: string;
          specification_reference: string | null;
          disposition: string;
          status: string;
          root_cause_identified: boolean;
          corrective_action_implemented: boolean;
          preventive_action_implemented: boolean;
          closed_at: string | null;
          estimated_cost: number;
          actual_cost: number;
          material_name: string;
          supplier_name: string;
          product_name: string;
          location_name: string;
          discovered_by_name: string;
          capa_number: string | null;
          photo_count: number;
        }>;
      };
    },
    enabled: false, // Only fetch when refetch is called
  });
}

// Cost of quality breakdown
export function useCostOfQuality(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['cost-of-quality', startDate, endDate],
    queryFn: async () => {
      const { data: costs, error } = await supabase
        .from('nc_cost_breakdown')
        .select(`
          *,
          cost_category:nc_cost_categories(category_name, cost_type)
        `);

      if (error) throw error;

      // Group by cost type
      const grouped = (costs || []).reduce((acc, cost) => {
        const type = cost.cost_category?.cost_type || 'unknown';
        if (!acc[type]) {
          acc[type] = { total: 0, items: [] };
        }
        acc[type].total += Number(cost.amount);
        acc[type].items.push(cost);
        return acc;
      }, {} as Record<string, { total: number; items: typeof costs }>);

      return grouped;
    },
  });
}

// Refresh analytics materialized view
export async function refreshNCAnalytics() {
  const { error } = await supabase.rpc('refresh_nc_analytics');
  if (error) throw error;
}
