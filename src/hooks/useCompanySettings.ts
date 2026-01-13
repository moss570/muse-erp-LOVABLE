import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompanySettings {
  id: string;
  company_name: string;
  company_prefix: string | null;
  gs1_company_prefix: string | null;
  default_packaging_indicator: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  logo_path: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as CompanySettings;
    },
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Omit<CompanySettings, 'id' | 'created_at' | 'updated_at'>>) => {
      // Get the single company settings record
      const { data: existing, error: fetchError } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('company_settings')
        .update(input)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as CompanySettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Company settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update company settings: ${error.message}`);
    },
  });
}

// Helper function to format full address
export function formatCompanyAddress(settings: CompanySettings | undefined): string {
  if (!settings) return '';
  
  const parts = [
    settings.address_line1,
    settings.address_line2,
    [settings.city, settings.state, settings.zip].filter(Boolean).join(', '),
  ].filter(Boolean);
  
  return parts.join(', ');
}
