import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, addHours, addDays } from 'date-fns';
import type { ReceivingRejectionData, RejectionCategory, REJECTION_CATEGORY_CONFIG } from '@/types/receiving';
import type { CapaSeverity } from '@/types/capa';

interface CreateCapaFromRejectionParams {
  rejectionData: ReceivingRejectionData;
  severity?: CapaSeverity;
  additionalNotes?: string;
  assignTo?: string;
}

// Get default severity based on rejection category
function getDefaultSeverity(category: RejectionCategory): CapaSeverity {
  const severityMap: Record<RejectionCategory, CapaSeverity> = {
    contamination: 'critical',
    temperature: 'major',
    quality: 'major',
    specification: 'major',
    expiration: 'major',
    documentation: 'minor',
    packaging: 'minor',
    quantity: 'minor',
    other: 'minor',
  };
  return severityMap[category] || 'minor';
}

// Category labels for display
const CATEGORY_LABELS: Record<RejectionCategory, string> = {
  temperature: 'Temperature Excursion',
  contamination: 'Contamination/Foreign Material',
  quality: 'Quality Defect',
  specification: 'Out of Specification',
  documentation: 'Documentation Issue',
  packaging: 'Packaging Damage',
  quantity: 'Quantity Discrepancy',
  expiration: 'Expiration/Dating Issue',
  other: 'Other',
};

// Build CAPA title from rejection data
export function buildCapaTitle(data: ReceivingRejectionData): string {
  const categoryLabel = CATEGORY_LABELS[data.rejection_category] || data.rejection_category;
  return `Receiving Rejection: ${categoryLabel} - ${data.material_name} from ${data.supplier_name}`;
}

// Build CAPA description from rejection data
function buildCapaDescription(data: ReceivingRejectionData): string {
  const parts: string[] = [];
  
  parts.push(`**Rejection Category:** ${CATEGORY_LABELS[data.rejection_category] || data.rejection_category}`);
  parts.push('');
  parts.push(`**Supplier:** ${data.supplier_name} (${data.supplier_code})`);
  parts.push(`**Material:** ${data.material_name} (${data.material_code})`);
  parts.push(`**Lot Number:** ${data.lot_number}`);
  
  if (data.internal_lot_number) {
    parts.push(`**Internal Lot:** ${data.internal_lot_number}`);
  }
  
  if (data.po_number) {
    parts.push(`**PO Number:** ${data.po_number}`);
  }
  
  if (data.quantity_received !== undefined) {
    parts.push(`**Quantity Received:** ${data.quantity_received} ${data.unit_of_measure || ''}`);
  }
  
  if (data.quantity_rejected !== undefined) {
    parts.push(`**Quantity Rejected:** ${data.quantity_rejected} ${data.unit_of_measure || ''}`);
  }
  
  // Temperature details for temperature rejections
  if (data.rejection_category === 'temperature' && data.temperature_reading !== undefined) {
    parts.push('');
    parts.push('**Temperature Details:**');
    parts.push(`- Actual Reading: ${data.temperature_reading}°F`);
    if (data.temperature_required_min !== undefined && data.temperature_required_max !== undefined) {
      parts.push(`- Required Range: ${data.temperature_required_min}°F - ${data.temperature_required_max}°F`);
    }
  }
  
  parts.push('');
  parts.push('**Rejection Reason:**');
  parts.push(data.rejection_reason);
  
  return parts.join('\n');
}

