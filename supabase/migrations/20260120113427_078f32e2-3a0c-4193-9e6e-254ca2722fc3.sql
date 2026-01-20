
-- ============================================================================
-- EMPLOYEE TASKS & COMMUNICATION MODULE - DATABASE SCHEMA
-- Part 1 of 9: Core Infrastructure
-- ============================================================================

-- ============================================================================
-- SECTION 1: TASK MANAGEMENT TABLES
-- ============================================================================

-- Task Categories (for organization and filtering)
CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  icon TEXT DEFAULT 'clipboard',
  is_food_safety BOOLEAN DEFAULT false,
  requires_photo BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 99,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default categories
INSERT INTO task_categories (name, description, color, icon, is_food_safety, requires_photo, sort_order) VALUES
  ('Food Safety', 'Food safety verification and compliance tasks', '#DC2626', 'shield-check', true, true, 1),
  ('Cleaning', 'Sanitation and cleaning tasks', '#2563EB', 'sparkles', true, true, 2),
  ('Maintenance', 'Equipment maintenance and repairs', '#D97706', 'wrench', false, false, 3),
  ('Quality', 'Quality assurance and inspection tasks', '#7C3AED', 'search', false, true, 4),
  ('Inventory', 'Inventory management tasks', '#059669', 'package', false, false, 5),
  ('Administrative', 'Administrative and paperwork tasks', '#6B7280', 'file-text', false, false, 6),
  ('Training', 'Training and onboarding tasks', '#EC4899', 'graduation-cap', false, false, 7),
  ('Other', 'Miscellaneous tasks', '#6B7280', 'clipboard', false, false, 99)
ON CONFLICT (name) DO NOTHING;

-- Task Templates (reusable task definitions)
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES task_categories(id),
  default_assignee_type TEXT DEFAULT 'role' CHECK (default_assignee_type IN ('specific', 'role', 'department')),
  default_assignee_id UUID,
  default_role TEXT,
  default_department_id UUID REFERENCES departments(id),
  estimated_duration_minutes INTEGER,
  default_priority TEXT DEFAULT 'medium' CHECK (default_priority IN ('low', 'medium', 'high', 'urgent')),
  requires_photo BOOLEAN DEFAULT false,
  requires_signature BOOLEAN DEFAULT false,
  requires_notes BOOLEAN DEFAULT false,
  photo_min_count INTEGER DEFAULT 0,
  checklist_items JSONB DEFAULT '[]',
  is_food_safety BOOLEAN DEFAULT false,
  food_safety_type TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  recurrence_time TIME,
  recurrence_days_of_week INTEGER[],
  recurrence_day_of_month INTEGER,
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks (actual task instances)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number TEXT UNIQUE,
  template_id UUID REFERENCES task_templates(id),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES task_categories(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'template', 'schedule', 'system', 'claimed')),
  source_module TEXT,
  source_record_id UUID,
  assignment_type TEXT DEFAULT 'specific' CHECK (assignment_type IN ('specific', 'role', 'department', 'available')),
  assigned_to UUID REFERENCES profiles(id),
  assigned_role TEXT,
  assigned_department_id UUID REFERENCES departments(id),
  claimed_by UUID REFERENCES profiles(id),
  claimed_at TIMESTAMPTZ,
  location_id UUID REFERENCES locations(id),
  due_date DATE,
  due_time TIME,
  estimated_duration_minutes INTEGER,
  requires_photo BOOLEAN DEFAULT false,
  requires_signature BOOLEAN DEFAULT false,
  requires_notes BOOLEAN DEFAULT false,
  photo_min_count INTEGER DEFAULT 0,
  checklist_items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'claimed', 'in_progress', 'completed', 'verified', 'cancelled', 'overdue')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  completion_notes TEXT,
  completion_signature TEXT,
  checklist_completed JSONB DEFAULT '[]',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  verification_notes TEXT,
  is_food_safety BOOLEAN DEFAULT false,
  food_safety_data JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Task Attachments
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  file_path TEXT NOT NULL,
  attachment_type TEXT DEFAULT 'photo' CHECK (attachment_type IN ('photo', 'document', 'signature')),
  caption TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Task Auto-Assignment Rules
CREATE TABLE IF NOT EXISTS task_auto_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES task_categories(id),
  template_id UUID REFERENCES task_templates(id),
  unclaimed_hours_threshold INTEGER DEFAULT 4,
  escalate_to_type TEXT DEFAULT 'specific' CHECK (escalate_to_type IN ('specific', 'role', 'manager')),
  escalate_to_id UUID REFERENCES profiles(id),
  escalate_to_role TEXT,
  notify_manager BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Task Activity Log
