import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { TaskTemplate, ChecklistItem } from '@/types/tasks';
import type { Json } from '@/integrations/supabase/types';

// Helper to parse JSON arrays safely
function parseChecklistItems(items: Json): ChecklistItem[] {
  if (Array.isArray(items)) {
    return items as unknown as ChecklistItem[];
  }
  return [];
}

function parseRecurrenceDays(days: number[] | null): number[] {
  if (Array.isArray(days)) {
    return days;
  }
  return [];
}

// ============================================================================
// TASK TEMPLATES
// ============================================================================
export function useTaskTemplates(filters?: { is_recurring?: boolean; is_food_safety?: boolean }) {
  return useQuery({
    queryKey: ['task-templates', filters],
    queryFn: async () => {
      let query = supabase
        .from('task_templates')
        .select(`
          *,
          category:task_categories(*)
        `)
        .eq('is_active', true)
        .order('name');
      
      if (filters?.is_recurring !== undefined) {
        query = query.eq('is_recurring', filters.is_recurring);
      }
      if (filters?.is_food_safety !== undefined) {
        query = query.eq('is_food_safety', filters.is_food_safety);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data ?? []).map((row) => ({
        ...row,
        checklist_items: parseChecklistItems(row.checklist_items),
        recurrence_days_of_week: parseRecurrenceDays(row.recurrence_days_of_week),
      })) as TaskTemplate[];
    },
  });
}

export function useTaskTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['task-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const { data, error } = await supabase
        .from('task_templates')
        .select(`
          *,
          category:task_categories(*)
        `)
        .eq('id', templateId)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        checklist_items: parseChecklistItems(data.checklist_items),
        recurrence_days_of_week: parseRecurrenceDays(data.recurrence_days_of_week),
      } as TaskTemplate;
    },
    enabled: !!templateId,
  });
}

// ============================================================================
// CREATE TEMPLATE
// ============================================================================
export interface CreateTemplateInput {
  name: string;
  description?: string;
  category_id?: string;
  
  default_assignee_type: 'specific' | 'role' | 'department';
  default_assignee_id?: string;
  default_role?: string;
  default_department_id?: string;
  
  estimated_duration_minutes?: number;
  default_priority: 'low' | 'medium' | 'high' | 'urgent';
  
  requires_photo: boolean;
  requires_signature: boolean;
  requires_notes: boolean;
  photo_min_count: number;
  
  checklist_items: ChecklistItem[];
  
  is_food_safety: boolean;
  food_safety_type?: string;
  
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_time?: string;
  recurrence_days_of_week?: number[];
  recurrence_day_of_month?: number;
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          name: input.name,
          description: input.description,
          category_id: input.category_id,
          default_assignee_type: input.default_assignee_type,
          default_assignee_id: input.default_assignee_id,
          default_role: input.default_role,
          default_department_id: input.default_department_id,
          estimated_duration_minutes: input.estimated_duration_minutes,
          default_priority: input.default_priority,
          requires_photo: input.requires_photo,
          requires_signature: input.requires_signature,
          requires_notes: input.requires_notes,
          photo_min_count: input.photo_min_count,
          checklist_items: input.checklist_items as unknown as Json,
          is_food_safety: input.is_food_safety,
          food_safety_type: input.food_safety_type,
          is_recurring: input.is_recurring,
          recurrence_pattern: input.recurrence_pattern,
          recurrence_time: input.recurrence_time,
          recurrence_days_of_week: input.recurrence_days_of_week,
          recurrence_day_of_month: input.recurrence_day_of_month,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success('Task template created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create template', { description: error.message });
    },
  });
}

// ============================================================================
// UPDATE TEMPLATE
// ============================================================================
export function useUpdateTaskTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateTemplateInput> & { id: string }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
      if (updates.default_assignee_type !== undefined) updateData.default_assignee_type = updates.default_assignee_type;
      if (updates.default_assignee_id !== undefined) updateData.default_assignee_id = updates.default_assignee_id;
      if (updates.default_role !== undefined) updateData.default_role = updates.default_role;
      if (updates.default_department_id !== undefined) updateData.default_department_id = updates.default_department_id;
      if (updates.estimated_duration_minutes !== undefined) updateData.estimated_duration_minutes = updates.estimated_duration_minutes;
      if (updates.default_priority !== undefined) updateData.default_priority = updates.default_priority;
      if (updates.requires_photo !== undefined) updateData.requires_photo = updates.requires_photo;
      if (updates.requires_signature !== undefined) updateData.requires_signature = updates.requires_signature;
      if (updates.requires_notes !== undefined) updateData.requires_notes = updates.requires_notes;
      if (updates.photo_min_count !== undefined) updateData.photo_min_count = updates.photo_min_count;
      if (updates.checklist_items !== undefined) updateData.checklist_items = updates.checklist_items as unknown as Json;
      if (updates.is_food_safety !== undefined) updateData.is_food_safety = updates.is_food_safety;
      if (updates.food_safety_type !== undefined) updateData.food_safety_type = updates.food_safety_type;
      if (updates.is_recurring !== undefined) updateData.is_recurring = updates.is_recurring;
      if (updates.recurrence_pattern !== undefined) updateData.recurrence_pattern = updates.recurrence_pattern;
      if (updates.recurrence_time !== undefined) updateData.recurrence_time = updates.recurrence_time;
      if (updates.recurrence_days_of_week !== undefined) updateData.recurrence_days_of_week = updates.recurrence_days_of_week;
      if (updates.recurrence_day_of_month !== undefined) updateData.recurrence_day_of_month = updates.recurrence_day_of_month;
      
      const { data, error } = await supabase
        .from('task_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      queryClient.invalidateQueries({ queryKey: ['task-template', data.id] });
      toast.success('Template updated');
    },
  });
}

