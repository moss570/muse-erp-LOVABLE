-- First, add the QA/Operations permission resources
INSERT INTO public.permission_resources (resource_key, resource_name, resource_type, description, sort_order, is_active)
VALUES 
  ('qa_approval', 'QA Approval', 'feature', 'Ability to approve/reject items in QA workflow', 100, true),
  ('qa_dashboard', 'QA Dashboard', 'page', 'QA Compliance Dashboard access', 101, true),
  ('operations_close_day', 'Close Day', 'page', 'Operations day close functionality', 102, true),
  ('compliance_documents', 'Compliance Documents', 'feature', 'Compliance document management', 103, true)
ON CONFLICT (resource_key) DO NOTHING;

-- Now add the role permissions
INSERT INTO public.role_permissions (role, resource_key, access_level)
VALUES 
  -- Admin has full QA approval access
  ('admin', 'qa_approval', 'full'),
  ('admin', 'qa_dashboard', 'full'),
  ('admin', 'operations_close_day', 'full'),
  ('admin', 'compliance_documents', 'full'),
  
  -- Manager has full access
  ('manager', 'qa_approval', 'full'),
  ('manager', 'qa_dashboard', 'full'),
  ('manager', 'operations_close_day', 'full'),
  ('manager', 'compliance_documents', 'full'),
  
  -- Supervisor can view QA dashboard and approve items
  ('supervisor', 'qa_approval', 'full'),
  ('supervisor', 'qa_dashboard', 'read'),
  ('supervisor', 'operations_close_day', 'none'),
  ('supervisor', 'compliance_documents', 'read'),
  
  -- Employee can only view
  ('employee', 'qa_approval', 'none'),
  ('employee', 'qa_dashboard', 'none'),
  ('employee', 'operations_close_day', 'none'),
  ('employee', 'compliance_documents', 'read')
ON CONFLICT (role, resource_key) DO UPDATE SET access_level = EXCLUDED.access_level;