import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ApprovalStatus = 'Draft' | 'Pending_QA' | 'Approved' | 'Rejected' | 'Archived';
export type ApprovalAction = 'Created' | 'Submitted' | 'Approved' | 'Rejected' | 'Archived' | 'Updated' | 'Restored';
export type RelatedTableName = 'materials' | 'products' | 'production_lots' | 'po_receiving_sessions' | 'suppliers' | 'compliance_documents' | 'receiving_lots';

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
      
      // Handle receiving_lots differently as it uses qa_status instead of approval_status
      if (tableName === 'receiving_lots') {
        const { data: currentRecord, error: fetchError } = await supabase
          .from('receiving_lots')
          .select('qa_status, internal_lot_number')
          .eq('id', recordId)
          .single();
        if (fetchError) throw fetchError;
        previousStatus = currentRecord?.qa_status || null;

        // Map approval status to qa_status values
        const qaStatusMap: Record<string, string> = {
          Approved: 'approved',
          Rejected: 'rejected',
          Pending_QA: 'pending_qa',
          Draft: 'pending_qa',
        };

        const updateData: Record<string, unknown> = {
          qa_status: qaStatusMap[newStatus] || String(newStatus).toLowerCase(),
        };

        if (action === 'Approved') {
          updateData.qa_approved_at = new Date().toISOString();
          updateData.qa_approved_by = user?.id;
          // Release the lot for use
          updateData.status = 'available';
        } else if (action === 'Rejected') {
          updateData.status = 'hold';
        }

        const { error: updateError } = await supabase
          .from('receiving_lots')
          .update(updateData)
          .eq('id', recordId);

        if (updateError) throw updateError;

        // Keep the receiving line item in sync (Receiving screen renders inspection_status)
        if (action === 'Approved') {
          await supabase
            .from('po_receiving_items')
            .update({ inspection_status: 'approved' })
            .eq('receiving_lot_id', recordId);
        } else if (action === 'Rejected') {
          await supabase
            .from('po_receiving_items')
            .update({ inspection_status: 'hold' })
            .eq('receiving_lot_id', recordId);
        }

        // Also log a note on the parent receiving session so the session QA history shows this action.
        const { data: parentItem } = await supabase
          .from('po_receiving_items')
          .select('receiving_session_id')
          .eq('receiving_lot_id', recordId)
          .maybeSingle();

        if (parentItem?.receiving_session_id) {
          await supabase.from('approval_logs').insert({
            related_record_id: parentItem.receiving_session_id,
            related_table_name: 'po_receiving_sessions',
            action: 'Updated',
            previous_status: null,
            new_status: null,
            user_id: user?.id,
            notes: `Receiving lot ${currentRecord?.internal_lot_number || recordId} ${action.toLowerCase()} via QA Dashboard`,
            metadata: { receiving_lot_id: recordId },
          });

          // Check if all lots in the session are now approved - if so, auto-approve the session
          if (action === 'Approved') {
            const { data: sessionLots } = await supabase
              .from('po_receiving_items')
              .select('receiving_lot_id, receiving_lot:receiving_lots(qa_status)')
              .eq('receiving_session_id', parentItem.receiving_session_id)
              .not('receiving_lot_id', 'is', null);

            const allApproved = sessionLots?.every(
              (item: any) => item.receiving_lot?.qa_status === 'approved'
            );

            if (allApproved) {
              // Get current session status
              const { data: sessionData } = await supabase
                .from('po_receiving_sessions')
                .select('approval_status')
                .eq('id', parentItem.receiving_session_id)
                .single();

              // Auto-approve the session
              await supabase
                .from('po_receiving_sessions')
                .update({
                  approval_status: 'Approved',
                  qa_verified_at: new Date().toISOString(),
                  qa_verified_by: user?.id,
                })
                .eq('id', parentItem.receiving_session_id);

              // Log the session approval
              await supabase.from('approval_logs').insert({
                related_record_id: parentItem.receiving_session_id,
                related_table_name: 'po_receiving_sessions',
                action: 'Approved',
                previous_status: sessionData?.approval_status || 'Pending_QA',
                new_status: 'Approved',
                user_id: user?.id,
                notes: 'All receiving lots approved - session auto-approved',
              });
            }
          }
        }
      } else if (tableName !== 'compliance_documents') {
        const { data: currentRecord, error: fetchError } = await supabase
          .from(tableName as 'materials')
          .select('approval_status')
          .eq('id', recordId)
          .single();
        if (fetchError) throw fetchError;
        previousStatus = currentRecord?.approval_status || null;

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
      }

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

      // Keep receiving/inventory screens in sync
      if (variables.tableName === 'receiving_lots') {
        queryClient.invalidateQueries({ queryKey: ['receiving-items'] });
        queryClient.invalidateQueries({ queryKey: ['receiving-session'] });
        queryClient.invalidateQueries({ queryKey: ['receiving-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['receiving-lots'] });
      }

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
      // Fetch all data and filter client-side to avoid TypeScript recursion issues
      const [rsResult, plResult, bolResult] = await Promise.all([
        supabase.from('po_receiving_sessions').select('id, receiving_number, received_date, status, notes'),
        supabase.from('production_lots').select('id, lot_number, production_date, status'),
        supabase.from('bills_of_lading').select('id, bol_number, ship_date, status'),
      ]);

      // Filter receiving sessions for the date that are not completed
      const sessions = ((rsResult.data as Array<{ id: string; receiving_number: string; received_date: string; status: string; notes: string | null }>) || [])
        .filter(r => r.received_date === date && r.status !== 'completed');

      // Filter production lots for the date that are in progress
      const lots = ((plResult.data as Array<{ id: string; lot_number: string; production_date: string; status: string }>) || [])
        .filter(r => r.production_date === date && ['in_progress', 'pending', 'scheduled'].includes(r.status));

      // Filter BOLs for the date that are not delivered
      const bols = ((bolResult.data as Array<{ id: string; bol_number: string; ship_date: string; status: string }>) || [])
        .filter(r => r.ship_date === date && r.status !== 'delivered');

      return {
        receivingSessions: sessions,
        productionLots: lots,
        billsOfLading: bols,
        totalBlockers: sessions.length + lots.length + bols.length,
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