// ============================================================================
// DELETE (DEACTIVATE) TEMPLATE
// ============================================================================
export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('task_templates')
        .update({ is_active: false })
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success('Template deleted');
    },
  });
}

// ============================================================================
// DUPLICATE TEMPLATE
// ============================================================================
export function useDuplicateTaskTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      // Fetch the original template
      const { data: original, error: fetchError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create a copy
      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          name: `${original.name} (Copy)`,
          description: original.description,
          category_id: original.category_id,
          default_assignee_type: original.default_assignee_type,
          default_assignee_id: original.default_assignee_id,
          default_role: original.default_role,
          default_department_id: original.default_department_id,
          estimated_duration_minutes: original.estimated_duration_minutes,
          default_priority: original.default_priority,
          requires_photo: original.requires_photo,
          requires_signature: original.requires_signature,
          requires_notes: original.requires_notes,
          photo_min_count: original.photo_min_count,
          checklist_items: original.checklist_items,
          is_food_safety: original.is_food_safety,
          food_safety_type: original.food_safety_type,
          is_recurring: false, // Don't copy recurrence
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success('Template duplicated');
    },
  });
}

// ============================================================================
// CREATE TASK FROM TEMPLATE
// ============================================================================
export function useCreateTaskFromTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      templateId,
      overrides,
    }: {
      templateId: string;
      overrides?: Partial<{
        title: string;
        assigned_to: string;
        due_date: string;
        due_time: string;
      }>;
    }) => {
      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (templateError) throw templateError;
      
      // Create task from template
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          template_id: templateId,
          title: overrides?.title || template.name,
          description: template.description,
          category_id: template.category_id,
          priority: template.default_priority,
          source_type: 'template',
          
          assignment_type: template.default_assignee_type,
          assigned_to: overrides?.assigned_to || template.default_assignee_id,
          assigned_role: template.default_role,
          assigned_department_id: template.default_department_id,
          
          due_date: overrides?.due_date,
          due_time: overrides?.due_time,
          estimated_duration_minutes: template.estimated_duration_minutes,
          
          requires_photo: template.requires_photo,
          requires_signature: template.requires_signature,
          requires_notes: template.requires_notes,
          photo_min_count: template.photo_min_count,
          checklist_items: template.checklist_items,
          
          is_food_safety: template.is_food_safety,
          
          status: template.default_assignee_type === 'available' ? 'available' : 'pending',
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Task ${data.task_number} created from template`);
    },
  });
}

// ============================================================================
// GENERATE RECURRING TASKS (called by cron or manually)
// ============================================================================
export function useGenerateRecurringTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday
      const dayOfMonth = today.getDate();
      const todayStr = today.toISOString().split('T')[0];
      
      // Get all active recurring templates
      const { data: templates, error: templatesError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .eq('is_recurring', true);
      
      if (templatesError) throw templatesError;
      
      let createdCount = 0;
      
      for (const template of templates || []) {
        let shouldCreate = false;
        
        switch (template.recurrence_pattern) {
          case 'daily':
            shouldCreate = true;
            break;
          case 'weekly':
            shouldCreate = template.recurrence_days_of_week?.includes(dayOfWeek) || false;
            break;
          case 'monthly':
            shouldCreate = template.recurrence_day_of_month === dayOfMonth;
            break;
          case 'shift_start':
          case 'shift_end':
            // These would be triggered by shift schedule, not this function
            break;
        }
        
        if (shouldCreate) {
          // Check if task already created today for this template
          const { data: existing } = await supabase
            .from('tasks')
            .select('id')
            .eq('template_id', template.id)
            .gte('created_at', todayStr)
            .lt('created_at', todayStr + 'T23:59:59');
          
          if (!existing || existing.length === 0) {
            const { error } = await supabase.from('tasks').insert({
              template_id: template.id,
              title: template.name,
              description: template.description,
              category_id: template.category_id,
              priority: template.default_priority,
              source_type: 'template',
              
              assignment_type: template.default_assignee_type,
              assigned_to: template.default_assignee_id,
              assigned_role: template.default_role,
              assigned_department_id: template.default_department_id,
              
              due_date: todayStr,
              due_time: template.recurrence_time,
              estimated_duration_minutes: template.estimated_duration_minutes,
              
              requires_photo: template.requires_photo,
              requires_signature: template.requires_signature,
              requires_notes: template.requires_notes,
              photo_min_count: template.photo_min_count,
              checklist_items: template.checklist_items,
              
              is_food_safety: template.is_food_safety,
              
              status: template.default_assignee_type === 'available' ? 'available' : 'pending',
            });
            
            if (!error) {
              createdCount++;
            }
          }
        }
      }
      
      return { created: createdCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (data.created > 0) {
        toast.success(`${data.created} recurring task(s) generated`);
      } else {
        toast.info('No recurring tasks to generate');
      }
    },
  });
}
