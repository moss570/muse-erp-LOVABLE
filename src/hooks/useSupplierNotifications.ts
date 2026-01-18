import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface SupplierNotificationPayload {
  type: 'probation_triggered' | 'score_warning' | 'status_changed' | 'review_required' | 'capa_created';
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  details: {
    score?: number;
    grade?: string;
    previousStatus?: string;
    newStatus?: string;
    triggeredRules?: string[];
    reason?: string;
    capaNumber?: string;
    capaTitle?: string;
  };
  recipientUserIds?: string[];
}

export interface SupplierAtRisk {
  id: string;
  name: string;
  code: string;
  approval_status: string;
  current_score?: number;
  current_grade?: string;
  open_capas?: number;
  rejection_rate?: string;
}

// ============================================
// SEND NOTIFICATION
// ============================================

export function useSendSupplierNotification() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: SupplierNotificationPayload) => {
      // For now, we log to approval_logs as a notification audit trail
      // This can be extended to send emails via edge functions
      
      const logEntry = {
        related_table_name: 'suppliers',
        related_record_id: payload.supplierId,
        action: payload.type,
        previous_status: payload.details.previousStatus || null,
        new_status: payload.details.newStatus || null,
        notes: getNotificationMessage(payload),
        metadata: {
          notification_type: payload.type,
          supplier_name: payload.supplierName,
          supplier_code: payload.supplierCode,
          score: payload.details.score,
          grade: payload.details.grade,
          triggered_rules: payload.details.triggeredRules,
          capa_number: payload.details.capaNumber,
        },
        user_id: user?.id,
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('approval_logs')
        .insert(logEntry);

      if (error) throw error;

      // TODO: Send email notifications via edge function
      // await supabase.functions.invoke('send-supplier-alert-email', { body: payload });

      return { success: true, message: getNotificationMessage(payload) };
    },
    onSuccess: (result) => {
      // Silent success - notifications are background operations
      console.log('Supplier notification logged:', result.message);
    },
    onError: (error: Error) => {
      console.error('Failed to log supplier notification:', error);
    },
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getNotificationTitle(payload: SupplierNotificationPayload): string {
  switch (payload.type) {
    case 'probation_triggered':
      return `⚠️ Supplier Probation: ${payload.supplierName}`;
    case 'score_warning':
      return `📉 Low Score Alert: ${payload.supplierName}`;
    case 'status_changed':
      return `🔄 Status Changed: ${payload.supplierName}`;
    case 'review_required':
      return `👀 Review Required: ${payload.supplierName}`;
    case 'capa_created':
      return `🔧 CAPA Created: ${payload.supplierName}`;
    default:
      return `Supplier Alert: ${payload.supplierName}`;
  }
}

function getNotificationMessage(payload: SupplierNotificationPayload): string {
  switch (payload.type) {
    case 'probation_triggered':
      return `${payload.supplierName} has been flagged for probation. Score: ${payload.details.score} (${payload.details.grade}). ${payload.details.triggeredRules?.length || 0} rule(s) triggered.`;
    case 'score_warning':
      return `${payload.supplierName}'s performance score dropped to ${payload.details.score} (${payload.details.grade}).`;
    case 'status_changed':
      return `${payload.supplierName}'s status changed from ${payload.details.previousStatus} to ${payload.details.newStatus}. Reason: ${payload.details.reason || 'Not specified'}`;
    case 'review_required':
      return `${payload.supplierName} requires review. Score: ${payload.details.score}. Please evaluate their performance.`;
    case 'capa_created':
      return `CAPA ${payload.details.capaNumber} created for ${payload.supplierName}: ${payload.details.capaTitle}`;
    default:
      return `Action required for ${payload.supplierName}.`;
  }
}

// ============================================
// SUPPLIERS AT RISK
// ============================================

export function useSuppliersAtRisk() {
  return useQuery({
    queryKey: ['suppliers-at-risk'],
    queryFn: async () => {
      // Get all active suppliers with their approval status
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name, code, approval_status')
        .eq('is_active', true)
        .or('approval_status.eq.Probation,approval_status.eq.Draft,approval_status.eq.Pending_QA');

      if (suppliersError) throw suppliersError;

      // If no problem suppliers by status, check by score
      if (!suppliers || suppliers.length === 0) {
        // Get all active suppliers and calculate scores
        const { data: allSuppliers, error: allError } = await supabase
          .from('suppliers')
          .select('id, name, code, approval_status')
          .eq('is_active', true)
          .limit(50);

        if (allError) throw allError;

        // For now, return empty - scores are calculated dynamically in the component
        return [];
      }

      // Enrich with CAPA counts for probation suppliers
      const enrichedSuppliers: SupplierAtRisk[] = await Promise.all(
        suppliers.map(async (supplier) => {
          // Get open CAPAs count
          const { count: openCapas } = await supabase
            .from('corrective_actions')
            .select('id', { count: 'exact', head: true })
            .eq('supplier_id', supplier.id)
            .not('status', 'in', '("closed","cancelled")');

          return {
            ...supplier,
            open_capas: openCapas || 0,
          };
        })
      );

      // Sort by status priority (Probation first) and then by open CAPAs
      return enrichedSuppliers.sort((a, b) => {
        if (a.approval_status === 'Probation' && b.approval_status !== 'Probation') return -1;
        if (b.approval_status === 'Probation' && a.approval_status !== 'Probation') return 1;
        return (b.open_capas || 0) - (a.open_capas || 0);
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// SUPPLIER SCORE HISTORY (for trend analysis)
// ============================================

export function useSupplierScoreHistory(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-score-history', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];

      // Get approval logs with score metadata
      const { data, error } = await supabase
        .from('approval_logs')
        .select('*')
        .eq('related_table_name', 'suppliers')
        .eq('related_record_id', supplierId)
        .in('action', ['score_warning', 'probation_triggered', 'status_changed'])
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!supplierId,
  });
}

// ============================================
// CHANGE SUPPLIER STATUS WITH NOTIFICATION
// ============================================

export function useChangeSupplierStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sendNotification = useSendSupplierNotification();

  return useMutation({
    mutationFn: async ({
      supplierId,
      newStatus,
      reason,
      isAutomatic = false,
    }: {
      supplierId: string;
      newStatus: string;
      reason?: string;
      isAutomatic?: boolean;
    }) => {
      // Get current supplier data
      const { data: supplier, error: fetchError } = await supabase
        .from('suppliers')
        .select('id, name, code, approval_status')
        .eq('id', supplierId)
        .single();

      if (fetchError) throw fetchError;

      const previousStatus = supplier.approval_status;

      // Update supplier status
      const { data, error } = await supabase
        .from('suppliers')
        .update({
          approval_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', supplierId)
        .select()
        .single();

      if (error) throw error;

      // Log the status change
      await supabase.from('approval_logs').insert({
        related_table_name: 'suppliers',
        related_record_id: supplierId,
        action: isAutomatic ? 'auto_status_change' : 'status_changed',
        previous_status: previousStatus,
        new_status: newStatus,
        notes: reason || `Status changed to ${newStatus}${isAutomatic ? ' (automatic)' : ''}`,
        user_id: user?.id,
        timestamp: new Date().toISOString(),
      });

      // Send notification
      await sendNotification.mutateAsync({
        type: 'status_changed',
        supplierId,
        supplierName: supplier.name,
        supplierCode: supplier.code,
        details: {
          previousStatus,
          newStatus,
          reason,
        },
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-at-risk'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', data.id] });
      toast.success('Supplier status updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update supplier status', {
        description: error.message,
      });
    },
  });
}
