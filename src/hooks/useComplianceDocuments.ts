import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type EntityType = 'supplier' | 'material' | 'product';

export interface ComplianceDocument {
  id: string;
  related_entity_id: string;
  related_entity_type: EntityType;
  document_type: string;
  document_name: string;
  file_url: string | null;
  file_path: string | null;
  storage_provider: 'supabase' | 'google_drive';
  expiration_date: string | null;
  is_current: boolean;
  archived_at: string | null;
  archived_by: string | null;
  replaced_by_id: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface CreateDocumentInput {
  related_entity_id: string;
  related_entity_type: EntityType;
  document_type: string;
  document_name: string;
  file_url?: string;
  file_path?: string;
  expiration_date?: string;
  notes?: string;
}

interface RenewDocumentInput {
  oldDocumentId: string;
  document_name: string;
  file_url?: string;
  file_path?: string;
  expiration_date?: string;
  notes?: string;
}

// Hook to fetch compliance documents for an entity
export function useComplianceDocuments(entityId: string, entityType?: EntityType) {
  return useQuery({
    queryKey: ['compliance-documents', entityId, entityType],
    queryFn: async () => {
      let query = supabase
        .from('compliance_documents')
        .select('*')
        .eq('related_entity_id', entityId)
        .order('created_at', { ascending: false });

      if (entityType) {
        query = query.eq('related_entity_type', entityType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as ComplianceDocument[];
    },
    enabled: !!entityId,
  });
}

// Hook to fetch current (active) compliance documents for an entity
export function useCurrentComplianceDocuments(entityId: string, entityType?: EntityType) {
  return useQuery({
    queryKey: ['compliance-documents-current', entityId, entityType],
    queryFn: async () => {
      let query = supabase
        .from('compliance_documents')
        .select('*')
        .eq('related_entity_id', entityId)
        .eq('is_current', true)
        .order('document_type', { ascending: true });

      if (entityType) {
        query = query.eq('related_entity_type', entityType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as ComplianceDocument[];
    },
    enabled: !!entityId,
  });
}

// Hook to create a new compliance document
export function useCreateComplianceDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateDocumentInput) => {
      const { data, error } = await supabase
        .from('compliance_documents')
        .insert({
          ...input,
          uploaded_by: user?.id,
          is_current: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('approval_logs').insert({
        related_record_id: data.id,
        related_table_name: 'compliance_documents',
        action: 'Created',
        new_status: 'Active',
        user_id: user?.id,
        notes: `Uploaded ${input.document_type}: ${input.document_name}`,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['compliance-documents', variables.related_entity_id] });
      queryClient.invalidateQueries({ queryKey: ['document-expiration-watchlist'] });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
}

// Hook to renew (replace) a compliance document
export function useRenewComplianceDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: RenewDocumentInput) => {
      // First, get the old document details
      const { data: oldDoc, error: fetchError } = await supabase
        .from('compliance_documents')
        .select('*')
        .eq('id', input.oldDocumentId)
        .single();

      if (fetchError) throw fetchError;

      // Create the new document
      const { data: newDoc, error: createError } = await supabase
        .from('compliance_documents')
        .insert({
          related_entity_id: oldDoc.related_entity_id,
          related_entity_type: oldDoc.related_entity_type,
          document_type: oldDoc.document_type,
          document_name: input.document_name,
          file_url: input.file_url,
          file_path: input.file_path,
          expiration_date: input.expiration_date,
          notes: input.notes,
          uploaded_by: user?.id,
          is_current: true,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Archive the old document
      const { error: archiveError } = await supabase
        .from('compliance_documents')
        .update({
          is_current: false,
          archived_at: new Date().toISOString(),
          archived_by: user?.id,
          replaced_by_id: newDoc.id,
        })
        .eq('id', input.oldDocumentId);

      if (archiveError) throw archiveError;

      // Log the renewal action
      await supabase.from('approval_logs').insert({
        related_record_id: newDoc.id,
        related_table_name: 'compliance_documents',
        action: 'Created',
        new_status: 'Active',
        user_id: user?.id,
        notes: `Renewed ${oldDoc.document_type}. Previous document archived.`,
        metadata: { replaced_document_id: input.oldDocumentId },
      });

      return { newDoc, oldDoc };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['compliance-documents', data.oldDoc.related_entity_id] });
      queryClient.invalidateQueries({ queryKey: ['document-expiration-watchlist'] });
      toast.success('Document renewed successfully. Old version archived.');
    },
    onError: (error: Error) => {
      toast.error(`Failed to renew document: ${error.message}`);
    },
  });
}

// Hook to fetch document types from dropdown options
export function useComplianceDocumentTypes() {
  return useQuery({
    queryKey: ['compliance-document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('*')
        .eq('dropdown_type', 'compliance_document_type')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

// Hook to get expiring documents count
export function useExpiringDocumentsCount() {
  return useQuery({
    queryKey: ['expiring-documents-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_expiration_watchlist')
        .select('expiration_status');

      if (error) throw error;

      const counts = {
        expired: 0,
        expiringSoon: 0,
        valid: 0,
        total: data?.length || 0,
      };

      data?.forEach((doc) => {
        if (doc.expiration_status === 'expired') counts.expired++;
        else if (doc.expiration_status === 'expiring_soon') counts.expiringSoon++;
        else counts.valid++;
      });

      return counts;
    },
  });
}
