import { useMutation, useQueryClient } from '@tanstack/react-query';
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
