-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for task attachments
CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can view task attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-attachments');

CREATE POLICY "Users can delete their own task attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create auto-assignment rules table
CREATE TABLE IF NOT EXISTS public.task_auto_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
  unclaimed_hours_threshold INTEGER NOT NULL DEFAULT 4,
  escalate_to_type TEXT NOT NULL DEFAULT 'manager' CHECK (escalate_to_type IN ('manager', 'specific', 'role')),
  escalate_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  escalate_to_role TEXT,
  notify_manager BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_auto_assignment_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for auto-assignment rules (admin/manager only)
CREATE POLICY "Admins and managers can manage auto-assignment rules"
ON public.task_auto_assignment_rules
FOR ALL TO authenticated
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));