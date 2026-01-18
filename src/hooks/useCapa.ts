import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addHours, addDays, format } from 'date-fns';
import type { 
  CorrectiveAction, 
  CapaListItem, 
  CreateCapaInput, 
  CapaAttachment, 
  CapaActivityLog,
  CapaSeveritySettings,
  CapaStatus,
  CapaSeverity,
  CapaType
} from '@/types/capa';

// ============================================
// CAPA LIST & FILTERING
// ============================================

export interface CapaFilters {
  status?: CapaStatus | CapaStatus[] | 'all';
  severity?: CapaSeverity | 'all';
  capa_type?: CapaType | 'all';
  assigned_to?: string | 'all' | 'me' | 'unassigned';
  supplier_id?: string;
  material_id?: string;
  product_id?: string;
  department_id?: string;
  date_from?: string;
  date_to?: string;
  is_overdue?: boolean;
  search?: string;
}

export function useCapaList(filters: CapaFilters = {}) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['capas', filters],
    queryFn: async () => {
      let query = supabase
        .from('corrective_actions')
        .select(`
          *,
          supplier:suppliers(id, name, code),
          material:materials(id, name, code),
          product:products(id, name, sku),
          equipment:machines(id, name, machine_number),
          employee:employees(id, first_name, last_name, employee_number),
          location:locations(id, name),
          assigned_to_profile:profiles!corrective_actions_assigned_to_fkey(id, first_name, last_name),
          created_by_profile:profiles!corrective_actions_created_by_fkey(id, first_name, last_name),
          department:departments(id, name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.severity && filters.severity !== 'all') {
        query = query.eq('severity', filters.severity);
      }

      if (filters.capa_type && filters.capa_type !== 'all') {
        query = query.eq('capa_type', filters.capa_type);
      }

      if (filters.assigned_to) {
        if (filters.assigned_to === 'me' && user?.id) {
          query = query.eq('assigned_to', user.id);
        } else if (filters.assigned_to === 'unassigned') {
          query = query.is('assigned_to', null);
        } else if (filters.assigned_to !== 'all') {
          query = query.eq('assigned_to', filters.assigned_to);
        }
      }

      if (filters.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters.material_id) {
        query = query.eq('material_id', filters.material_id);
      }

      if (filters.product_id) {
        query = query.eq('product_id', filters.product_id);
      }

      if (filters.department_id) {
        query = query.eq('department_id', filters.department_id);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,capa_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate derived fields
      const now = new Date();
      const enrichedData: CapaListItem[] = (data || []).map(capa => {
        const createdAt = new Date(capa.created_at);
        const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determine next due date and action
        let nextDueDate: string | null = null;
        let nextDueAction: string | null = null;
        let isOverdue = false;

        const dueDates = [
          { date: capa.containment_due_date, action: 'Containment', statuses: ['open', 'containment'] },
          { date: capa.root_cause_due_date, action: 'Root Cause Analysis', statuses: ['open', 'containment', 'investigating'] },
          { date: capa.corrective_action_due_date, action: 'Corrective Action', statuses: ['investigating', 'action_required'] },
          { date: capa.verification_due_date, action: 'Verification', statuses: ['action_required', 'verification'] },
          { date: capa.effectiveness_review_due_date, action: 'Effectiveness Review', statuses: ['verification', 'effectiveness_review'] },
        ];

        for (const item of dueDates) {
          if (item.date && item.statuses.includes(capa.status)) {
            const dueDate = new Date(item.date);
            if (!nextDueDate || dueDate < new Date(nextDueDate)) {
              nextDueDate = item.date;
              nextDueAction = item.action;
              if (dueDate < now) {
                isOverdue = true;
              }
            }
          }
        }

        return {
          ...capa,
          days_open: daysOpen,
          is_overdue: isOverdue,
          next_due_date: nextDueDate,
          next_due_action: nextDueAction,
        } as CapaListItem;
      });

      // Filter by overdue if requested
      if (filters.is_overdue) {
        return enrichedData.filter(c => c.is_overdue);
      }

      return enrichedData;
    },
  });
}

// ============================================
// SINGLE CAPA
// ============================================

export function useCapa(id: string | undefined) {
  return useQuery({
    queryKey: ['capa', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          *,
          supplier:suppliers(id, name, code),
          material:materials(id, name, code),
          product:products(id, name, sku),
          production_lot:production_lots(id, lot_number),
          receiving_lot:receiving_lots(id, internal_lot_number),
          equipment:machines(id, name, machine_number),
          employee:employees(id, first_name, last_name, employee_number),
          location:locations(id, name, location_code),
          assigned_to_profile:profiles!corrective_actions_assigned_to_fkey(id, first_name, last_name, email),
          created_by_profile:profiles!corrective_actions_created_by_fkey(id, first_name, last_name),
          department:departments(id, name),
          related_capa:corrective_actions!corrective_actions_related_capa_id_fkey(id, capa_number, title)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CorrectiveAction & Record<string, unknown>;
    },
    enabled: !!id,
  });
}

// ============================================
// CREATE CAPA
// ============================================

export function useCreateCapa() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCapaInput) => {
      // Generate CAPA number
      const { data: capaNumber, error: numError } = await supabase.rpc('generate_capa_number');
      if (numError) throw numError;

      // Get severity settings for due date calculation
      const { data: settings, error: settingsError } = await supabase
        .from('capa_severity_settings')
        .select('*')
        .eq('severity', input.severity)
        .single();
      if (settingsError) throw settingsError;

      const now = new Date();
      const discoveryDate = input.discovery_date ? new Date(input.discovery_date) : now;

      // Calculate due dates based on severity
      const dueDates = {
        containment_due_date: addHours(discoveryDate, settings.containment_hours).toISOString(),
        root_cause_due_date: addHours(discoveryDate, settings.root_cause_hours).toISOString(),
        corrective_action_due_date: format(addDays(discoveryDate, settings.corrective_action_days), 'yyyy-MM-dd'),
        preventive_action_due_date: format(addDays(discoveryDate, settings.preventive_action_days), 'yyyy-MM-dd'),
        verification_due_date: format(addDays(discoveryDate, settings.verification_days), 'yyyy-MM-dd'),
        effectiveness_review_due_date: format(addDays(discoveryDate, settings.effectiveness_review_days), 'yyyy-MM-dd'),
      };

      const { data, error } = await supabase
        .from('corrective_actions')
        .insert({
          capa_number: capaNumber,
          capa_type: input.capa_type,
          severity: input.severity,
          title: input.title,
          description: input.description,
          occurrence_date: input.occurrence_date,
          discovery_date: input.discovery_date || format(now, 'yyyy-MM-dd'),
          source_type: input.source_type || null,
          source_id: input.source_id || null,
          supplier_id: input.supplier_id || null,
          material_id: input.material_id || null,
          product_id: input.product_id || null,
          production_lot_id: input.production_lot_id || null,
          receiving_lot_id: input.receiving_lot_id || null,
          equipment_id: input.equipment_id || null,
          employee_id: input.employee_id || null,
          location_id: input.location_id || null,
          assigned_to: input.assigned_to || null,
          department_id: input.department_id || null,
          immediate_action: input.immediate_action || null,
          ...dueDates,
          status: input.immediate_action ? 'containment' : 'open',
          immediate_action_date: input.immediate_action ? now.toISOString() : null,
          immediate_action_by: input.immediate_action ? user?.id : null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('capa_activity_log').insert({
        capa_id: data.id,
        action: 'created',
        new_value: input.severity,
        comment: `CAPA created: ${input.title}`,
        performed_by: user?.id,
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      queryClient.invalidateQueries({ queryKey: ['capa-dashboard-metrics'] });
      toast.success('CAPA Created', {
        description: `${data.capa_number} has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create CAPA', {
        description: error.message,
      });
    },
  });
}

