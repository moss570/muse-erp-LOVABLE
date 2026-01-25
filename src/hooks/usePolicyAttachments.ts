import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PolicyAttachment, PolicyAttachmentFormData } from '@/types/policies';

// Fetch all attachments for a policy
export function usePolicyAttachments(policyId: string, options?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['policy-attachments', policyId, options?.includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('policy_attachments')
        .select(`
          *,
          uploaded_by_profile:profiles!policy_attachments_uploaded_by_fkey(id, first_name, last_name, avatar_url),
          version:policy_versions(id, version_number)
        `)
        .eq('policy_id', policyId)
        .order('uploaded_at', { ascending: false });

      // Filter by active status unless includeInactive is true
      if (!options?.includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as PolicyAttachment[];
    },
    enabled: !!policyId,
  });
}

// Fetch attachments by type
export function usePolicyAttachmentsByType(
  policyId: string,
  attachmentType: 'form' | 'image' | 'document' | 'video' | 'other'
) {
  return useQuery({
    queryKey: ['policy-attachments-by-type', policyId, attachmentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_attachments')
        .select(`
          *,
          uploaded_by_profile:profiles!policy_attachments_uploaded_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('policy_id', policyId)
        .eq('attachment_type', attachmentType)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PolicyAttachment[];
    },
    enabled: !!policyId,
  });
}

// Fetch single attachment
export function usePolicyAttachment(attachmentId: string) {
  return useQuery({
    queryKey: ['policy-attachment', attachmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_attachments')
        .select(`
          *,
          uploaded_by_profile:profiles!policy_attachments_uploaded_by_fkey(id, first_name, last_name, avatar_url),
          policy:policies(id, policy_number, title),
          version:policy_versions(id, version_number)
        `)
        .eq('id', attachmentId)
        .single();

      if (error) throw error;
      return data as unknown as PolicyAttachment;
    },
    enabled: !!attachmentId,
  });
}

// Upload attachment with file
export function useUploadPolicyAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      metadata,
    }: {
      file: File;
      metadata: PolicyAttachmentFormData;
    }) => {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `policy-attachments/${metadata.policy_id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('policies')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('policies')
        .getPublicUrl(filePath);

      // 3. Create attachment record
      const attachmentData = {
        ...metadata,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size_bytes: file.size,
        file_path: filePath,
      };

      const { data, error } = await supabase
        .from('policy_attachments')
        .insert([attachmentData])
        .select(`
          *,
          uploaded_by_profile:profiles!policy_attachments_uploaded_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as unknown as PolicyAttachment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policy-attachments', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy', data.policy_id] });
      toast.success('Attachment uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload attachment: ${error.message}`);
    },
  });
}

// Update attachment metadata (not the file itself)
export function useUpdatePolicyAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<PolicyAttachmentFormData>;
    }) => {
      const { data, error } = await supabase
        .from('policy_attachments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          uploaded_by_profile:profiles!policy_attachments_uploaded_by_fkey(id, first_name, last_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as unknown as PolicyAttachment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policy-attachments', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy-attachment', data.id] });
      toast.success('Attachment updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update attachment: ${error.message}`);
    },
  });
}

// Delete attachment (soft delete - set is_active to false)
export function useDeletePolicyAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch attachment to get file path and policy_id
      const { data: attachment, error: fetchError } = await supabase
        .from('policy_attachments')
        .select('file_path, policy_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Soft delete in database
      const { error } = await supabase
        .from('policy_attachments')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      return { id, policy_id: attachment.policy_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policy-attachments', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy-attachment', data.id] });
      toast.success('Attachment deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete attachment: ${error.message}`);
    },
  });
}

// Permanently delete attachment (hard delete - removes file and record)
export function usePermanentlyDeletePolicyAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch attachment to get file path
      const { data: attachment, error: fetchError } = await supabase
        .from('policy_attachments')
        .select('file_path, policy_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete file from storage if exists
      if (attachment.file_path) {
        const { error: storageError } = await supabase.storage
          .from('policies')
          .remove([attachment.file_path]);

        if (storageError) {
          console.error('Failed to delete file from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete database record
      const { error } = await supabase
        .from('policy_attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { id, policy_id: attachment.policy_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policy-attachments', data.policy_id] });
      queryClient.invalidateQueries({ queryKey: ['policy-attachment', data.id] });
      toast.success('Attachment permanently deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to permanently delete attachment: ${error.message}`);
    },
  });
}

// Download attachment
export async function downloadAttachment(attachment: PolicyAttachment) {
  try {
    // Fetch the file from the URL
    const response = await fetch(attachment.file_url);
    if (!response.ok) throw new Error('Failed to download file');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.file_name;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('Download started');
  } catch (error) {
    toast.error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// Get attachment statistics for a policy
export function usePolicyAttachmentStats(policyId: string) {
  return useQuery({
    queryKey: ['policy-attachment-stats', policyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_attachments')
        .select('id, attachment_type, file_size_bytes')
        .eq('policy_id', policyId)
        .eq('is_active', true);

      if (error) throw error;

      const stats = {
        total_count: data.length,
        forms_count: data.filter(a => a.attachment_type === 'form').length,
        images_count: data.filter(a => a.attachment_type === 'image').length,
        documents_count: data.filter(a => a.attachment_type === 'document').length,
        videos_count: data.filter(a => a.attachment_type === 'video').length,
        other_count: data.filter(a => a.attachment_type === 'other').length,
        total_size_bytes: data.reduce((sum, a) => sum + (a.file_size_bytes || 0), 0),
        total_size_mb: Math.round(data.reduce((sum, a) => sum + (a.file_size_bytes || 0), 0) / 1024 / 1024 * 100) / 100,
      };

      return stats;
    },
    enabled: !!policyId,
  });
}
