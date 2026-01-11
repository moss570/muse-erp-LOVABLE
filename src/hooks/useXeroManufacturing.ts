import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface XeroAccountMapping {
  id: string;
  mapping_key: string;
  xero_account_id: string | null;
  xero_account_code: string | null;
  xero_account_name: string | null;
  xero_account_type: string | null;
  helper_text: string | null;
  updated_at: string;
}

export interface XeroJournalBatch {
  id: string;
  batch_date: string;
  batch_type: string;
  xero_journal_id: string | null;
  total_wip_amount: number;
  total_material_amount: number;
  total_labor_amount: number;
  total_overhead_amount: number;
  production_lot_ids: string[];
  status: string;
  sync_error: string | null;
  synced_at: string | null;
  created_at: string;
}

export function useXeroAccountMappings() {
  return useQuery({
    queryKey: ['xero-account-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xero_manufacturing_account_mappings')
        .select('*')
        .order('mapping_key');

      if (error) throw error;
      return data as XeroAccountMapping[];
    },
  });
}

export function useUpdateAccountMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      mappingKey: string;
      xeroAccountId: string;
      xeroAccountCode: string;
      xeroAccountName: string;
      xeroAccountType: string;
    }) => {
      const { data, error } = await supabase
        .from('xero_manufacturing_account_mappings')
        .update({
          xero_account_id: params.xeroAccountId,
          xero_account_code: params.xeroAccountCode,
          xero_account_name: params.xeroAccountName,
          xero_account_type: params.xeroAccountType,
        })
        .eq('mapping_key', params.mappingKey)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Account mapping updated');
      queryClient.invalidateQueries({ queryKey: ['xero-account-mappings'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update mapping: ${error.message}`);
    },
  });
}

export function useXeroJournalBatches(limit = 10) {
  return useQuery({
    queryKey: ['xero-journal-batches', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xero_journal_batches')
        .select('*')
        .order('batch_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as XeroJournalBatch[];
    },
  });
}

export function useSyncProductionJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchDate: string) => {
      const { data, error } = await supabase.functions.invoke('xero-sync-production-journal', {
        body: { batchDate },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      if (data.lotsProcessed > 0) {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ['xero-journal-batches'] });
      queryClient.invalidateQueries({ queryKey: ['production-lots'] });
    },
    onError: (error: Error) => {
      console.error('Production journal sync error:', error);
      toast.error(`Failed to sync production journal: ${error.message}`);
    },
  });
}

export function useUnsyncedProductionCount(date: string) {
  return useQuery({
    queryKey: ['unsynced-production-count', date],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('production_lots')
        .select('*', { count: 'exact', head: true })
        .eq('production_date', date)
        .eq('is_synced_to_xero', false)
        .in('status', ['completed', 'Completed', 'COMPLETED']);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!date,
  });
}