// ============================================
// UPDATE CAPA
// ============================================

export function useUpdateCapa() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CorrectiveAction> & { id: string }) => {
      // Get current state for activity logging
      const { data: current, error: fetchError } = await supabase
        .from('corrective_actions')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('corrective_actions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log significant changes
      const significantFields = ['status', 'severity', 'assigned_to', 'root_cause', 'corrective_action', 'preventive_action'] as const;
      for (const field of significantFields) {
        const updateValue = updates[field as keyof typeof updates];
        if (updateValue !== undefined && current[field] !== updateValue) {
          await supabase.from('capa_activity_log').insert({
            capa_id: id,
            action: field === 'status' ? 'status_changed' : field === 'assigned_to' ? 'assigned' : 'updated',
            field_changed: field,
            old_value: current[field]?.toString() || null,
            new_value: updateValue?.toString() || null,
            performed_by: user?.id,
          });
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      queryClient.invalidateQueries({ queryKey: ['capa', data.id] });
      queryClient.invalidateQueries({ queryKey: ['capa-dashboard-metrics'] });
      toast.success('CAPA Updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update CAPA', {
        description: error.message,
      });
    },
  });
}

// ============================================
// UPDATE CAPA STATUS (Workflow Transition)
// ============================================

export function useUpdateCapaStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      newStatus, 
      notes 
    }: { 
      id: string; 
      newStatus: CapaStatus; 
      notes?: string;
    }) => {
      // Get current state
      const { data: current, error: fetchError } = await supabase
        .from('corrective_actions')
        .select('status, capa_number')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Set completion timestamps based on status transition
      const now = new Date().toISOString();
      if (newStatus === 'investigating' && current.status === 'containment') {
        // Containment completed
      } else if (newStatus === 'action_required' && current.status === 'investigating') {
        updateData.root_cause_completed_at = now;
        updateData.root_cause_completed_by = user?.id;
      } else if (newStatus === 'verification' && current.status === 'action_required') {
        updateData.corrective_action_completed_at = now;
        updateData.corrective_action_completed_by = user?.id;
        updateData.preventive_action_completed_at = now;
        updateData.preventive_action_completed_by = user?.id;
      } else if (newStatus === 'effectiveness_review' && current.status === 'verification') {
        updateData.verification_date = now;
        updateData.verified_by = user?.id;
      } else if (newStatus === 'closed') {
        updateData.closed_at = now;
        updateData.closed_by = user?.id;
        updateData.effectiveness_review_completed_at = now;
        updateData.effectiveness_reviewed_by = user?.id;
      }

      const { data, error } = await supabase
        .from('corrective_actions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log status change
      await supabase.from('capa_activity_log').insert({
        capa_id: id,
        action: 'status_changed',
        field_changed: 'status',
        old_value: current.status,
        new_value: newStatus,
        comment: notes || null,
        performed_by: user?.id,
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      queryClient.invalidateQueries({ queryKey: ['capa', data.id] });
      queryClient.invalidateQueries({ queryKey: ['capa-activity', data.id] });
      queryClient.invalidateQueries({ queryKey: ['capa-dashboard-metrics'] });
      toast.success('Status Updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update status', {
        description: error.message,
      });
    },
  });
}

