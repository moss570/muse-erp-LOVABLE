import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Task, TaskCategory, CreateTaskInput, CompleteTaskInput, TaskAttachment, TaskActivityLog, ChecklistItem } from '@/types/tasks';
import type { Json } from '@/integrations/supabase/types';

// Helper to transform profile data
function transformProfile(profile: { id: string; first_name: string | null; last_name: string | null; avatar_url?: string | null } | null) {
  if (!profile) return undefined;
  return {
    id: profile.id,
    full_name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown',
    avatar_url: profile.avatar_url ?? undefined,
  };
}

// Helper to parse JSON arrays safely
function parseChecklistItems(items: Json): ChecklistItem[] {
  if (Array.isArray(items)) {
    return items as unknown as ChecklistItem[];
  }
  return [];
}

function parseChecklistCompleted(items: Json): { id: string; completed: boolean; completed_at?: string }[] {
  if (Array.isArray(items)) {
    return items as unknown as { id: string; completed: boolean; completed_at?: string }[];
  }
  return [];
}

// ============================================================================
// TASK CATEGORIES
// ============================================================================
export function useTaskCategories() {
  return useQuery({
    queryKey: ['task-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as TaskCategory[];
    },
  });
}

// ============================================================================
// TASKS LIST
// ============================================================================
interface TaskFilters {
  status?: string[];
  category_id?: string;
  assigned_to?: string;
  priority?: string;
  is_food_safety?: boolean;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
}

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          category:task_categories(*),
          assigned_to_profile:profiles!tasks_assigned_to_fkey(id, first_name, last_name, avatar_url),
          claimed_by_profile:profiles!tasks_claimed_by_fkey(id, first_name, last_name, avatar_url),
          completed_by_profile:profiles!tasks_completed_by_fkey(id, first_name, last_name),
          created_by_profile:profiles!tasks_created_by_fkey(id, first_name, last_name),
          location:locations(id, name),
          assigned_department:departments(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.is_food_safety !== undefined) {
        query = query.eq('is_food_safety', filters.is_food_safety);
      }
      if (filters?.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
      }
      if (filters?.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,task_number.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data ?? []).map((row) => ({
        ...row,
        checklist_items: parseChecklistItems(row.checklist_items),
        checklist_completed: parseChecklistCompleted(row.checklist_completed),
        assigned_to_profile: transformProfile(row.assigned_to_profile),
        claimed_by_profile: transformProfile(row.claimed_by_profile),
        completed_by_profile: transformProfile(row.completed_by_profile),
        created_by_profile: transformProfile(row.created_by_profile),
      })) as Task[];
    },
  });
}

// ============================================================================
// MY TASKS (for employee work queue)
// ============================================================================
export function useMyTasks() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          category:task_categories(*),
          location:locations(id, name)
        `)
        .or(`assigned_to.eq.${user.id},claimed_by.eq.${user.id}`)
        .in('status', ['pending', 'claimed', 'in_progress', 'overdue'])
        .order('priority', { ascending: false })
        .order('due_at', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      
      return (data ?? []).map((row) => ({
        ...row,
        checklist_items: parseChecklistItems(row.checklist_items),
        checklist_completed: parseChecklistCompleted(row.checklist_completed),
      })) as Task[];
    },
    enabled: !!user?.id,
  });
}

// ============================================================================
// AVAILABLE TASKS (for claiming)
// ============================================================================
export function useAvailableTasks() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['available-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          category:task_categories(*),
          location:locations(id, name)
        `)
        .eq('status', 'available')
        .order('priority', { ascending: false });
      
      if (error) throw error;
      
      return (data ?? []).map((row) => ({
        ...row,
        checklist_items: parseChecklistItems(row.checklist_items),
        checklist_completed: parseChecklistCompleted(row.checklist_completed),
      })) as Task[];
    },
    enabled: !!user?.id,
  });
}

