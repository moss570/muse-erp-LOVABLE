import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { QACheckResult } from '@/types/qa-checks';

export interface OverrideRequest {
  id: string;
  related_record_id: string;
  related_table_name: string;
  blocked_checks: unknown;
  requested_by: string;
  requested_at: string;
  override_reason: string;
  justification: string;
  follow_up_date: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  override_expires_at: string | null;
  override_type: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  requester?: { full_name: string | null; email: string | null };
  reviewer?: { full_name: string | null } | null;
}

export interface CreateOverrideRequest {
  related_record_id: string;
  related_table_name: string;
  blocked_checks: { check_key: string; check_name: string; tier: string }[];
  requested_by: string;
  override_reason: string;
  justification: string;
  follow_up_date: string;
  override_type: string;
}

// Fetch pending override requests (for Admin dashboard)
export const usePendingOverrideRequests = () => {
  return useQuery({
    queryKey: ['override-requests', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_override_requests')
        .select(`
          *,
          requester:profiles!qa_override_requests_requested_by_fkey(full_name, email),
          reviewer:profiles!qa_override_requests_reviewed_by_fkey(full_name)
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });
      
      if (error) throw error;
      return data as OverrideRequest[];
    },
  });
};

// Fetch all override requests
export const useOverrideRequests = (filters?: { status?: string; tableName?: string }) => {
  return useQuery({
    queryKey: ['override-requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('qa_override_requests')
        .select(`
          *,
          requester:profiles!qa_override_requests_requested_by_fkey(full_name, email),
          reviewer:profiles!qa_override_requests_reviewed_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.tableName) {
        query = query.eq('related_table_name', filters.tableName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OverrideRequest[];
    },
  });
};

// Fetch override requests for a specific record
export const useRecordOverrideRequests = (recordId: string, tableName: string, enabled = true) => {
  return useQuery({
    queryKey: ['override-requests', 'record', recordId, tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_override_requests')
        .select(`
          *,
          requester:profiles!qa_override_requests_requested_by_fkey(full_name, email),
          reviewer:profiles!qa_override_requests_reviewed_by_fkey(full_name)
        `)
        .eq('related_record_id', recordId)
        .eq('related_table_name', tableName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OverrideRequest[];
    },
    enabled: enabled && !!recordId && !!tableName,
  });
};

// Check if there's a pending override request for a record
export const usePendingOverrideForRecord = (recordId: string, tableName: string, enabled = true) => {
  return useQuery({
    queryKey: ['override-requests', 'pending', recordId, tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_override_requests')
        .select('id, status, requested_at')
        .eq('related_record_id', recordId)
        .eq('related_table_name', tableName)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!recordId && !!tableName,
  });
};

// Create new override request
export const useCreateOverrideRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateOverrideRequest) => {
      const { data, error } = await supabase
        .from('qa_override_requests')
        .insert({
          related_record_id: request.related_record_id,
          related_table_name: request.related_table_name,
          blocked_checks: request.blocked_checks,
          requested_by: request.requested_by,
          override_reason: request.override_reason,
          justification: request.justification,
          follow_up_date: request.follow_up_date,
          override_type: request.override_type,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Log to approval_logs
      await supabase.from('approval_logs').insert({
        related_record_id: request.related_record_id,
        related_table_name: request.related_table_name,
        action: 'Override Requested',
        notes: request.justification,
        user_id: request.requested_by,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['override-requests'] });
      toast.success('Override request submitted for approval');
    },
    onError: (error: any) => {
      console.error('Failed to create override request:', error);
      toast.error('Failed to submit override request');
    },
  });
};

// Approve/Deny override request (Admin only)
export const useReviewOverrideRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      approved, 
      notes, 
      expiresAt 
    }: { 
      requestId: string; 
      approved: boolean; 
      notes?: string; 
      expiresAt?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Get the request first
      const { data: request, error: fetchError } = await supabase
        .from('qa_override_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update the override request
      const { data, error } = await supabase
        .from('qa_override_requests')
        .update({
          status: approved ? 'approved' : 'denied',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
          override_expires_at: approved ? expiresAt : null,
        })
        .eq('id', requestId)
        .select()
        .single();
      
      if (error) throw error;
      
      // If approved, update the entity's active_override_id and status
      if (approved && request.related_table_name === 'materials') {
        await supabase
          .from('materials')
          .update({
            active_override_id: requestId,
            approval_status: request.override_type === 'full_approval' ? 'Approved' : 'Conditional',
            conditional_approval_expires_at: expiresAt || null,
            conditional_approval_at: new Date().toISOString(),
            conditional_approval_by: user.id,
          })
          .eq('id', request.related_record_id);
      } else if (approved && request.related_table_name === 'suppliers') {
        await supabase
          .from('suppliers')
          .update({
            active_override_id: requestId,
            approval_status: request.override_type === 'full_approval' ? 'Approved' : 'Conditional',
            conditional_approval_expires_at: expiresAt || null,
            conditional_approval_at: new Date().toISOString(),
            conditional_approval_by: user.id,
          })
          .eq('id', request.related_record_id);
      } else if (approved && request.related_table_name === 'products') {
        await supabase
          .from('products')
          .update({
            active_override_id: requestId,
            approval_status: request.override_type === 'full_approval' ? 'Approved' : 'Conditional',
            conditional_approval_expires_at: expiresAt || null,
            conditional_approval_at: new Date().toISOString(),
            conditional_approval_by: user.id,
          })
          .eq('id', request.related_record_id);
      }
      
      // Log to approval_logs
      await supabase.from('approval_logs').insert({
        related_record_id: request.related_record_id,
        related_table_name: request.related_table_name,
        action: approved ? 'Override Approved' : 'Override Denied',
        notes: notes || null,
        user_id: user.id,
      });
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['override-requests'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(variables.approved ? 'Override approved' : 'Override denied');
    },
    onError: (error: any) => {
      console.error('Failed to review override request:', error);
      toast.error('Failed to process override request');
    },
  });
};