CREATE TABLE IF NOT EXISTS task_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 2: CHAT SYSTEM TABLES
-- ============================================================================

-- Chat Channels
CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT DEFAULT 'public' CHECK (channel_type IN ('public', 'private', 'department', 'direct')),
  department_id UUID REFERENCES departments(id),
  participant_ids UUID[],
  is_archived BOOLEAN DEFAULT false,
  allow_file_sharing BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default channels
INSERT INTO chat_channels (name, description, channel_type) VALUES
  ('General', 'Company-wide announcements and discussion', 'public'),
  ('Production', 'Production team communication', 'public'),
  ('Warehouse', 'Warehouse team communication', 'public'),
  ('Quality', 'Quality assurance team', 'public'),
  ('Management', 'Management discussions', 'private')
ON CONFLICT DO NOTHING;

-- Chat Channel Members
CREATE TABLE IF NOT EXISTS chat_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  notifications_enabled BOOLEAN DEFAULT true,
  muted_until TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'file', 'image', 'system')),
  file_name TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  reply_to_id UUID REFERENCES chat_messages(id),
  mentions UUID[],
  is_pinned BOOLEAN DEFAULT false,
  pinned_by UUID REFERENCES profiles(id),
  pinned_at TIMESTAMPTZ,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat Message Reactions
CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Chat Read Receipts
CREATE TABLE IF NOT EXISTS chat_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES chat_messages(id),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- ============================================================================
-- SECTION 3: PTO SYSTEM TABLES
-- ============================================================================

-- PTO Types
CREATE TABLE IF NOT EXISTS pto_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  accrual_type TEXT DEFAULT 'none' CHECK (accrual_type IN ('none', 'hourly', 'per_pay_period', 'annual')),
  default_accrual_rate NUMERIC(10,4),
  default_annual_grant NUMERIC(10,2),
  max_balance NUMERIC(10,2),
  max_carryover NUMERIC(10,2),
  waiting_period_days INTEGER DEFAULT 0,
  requires_approval BOOLEAN DEFAULT true,
  advance_notice_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default PTO types
INSERT INTO pto_types (name, code, description, color, accrual_type, waiting_period_days) VALUES
  ('Vacation', 'VAC', 'Paid vacation time', '#059669', 'hourly', 90),
  ('Sick', 'SICK', 'Sick leave', '#DC2626', 'annual', 0),
  ('Personal', 'PER', 'Personal time off', '#2563EB', 'annual', 0),
  ('Bereavement', 'BRV', 'Bereavement leave', '#6B7280', 'none', 0),
  ('Jury Duty', 'JURY', 'Jury duty leave', '#6B7280', 'none', 0)
ON CONFLICT (code) DO NOTHING;

-- Employee PTO Settings
CREATE TABLE IF NOT EXISTS employee_pto_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pto_type_id UUID NOT NULL REFERENCES pto_types(id) ON DELETE CASCADE,
  accrual_type TEXT CHECK (accrual_type IN ('none', 'hourly', 'per_pay_period', 'annual')),
  accrual_rate NUMERIC(10,4),
  annual_grant NUMERIC(10,2),
  max_balance NUMERIC(10,2),
  max_carryover NUMERIC(10,2),
  current_balance NUMERIC(10,2) DEFAULT 0,
  year_start_balance NUMERIC(10,2) DEFAULT 0,
  year_accrued NUMERIC(10,2) DEFAULT 0,
  year_used NUMERIC(10,2) DEFAULT 0,
  eligible_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, pto_type_id)
);

-- PTO Requests
CREATE TABLE IF NOT EXISTS pto_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE,
  employee_id UUID NOT NULL REFERENCES profiles(id),
  pto_type_id UUID NOT NULL REFERENCES pto_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_hours NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PTO Accrual Log
CREATE TABLE IF NOT EXISTS pto_accrual_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id),
  pto_type_id UUID NOT NULL REFERENCES pto_types(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('accrual', 'grant', 'used', 'adjustment', 'carryover', 'forfeited')),
  hours NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  pto_request_id UUID REFERENCES pto_requests(id),
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 4: HR DOCUMENTS WITH DIGITAL SIGNATURES
-- ============================================================================

