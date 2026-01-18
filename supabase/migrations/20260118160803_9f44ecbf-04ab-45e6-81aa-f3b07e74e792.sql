-- CAPA Module - Corrective Action / Preventive Action Management

-- 1. Main CAPA table
CREATE TABLE public.corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_number TEXT NOT NULL UNIQUE,
  
  -- Classification
  capa_type TEXT NOT NULL CHECK (capa_type IN (
    'supplier', 'equipment', 'material', 'product', 'facility', 
    'process', 'employee', 'sanitation', 'sop_non_compliance', 'labeling', 'other'
  )),
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'containment', 'investigating', 'action_required', 
    'verification', 'effectiveness_review', 'closed', 'cancelled'
  )),
  
  -- Source/Origin linkage
  source_type TEXT CHECK (source_type IN (
    'receiving', 'production', 'audit', 'complaint', 'inspection', 'manual'
  )),
  source_id UUID,
  
  -- Entity references
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  production_lot_id UUID REFERENCES public.production_lots(id) ON DELETE SET NULL,
  receiving_lot_id UUID REFERENCES public.receiving_lots(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  
  -- Problem description
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  occurrence_date DATE NOT NULL DEFAULT CURRENT_DATE,
  discovery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Due dates
  containment_due_date TIMESTAMPTZ,
  root_cause_due_date TIMESTAMPTZ,
  corrective_action_due_date DATE,
  preventive_action_due_date DATE,
  verification_due_date DATE,
  effectiveness_review_due_date DATE,
  
  -- Immediate Action (Containment)
  immediate_action TEXT,
  immediate_action_date TIMESTAMPTZ,
  immediate_action_by UUID REFERENCES public.profiles(id),
  
  -- Root Cause Analysis
  root_cause TEXT,
  root_cause_method TEXT CHECK (root_cause_method IN ('5_why', 'fishbone', 'pareto', 'fmea', 'other')),
  root_cause_completed_at TIMESTAMPTZ,
  root_cause_completed_by UUID REFERENCES public.profiles(id),
  
  -- Corrective Action
  corrective_action TEXT,
  corrective_action_completed_at TIMESTAMPTZ,
  corrective_action_completed_by UUID REFERENCES public.profiles(id),
  
  -- Preventive Action
  preventive_action TEXT,
  preventive_action_completed_at TIMESTAMPTZ,
  preventive_action_completed_by UUID REFERENCES public.profiles(id),
  
  -- Verification
  verification_method TEXT,
  verification_result TEXT CHECK (verification_result IN ('effective', 'partially_effective', 'ineffective')),
  verification_date TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),
  
  -- Effectiveness Review
  effectiveness_review_result TEXT CHECK (effectiveness_review_result IN ('effective', 'requires_followup', 'ineffective')),
  effectiveness_review_completed_at TIMESTAMPTZ,
  effectiveness_review_notes TEXT,
  effectiveness_reviewed_by UUID REFERENCES public.profiles(id),
  
  -- Financial Impact
  estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  cost_recovery_amount NUMERIC(12,2),
  cost_recovery_source TEXT,
  
  -- Closure
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.profiles(id),
  closure_notes TEXT,
  
  -- Assignment & Ownership
  assigned_to UUID REFERENCES public.profiles(id),
  department_id UUID REFERENCES public.departments(id),
  
  -- Recurrence tracking
  is_recurring BOOLEAN DEFAULT false,
  related_capa_id UUID REFERENCES public.corrective_actions(id),
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view CAPAs" ON public.corrective_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create CAPAs" ON public.corrective_actions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update CAPAs" ON public.corrective_actions
  FOR UPDATE TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_capa_status ON public.corrective_actions(status);
CREATE INDEX idx_capa_type ON public.corrective_actions(capa_type);
CREATE INDEX idx_capa_severity ON public.corrective_actions(severity);
CREATE INDEX idx_capa_supplier ON public.corrective_actions(supplier_id);
CREATE INDEX idx_capa_assigned ON public.corrective_actions(assigned_to);
CREATE INDEX idx_capa_due_dates ON public.corrective_actions(corrective_action_due_date, verification_due_date);

-- Trigger for updated_at
CREATE TRIGGER update_corrective_actions_updated_at
  BEFORE UPDATE ON public.corrective_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. CAPA Attachments table
CREATE TABLE public.capa_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES public.corrective_actions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  file_size INTEGER,
  file_type TEXT CHECK (file_type IN ('photo', 'document', 'report', 'other')),
  description TEXT,
  attachment_category TEXT CHECK (attachment_category IN (
    'evidence', 'root_cause', 'corrective_action', 'verification', 'other'
  )),
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capa_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view CAPA attachments" ON public.capa_attachments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage CAPA attachments" ON public.capa_attachments
  FOR ALL TO authenticated USING (true);

CREATE INDEX idx_capa_attachments_capa ON public.capa_attachments(capa_id);

-- 3. CAPA Activity Log table
CREATE TABLE public.capa_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES public.corrective_actions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'status_changed', 'assigned', 'commented', 
    'attachment_added', 'attachment_removed', 'due_date_changed', 'escalated'
  )),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  comment TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capa_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view CAPA activity" ON public.capa_activity_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can log CAPA activity" ON public.capa_activity_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_capa_activity_capa ON public.capa_activity_log(capa_id);
CREATE INDEX idx_capa_activity_timestamp ON public.capa_activity_log(performed_at DESC);

