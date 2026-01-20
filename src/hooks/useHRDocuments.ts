import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface HRDocumentTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'policy' | 'handbook' | 'form' | 'training' | 'safety' | 'other';
  content?: string;
  file_path?: string;
  requires_signature: boolean;
  signature_text?: string;
  assign_to_new_hires: boolean;
  assign_to_all: boolean;
  version: number;
  effective_date?: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeHRDocument {
  id: string;
  employee_id: string;
  template_id: string;
  template?: HRDocumentTemplate;
  status: 'pending' | 'signed' | 'expired';
  signed_at?: string;
  signature_data?: string;
  signature_ip?: string;
  due_date?: string;
  reminder_sent_at?: string;
  reminder_count: number;
  created_at: string;
}

export interface EmployeePersonalDocument {
  id: string;
  employee_id: string;
  document_type: string;
  name: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  issue_date?: string;
  expiry_date?: string;
  uploaded_by?: string;
  uploaded_at: string;
}

// ============================================================================
// DOCUMENT TEMPLATES
// ============================================================================
export function useHRDocumentTemplates() {
  return useQuery({
    queryKey: ['hr-document-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_document_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as HRDocumentTemplate[];
    },
  });
}

export function useHRDocumentTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['hr-document-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const { data, error } = await supabase
        .from('hr_document_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      if (error) throw error;
      return data as HRDocumentTemplate;
    },
    enabled: !!templateId,
  });
}

// ============================================================================
// MY HR DOCUMENTS (Employee view)
// ============================================================================
export function useMyHRDocuments() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-hr-documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_hr_documents')
        .select(`*, template:hr_document_templates(*)`)
        .eq('employee_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmployeeHRDocument[];
    },
    enabled: !!user?.id,
  });
}

// ============================================================================
// EMPLOYEE HR DOCUMENTS (Admin view for specific employee)
// ============================================================================
export function useEmployeeHRDocuments(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-hr-documents', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('employee_hr_documents')
        .select(`*, template:hr_document_templates(*)`)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmployeeHRDocument[];
    },
    enabled: !!employeeId,
  });
}

// ============================================================================
// ALL PENDING DOCUMENTS (Admin view)
// ============================================================================
export function usePendingHRDocuments() {
  return useQuery({
    queryKey: ['pending-hr-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_hr_documents')
        .select(`
          *,
          template:hr_document_templates(*),
          employee:profiles(id, first_name, last_name, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ============================================================================
// MY PERSONAL DOCUMENTS
// ============================================================================
export function useMyPersonalDocuments() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-personal-documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_personal_documents')
        .select('*')
        .eq('employee_id', user?.id)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as EmployeePersonalDocument[];
    },
    enabled: !!user?.id,
  });
}

// ============================================================================
// CREATE DOCUMENT TEMPLATE
// ============================================================================
export function useCreateHRDocumentTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: Partial<HRDocumentTemplate> & { file?: File }) => {
      let file_path = input.file_path;
      
      // Upload file if provided
      if (input.file) {
        const ext = input.file.name.split('.').pop();
        file_path = `templates/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('hr-documents')
          .upload(file_path, input.file);
        if (uploadError) throw uploadError;
      }
      
      const { file, ...rest } = input;
      const { data, error } = await supabase
        .from('hr_document_templates')
        .insert({ ...rest, file_path, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-document-templates'] });
      toast.success('Document template created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create template', { description: error.message });
    },
  });
}

// ============================================================================
// ASSIGN DOCUMENT TO EMPLOYEE
// ============================================================================
export function useAssignHRDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: {
      template_id: string;
      employee_ids: string[];
      due_date?: string;
    }) => {
      const records = input.employee_ids.map(employee_id => ({
        employee_id,
        template_id: input.template_id,
        status: 'pending' as const,
        due_date: input.due_date,
      }));
      
      const { error } = await supabase
        .from('employee_hr_documents')
        .insert(records as any);
      if (error) throw error;
      
      // Create notifications
      const { data: template } = await supabase
        .from('hr_document_templates')
        .select('name')
        .eq('id', input.template_id)
        .single();
      
      const notifications = input.employee_ids.map(employee_id => ({
        user_id: employee_id,
        title: 'Document Requires Signature',
        message: `Please review and sign: ${template?.name}`,
        notification_type: 'document_required',
        link_type: 'document',
        link_id: input.template_id,
      }));
      
      await supabase.from('notifications').insert(notifications as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-hr-documents'] });
      queryClient.invalidateQueries({ queryKey: ['pending-hr-documents'] });
      toast.success('Document assigned');
    },
  });
}

// ============================================================================
// SIGN DOCUMENT
// ============================================================================
export function useSignHRDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: {
      document_id: string;
      signature_data: string;
    }) => {
      const { data, error } = await supabase
        .from('employee_hr_documents')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_data: input.signature_data,
        })
        .eq('id', input.document_id)
        .eq('employee_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-hr-documents'] });
      toast.success('Document signed');
    },
    onError: (error: Error) => {
      toast.error('Failed to sign document', { description: error.message });
    },
  });
}

// ============================================================================
// UPLOAD PERSONAL DOCUMENT (Admin)
// ============================================================================
export function useUploadPersonalDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      document_type: string;
      name: string;
      description?: string;
      file: File;
      issue_date?: string;
      expiry_date?: string;
    }) => {
      const ext = input.file.name.split('.').pop();
      const file_path = `personal/${input.employee_id}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('hr-documents')
        .upload(file_path, input.file);
      if (uploadError) throw uploadError;
      
      const { data, error } = await supabase
        .from('employee_personal_documents')
        .insert({
          employee_id: input.employee_id,
          document_type: input.document_type,
          name: input.name,
          description: input.description,
          file_name: input.file.name,
          file_path,
          file_type: input.file.type,
          file_size: input.file.size,
          issue_date: input.issue_date,
          expiry_date: input.expiry_date,
          uploaded_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { employee_id }) => {
      queryClient.invalidateQueries({ queryKey: ['employee-personal-documents', employee_id] });
      toast.success('Document uploaded');
    },
  });
}
