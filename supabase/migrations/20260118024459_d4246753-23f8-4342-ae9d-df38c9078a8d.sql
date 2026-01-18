-- Override Requests Table
CREATE TABLE public.qa_override_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What's being overridden
  related_record_id UUID NOT NULL,
  related_table_name TEXT NOT NULL CHECK (related_table_name IN ('materials', 'products', 'suppliers', 'production_lots')),
  blocked_checks JSONB NOT NULL DEFAULT '[]',
  
  -- Request details
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  override_reason TEXT NOT NULL CHECK (override_reason IN (
    'emergency_production', 'supplier_documentation_pending', 
    'temporary_issue_being_resolved', 'administrative_data_pending', 'other'
  )),
  justification TEXT NOT NULL CHECK (char_length(justification) >= 50),
  follow_up_date DATE NOT NULL,
  
  -- Approval details
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'cancelled')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Override validity
  override_expires_at TIMESTAMPTZ,
  override_type TEXT CHECK (override_type IN ('conditional_approval', 'full_approval')),
  
  -- Resolution tracking
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.qa_override_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view override requests"
ON public.qa_override_requests FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can create override requests"
ON public.qa_override_requests FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can update override requests"
ON public.qa_override_requests FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_override_requests_status ON public.qa_override_requests(status);
CREATE INDEX idx_override_requests_record ON public.qa_override_requests(related_record_id, related_table_name);
CREATE INDEX idx_override_requests_pending ON public.qa_override_requests(status, requested_at) WHERE status = 'pending';
CREATE INDEX idx_override_requests_follow_up ON public.qa_override_requests(follow_up_date) WHERE status = 'approved' AND resolved_at IS NULL;

CREATE TRIGGER update_qa_override_requests_updated_at
BEFORE UPDATE ON public.qa_override_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add active_override_id to entities
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS active_override_id UUID REFERENCES public.qa_override_requests(id);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS active_override_id UUID REFERENCES public.qa_override_requests(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active_override_id UUID REFERENCES public.qa_override_requests(id);

-- Add override permission resources
INSERT INTO public.permission_resources (resource_key, resource_name, resource_type, description, sort_order, is_active) VALUES 
  ('qa_override_direct', 'QA Override - Direct', 'feature', 'Override Critical blocks directly (Admin only)', 110, true),
  ('qa_override_request', 'QA Override - Request', 'feature', 'Request override requiring Admin approval', 111, true),
  ('qa_override_approve', 'QA Override - Approve', 'feature', 'Approve/deny override requests (Admin only)', 112, true)
ON CONFLICT (resource_key) DO NOTHING;

INSERT INTO public.role_permissions (role, resource_key, access_level) VALUES 
  ('admin', 'qa_override_direct', 'full'),
  ('admin', 'qa_override_request', 'full'),
  ('admin', 'qa_override_approve', 'full'),
  ('manager', 'qa_override_direct', 'none'),
  ('manager', 'qa_override_request', 'full'),
  ('manager', 'qa_override_approve', 'none'),
  ('supervisor', 'qa_override_direct', 'none'),
  ('supervisor', 'qa_override_request', 'full'),
  ('supervisor', 'qa_override_approve', 'none'),
  ('employee', 'qa_override_direct', 'none'),
  ('employee', 'qa_override_request', 'none'),
  ('employee', 'qa_override_approve', 'none')
ON CONFLICT (role, resource_key) DO UPDATE SET access_level = EXCLUDED.access_level;