// Direct override (Admin self-approves)
export const useDirectOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateOverrideRequest & { expiresAt: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Create and immediately approve
      const { data, error } = await supabase
        .from('qa_override_requests')
        .insert({
          related_record_id: request.related_record_id,
          related_table_name: request.related_table_name,
          blocked_checks: request.blocked_checks,
          requested_by: request.requested_by,
          override_reason: request.override_reason,
          justification: request.justification,
          follow_up_date: request.follow_up_date,
          override_type: request.override_type,
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          override_expires_at: request.expiresAt,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update the entity
      if (request.related_table_name === 'materials') {
        await supabase
          .from('materials')
          .update({
            active_override_id: data.id,
            approval_status: request.override_type === 'full_approval' ? 'Approved' : 'Conditional',
            conditional_approval_expires_at: request.expiresAt,
            conditional_approval_at: new Date().toISOString(),
            conditional_approval_by: user.id,
          })
          .eq('id', request.related_record_id);
      } else if (request.related_table_name === 'suppliers') {
        await supabase
          .from('suppliers')
          .update({
            active_override_id: data.id,
            approval_status: request.override_type === 'full_approval' ? 'Approved' : 'Conditional',
            conditional_approval_expires_at: request.expiresAt,
            conditional_approval_at: new Date().toISOString(),
            conditional_approval_by: user.id,
          })
          .eq('id', request.related_record_id);
      } else if (request.related_table_name === 'products') {
        await supabase
          .from('products')
          .update({
            active_override_id: data.id,
            approval_status: request.override_type === 'full_approval' ? 'Approved' : 'Conditional',
            conditional_approval_expires_at: request.expiresAt,
            conditional_approval_at: new Date().toISOString(),
            conditional_approval_by: user.id,
          })
          .eq('id', request.related_record_id);
      }
      
      // Log to approval_logs
      await supabase.from('approval_logs').insert({
        related_record_id: request.related_record_id,
        related_table_name: request.related_table_name,
        action: 'Direct Override Applied',
        notes: request.justification,
        user_id: user.id,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['override-requests'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Direct override applied');
    },
    onError: (error: any) => {
      console.error('Failed to apply direct override:', error);
      toast.error('Failed to apply override');
    },
  });
};

// Permission hooks
export const useCanRequestOverride = () => {
  const { role } = useAuth();
  return ['admin', 'manager', 'supervisor'].includes(role || '');
};

export const useCanDirectOverride = () => {
  const { role } = useAuth();
  return role === 'admin';
};

export const useCanApproveOverride = () => {
  const { role } = useAuth();
  return role === 'admin';
};

// Convert QACheckResult array to blocked_checks format
export const formatBlockedChecks = (results: QACheckResult[]) => {
  return results.map(r => ({
    check_key: r.definition.check_key,
    check_name: r.definition.check_name,
    tier: r.definition.tier,
  }));
};
