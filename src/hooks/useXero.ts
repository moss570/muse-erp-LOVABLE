import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface XeroConnection {
  id: string;
  tenant_id: string;
  tenant_name: string;
  token_expires_at: string;
  updated_at: string;
}

interface XeroAccount {
  xero_account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  xero_type: string;
  xero_class: string;
  status: string;
  tax_type: string;
}

export function useXeroConnection() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['xero-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('xero_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as XeroConnection | null;
    },
    enabled: !!user?.id,
  });
}

export function useXeroConnect() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const connectToXero = async () => {
    if (!user?.id) {
      toast.error('Please log in to connect to Xero');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('xero-auth-url', {
        body: {
          user_id: user.id,
          redirect_url: window.location.href,
        },
      });

      if (error) throw error;

      // Open Xero auth in popup
      const popup = window.open(
        data.auth_url,
        'xero-auth',
        'width=600,height=700,scrollbars=yes'
      );

      // Listen for success message from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'xero-connected' && event.data?.success) {
          queryClient.invalidateQueries({ queryKey: ['xero-connection'] });
          toast.success('Connected to Xero successfully!');
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          queryClient.invalidateQueries({ queryKey: ['xero-connection'] });
        }
      }, 1000);

    } catch (error: unknown) {
      console.error('Error connecting to Xero:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to connect to Xero: ${message}`);
    }
  };

  return { connectToXero };
}

export function useXeroSyncInvoice() {
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
    onSuccess: (data, invoiceId) => {
      toast.success('Invoice synced to Xero');
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['po-invoices'] });
    },
    onError: (error: Error) => {
      console.error('Xero sync error:', error);
      toast.error(`Failed to sync to Xero: ${error.message}`);
    },
  });
}

export function useXeroDisconnect() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('xero_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Disconnected from Xero');
      queryClient.invalidateQueries({ queryKey: ['xero-connection'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });
}

export function useXeroAccounts() {
  return useQuery({
    queryKey: ['xero-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('xero-get-accounts');

      if (error) {
        const anyErr: any = error;
        const res: Response | undefined = anyErr?.context;
        if (res) {
          const bodyText = await res.text();
          throw new Error(`Xero fetch failed (${res.status}): ${bodyText}`);
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      return data as { accounts: XeroAccount[]; tenant_name: string };
    },
    enabled: false,
    retry: false,
  });
}

export function useFetchXeroAccounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('xero-get-accounts');

      if (error) {
        const anyErr: any = error;
        const res: Response | undefined = anyErr?.context;
        if (res) {
          const bodyText = await res.text();
          throw new Error(`Xero fetch failed (${res.status}): ${bodyText}`);
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      return data as { accounts: XeroAccount[]; tenant_name: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['xero-accounts'] });
    },
    onError: (error: Error) => {
      console.error('Error fetching Xero accounts:', error);
      toast.error(error.message);
    },
  });
}
