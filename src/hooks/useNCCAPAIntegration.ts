import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Evaluate if NC should trigger CAPA
export function useEvaluateNCCAPATrigger(ncId: string | null) {
  return useQuery({
    queryKey: ['nc-capa-evaluation', ncId],
    queryFn: async () => {
      if (!ncId) return null;

      const { data, error } = await supabase.rpc('evaluate_nc_capa_trigger', {
        p_nc_id: ncId,
      });

      if (error) throw error;
      return data as {
        should_create_capa: boolean;
        reasons: string[];
        similar_nc_count: number;
        auto_triggered: boolean;
      };
    },
    enabled: !!ncId,
  });
}

// Create CAPA from NC
export function useCreateCAPAFromNC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ncId: string) => {
      const { data: capaId, error } = await supabase.rpc('create_capa_from_nc', {
        p_nc_id: ncId,
      });

      if (error) throw error;
      return capaId as string;
    },
    onSuccess: (capaId, ncId) => {
      queryClient.invalidateQueries({ queryKey: ['non-conformities'] });
      queryClient.invalidateQueries({ queryKey: ['non-conformity', ncId] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['nc-activity-log', ncId] });
      
      toast.success('CAPA created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create CAPA: ${error.message}`);
    },
  });
}

// Get similar NCs (for pattern detection)
export function useSimilarNCs(
  ncType: string | null,
  materialId: string | null,
  discoveredDate: string | null,
  excludeNCId: string | null
) {
  return useQuery({
    queryKey: ['similar-ncs', ncType, materialId, discoveredDate, excludeNCId],
    queryFn: async () => {
      if (!ncType || !discoveredDate) return [];

      const thirtyDaysAgo = new Date(discoveredDate);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let query = supabase
        .from('non_conformities')
        .select(`
          id,
          nc_number,
          title,
          severity,
          discovered_date,
          disposition
        `)
        .eq('nc_type', ncType)
        .gte('discovered_date', thirtyDaysAgo.toISOString())
        .lte('discovered_date', discoveredDate)
        .order('discovered_date', { ascending: false });

      if (materialId) {
        query = query.eq('material_id', materialId);
      }

      if (excludeNCId) {
        query = query.neq('id', excludeNCId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!ncType && !!discoveredDate,
  });
}
