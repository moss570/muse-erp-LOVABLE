import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, addHours, addDays } from 'date-fns';
import type { 
  ProductionQAFailureData, 
  ProductionFailureCategory,
} from '@/types/production-qa';
import { PRODUCTION_FAILURE_CONFIG } from '@/types/production-qa';
import type { CapaSeverity, CapaType } from '@/types/capa';

interface CreateCapaFromProductionParams {
  failureData: ProductionQAFailureData;
  severity?: CapaSeverity;
  capaType?: CapaType;
  additionalNotes?: string;
  assignTo?: string;
}

function getDefaultSeverity(category: ProductionFailureCategory): CapaSeverity {
  return PRODUCTION_FAILURE_CONFIG[category]?.defaultSeverity || 'minor';
}

function getDefaultCapaType(category: ProductionFailureCategory): CapaType {
  return (PRODUCTION_FAILURE_CONFIG[category]?.defaultCapaType as CapaType) || 'product';
}

function buildCapaTitle(data: ProductionQAFailureData): string {
  const categoryLabel = PRODUCTION_FAILURE_CONFIG[data.failure_category]?.label || data.failure_category;
  return `Production QA: ${categoryLabel} - ${data.product_name} (Lot ${data.lot_number})`;
}

function buildCapaDescription(data: ProductionQAFailureData): string {
  const parts: string[] = [];
  
  parts.push(`**Failure Category:** ${PRODUCTION_FAILURE_CONFIG[data.failure_category]?.label || data.failure_category}`);
  parts.push('');
  parts.push('## Production Details');
  parts.push(`**Product:** ${data.product_name} (${data.product_sku})`);
  parts.push(`**Lot Number:** ${data.lot_number}`);
  parts.push(`**Production Date:** ${data.production_date}`);
  
  if (data.line_name) {
    parts.push(`**Production Line:** ${data.line_name}`);
  }
  
  if (data.machine_name) {
    parts.push(`**Equipment:** ${data.machine_name}`);
  }
  
  if (data.operator_name) {
    parts.push(`**Operator:** ${data.operator_name}`);
  }
  
  if (data.batch_size) {
    parts.push(`**Batch Size:** ${data.batch_size}`);
  }
  
  if (data.quantity_affected) {
    parts.push(`**Quantity Affected:** ${data.quantity_affected}`);
  }
  
  // Test-specific details
  if (data.test_name) {
    parts.push('');
    parts.push('## Test Details');
    parts.push(`**Test Name:** ${data.test_name}`);
    if (data.test_type) parts.push(`**Test Type:** ${data.test_type}`);
    if (data.expected_value) parts.push(`**Expected Value:** ${data.expected_value} ${data.unit_of_measure || ''}`);
    if (data.actual_value) parts.push(`**Actual Value:** ${data.actual_value} ${data.unit_of_measure || ''}`);
  }
  
  // Ingredient info for material issues
  if (data.ingredient_lot_numbers && data.ingredient_lot_numbers.length > 0) {
    parts.push('');
    parts.push('## Related Ingredients');
    parts.push(`**Ingredient Lots:** ${data.ingredient_lot_numbers.join(', ')}`);
  }
  
  parts.push('');
  parts.push('## Failure Description');
  parts.push(data.failure_reason);
  
  return parts.join('\n');
}

