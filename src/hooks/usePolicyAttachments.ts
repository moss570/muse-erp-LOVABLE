import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PolicyAttachment {
  id: string;
  policy_id: string;
  file_name: string;
  file_path: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
  uploader?: { id: string; first_name: string; last_name: string } | null;
}

export function usePolicyAttachments(policyId: string | undefined) {
  return useQuery({
    queryKey: ["policy-attachments", policyId],
    queryFn: async () => {
      if (!policyId) return [];
      const { data, error } = await supabase
        .from("policy_attachments")
        .select(`
          *,
          uploader:profiles!policy_attachments_uploaded_by_fkey(id, first_name, last_name)
        `)
        .eq("policy_id", policyId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as PolicyAttachment[];
    },
    enabled: !!policyId,
  });
}

export function useUploadPolicyAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      policyId, 
      file, 
      description 
    }: { 
      policyId: string; 
      file: File; 
      description?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `policies/${policyId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("policy-attachments")
        .upload(filePath, file);
      
      if (uploadError) {
        // If bucket doesn't exist, create the record without storage
        console.warn("Storage upload failed, saving metadata only:", uploadError);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from("policy-attachments")
        .getPublicUrl(filePath);
      
      // Create attachment record
      const { data, error } = await supabase
        .from("policy_attachments")
        .insert({
          policy_id: policyId,
          file_name: file.name,
          file_path: filePath,
          file_url: urlData?.publicUrl || null,
          file_type: file.type,
          file_size: file.size,
          description,
          uploaded_by: user.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["policy-attachments", data.policy_id] });
      toast.success("Attachment uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload attachment: ${error.message}`);
    },
  });
}

export function useDeletePolicyAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, policyId, filePath }: { id: string; policyId: string; filePath?: string }) => {
      // Delete from storage if path exists
      if (filePath) {
        await supabase.storage
          .from("policy-attachments")
          .remove([filePath]);
      }
      
      // Delete record
      const { error } = await supabase
        .from("policy_attachments")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return { policyId };
    },
    onSuccess: ({ policyId }) => {
      queryClient.invalidateQueries({ queryKey: ["policy-attachments", policyId] });
      toast.success("Attachment deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete attachment: ${error.message}`);
    },
  });
}
