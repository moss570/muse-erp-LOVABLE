import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  QAApprovalSetting, 
  QACheckDefinition, 
  QACheckTier, 
  QAEntityType,
  ConditionalDurationMaterials,
  ConditionalDurationEntities
} from '@/types/qa-checks';

// Fetch all QA settings
export function useQASettings() {
  return useQuery({
    queryKey: ['qa-approval-settings'],
    queryFn: async (): Promise<QAApprovalSetting[]> => {
      const { data, error } = await supabase
        .from('qa_approval_settings')
        .select('*')
        .order('setting_key');
      
      if (error) throw error;
      
      // Map and cast the data to our expected type
      return (data || []).map(item => ({
        id: item.id,
        setting_key: item.setting_key,
        setting_value: item.setting_value as Record<string, any> | string | number,
        description: item.description,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    },
  });
}

// Get a specific setting by key
export function useQASetting(settingKey: string) {
  const { data: settings, ...rest } = useQASettings();
  
  const setting = settings?.find(s => s.setting_key === settingKey);
  
  return {
    ...rest,
    data: setting,
    value: setting?.setting_value,
  };
}

// Get conditional duration for material category
export function useConditionalDurationMaterials() {
  const { data: settings } = useQASettings();
  const setting = settings?.find(s => s.setting_key === 'conditional_duration_materials');
  return (setting?.setting_value as ConditionalDurationMaterials) || {
    Ingredients: 14,
    Packaging: 30,
    Boxes: 30,
    Chemical: 21,
    Supplies: 45,
    Maintenance: 45,
    'Direct Sale': 14,
  };
}

// Get conditional duration for entities
export function useConditionalDurationEntities() {
  const { data: settings } = useQASettings();
  const setting = settings?.find(s => s.setting_key === 'conditional_duration_entities');
  return (setting?.setting_value as ConditionalDurationEntities) || {
    suppliers: 30,
    products: 14,
    production_lots: 7,
  };
}

// Get document expiry warning days
export function useDocumentExpiryWarningDays() {
  const { data: settings } = useQASettings();
  const setting = settings?.find(s => s.setting_key === 'document_expiry_warning_days');
  return typeof setting?.setting_value === 'string' 
    ? parseInt(setting.setting_value, 10) 
    : (setting?.setting_value as number) || 30;
}

// Mutation to update settings
export function useQASettingsMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Array<{ setting_key: string; setting_value: any }>) => {
      const results = await Promise.all(
        updates.map(async ({ setting_key, setting_value }) => {
          const { data, error } = await supabase
            .from('qa_approval_settings')
            .update({ 
              setting_value: typeof setting_value === 'object' 
                ? setting_value 
                : String(setting_value)
            })
            .eq('setting_key', setting_key)
            .select()
            .single();
          
          if (error) throw error;
          return data;
        })
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-approval-settings'] });
      toast.success('QA settings updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update QA settings:', error);
      toast.error('Failed to update settings');
    },
  });
}

// Fetch check definitions with optional filters
interface CheckDefinitionFilters {
  tier?: QACheckTier;
  entityType?: QAEntityType;
  activeOnly?: boolean;
}

export function useQACheckDefinitions(filters?: CheckDefinitionFilters) {
  return useQuery({
    queryKey: ['qa-check-definitions', filters],
    queryFn: async (): Promise<QACheckDefinition[]> => {
      let query = supabase
        .from('qa_check_definitions')
        .select('*')
        .order('sort_order');
      
      if (filters?.tier) {
        query = query.eq('tier', filters.tier);
      }
      
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      
      if (filters?.activeOnly !== false) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as QACheckDefinition[];
    },
  });
}

// Mutation to update check definition
export function useQACheckDefinitionMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (update: Partial<QACheckDefinition> & { id: string }) => {
      const { id, ...rest } = update;
      const { data, error } = await supabase
        .from('qa_check_definitions')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-check-definitions'] });
      toast.success('Check definition updated');
    },
    onError: (error) => {
      console.error('Failed to update check definition:', error);
      toast.error('Failed to update check definition');
    },
  });
}
