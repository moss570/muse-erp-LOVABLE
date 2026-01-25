import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailTemplate {
  id: string;
  email_type: string;
  template_name: string;
  subject: string;
  heading: string | null;
  body_text: string;
  button_text: string | null;
  footer_text: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_name');

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
}

export function useEmailTemplate(emailType: string) {
  return useQuery({
    queryKey: ['email-template', emailType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('email_type', emailType)
        .single();

      if (error) throw error;
      return data as EmailTemplate;
    },
    enabled: !!emailType,
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at' | 'email_type'>>;
    }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Email template updated');
    },
    onError: (error) => {
      console.error('Failed to update email template:', error);
      toast.error('Failed to update email template');
    },
  });
}

export function useTestEmailTemplate() {
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

// Default templates for reset functionality
export const DEFAULT_EMAIL_TEMPLATES: Record<string, Partial<EmailTemplate>> = {
  employee_welcome: {
    subject: 'Welcome to {{COMPANY_NAME}} - Set Up Your Account',
    heading: 'Welcome to the Team!',
    body_text: "Your account has been created for {{COMPANY_NAME}}'s management system. To get started, please set your password using the button below.",
    button_text: 'Set My Password',
    footer_text: 'This link will expire in 24 hours for security reasons.',
  },
  password_reset: {
    subject: 'Password Reset Request',
    heading: 'Password Reset Request',
    body_text: 'You requested to reset your password. Click the button below to set a new password.',
    button_text: 'Reset Password',
    footer_text: "If you didn't request this, you can safely ignore this email.",
  },
  admin_password_reset: {
    subject: 'Password Reset Request',
    heading: 'Password Reset Request',
    body_text: 'A password reset has been requested for your account. Click the button below to set a new password.',
    button_text: 'Reset Password',
    footer_text: "If you didn't request this password reset, you can safely ignore this email.",
  },
};

// Helper to get email template labels
export const EMAIL_TEMPLATE_LABELS: Record<string, { label: string; description: string }> = {
  employee_welcome: { 
    label: 'Employee Welcome', 
    description: 'Sent when a new employee account is created' 
  },
  password_reset: { 
    label: 'Password Reset (Public)', 
    description: 'Sent when a user requests a password reset from the login page' 
  },
  admin_password_reset: { 
    label: 'Password Reset (Admin)', 
    description: 'Sent when an admin resets a user\'s password' 
  },
};

// Available merge fields
export const MERGE_FIELDS = [
  { field: '{{COMPANY_NAME}}', description: 'Your company name from settings' },
  { field: '{{FIRST_NAME}}', description: "Recipient's first name (welcome emails only)" },
];
