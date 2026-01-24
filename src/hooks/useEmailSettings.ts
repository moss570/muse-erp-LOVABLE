import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailSetting {
  id: string;
  email_type: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmailSettings() {
  return useQuery({
    queryKey: ['email-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .order('email_type');

      if (error) throw error;
      return data as EmailSetting[];
    },
  });
}

export function useUpdateEmailSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<EmailSetting, 'id' | 'created_at' | 'updated_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('email_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
      toast.success('Email settings updated');
    },
    onError: (error) => {
      console.error('Failed to update email settings:', error);
      toast.error('Failed to update email settings');
    },
  });
}

export function useTestEmail() {
  return useMutation({
    mutationFn: async ({ emailType }: { emailType: string }) => {
      // Get current user email to send test to
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('No email address found for current user');
      }

      const { data, error } = await supabase.functions.invoke('test-email', {
        body: { email_type: emailType, test_email: user.email },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Test email sent! Check your inbox.');
    },
    onError: (error) => {
      console.error('Failed to send test email:', error);
      toast.error('Failed to send test email');
    },
  });
}

// Helper to get email labels
export const EMAIL_TYPE_LABELS: Record<string, { label: string; icon: string; isInbound?: boolean }> = {
  noreply: { label: 'System Notifications', icon: 'Bell' },
  employee_welcome: { label: 'Employee Welcome', icon: 'UserPlus' },
  invoices: { label: 'Customer Invoices', icon: 'FileText' },
  purchase_orders: { label: 'Purchase Orders', icon: 'ShoppingCart' },
  '3pl_releases': { label: '3PL Releases', icon: 'Warehouse' },
  sales: { label: 'Sales Notifications', icon: 'TrendingUp' },
  inbound_orders: { label: 'Incoming Customer POs', icon: 'Inbox', isInbound: true },
};