// ============================================================================
// SINGLE TASK
// ============================================================================
export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          category:task_categories(*),
          assigned_to_profile:profiles!tasks_assigned_to_fkey(id, first_name, last_name, avatar_url),
          claimed_by_profile:profiles!tasks_claimed_by_fkey(id, first_name, last_name, avatar_url),
          completed_by_profile:profiles!tasks_completed_by_fkey(id, first_name, last_name),
          created_by_profile:profiles!tasks_created_by_fkey(id, first_name, last_name),
          verified_by_profile:profiles!tasks_verified_by_fkey(id, first_name, last_name),
          location:locations(id, name),
          assigned_department:departments(id, name),
          template:task_templates(*)
        `)
        .eq('id', taskId)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        checklist_items: parseChecklistItems(data.checklist_items),
        checklist_completed: parseChecklistCompleted(data.checklist_completed),
        assigned_to_profile: transformProfile(data.assigned_to_profile),
        claimed_by_profile: transformProfile(data.claimed_by_profile),
        completed_by_profile: transformProfile(data.completed_by_profile),
        created_by_profile: transformProfile(data.created_by_profile),
        verified_by_profile: transformProfile(data.verified_by_profile),
        template: data.template ? {
          ...data.template,
          checklist_items: parseChecklistItems(data.template.checklist_items),
        } : undefined,
      } as Task;
    },
    enabled: !!taskId,
  });
}

// ============================================================================
// TASK ATTACHMENTS
// ============================================================================
export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as TaskAttachment[];
    },
    enabled: !!taskId,
  });
}

// ============================================================================
// TASK ACTIVITY LOG
// ============================================================================
export function useTaskActivityLog(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-activity', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('task_activity_log')
        .select(`
          *,
          performed_by_profile:profiles(id, first_name, last_name)
        `)
        .eq('task_id', taskId)
        .order('performed_at', { ascending: false });
      
      if (error) throw error;
      
      return (data ?? []).map((row) => ({
        ...row,
        performed_by_profile: transformProfile(row.performed_by_profile),
      })) as TaskActivityLog[];
    },
    enabled: !!taskId,
  });
}

// ============================================================================
// CREATE TASK
// ============================================================================
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: input.title,
          description: input.description,
          category_id: input.category_id,
          priority: input.priority ?? 'medium',
          template_id: input.template_id,
          assignment_type: input.assignment_type,
          assigned_to: input.assigned_to,
          assigned_role: input.assigned_role,
          assigned_department_id: input.assigned_department_id,
          location_id: input.location_id,
          due_date: input.due_date,
          due_time: input.due_time,
          estimated_duration_minutes: input.estimated_duration_minutes,
          requires_photo: input.requires_photo ?? false,
          requires_signature: input.requires_signature ?? false,
          requires_notes: input.requires_notes ?? false,
          photo_min_count: input.photo_min_count ?? 0,
          checklist_items: (input.checklist_items ?? []) as unknown as Json,
          is_food_safety: input.is_food_safety ?? false,
          status: input.assignment_type === 'available' ? 'available' : 'pending',
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success(`Task ${data.task_number} created`);
    },
    onError: (error: Error) => {
      toast.error('Failed to create task', { description: error.message });
    },
  });
}

// ============================================================================
// UPDATE TASK
// ============================================================================
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, title, description, category_id, priority, due_date, due_time, location_id, estimated_duration_minutes }: { 
      id: string;
      title?: string;
      description?: string;
      category_id?: string;
      priority?: string;
      due_date?: string;
      due_time?: string;
      location_id?: string;
      estimated_duration_minutes?: number;
    }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (category_id !== undefined) updates.category_id = category_id;
      if (priority !== undefined) updates.priority = priority;
      if (due_date !== undefined) updates.due_date = due_date;
      if (due_time !== undefined) updates.due_time = due_time;
      if (location_id !== undefined) updates.location_id = location_id;
      if (estimated_duration_minutes !== undefined) updates.estimated_duration_minutes = estimated_duration_minutes;
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success('Task updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update task', { description: error.message });
    },
  });
}

// ============================================================================
// CLAIM TASK
// ============================================================================
export function useClaimTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          claimed_by: user?.id,
          claimed_at: new Date().toISOString(),
          status: 'claimed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('status', 'available') // Only claim if still available
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success(`Task ${data.task_number} claimed`);
    },
    onError: (error: Error) => {
      toast.error('Failed to claim task', { description: error.message });
    },
  });
}

// ============================================================================
// START TASK
// ============================================================================
export function useStartTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success('Task started');
    },
  });
}

// ============================================================================
// COMPLETE TASK
// ============================================================================
export function useCompleteTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: CompleteTaskInput) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
          completion_notes: input.completion_notes,
          completion_signature: input.completion_signature,
          checklist_completed: (input.checklist_completed ?? []) as unknown as Json,
          food_safety_data: input.food_safety_data as Json ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.task_id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success(`Task ${data.task_number} completed`);
    },
    onError: (error: Error) => {
      toast.error('Failed to complete task', { description: error.message });
    },
  });
}

// ============================================================================
// VERIFY TASK (for food safety tasks)
// ============================================================================
export function useVerifyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
          verification_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      toast.success('Task verified');
    },
  });
}

// ============================================================================
// CANCEL TASK
// ============================================================================
export function useCancelTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'cancelled',
          completion_notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success('Task cancelled');
    },
  });
}

// ============================================================================
// UPLOAD TASK ATTACHMENT
// ============================================================================
export function useUploadTaskAttachment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      taskId,
      file,
      attachmentType = 'photo',
      caption,
    }: {
      taskId: string;
      file: File;
      attachmentType?: 'photo' | 'document' | 'signature';
      caption?: string;
    }) => {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Create attachment record
      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: fileName,
          attachment_type: attachmentType,
          caption,
          uploaded_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', data.task_id] });
      toast.success('Attachment uploaded');
    },
    onError: (error: Error) => {
      toast.error('Failed to upload attachment', { description: error.message });
    },
  });
}

// ============================================================================
// DELETE TASK ATTACHMENT
// ============================================================================
export function useDeleteTaskAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, taskId, filePath }: { id: string; taskId: string; filePath: string }) => {
      // Delete from storage
      await supabase.storage.from('task-attachments').remove([filePath]);
      
      // Delete record
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { taskId };
    },
    onSuccess: ({ taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      toast.success('Attachment deleted');
    },
  });
}

// ============================================================================
// ADD TASK COMMENT
// ============================================================================
export function useAddTaskComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ taskId, comment }: { taskId: string; comment: string }) => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          comment,
          created_by: user?.id,
        })
        .select(`
          *,
          created_by_profile:profiles(id, first_name, last_name, avatar_url)
        `)
        .single();
      
      if (error) throw error;
      return {
        ...data,
        created_by_profile: transformProfile(data.created_by_profile),
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.task_id] });
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.task_id] });
      toast.success('Comment added');
    },
  });
}

// ============================================================================
// GET TASK COMMENTS
// ============================================================================
export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          created_by_profile:profiles(id, first_name, last_name, avatar_url)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        created_by_profile: transformProfile(row.created_by_profile),
      }));
    },
    enabled: !!taskId,
  });
}

// ============================================================================
// REASSIGN TASK
// ============================================================================
export function useReassignTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      assignedTo, 
      assignmentType = 'specific' 
    }: { 
      taskId: string; 
      assignedTo: string; 
      assignmentType?: 'specific' | 'role' | 'department';
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          assigned_to: assignedTo,
          assignment_type: assignmentType,
          status: 'pending',
          claimed_by: null,
          claimed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success('Task reassigned');
    },
  });
}
