import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ApprovalStatus = 'Draft' | 'Pending_QA' | 'Approved' | 'Rejected' | 'Archived';
export type ApprovalAction = 'Created' | 'Submitted' | 'Approved' | 'Rejected' | 'Archived' | 'Updated' | 'Restored';
export type RelatedTableName = 'materials' | 'products' | 'production_lots' | 'po_receiving_sessions' | 'suppliers' | 'compliance_documents';

interface ApprovalLog {
  id: string;
  related_record_id: string;
  related_table_name: RelatedTableName;
  action: ApprovalAction;
  previous_status: string | null;
  new_status: string | null;
  user_id: string | null;
  timestamp: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface QAPendingItem {
  id: string;
  table_name: string;
  item_name: string;
  item_code: string;
  approval_status: string;
  created_at: string;
  updated_at: string;
  qa_verified_by: string | null;
}

interface StaleDraftItem {
  id: string;
  table_name: string;
  item_name: string;
  item_code: string;
  approval_status: string;
  created_at: string;
  updated_at: string;
  days_stale: number;
}

interface DocumentExpirationItem {
  id: string;
  related_entity_id: string;
  related_entity_type: string;
  document_type: string;
  document_name: string;
  file_url: string | null;
  expiration_date: string;
  uploaded_by: string | null;
  created_at: string;
  expiration_status: 'expired' | 'expiring_soon' | 'valid';
  entity_name: string;
}

// Hook to fetch approval logs for a specific record
export function useApprovalLogs(recordId: string, tableName: RelatedTableName) {
  return useQuery({
    queryKey: ['approval-logs', recordId, tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_logs')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq('related_record_id', recordId)
        .eq('related_table_name', tableName)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data as ApprovalLog[];
    },
    enabled: !!recordId,
  });
}

// Hook to perform approval actions
export function useApprovalAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      recordId,
      tableName,
      action,
      notes,
      newStatus,
    }: {
      recordId: string;
      tableName: RelatedTableName;
      action: ApprovalAction;
      notes?: string;
      newStatus: ApprovalStatus;
    }) => {
      // Get current status based on table
      let previousStatus: string | null = null;
      
      if (tableName !== 'compliance_documents') {
        const { data: currentRecord, error: fetchError } = await supabase
          .from(tableName as 'materials')
          .select('approval_status')
          .eq('id', recordId)
          .single();
        if (fetchError) throw fetchError;
        previousStatus = currentRecord?.approval_status || null;
      }

      // Update the record's approval status
      const updateData: Record<string, unknown> = {
        approval_status: newStatus,
      };

      // If approving, set QA verification fields
      if (action === 'Approved') {
        updateData.qa_verified_at = new Date().toISOString();
        updateData.qa_verified_by = user?.id;
      }

      const { error: updateError } = await supabase
        .from(tableName as 'materials')
        .update(updateData)
        .eq('id', recordId);

      if (updateError) throw updateError;

      // Log the action
      const { error: logError } = await supabase.from('approval_logs').insert({
        related_record_id: recordId,
        related_table_name: tableName,
        action,
        previous_status: previousStatus,
        new_status: newStatus,
        user_id: user?.id,
        notes: notes || null,
      });

      if (logError) throw logError;

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval-logs', variables.recordId] });
      queryClient.invalidateQueries({ queryKey: [variables.tableName] });
      queryClient.invalidateQueries({ queryKey: ['qa-pending-items'] });
      queryClient.invalidateQueries({ queryKey: ['stale-draft-items'] });
      toast.success(`Item ${variables.action.toLowerCase()} successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

// Hook to fetch QA pending items
export function useQAPendingItems() {
  return useQuery({
    queryKey: ['qa-pending-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_pending_items')
        .select('*');

      if (error) throw error;
      return data as QAPendingItem[];
    },
  });
}

// Hook to fetch stale draft items (>7 days old)
export function useStaleDraftItems() {
  return useQuery({
    queryKey: ['stale-draft-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stale_draft_items')
        .select('*')
        .order('days_stale', { ascending: false });

      if (error) throw error;
      return data as StaleDraftItem[];
    },
  });
}

// Hook to fetch document expiration watchlist
export function useDocumentExpirationWatchlist() {
  return useQuery({
    queryKey: ['document-expiration-watchlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_expiration_watchlist')
        .select('*');

      if (error) throw error;
      return data as DocumentExpirationItem[];
    },
  });
}

// Hook to fetch end-of-day blockers
export function useEndOfDayBlockers(date: string) {
  return useQuery({
    queryKey: ['end-of-day-blockers', date],
    queryFn: async () => {
      // Fetch open receiving sessions for the day
      const { data: receivingSessions, error: rsError } = await supabase
        .from('po_receiving_sessions')
        .select(`
          id,
          session_date,
          status,
          notes,
          purchase_orders (
            po_number,
            suppliers (name)
          )
        `)
        .eq('session_date', date)
        .neq('status', 'completed');

      if (rsError) throw rsError;

      // Fetch open production lots for the day
      const { data: productionLots, error: plError } = await supabase
        .from('production_lots')
        .select(`
          id,
          lot_number,
          production_date,
          status,
          products (name)
        `)
        .eq('production_date', date)
        .in('status', ['in_progress', 'pending', 'scheduled']);

      if (plError) throw plError;

      // Fetch open BOLs for the day
      const { data: billsOfLading, error: bolError } = await supabase
        .from('bills_of_lading')
        .select(`
          id,
          bol_number,
          ship_date,
          status,
          from_location:from_location_id (name),
          to_location:to_location_id (name)
        `)
        .eq('ship_date', date)
        .neq('status', 'delivered');

      if (bolError) throw bolError;

      return {
        receivingSessions: receivingSessions || [],
        productionLots: productionLots || [],
        billsOfLading: billsOfLading || [],
        totalBlockers: (receivingSessions?.length || 0) + (productionLots?.length || 0) + (billsOfLading?.length || 0),
      };
    },
  });
}

// Hook to check if a material is approved for production
export function useMaterialApprovalCheck(materialId: string) {
  return useQuery({
    queryKey: ['material-approval-check', materialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('id, name, approval_status')
        .eq('id', materialId)
        .single();

      if (error) throw error;
      return {
        isApproved: data?.approval_status === 'Approved',
        status: data?.approval_status,
        name: data?.name,
      };
    },
    enabled: !!materialId,
  });
}

// Hook to get recent approval activity
export function useRecentApprovalActivity(limit = 10) {
  return useQuery({
    queryKey: ['recent-approval-activity', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_logs')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ApprovalLog[];
    },
  });
}