-- 4. CAPA Severity Settings table
CREATE TABLE public.capa_severity_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL UNIQUE CHECK (severity IN ('minor', 'major', 'critical')),
  containment_hours INTEGER NOT NULL,
  root_cause_hours INTEGER NOT NULL,
  corrective_action_days INTEGER NOT NULL,
  preventive_action_days INTEGER NOT NULL,
  verification_days INTEGER NOT NULL,
  effectiveness_review_days INTEGER NOT NULL,
  color_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.capa_severity_settings (severity, containment_hours, root_cause_hours, corrective_action_days, preventive_action_days, verification_days, effectiveness_review_days, color_code) VALUES
  ('critical', 24, 72, 7, 7, 14, 14, '#dc2626'),
  ('major', 48, 168, 14, 14, 30, 30, '#f59e0b'),
  ('minor', 168, 336, 30, 30, 60, 60, '#3b82f6');

ALTER TABLE public.capa_severity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view severity settings" ON public.capa_severity_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage severity settings" ON public.capa_severity_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. Auto-generate CAPA number function
CREATE OR REPLACE FUNCTION public.generate_capa_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(capa_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.corrective_actions
  WHERE capa_number LIKE 'CAPA-' || year_prefix || '-%';
  
  RETURN 'CAPA-' || year_prefix || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Link existing tables to CAPAs (only tables that exist)
ALTER TABLE public.po_receiving_items
ADD COLUMN IF NOT EXISTS capa_id UUID REFERENCES public.corrective_actions(id) ON DELETE SET NULL;

ALTER TABLE public.quality_complaints
ADD COLUMN IF NOT EXISTS capa_id UUID REFERENCES public.corrective_actions(id) ON DELETE SET NULL;

-- 7. Add dropdown options for CAPA
INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order, is_active) VALUES
  ('capa_type', 'supplier', 'Supplier Issue', 1, true),
  ('capa_type', 'equipment', 'Equipment Issue', 2, true),
  ('capa_type', 'material', 'Material Issue', 3, true),
  ('capa_type', 'product', 'Product Issue', 4, true),
  ('capa_type', 'facility', 'Facility Issue', 5, true),
  ('capa_type', 'process', 'Process Deviation', 6, true),
  ('capa_type', 'employee', 'Employee Issue', 7, true),
  ('capa_type', 'sanitation', 'Sanitation Issue', 8, true),
  ('capa_type', 'sop_non_compliance', 'SOP Non-Compliance', 9, true),
  ('capa_type', 'labeling', 'Labeling Issue', 10, true),
  ('capa_type', 'other', 'Other', 99, true),
  ('capa_status', 'open', 'Open', 1, true),
  ('capa_status', 'containment', 'Containment', 2, true),
  ('capa_status', 'investigating', 'Investigating', 3, true),
  ('capa_status', 'action_required', 'Action Required', 4, true),
  ('capa_status', 'verification', 'Verification', 5, true),
  ('capa_status', 'effectiveness_review', 'Effectiveness Review', 6, true),
  ('capa_status', 'closed', 'Closed', 7, true),
  ('capa_status', 'cancelled', 'Cancelled', 8, true),
  ('rca_method', '5_why', '5 Whys', 1, true),
  ('rca_method', 'fishbone', 'Fishbone (Ishikawa)', 2, true),
  ('rca_method', 'pareto', 'Pareto Analysis', 3, true),
  ('rca_method', 'fmea', 'FMEA', 4, true),
  ('rca_method', 'other', 'Other', 99, true)
ON CONFLICT DO NOTHING;

-- 8. Add permission resources (using valid resource_types: page, feature, report)
INSERT INTO public.permission_resources (resource_key, resource_name, resource_type, description, sort_order, is_active) VALUES 
  ('capa_view', 'CAPA - View', 'page', 'View corrective actions', 120, true),
  ('capa_create', 'CAPA - Create', 'feature', 'Create new corrective actions', 121, true),
  ('capa_edit', 'CAPA - Edit', 'feature', 'Edit corrective actions', 122, true),
  ('capa_close', 'CAPA - Close', 'feature', 'Close corrective actions', 123, true),
  ('capa_settings', 'CAPA - Settings', 'page', 'Manage CAPA settings', 124, true)
ON CONFLICT (resource_key) DO NOTHING;

INSERT INTO public.role_permissions (role, resource_key, access_level) VALUES 
  ('admin', 'capa_view', 'full'),
  ('admin', 'capa_create', 'full'),
  ('admin', 'capa_edit', 'full'),
  ('admin', 'capa_close', 'full'),
  ('admin', 'capa_settings', 'full'),
  ('manager', 'capa_view', 'full'),
  ('manager', 'capa_create', 'full'),
  ('manager', 'capa_edit', 'full'),
  ('manager', 'capa_close', 'full'),
  ('manager', 'capa_settings', 'read'),
  ('supervisor', 'capa_view', 'full'),
  ('supervisor', 'capa_create', 'full'),
  ('supervisor', 'capa_edit', 'full'),
  ('supervisor', 'capa_close', 'none'),
  ('supervisor', 'capa_settings', 'none'),
  ('employee', 'capa_view', 'read'),
  ('employee', 'capa_create', 'full'),
  ('employee', 'capa_edit', 'none'),
  ('employee', 'capa_close', 'none'),
  ('employee', 'capa_settings', 'none')
ON CONFLICT (role, resource_key) DO UPDATE SET access_level = EXCLUDED.access_level;

-- Create storage bucket for CAPA attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('capa-attachments', 'capa-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for CAPA attachments
CREATE POLICY "Authenticated users can view CAPA attachments storage"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'capa-attachments');

CREATE POLICY "Authenticated users can upload CAPA attachments storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'capa-attachments');

CREATE POLICY "Authenticated users can delete CAPA attachments storage"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'capa-attachments');