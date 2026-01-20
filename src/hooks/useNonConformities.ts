import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NonConformity, NCAttachment, NCActivityLog } from '@/types/non-conformities';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Fetch all non-conformities with filters
export function useNonConformities(filters?: {
  status?: string;
  nc_type?: string;
  severity?: string;
  impact_level?: string;
  from_date?: string;
  to_date?: string;
}) {
  return useQuery({
    queryKey: ['non-conformities', filters],
    queryFn: async () => {
      let query = supabase
        .from('non_conformities')
        .select(`
          *,
          discovered_by_profile:profiles!non_conformities_discovered_by_fkey(id, first_name, last_name, email),
          location:locations!non_conformities_discovery_location_id_fkey(id, name),
          material:materials!non_conformities_material_id_fkey(id, name, code),
          product:products!non_conformities_product_id_fkey(id, name, sku),
          supplier:suppliers!non_conformities_supplier_id_fkey(id, name, code),
          receiving_lot:receiving_lots!non_conformities_receiving_lot_id_fkey(id, internal_lot_number),
          production_lot:production_lots!non_conformities_production_lot_id_fkey(id, lot_number),
          equipment:machines!non_conformities_equipment_id_fkey(id, name, machine_number),
          capa:corrective_actions!non_conformities_capa_id_fkey(id, capa_number, status)
        `)
        .order('discovered_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.nc_type) {
        query = query.eq('nc_type', filters.nc_type);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.impact_level) {
        query = query.eq('impact_level', filters.impact_level);
      }
      if (filters?.from_date) {
        query = query.gte('discovered_date', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('discovered_date', filters.to_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NonConformity[];
    },
  });
}

// Fetch single non-conformity with full details
export function useNonConformity(id: string | null) {
  return useQuery({
    queryKey: ['non-conformity', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('non_conformities')
        .select(`
          *,
          discovered_by_profile:profiles!non_conformities_discovered_by_fkey(id, first_name, last_name, email),
          location:locations!non_conformities_discovery_location_id_fkey(id, name),
          material:materials!non_conformities_material_id_fkey(id, name, code),
          product:products!non_conformities_product_id_fkey(id, name, sku),
          supplier:suppliers!non_conformities_supplier_id_fkey(id, name, code),
          receiving_lot:receiving_lots!non_conformities_receiving_lot_id_fkey(id, internal_lot_number),
          production_lot:production_lots!non_conformities_production_lot_id_fkey(id, lot_number),
          equipment:machines!non_conformities_equipment_id_fkey(id, name, machine_number),
          capa:corrective_actions!non_conformities_capa_id_fkey(id, capa_number, status),
          closed_by_profile:profiles!non_conformities_closed_by_fkey(id, first_name, last_name),
          disposition_approved_by_profile:profiles!non_conformities_disposition_approved_by_fkey(id, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as NonConformity;
    },
    enabled: !!id,
  });
}

// Fetch attachments for a non-conformity
export function useNCAttachments(ncId: string | null) {
  return useQuery({
    queryKey: ['nc-attachments', ncId],
    queryFn: async () => {
      if (!ncId) return [];
      
      const { data, error } = await supabase
        .from('nc_attachments')
        .select(`
          *,
          uploaded_by_profile:profiles!nc_attachments_uploaded_by_fkey(id, first_name, last_name)
        `)
        .eq('nc_id', ncId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as NCAttachment[];
    },
    enabled: !!ncId,
  });
}

// Fetch activity log for a non-conformity
export function useNCActivityLog(ncId: string | null) {
  return useQuery({
    queryKey: ['nc-activity-log', ncId],
    queryFn: async () => {
      if (!ncId) return [];
      
      const { data, error } = await supabase
        .from('nc_activity_log')
        .select(`
          *,
          performed_by_profile:profiles!nc_activity_log_performed_by_fkey(id, first_name, last_name)
        `)
        .eq('nc_id', ncId)
        .order('performed_at', { ascending: false });

      if (error) throw error;
      return data as NCActivityLog[];
    },
    enabled: !!ncId,
  });
}

// Create non-conformity
export function useCreateNonConformity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<NonConformity>) => {
      // Generate NC number
      const { data: ncNumber, error: numberError } = await supabase
        .rpc('generate_nc_number');
      if (numberError) throw numberError;

      const { data: nc, error } = await supabase
        .from('non_conformities')
        .insert({
          ...data,
          nc_number: ncNumber,
          discovered_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return nc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['non-conformities'] });
      toast.success('Non-conformity created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create non-conformity: ${error.message}`);
    },
  });
}

// Update non-conformity
export function useUpdateNonConformity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NonConformity> }) => {
      const { data, error } = await supabase
        .from('non_conformities')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['non-conformities'] });
      queryClient.invalidateQueries({ queryKey: ['non-conformity', variables.id] });
      toast.success('Non-conformity updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update non-conformity: ${error.message}`);
    },
  });
}

// Delete non-conformity
export function useDeleteNonConformity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('non_conformities')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['non-conformities'] });
      toast.success('Non-conformity deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete non-conformity: ${error.message}`);
    },
  });
}

// Upload attachment
export function useUploadNCAttachment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      ncId,
      file,
      description,
      attachmentType,
    }: {
      ncId: string;
      file: File;
      description?: string;
      attachmentType?: 'photo' | 'document' | 'video' | 'other';
    }) => {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${ncId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('nc-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { data, error } = await supabase
        .from('nc_attachments')
        .insert({
          nc_id: ncId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          description,
          attachment_type: attachmentType || 'photo',
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('nc_activity_log').insert({
        nc_id: ncId,
        action: 'attachment_added',
        comment: `Added ${attachmentType || 'photo'}: ${file.name}`,
        performed_by: user?.id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nc-attachments', variables.ncId] });
      queryClient.invalidateQueries({ queryKey: ['nc-activity-log', variables.ncId] });
      toast.success('Attachment uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload attachment: ${error.message}`);
    },
  });
}

// Delete attachment
export function useDeleteNCAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ncId, filePath }: { id: string; ncId: string; filePath: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('nc-attachments')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error } = await supabase
        .from('nc_attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nc-attachments', variables.ncId] });
      toast.success('Attachment deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete attachment: ${error.message}`);
    },
  });
}

// Add activity log entry (for manual comments)
export function useAddNCActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      ncId,
      comment,
    }: {
      ncId: string;
      comment: string;
    }) => {
      const { data, error } = await supabase
        .from('nc_activity_log')
        .insert({
          nc_id: ncId,
          action: 'comment_added',
          comment,
          performed_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nc-activity-log', variables.ncId] });
      toast.success('Comment added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
}

// Close non-conformity
export function useCloseNonConformity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, closureNotes }: { id: string; closureNotes: string }) => {
      const { data, error } = await supabase
        .from('non_conformities')
        .update({
          status: 'closed',
          closed_by: user?.id,
          closed_at: new Date().toISOString(),
          closure_notes: closureNotes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['non-conformities'] });
      queryClient.invalidateQueries({ queryKey: ['non-conformity', variables.id] });
      toast.success('Non-conformity closed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to close non-conformity: ${error.message}`);
    },
  });
}