// ============================================
// CLOSE CAPA
// ============================================

export function useCloseCapa() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      closure_notes,
      effectiveness_review_result 
    }: { 
      id: string; 
      closure_notes?: string;
      effectiveness_review_result?: 'effective' | 'requires_followup' | 'ineffective';
    }) => {
      const { data: current, error: fetchError } = await supabase
        .from('corrective_actions')
        .select('status, capa_number')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('corrective_actions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
          closure_notes,
          effectiveness_review_result: effectiveness_review_result || 'effective',
          effectiveness_review_completed_at: new Date().toISOString(),
          effectiveness_reviewed_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log closure
      await supabase.from('capa_activity_log').insert({
        capa_id: id,
        action: 'status_changed',
        field_changed: 'status',
        old_value: current.status,
        new_value: 'closed',
        comment: closure_notes || 'CAPA closed',
        performed_by: user?.id,
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      queryClient.invalidateQueries({ queryKey: ['capa', data.id] });
      queryClient.invalidateQueries({ queryKey: ['capa-dashboard-metrics'] });
      toast.success('CAPA Closed', {
        description: `${data.capa_number} has been closed.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to close CAPA', {
        description: error.message,
      });
    },
  });
}

// ============================================
// CANCEL CAPA
// ============================================

export function useCancelCapa() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: current, error: fetchError } = await supabase
        .from('corrective_actions')
        .select('status, capa_number')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('corrective_actions')
        .update({
          status: 'cancelled',
          closure_notes: reason,
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log cancellation
      await supabase.from('capa_activity_log').insert({
        capa_id: id,
        action: 'status_changed',
        field_changed: 'status',
        old_value: current.status,
        new_value: 'cancelled',
        comment: `CAPA cancelled: ${reason}`,
        performed_by: user?.id,
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      queryClient.invalidateQueries({ queryKey: ['capa', data.id] });
      queryClient.invalidateQueries({ queryKey: ['capa-dashboard-metrics'] });
      toast.success('CAPA Cancelled', {
        description: `${data.capa_number} has been cancelled.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel CAPA', {
        description: error.message,
      });
    },
  });
}

// ============================================
// ATTACHMENTS
// ============================================

