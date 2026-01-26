import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  SQFEdition,
  SQFEditionFormData,
  SQFParseRequest,
  SQFParseResponse,
} from '@/types/sqf';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const sqfEditionKeys = {
  all: ['sqf-editions'] as const,
  lists: () => [...sqfEditionKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...sqfEditionKeys.lists(), filters] as const,
  details: () => [...sqfEditionKeys.all, 'detail'] as const,
  detail: (id: string) => [...sqfEditionKeys.details(), id] as const,
  active: () => [...sqfEditionKeys.all, 'active'] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all SQF editions
 */
export function useSQFEditions() {
  return useQuery({
    queryKey: sqfEditionKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sqf_editions')
        .select(`
          *,
          creator:created_by(id, full_name, email),
          updater:updated_by(id, full_name, email)
        `)
        .order('release_date', { ascending: false });

      if (error) throw error;
      return data as SQFEdition[];
    },
  });
}

/**
 * Fetch a single SQF edition by ID
 */
export function useSQFEdition(id: string | undefined) {
  return useQuery({
    queryKey: sqfEditionKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Edition ID is required');

      const { data, error } = await supabase
        .from('sqf_editions')
        .select(`
          *,
          creator:created_by(id, full_name, email),
          updater:updated_by(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as SQFEdition;
    },
    enabled: !!id,
  });
}

/**
 * Fetch the active SQF edition
 */
export function useActiveSQFEdition() {
  return useQuery({
    queryKey: sqfEditionKeys.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sqf_editions')
        .select(`
          *,
          creator:created_by(id, full_name, email)
        `)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as SQFEdition | null;
    },
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new SQF edition
 */
export function useCreateSQFEdition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SQFEditionFormData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: edition, error } = await supabase
        .from('sqf_editions')
        .insert({
          ...data,
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return edition as SQFEdition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sqfEditionKeys.lists() });
    },
  });
}

/**
 * Update an existing SQF edition
 */
export function useUpdateSQFEdition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SQFEditionFormData> }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('sqf_editions')
        .update({
          ...updates,
          updated_by: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SQFEdition;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sqfEditionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfEditionKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: sqfEditionKeys.active() });
    },
  });
}

/**
 * Delete an SQF edition
 */
export function useDeleteSQFEdition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sqf_editions').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sqfEditionKeys.lists() });
    },
  });
}

/**
 * Set an SQF edition as active (deactivates all others)
 */
export function useSetActiveSQFEdition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (editionId: string) => {
      const { error } = await supabase.rpc('set_active_sqf_edition', {
        edition_id: editionId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sqfEditionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfEditionKeys.active() });
    },
  });
}

/**
 * Upload and parse an SQF document
 */
export function useUploadSQFDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ editionId, file }: { editionId: string; file: File }) => {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${editionId}.${fileExt}`;
      const filePath = `sqf-editions/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('policy-attachments')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('policy-attachments').getPublicUrl(filePath);

      // Update edition with file info
      const { error: updateError } = await supabase
        .from('sqf_editions')
        .update({
          source_document_url: publicUrl,
          source_document_filename: file.name,
          source_file_size_bytes: file.size,
          parsing_status: 'Pending',
        })
        .eq('id', editionId);

      if (updateError) throw updateError;

      return { editionId, fileUrl: publicUrl };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sqfEditionKeys.detail(variables.editionId) });
      queryClient.invalidateQueries({ queryKey: sqfEditionKeys.lists() });
    },
  });
}

/**
 * Trigger AI parsing of SQF document
 */
export function useParseSQFDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SQFParseRequest) => {
      // Update parsing status to "Parsing"
      await supabase
        .from('sqf_editions')
        .update({
          parsing_status: 'Parsing',
          parsing_started_at: new Date().toISOString(),
        })
        .eq('id', request.edition_id);

      // Call edge function to parse document
      const { data, error } = await supabase.functions.invoke('parse-sqf-document', {
        body: request,
      });

      if (error) throw error;
      return data as SQFParseResponse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sqfEditionKeys.detail(variables.edition_id) });
      queryClient.invalidateQueries({ queryKey: sqfEditionKeys.lists() });
    },
  });
}

/**
 * Get compliance percentage for an edition
 */
export function useSQFEditionCompliance(editionId: string | undefined) {
  return useQuery({
    queryKey: [...sqfEditionKeys.detail(editionId || ''), 'compliance'],
    queryFn: async () => {
      if (!editionId) throw new Error('Edition ID is required');

      const { data, error } = await supabase.rpc('calculate_sqf_compliance_percentage', {
        edition_id: editionId,
      });

      if (error) throw error;
      return data as number;
    },
    enabled: !!editionId,
  });
}