-- HR Document Templates
CREATE TABLE IF NOT EXISTS hr_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'policy' CHECK (category IN ('policy', 'handbook', 'form', 'training', 'safety', 'other')),
  content TEXT,
  file_path TEXT,
  requires_signature BOOLEAN DEFAULT true,
  signature_text TEXT,
  assign_to_new_hires BOOLEAN DEFAULT false,
  assign_to_all BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  effective_date DATE,
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employee HR Documents
CREATE TABLE IF NOT EXISTS employee_hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES hr_document_templates(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired')),
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  signature_ip TEXT,
  due_date DATE,
  reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, template_id)
);

-- Employee Personal Documents
CREATE TABLE IF NOT EXISTS employee_personal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  issue_date DATE,
  expiry_date DATE,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 5: EMPLOYEE TRAINING LOG
-- ============================================================================

-- Training Records
CREATE TABLE IF NOT EXISTS employee_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  training_name TEXT NOT NULL,
  training_type TEXT DEFAULT 'general' CHECK (training_type IN ('onboarding', 'safety', 'food_safety', 'equipment', 'sop', 'compliance', 'general')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
  completed_at TIMESTAMPTZ,
  score NUMERIC(5,2),
  certificate_number TEXT,
  certificate_file_path TEXT,
  valid_from DATE,
  valid_until DATE,
  trainer_name TEXT,
  trainer_id UUID REFERENCES profiles(id),
  sop_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employee Skills
CREATE TABLE IF NOT EXISTS employee_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_category TEXT,
  proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  is_certified BOOLEAN DEFAULT false,
  certified_date DATE,
  certification_expiry DATE,
  certification_number TEXT,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, skill_name)
);

-- ============================================================================
-- SECTION 6: NOTIFICATIONS SYSTEM
-- ============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  notification_type TEXT DEFAULT 'info' CHECK (notification_type IN ('info', 'task_assigned', 'task_due', 'task_overdue', 'chat_mention', 'chat_message', 'pto_request', 'pto_approved', 'pto_denied', 'document_required', 'training_due', 'announcement')),
  link_type TEXT,
  link_id UUID,
  link_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  delivered_via TEXT[] DEFAULT ARRAY['in_app'],
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  in_app BOOLEAN DEFAULT true,
  email BOOLEAN DEFAULT false,
  push BOOLEAN DEFAULT false,
  quiet_start TIME,
  quiet_end TIME,
  UNIQUE(user_id, notification_type)
);

-- ============================================================================
-- SECTION 7: DATABASE FUNCTIONS
-- ============================================================================

-- Generate Task Number
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part TEXT;
  seq_num INTEGER;