export function useCreateCapaFromRejection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      rejectionData,
      severity,
      additionalNotes,
      assignTo,
    }: CreateCapaFromRejectionParams) => {
      // Generate CAPA number
      const { data: capaNumber, error: numError } = await supabase.rpc('generate_capa_number');
      if (numError) throw numError;

      // Determine severity
      const finalSeverity = severity || getDefaultSeverity(rejectionData.rejection_category);

      // Get severity settings for due date calculation
      const { data: settings, error: settingsError } = await supabase
        .from('capa_severity_settings')
        .select('*')
        .eq('severity', finalSeverity)
        .single();
      
      // Use default values if settings not found
      const severitySettings = settings || {
        containment_hours: 24,
        root_cause_hours: 72,
        corrective_action_days: 14,
        preventive_action_days: 30,
        verification_days: 45,
        effectiveness_review_days: 90,
      };

      const now = new Date();
      const description = buildCapaDescription(rejectionData) + 
        (additionalNotes ? `\n\n**Additional Notes:**\n${additionalNotes}` : '');

      // Calculate due dates based on severity
      const dueDates = {
        containment_due_date: addHours(now, severitySettings.containment_hours).toISOString(),
        root_cause_due_date: addHours(now, severitySettings.root_cause_hours).toISOString(),
        corrective_action_due_date: format(addDays(now, severitySettings.corrective_action_days), 'yyyy-MM-dd'),
        preventive_action_due_date: format(addDays(now, severitySettings.preventive_action_days), 'yyyy-MM-dd'),
        verification_due_date: format(addDays(now, severitySettings.verification_days), 'yyyy-MM-dd'),
        effectiveness_review_due_date: format(addDays(now, severitySettings.effectiveness_review_days), 'yyyy-MM-dd'),
      };

      // Create the CAPA
      const { data: capa, error: capaError } = await supabase
        .from('corrective_actions')
        .insert({
          capa_number: capaNumber,
          capa_type: 'supplier', // Receiving rejections are supplier issues
          severity: finalSeverity,
          status: 'open',
          source_type: 'receiving',
          source_id: rejectionData.receiving_lot_id || rejectionData.receiving_item_id,
          
          // Entity references
          supplier_id: rejectionData.supplier_id,
          material_id: rejectionData.material_id,
          receiving_lot_id: rejectionData.receiving_lot_id,
          
          // Problem description
          title: buildCapaTitle(rejectionData),
          description,
          occurrence_date: format(now, 'yyyy-MM-dd'),
          discovery_date: format(now, 'yyyy-MM-dd'),
          
          // Due dates
          ...dueDates,
          
          // Assignment
          assigned_to: assignTo || null,
          
          // Metadata
          created_by: user?.id,
        })
        .select()
        .single();

      if (capaError) throw capaError;

      // Link the CAPA back to the receiving record
      if (rejectionData.receiving_lot_id) {
        await supabase
          .from('receiving_lots')
          .update({ 
            capa_id: capa.id,
            rejection_category: rejectionData.rejection_category,
          })
          .eq('id', rejectionData.receiving_lot_id);
      }

      if (rejectionData.receiving_item_id) {
        await supabase
          .from('po_receiving_items')
          .update({ 
            capa_id: capa.id,
            rejection_category: rejectionData.rejection_category,
          })
          .eq('id', rejectionData.receiving_item_id);
      }

      // Log CAPA creation activity
      await supabase.from('capa_activity_log').insert({
        capa_id: capa.id,
        action: 'created',
        comment: `CAPA created from receiving rejection. Lot: ${rejectionData.lot_number}, Category: ${rejectionData.rejection_category}`,
        performed_by: user?.id,
      });

      return capa;
    },
    onSuccess: (capa) => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      queryClient.invalidateQueries({ queryKey: ['receiving-lots'] });
      queryClient.invalidateQueries({ queryKey: ['receiving-items'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-metrics'] });
      
      toast.success('CAPA Created', {
        description: `${capa.capa_number} has been created from the rejection.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create CAPA', {
        description: error.message,
      });
    },
  });
}

// Hook to get CAPA details for a receiving lot/item
export function useReceivingCapa(receivingLotId?: string, receivingItemId?: string) {
  return useQuery({
    queryKey: ['receiving-capa', receivingLotId, receivingItemId],
    queryFn: async () => {
      if (!receivingLotId && !receivingItemId) return null;

      let query = supabase
        .from('corrective_actions')
        .select(`
          id,
          capa_number,
          title,
          severity,
          status,
          created_at,
          assigned_to_profile:profiles!corrective_actions_assigned_to_fkey(first_name, last_name)
        `)
        .eq('source_type', 'receiving');

      if (receivingLotId) {
        query = query.eq('receiving_lot_id', receivingLotId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!(receivingLotId || receivingItemId),
  });
}

// Hook to check if CAPA is required/suggested based on settings
export function useCapaSuggestionSettings() {
  return useQuery({
    queryKey: ['capa-suggestion-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capa_settings')
        .select('setting_key, setting_value, setting_type')
        .in('setting_key', ['auto_suggest_capa_on_rejection', 'require_capa_for_rejection', 'auto_capa_severity_mapping']);

      if (error) throw error;

      const settings: Record<string, unknown> = {};
      data?.forEach(row => {
        let value: unknown = row.setting_value;
        if (row.setting_type === 'boolean') value = value === 'true';
        else if (row.setting_type === 'json') {
          try {
            value = JSON.parse(row.setting_value);
          } catch {
            value = {};
          }
        }
        settings[row.setting_key] = value;
      });

      return {
        auto_suggest_capa_on_rejection: (settings.auto_suggest_capa_on_rejection as boolean) ?? true,
        require_capa_for_rejection: (settings.require_capa_for_rejection as boolean) ?? false,
        auto_capa_severity_mapping: (settings.auto_capa_severity_mapping as Record<RejectionCategory, CapaSeverity>) ?? {},
      };
    },
  });
}

// Hook to get profiles for assignment
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');

      if (error) throw error;
      return data;
    },
  });
}