export function useCapaAttachments(capaId: string | undefined) {
  return useQuery({
    queryKey: ['capa-attachments', capaId],
    queryFn: async () => {
      if (!capaId) return [];
      
      const { data, error } = await supabase
        .from('capa_attachments')
        .select(`
          *,
          uploaded_by_profile:profiles!capa_attachments_uploaded_by_fkey(id, first_name, last_name)
        `)
        .eq('capa_id', capaId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as (CapaAttachment & { uploaded_by_profile: { id: string; first_name: string | null; last_name: string | null } | null })[];
    },
    enabled: !!capaId,
  });
}

export function useUploadCapaAttachment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      capaId,
      file,
      fileType,
      category,
      description,
    }: {
      capaId: string;
      file: File;
      fileType: 'photo' | 'document' | 'report' | 'other';
      category: 'evidence' | 'root_cause' | 'corrective_action' | 'verification' | 'other';
      description?: string;
    }) => {
      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `capa/${capaId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('capa-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('capa-attachments')
        .getPublicUrl(filePath);

      // Create attachment record
      const { data, error } = await supabase
        .from('capa_attachments')
        .insert({
          capa_id: capaId,
          file_name: file.name,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: fileType,
          attachment_category: category,
          description,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('capa_activity_log').insert({
        capa_id: capaId,
        action: 'attachment_added',
        new_value: file.name,
        performed_by: user?.id,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['capa-attachments', variables.capaId] });
      queryClient.invalidateQueries({ queryKey: ['capa-activity', variables.capaId] });
      toast.success('Attachment uploaded');
    },
    onError: (error: Error) => {
      toast.error('Failed to upload attachment', {
        description: error.message,
      });
    },
  });
}

export function useDeleteCapaAttachment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      capaId, 
      filePath 
    }: { 
      id: string; 
      capaId: string; 
      filePath: string | null;
    }) => {
      // Delete from storage if path exists
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('capa-attachments')
          .remove([filePath]);
        if (storageError) console.error('Storage delete error:', storageError);
      }

      // Get filename for logging
      const { data: attachment } = await supabase
        .from('capa_attachments')
        .select('file_name')
        .eq('id', id)
        .single();

      // Delete record
      const { error } = await supabase
        .from('capa_attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log activity
      await supabase.from('capa_activity_log').insert({
        capa_id: capaId,
        action: 'attachment_removed',
        old_value: attachment?.file_name || 'Unknown file',
        performed_by: user?.id,
      });

      return { id, capaId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capa-attachments', data.capaId] });
      queryClient.invalidateQueries({ queryKey: ['capa-activity', data.capaId] });
      toast.success('Attachment deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete attachment', {
        description: error.message,
      });
    },
  });
}

// ============================================
// ACTIVITY LOG
// ============================================

export function useCapaActivityLog(capaId: string | undefined) {
  return useQuery({
    queryKey: ['capa-activity', capaId],
    queryFn: async () => {
      if (!capaId) return [];
      
      const { data, error } = await supabase
        .from('capa_activity_log')
        .select(`
          *,
          performed_by_profile:profiles!capa_activity_log_performed_by_fkey(id, first_name, last_name)
        `)
        .eq('capa_id', capaId)
        .order('performed_at', { ascending: false });

      if (error) throw error;
      return data as (CapaActivityLog & { performed_by_profile: { id: string; first_name: string | null; last_name: string | null } | null })[];
    },
    enabled: !!capaId,
  });
}

export function useAddCapaComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ capaId, comment }: { capaId: string; comment: string }) => {
      const { data, error } = await supabase
        .from('capa_activity_log')
        .insert({
          capa_id: capaId,
          action: 'commented',
          comment,
          performed_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['capa-activity', variables.capaId] });
      toast.success('Comment added');
    },
    onError: (error: Error) => {
      toast.error('Failed to add comment', {
        description: error.message,
      });
    },
  });
}

// ============================================
// SEVERITY SETTINGS
// ============================================

export function useCapaSeveritySettings() {
  return useQuery({
    queryKey: ['capa-severity-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capa_severity_settings')
        .select('*')
        .order('severity');

      if (error) throw error;
      return data as CapaSeveritySettings[];
    },
  });
}

export function useUpdateCapaSeveritySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<CapaSeveritySettings> & { id: string }) => {
      const { data, error } = await supabase
        .from('capa_severity_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capa-severity-settings'] });
      toast.success('Settings updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update settings', {
        description: error.message,
      });
    },
  });
}

// ============================================
// DASHBOARD METRICS
// ============================================

export function useCapaDashboardMetrics() {
  return useQuery({
    queryKey: ['capa-dashboard-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corrective_actions')
        .select('id, status, severity, capa_type, created_at, closed_at, corrective_action_due_date, verification_due_date, containment_due_date, root_cause_due_date');

      if (error) throw error;

      const now = new Date();
      const capas = data || [];
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const openCapas = capas.filter(c => !['closed', 'cancelled'].includes(c.status));
      const closedThisMonth = capas.filter(c => 
        c.status === 'closed' && 
        c.closed_at && 
        new Date(c.closed_at) >= thirtyDaysAgo
      );

      const overdueCapas = openCapas.filter(c => {
        const dueDates = [
          c.containment_due_date,
          c.root_cause_due_date,
          c.corrective_action_due_date,
          c.verification_due_date,
        ].filter(Boolean);
        
        return dueDates.some(d => new Date(d!) < now);
      });

      // Group by type
      const byType = openCapas.reduce((acc, c) => {
        acc[c.capa_type] = (acc[c.capa_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by severity
      const bySeverity = openCapas.reduce((acc, c) => {
        acc[c.severity] = (acc[c.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by status
      const byStatus = capas.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate average days to close for closed CAPAs
      const closedCapas = capas.filter(c => c.status === 'closed' && c.closed_at);
      let avgDaysToClose = 0;
      if (closedCapas.length > 0) {
        const totalDays = closedCapas.reduce((sum, c) => {
          const created = new Date(c.created_at);
          const closed = new Date(c.closed_at!);
          return sum + Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        avgDaysToClose = Math.round(totalDays / closedCapas.length);
      }

      return {
        total: capas.length,
        open: openCapas.length,
        overdue: overdueCapas.length,
        closedThisMonth: closedThisMonth.length,
        avgDaysToClose,
        critical: bySeverity['critical'] || 0,
        major: bySeverity['major'] || 0,
        minor: bySeverity['minor'] || 0,
        byType,
        bySeverity,
        byStatus,
      };
    },
  });
}

// ============================================
// SUPPLIER-SPECIFIC CAPA METRICS
// ============================================

export function useSupplierCapaMetrics(supplierId: string | undefined, rollingMonths: number = 12) {
  return useQuery({
    queryKey: ['supplier-capa-metrics', supplierId, rollingMonths],
    queryFn: async () => {
      if (!supplierId) return null;

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - rollingMonths);

      const { data, error } = await supabase
        .from('corrective_actions')
        .select('id, severity, status, created_at, closed_at')
        .eq('supplier_id', supplierId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const capas = data || [];
      const openCapas = capas.filter(c => !['closed', 'cancelled'].includes(c.status));
      const criticalCapas = capas.filter(c => c.severity === 'critical');

      return {
        total: capas.length,
        open: openCapas.length,
        closed: capas.filter(c => c.status === 'closed').length,
        critical: criticalCapas.length,
        major: capas.filter(c => c.severity === 'major').length,
        minor: capas.filter(c => c.severity === 'minor').length,
        rollingMonths,
      };
    },
    enabled: !!supplierId,
  });
}

// ============================================
// MATERIAL-SPECIFIC CAPA METRICS
// ============================================

export function useMaterialCapaMetrics(materialId: string | undefined, rollingMonths: number = 12) {
  return useQuery({
    queryKey: ['material-capa-metrics', materialId, rollingMonths],
    queryFn: async () => {
      if (!materialId) return null;

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - rollingMonths);

      const { data, error } = await supabase
        .from('corrective_actions')
        .select('id, severity, status, created_at, closed_at')
        .eq('material_id', materialId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const capas = data || [];
      const openCapas = capas.filter(c => !['closed', 'cancelled'].includes(c.status));

      return {
        total: capas.length,
        open: openCapas.length,
        closed: capas.filter(c => c.status === 'closed').length,
        critical: capas.filter(c => c.severity === 'critical').length,
        major: capas.filter(c => c.severity === 'major').length,
        minor: capas.filter(c => c.severity === 'minor').length,
        rollingMonths,
      };
    },
    enabled: !!materialId,
  });
}

// ============================================
// RECENT CAPAS (for dashboards)
// ============================================

export function useRecentCapas(limit: number = 5) {
  return useQuery({
    queryKey: ['recent-capas', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          id, 
          capa_number, 
          title, 
          severity, 
          status, 
          capa_type,
          created_at,
          supplier:suppliers(id, name),
          material:materials(id, name)
        `)
        .not('status', 'in', '("closed","cancelled")')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}

// ============================================
// OVERDUE CAPAS
// ============================================

export function useOverdueCapas() {
  return useQuery({
    queryKey: ['overdue-capas'],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          id, 
          capa_number, 
          title, 
          severity, 
          status, 
          capa_type,
          corrective_action_due_date,
          verification_due_date,
          containment_due_date,
          root_cause_due_date,
          assigned_to_profile:profiles!corrective_actions_assigned_to_fkey(id, first_name, last_name)
        `)
        .not('status', 'in', '("closed","cancelled")')
        .or(`containment_due_date.lt.${now},root_cause_due_date.lt.${now},corrective_action_due_date.lt.${now},verification_due_date.lt.${now}`)
        .order('severity', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
