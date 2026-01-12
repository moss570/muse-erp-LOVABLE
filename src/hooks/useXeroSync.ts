import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSyncPOBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (purchaseOrderId: string) => {
      const { data, error } = await supabase.functions.invoke('xero-sync-po-bill', {
        body: { purchaseOrderId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'PO synced to Xero as Bill');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
    },
    onError: (error: Error) => {
      console.error('PO Bill sync error:', error);
      toast.error(`Failed to sync PO to Xero: ${error.message}`);
    },
  });
}

export function useSyncInvoiceBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.functions.invoke('xero-sync-invoice', {
        body: { invoiceId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Invoice synced to Xero as Bill');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-invoices'] });
    },
    onError: (error: Error) => {
      console.error('Invoice Bill sync error:', error);
      toast.error(`Failed to sync Invoice to Xero: ${error.message}`);
    },
  });
}

export function useSyncFGCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { batchDate: string; productionLotIds: string[] }) => {
      const { data, error } = await supabase.functions.invoke('xero-sync-fg-completion', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'FG Completion journal synced');
      queryClient.invalidateQueries({ queryKey: ['xero-journal-batches'] });
      queryClient.invalidateQueries({ queryKey: ['production-lots'] });
    },
    onError: (error: Error) => {
      console.error('FG Completion sync error:', error);
      toast.error(`Failed to sync FG completion: ${error.message}`);
    },
  });
}

export function useSyncProductionJournal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { batchDate: string; journalType: 'production_consumption' | 'fg_completion' }) => {
      const { data, error } = await supabase.functions.invoke('xero-sync-production-journal', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Production journal synced to Xero');
      queryClient.invalidateQueries({ queryKey: ['xero-journal-batches'] });
      queryClient.invalidateQueries({ queryKey: ['production-lots'] });
    },
    onError: (error: Error) => {
      console.error('Production journal sync error:', error);
      toast.error(`Failed to sync production journal: ${error.message}`);
    },
  });
}

// Fetch journal batches
export function useXeroJournalBatches(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['xero-journal-batches', dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('xero_journal_batches')
        .select('*')
        .order('batch_date', { ascending: false });

      if (dateFrom) query = query.gte('batch_date', dateFrom);
      if (dateTo) query = query.lte('batch_date', dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data as Array<{
        id: string;
        batch_date: string;
        batch_type?: string;
        journal_type?: string;
        xero_journal_id?: string;
        status: string;
        total_wip_amount?: number;
        total_material_amount?: number;
        total_labor_amount?: number;
        total_overhead_amount?: number;
        synced_at?: string;
        created_at: string;
      }>;
    },
  });
}