export function useCreateCapaFromProduction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      failureData,
      severity,
      capaType,
      additionalNotes,
      assignTo,
    }: CreateCapaFromProductionParams) => {
      // Generate CAPA number
      const { data: capaNumber, error: numError } = await supabase.rpc('generate_capa_number');
      if (numError) throw numError;

      const finalSeverity = severity || getDefaultSeverity(failureData.failure_category);
      const finalCapaType = capaType || getDefaultCapaType(failureData.failure_category);

      // Get severity settings for due date calculation
      const { data: settings, error: settingsError } = await supabase
        .from('capa_severity_settings')
        .select('*')
        .eq('severity', finalSeverity)
        .single();
      if (settingsError) throw settingsError;

      const now = new Date();
      const description = buildCapaDescription(failureData) + 
        (additionalNotes ? `\n\n**Additional Notes:**\n${additionalNotes}` : '');

      const dueDates = {
        containment_due_date: addHours(now, settings.containment_hours).toISOString(),
        root_cause_due_date: addHours(now, settings.root_cause_hours).toISOString(),
        corrective_action_due_date: format(addDays(now, settings.corrective_action_days), 'yyyy-MM-dd'),
        preventive_action_due_date: format(addDays(now, settings.preventive_action_days), 'yyyy-MM-dd'),
        verification_due_date: format(addDays(now, settings.verification_days), 'yyyy-MM-dd'),
        effectiveness_review_due_date: format(addDays(now, settings.effectiveness_review_days), 'yyyy-MM-dd'),
      };

      // Create the CAPA
      const { data: capa, error: capaError } = await supabase
        .from('corrective_actions')
        .insert({
          capa_number: capaNumber,
          capa_type: finalCapaType,
          severity: finalSeverity,
          status: 'open',
          source_type: 'production',
          source_id: failureData.production_lot_id,
          
          product_id: failureData.product_id,
          production_lot_id: failureData.production_lot_id,
          equipment_id: failureData.machine_id || null,
          employee_id: failureData.operator_id || null,
          
          title: buildCapaTitle(failureData),
          description,
          occurrence_date: failureData.production_date,
          discovery_date: format(now, 'yyyy-MM-dd'),
          
          ...dueDates,
          assigned_to: assignTo || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (capaError) throw capaError;

      // Link CAPA to production lot
      await supabase
        .from('production_lots')
        .update({ 
          capa_id: capa.id,
          failure_category: failureData.failure_category,
        })
        .eq('id', failureData.production_lot_id);

      // Link CAPA to specific test if provided
      if (failureData.test_id) {
        await supabase
          .from('production_lot_qa_tests')
          .update({ 
            capa_id: capa.id,
            failure_category: failureData.failure_category,
          })
          .eq('id', failureData.test_id);
      }

      // Log activity
      await supabase.from('capa_activity_log').insert({
        capa_id: capa.id,
        action: 'created',
        comment: `CAPA created from production QA failure. Lot: ${failureData.lot_number}, Category: ${failureData.failure_category}`,
        performed_by: user?.id,
      });

      return capa;
    },
    onSuccess: (capa) => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      queryClient.invalidateQueries({ queryKey: ['production-lots'] });
      queryClient.invalidateQueries({ queryKey: ['production-qa-tests'] });
      
      toast.success('CAPA Created', {
        description: `${capa.capa_number} has been created from the production failure.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create CAPA', { description: error.message });
    },
  });
}

// Get CAPA(s) linked to a production lot
export function useProductionLotCapas(productionLotId?: string) {
  return useQuery({
    queryKey: ['production-lot-capas', productionLotId],
    queryFn: async () => {
      if (!productionLotId) return [];

      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          id, capa_number, title, severity, status, created_at,
          assigned_to_profile:profiles!corrective_actions_assigned_to_fkey(first_name, last_name)
        `)
        .eq('production_lot_id', productionLotId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!productionLotId,
  });
}

// Get CAPA settings for production
export function useProductionCapaSettings() {
  return useQuery({
    queryKey: ['production-capa-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capa_settings')
        .select('setting_key, setting_value, setting_type')
        .in('setting_key', [
          'auto_suggest_capa_on_test_fail',
          'require_capa_for_batch_rejection',
          'require_capa_for_batch_hold',
          'production_capa_severity_mapping'
        ]);

      if (error) throw error;

      const settings: Record<string, boolean | object> = {};
      data?.forEach(row => {
        let value: boolean | object = row.setting_value as unknown as boolean;
        if (row.setting_type === 'boolean') value = row.setting_value === 'true';
        else if (row.setting_type === 'json') value = JSON.parse(row.setting_value);
        settings[row.setting_key] = value;
      });

      return settings;
    },
  });
}