BEGIN
  date_part := to_char(CURRENT_DATE, 'YYMMDD');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(task_number FROM 'TSK-' || date_part || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM tasks
  WHERE task_number LIKE 'TSK-' || date_part || '-%';
  
  NEW.task_number := 'TSK-' || date_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_task_number ON tasks;
CREATE TRIGGER set_task_number
  BEFORE INSERT ON tasks
  FOR EACH ROW
  WHEN (NEW.task_number IS NULL)
  EXECUTE FUNCTION generate_task_number();

-- Generate PTO Request Number
CREATE OR REPLACE FUNCTION generate_pto_request_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part TEXT;
  seq_num INTEGER;
BEGIN
  date_part := to_char(CURRENT_DATE, 'YYMMDD');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(request_number FROM 'PTO-' || date_part || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM pto_requests
  WHERE request_number LIKE 'PTO-' || date_part || '-%';
  
  NEW.request_number := 'PTO-' || date_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_pto_request_number ON pto_requests;
CREATE TRIGGER set_pto_request_number
  BEFORE INSERT ON pto_requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL)
  EXECUTE FUNCTION generate_pto_request_number();

-- Log Task Activity
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_activity_log (task_id, action, new_value, performed_by)
    VALUES (NEW.id, 'created', NEW.status, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO task_activity_log (task_id, action, old_value, new_value, performed_by)
      VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, 
        COALESCE(NEW.completed_by, NEW.claimed_by, NEW.assigned_to));
    END IF;
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO task_activity_log (task_id, action, old_value, new_value, performed_by)
      VALUES (NEW.id, 'assigned', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT, NEW.assigned_to);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS task_activity_trigger ON tasks;
CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_activity();

-- Update PTO Balance on Approval
CREATE OR REPLACE FUNCTION update_pto_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE employee_pto_settings
    SET 
      current_balance = current_balance - NEW.total_hours,
      year_used = year_used + NEW.total_hours,
      updated_at = now()
    WHERE employee_id = NEW.employee_id AND pto_type_id = NEW.pto_type_id;
    
    INSERT INTO pto_accrual_log (employee_id, pto_type_id, transaction_type, hours, balance_after, pto_request_id, performed_by)
    SELECT 
      NEW.employee_id,
      NEW.pto_type_id,
      'used',
      -NEW.total_hours,
      eps.current_balance,
      NEW.id,
      NEW.reviewed_by
    FROM employee_pto_settings eps
    WHERE eps.employee_id = NEW.employee_id AND eps.pto_type_id = NEW.pto_type_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS pto_balance_trigger ON pto_requests;
CREATE TRIGGER pto_balance_trigger
  AFTER UPDATE ON pto_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_pto_balance_on_approval();

-- Mark Tasks as Overdue
CREATE OR REPLACE FUNCTION mark_overdue_tasks()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE tasks
  SET status = 'overdue', updated_at = now()
  WHERE status IN ('pending', 'available', 'claimed', 'in_progress')
    AND (due_date + COALESCE(due_time, '23:59:59'::TIME))::TIMESTAMPTZ < now()
    AND status != 'overdue';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- SECTION 8: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_pto_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_accrual_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_hr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_personal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_auto_assignment_rules ENABLE ROW LEVEL SECURITY;

-- Task Categories
CREATE POLICY "Anyone can view task categories" ON task_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage task categories" ON task_categories FOR ALL 
  USING (is_admin_or_manager(auth.uid()));

-- Task Templates
CREATE POLICY "Anyone can view active task templates" ON task_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Supervisors manage task templates" ON task_templates FOR ALL 
  USING (is_admin_or_manager(auth.uid()) OR has_role(auth.uid(), 'supervisor'));

-- Tasks
CREATE POLICY "Users see assigned or available tasks" ON tasks FOR SELECT 
  USING (
    assigned_to = auth.uid() OR
    claimed_by = auth.uid() OR
    created_by = auth.uid() OR
    assignment_type = 'available' OR
    is_admin_or_manager(auth.uid()) OR
    has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE 
  USING (assigned_to = auth.uid() OR claimed_by = auth.uid() OR created_by = auth.uid() OR is_admin_or_manager(auth.uid()));

CREATE POLICY "Supervisors can create tasks" ON tasks FOR INSERT 
  WITH CHECK (is_admin_or_manager(auth.uid()) OR has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisors can delete tasks" ON tasks FOR DELETE
  USING (is_admin_or_manager(auth.uid()) OR has_role(auth.uid(), 'supervisor'));

-- Task Attachments
CREATE POLICY "Users can view task attachments" ON task_attachments FOR SELECT USING (true);
CREATE POLICY "Users can upload task attachments" ON task_attachments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own attachments" ON task_attachments FOR DELETE USING (uploaded_by = auth.uid() OR is_admin_or_manager(auth.uid()));

-- Task Comments
CREATE POLICY "Users can view task comments" ON task_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON task_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own comments" ON task_comments FOR DELETE USING (created_by = auth.uid() OR is_admin_or_manager(auth.uid()));

-- Task Activity Log
CREATE POLICY "Users can view task activity" ON task_activity_log FOR SELECT USING (true);

-- Task Auto Assignment Rules
CREATE POLICY "Anyone can view auto assignment rules" ON task_auto_assignment_rules FOR SELECT USING (true);
CREATE POLICY "Admins manage auto assignment rules" ON task_auto_assignment_rules FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Chat Channels
CREATE POLICY "Users see their channels" ON chat_channels FOR SELECT 
  USING (
    channel_type = 'public' OR
    id IN (SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()) OR
    auth.uid() = ANY(participant_ids) OR
    is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Users can create channels" ON chat_channels FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Channel admins can update" ON chat_channels FOR UPDATE USING (
  created_by = auth.uid() OR 
  is_admin_or_manager(auth.uid()) OR
  id IN (SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Chat Channel Members
CREATE POLICY "Users see channel members" ON chat_channel_members FOR SELECT USING (true);
CREATE POLICY "Users can join public channels" ON chat_channel_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own membership" ON chat_channel_members FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can leave channels" ON chat_channel_members FOR DELETE USING (user_id = auth.uid() OR is_admin_or_manager(auth.uid()));

-- Chat Messages
CREATE POLICY "Users see messages in their channels" ON chat_messages FOR SELECT 
  USING (channel_id IN (
    SELECT id FROM chat_channels WHERE channel_type = 'public'
    UNION
    SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can send messages to their channels" ON chat_messages FOR INSERT 
  WITH CHECK (sender_id = auth.uid() AND channel_id IN (
    SELECT id FROM chat_channels WHERE channel_type = 'public'
    UNION
    SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can edit own messages" ON chat_messages FOR UPDATE USING (sender_id = auth.uid());
CREATE POLICY "Users can delete own messages" ON chat_messages FOR DELETE USING (sender_id = auth.uid() OR is_admin_or_manager(auth.uid()));

-- Chat Reactions
CREATE POLICY "Users can view reactions" ON chat_message_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON chat_message_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove own reactions" ON chat_message_reactions FOR DELETE USING (user_id = auth.uid());

-- Chat Read Receipts
CREATE POLICY "Users manage own read receipts" ON chat_read_receipts FOR ALL USING (user_id = auth.uid());

-- PTO Types
CREATE POLICY "Anyone can view PTO types" ON pto_types FOR SELECT USING (true);
CREATE POLICY "Admins manage PTO types" ON pto_types FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Employee PTO Settings
CREATE POLICY "Employees see own PTO settings" ON employee_pto_settings FOR SELECT 
  USING (employee_id = auth.uid() OR is_admin_or_manager(auth.uid()));
CREATE POLICY "Managers manage PTO settings" ON employee_pto_settings FOR ALL USING (is_admin_or_manager(auth.uid()));

-- PTO Requests
CREATE POLICY "Employees see own PTO" ON pto_requests FOR SELECT 
  USING (employee_id = auth.uid() OR is_admin_or_manager(auth.uid()));
CREATE POLICY "Employees create own PTO requests" ON pto_requests FOR INSERT 
  WITH CHECK (employee_id = auth.uid());
CREATE POLICY "Managers manage PTO requests" ON pto_requests FOR UPDATE 
  USING (employee_id = auth.uid() OR is_admin_or_manager(auth.uid()));
CREATE POLICY "Users can cancel own PTO" ON pto_requests FOR DELETE USING (employee_id = auth.uid() AND status = 'pending');

-- PTO Accrual Log
CREATE POLICY "Employees see own accrual log" ON pto_accrual_log FOR SELECT 
  USING (employee_id = auth.uid() OR is_admin_or_manager(auth.uid()));
CREATE POLICY "Managers manage accrual log" ON pto_accrual_log FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));

-- HR Document Templates
CREATE POLICY "Anyone can view active templates" ON hr_document_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Managers manage templates" ON hr_document_templates FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Employee HR Documents
CREATE POLICY "Employees see own HR documents" ON employee_hr_documents FOR SELECT 
  USING (employee_id = auth.uid() OR is_admin_or_manager(auth.uid()));
CREATE POLICY "Employees sign own documents" ON employee_hr_documents FOR UPDATE 
  USING (employee_id = auth.uid());
CREATE POLICY "Managers assign documents" ON employee_hr_documents FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "Managers manage employee documents" ON employee_hr_documents FOR DELETE USING (is_admin_or_manager(auth.uid()));

-- Employee Personal Documents
CREATE POLICY "Employees see own personal documents" ON employee_personal_documents FOR SELECT 
  USING (employee_id = auth.uid() OR is_admin_or_manager(auth.uid()));
CREATE POLICY "Managers manage personal documents" ON employee_personal_documents FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Training Records
CREATE POLICY "Employees see own training" ON employee_training_records FOR SELECT 
  USING (employee_id = auth.uid() OR is_admin_or_manager(auth.uid()) OR has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Managers manage training" ON employee_training_records FOR ALL USING (is_admin_or_manager(auth.uid()) OR has_role(auth.uid(), 'supervisor'));

-- Employee Skills
CREATE POLICY "Anyone can view skills" ON employee_skills FOR SELECT USING (true);
CREATE POLICY "Employees update own skills" ON employee_skills FOR UPDATE USING (employee_id = auth.uid() OR is_admin_or_manager(auth.uid()));
CREATE POLICY "Managers manage skills" ON employee_skills FOR ALL USING (is_admin_or_manager(auth.uid()) OR has_role(auth.uid(), 'supervisor'));

-- Notifications
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Notification Preferences
CREATE POLICY "Users manage own preferences" ON notification_preferences FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- SECTION 9: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_claimed_by ON tasks(claimed_by) WHERE claimed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user ON chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_mentions ON chat_messages USING GIN(mentions) WHERE mentions IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pto_requests_employee ON pto_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_pto_requests_status ON pto_requests(status);
CREATE INDEX IF NOT EXISTS idx_pto_requests_dates ON pto_requests(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_hr_docs_employee ON employee_hr_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_hr_docs_status ON employee_hr_documents(status);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity_log(task_id);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
