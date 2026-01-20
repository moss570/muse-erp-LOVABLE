export interface TaskCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_food_safety: boolean;
  requires_photo: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  category?: TaskCategory;
  
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
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'shift_start' | 'shift_end';
  recurrence_time?: string;
  recurrence_days_of_week?: number[];
  recurrence_day_of_month?: number;
  
  created_by?: string;
  is_active: boolean;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

export interface Task {
  id: string;
  task_number: string;
  template_id?: string;
  template?: TaskTemplate;
  
  title: string;
  description?: string;
  category_id?: string;
  category?: TaskCategory;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  source_type: 'manual' | 'template' | 'schedule' | 'system' | 'claimed';
  source_module?: string;
  source_record_id?: string;
  
  assignment_type: 'specific' | 'role' | 'department' | 'available';
  assigned_to?: string;
  assigned_to_profile?: { id: string; full_name: string; avatar_url?: string };
  assigned_role?: string;
  assigned_department_id?: string;
  assigned_department?: { id: string; name: string };
  claimed_by?: string;
  claimed_by_profile?: { id: string; full_name: string; avatar_url?: string };
  claimed_at?: string;
  
  location_id?: string;
  location?: { id: string; name: string };
  
  due_date?: string;
  due_time?: string;
  due_at?: string;
  estimated_duration_minutes?: number;
  
  requires_photo: boolean;
  requires_signature: boolean;
  requires_notes: boolean;
  photo_min_count: number;
  checklist_items: ChecklistItem[];
  
  status: TaskStatus;
  
  started_at?: string;
  completed_at?: string;
  completed_by?: string;
  completed_by_profile?: { id: string; full_name: string };
  completion_notes?: string;
  completion_signature?: string;
  checklist_completed: { id: string; completed: boolean; completed_at?: string }[];
  
  verified_at?: string;
  verified_by?: string;
  verified_by_profile?: { id: string; full_name: string };
  verification_notes?: string;
  
  is_food_safety: boolean;
  food_safety_data?: Record<string, unknown>;
  
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  
  created_by?: string;
  created_by_profile?: { id: string; full_name: string };
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 
  | 'pending'
  | 'available'
  | 'claimed'
  | 'in_progress'
  | 'completed'
  | 'verified'
  | 'cancelled'
  | 'overdue';

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  file_path: string;
  attachment_type: 'photo' | 'document' | 'signature';
  caption?: string;
  uploaded_by?: string;
  uploaded_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  comment: string;
  created_by?: string;
  created_by_profile?: { id: string; full_name: string; avatar_url?: string };
  created_at: string;
}

export interface TaskActivityLog {
  id: string;
  task_id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  performed_by?: string;
  performed_by_profile?: { id: string; full_name: string };
  performed_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  category_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  template_id?: string;
  
  assignment_type: 'specific' | 'role' | 'department' | 'available';
  assigned_to?: string;
  assigned_role?: string;
  assigned_department_id?: string;
  
  location_id?: string;
  due_date?: string;
  due_time?: string;
  estimated_duration_minutes?: number;
  
  requires_photo?: boolean;
  requires_signature?: boolean;
  requires_notes?: boolean;
  photo_min_count?: number;
  checklist_items?: ChecklistItem[];
  
  is_food_safety?: boolean;
}

export interface CompleteTaskInput {
  task_id: string;
  completion_notes?: string;
  completion_signature?: string;
  checklist_completed?: { id: string; completed: boolean }[];
  food_safety_data?: Record<string, unknown>;
}
