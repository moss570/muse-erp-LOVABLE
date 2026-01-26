import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SQFCode, SQFCodeFormData, SQFCodeFilters, SQFComplianceSummary } from '@/types/sqf';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const sqfCodeKeys = {
  all: ['sqf-codes'] as const,
  lists: () => [...sqfCodeKeys.all, 'list'] as const,
  list: (filters: SQFCodeFilters) => [...sqfCodeKeys.lists(), filters] as const,
  details: () => [...sqfCodeKeys.all, 'detail'] as const,
  detail: (id: string) => [...sqfCodeKeys.details(), id] as const,
  byEdition: (editionId: string) => [...sqfCodeKeys.all, 'edition', editionId] as const,
  compliance: () => [...sqfCodeKeys.all, 'compliance'] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all SQF codes for an edition
 */
export function useSQFCodes(editionId: string | undefined, filters?: SQFCodeFilters) {
  return useQuery({
    queryKey: sqfCodeKeys.list({ edition_id: editionId, ...filters }),
    queryFn: async () => {
      if (!editionId) throw new Error('Edition ID is required');

      let query = supabase
        .from('sqf_codes')
        .select('*')
        .eq('sqf_edition_id', editionId);

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.section) {
        query = query.eq('section', filters.section);
      }
      if (filters?.is_fundamental !== undefined) {
        query = query.eq('is_fundamental', filters.is_fundamental);
      }
      if (filters?.is_mandatory !== undefined) {
        query = query.eq('is_mandatory', filters.is_mandatory);
      }
      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,code_number.ilike.%${filters.search}%`
        );
      }

      query = query.order('code_number', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as SQFCode[];
    },
    enabled: !!editionId,
  });
}

/**
 * Fetch a single SQF code by ID
 */
export function useSQFCode(id: string | undefined) {
  return useQuery({
    queryKey: sqfCodeKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Code ID is required');

      const { data, error } = await supabase
        .from('sqf_codes')
        .select(`
          *,
          edition:sqf_edition_id(
            id,
            edition_name,
            edition_number,
            is_active
          ),
          supersedes:supersedes_code_id(
            id,
            code_number,
            title
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as SQFCode;
    },
    enabled: !!id,
  });
}

/**
 * Fetch SQF compliance summary
 */
export function useSQFComplianceSummary(editionId?: string) {
  return useQuery({
    queryKey: [...sqfCodeKeys.compliance(), editionId],
    queryFn: async () => {
      let query = supabase.from('sqf_compliance_summary').select('*');

      if (editionId) {
        query = query.eq('sqf_edition_id', editionId);
      }

      query = query.order('code_number', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as SQFComplianceSummary[];
    },
  });
}

/**
 * Fetch SQF codes by category
 */
export function useSQFCodesByCategory(editionId: string | undefined) {
  return useQuery({
    queryKey: [...sqfCodeKeys.byEdition(editionId || ''), 'by-category'],
    queryFn: async () => {
      if (!editionId) throw new Error('Edition ID is required');

      const { data, error } = await supabase
        .from('sqf_codes')
        .select('*')
        .eq('sqf_edition_id', editionId)
        .order('category', { ascending: true })
        .order('code_number', { ascending: true });

      if (error) throw error;

      // Group by category
      const grouped = (data as SQFCode[]).reduce((acc, code) => {
        const category = code.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(code);
        return acc;
      }, {} as Record<string, SQFCode[]>);

      return grouped;
    },
    enabled: !!editionId,
  });
}

/**
 * Fetch fundamental SQF codes only
 */
export function useFundamentalSQFCodes(editionId: string | undefined) {
  return useQuery({
    queryKey: [...sqfCodeKeys.byEdition(editionId || ''), 'fundamental'],
    queryFn: async () => {
      if (!editionId) throw new Error('Edition ID is required');

      const { data, error } = await supabase
        .from('sqf_codes')
        .select('*')
        .eq('sqf_edition_id', editionId)
        .eq('is_fundamental', true)
        .order('code_number', { ascending: true });

      if (error) throw error;
      return data as SQFCode[];
    },
    enabled: !!editionId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new SQF code
 */
export function useCreateSQFCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SQFCodeFormData) => {
      const { data: code, error } = await supabase
        .from('sqf_codes')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return code as SQFCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.byEdition(data.sqf_edition_id) });
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.compliance() });
    },
  });
}

/**
 * Update an existing SQF code
 */
export function useUpdateSQFCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SQFCodeFormData> }) => {
      const { data, error } = await supabase
        .from('sqf_codes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SQFCode;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.byEdition(data.sqf_edition_id) });
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.compliance() });
    },
  });
}

/**
 * Delete an SQF code
 */
export function useDeleteSQFCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sqf_codes').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.compliance() });
    },
  });
}

/**
 * Bulk import SQF codes from AI extraction
 */
export function useBulkImportSQFCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ editionId, codes }: { editionId: string; codes: Partial<SQFCodeFormData>[] }) => {
      // Add edition ID to all codes
      const codesWithEdition = codes.map(code => ({
        ...code,
        sqf_edition_id: editionId,
      }));

      const { data, error } = await supabase
        .from('sqf_codes')
        .insert(codesWithEdition)
        .select();

      if (error) throw error;
      return data as SQFCode[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.byEdition(variables.editionId) });
      queryClient.invalidateQueries({ queryKey: sqfCodeKeys.compliance() });
    },
  });
}
