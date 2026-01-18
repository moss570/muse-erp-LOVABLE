-- =====================================================
-- PHASE 1: QA APPROVAL SYSTEM - DATABASE MIGRATIONS
-- =====================================================

-- 1.1 QA Approval Settings Table
CREATE TABLE public.qa_approval_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.qa_approval_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view QA settings"
ON public.qa_approval_settings FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage QA settings"
ON public.qa_approval_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_qa_approval_settings_updated_at
BEFORE UPDATE ON public.qa_approval_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings
INSERT INTO public.qa_approval_settings (setting_key, setting_value, description) VALUES
  ('conditional_duration_materials', '{"Ingredients": 14, "Packaging": 30, "Boxes": 30, "Chemical": 21, "Supplies": 45, "Maintenance": 45, "Direct Sale": 14}', 'Days until conditional approval expires by material category'),
  ('conditional_duration_entities', '{"suppliers": 30, "products": 14, "production_lots": 7}', 'Days until conditional approval expires by entity type'),
  ('work_queue_lookahead_days', '45', 'Days to look ahead in QA Work Queue'),
  ('document_expiry_warning_days', '30', 'Days before expiry to show warning'),
  ('stale_draft_threshold_days', '30', 'Days of inactivity before draft flagged as stale');


-- 1.2 QA Check Definitions Table
CREATE TABLE public.qa_check_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key TEXT NOT NULL UNIQUE,
  check_name TEXT NOT NULL,
  check_description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('critical', 'important', 'recommended')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('material', 'supplier', 'product', 'production_lot')),
  applicable_categories TEXT[],
  target_tab TEXT,
  target_field TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.qa_check_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view check definitions" ON public.qa_check_definitions FOR SELECT USING (true);

CREATE POLICY "Admins can manage check definitions" ON public.qa_check_definitions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_qa_check_definitions_updated_at
BEFORE UPDATE ON public.qa_check_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed material checks
INSERT INTO public.qa_check_definitions (check_key, check_name, check_description, tier, entity_type, applicable_categories, target_tab, target_field, sort_order) VALUES
-- CRITICAL (blocks all approval)
('material_no_approved_supplier', 'No Approved Supplier', 'Material must have at least one supplier with Approved status', 'critical', 'material', NULL, 'suppliers', NULL, 10),
('material_manufacturer_rejected', 'Manufacturer Rejected', 'The designated manufacturer has been rejected', 'critical', 'material', NULL, 'suppliers', NULL, 11),
('material_required_docs_missing', 'Required Documents Missing', 'One or more required documents have not been uploaded', 'critical', 'material', NULL, 'documents', NULL, 12),
('material_safety_docs_expired', 'Safety Documents Expired', 'Critical safety documents have expired', 'critical', 'material', ARRAY['Ingredients', 'Direct Sale'], 'documents', NULL, 13),
-- IMPORTANT (blocks full approval, allows conditional)
('material_manufacturer_probation', 'Manufacturer on Probation', 'The designated manufacturer is on probation', 'important', 'material', NULL, 'suppliers', NULL, 20),
('material_no_gl_account', 'No GL Account Assigned', 'Material does not have a GL account for financial tracking', 'important', 'material', NULL, 'basic', 'gl_account_id', 21),
('material_docs_expiring_soon', 'Documents Expiring Soon', 'Documents will expire within 30 days', 'important', 'material', NULL, 'documents', NULL, 22),
('material_coa_limits_missing', 'COA Limits Not Defined', 'COA required but no limits specified', 'important', 'material', ARRAY['Ingredients'], 'coa-limits', NULL, 23),
('material_no_purchase_units', 'No Purchase Units Defined', 'No purchase unit configurations set up', 'important', 'material', NULL, 'unit-variants', NULL, 24),
('material_no_cost_defined', 'No Cost Defined', 'No supplier has cost per unit specified', 'important', 'material', NULL, 'suppliers', NULL, 25),
-- RECOMMENDED (warning only)
('material_country_origin_missing', 'Country of Origin Not Specified', 'Country of origin for VACCP compliance', 'recommended', 'material', ARRAY['Ingredients', 'Direct Sale'], 'food-safety', 'country_of_origin', 30),
('material_fraud_score_missing', 'Fraud Vulnerability Not Assessed', 'Food fraud vulnerability not set', 'recommended', 'material', ARRAY['Ingredients'], 'food-safety', 'fraud_vulnerability_score', 31),
('material_haccp_incomplete', 'HACCP Assessment Incomplete', 'HACCP hazard questions not answered', 'recommended', 'material', ARRAY['Ingredients', 'Direct Sale'], 'haccp', NULL, 32),
('material_storage_temps_missing', 'Storage Temperatures Not Set', 'Storage temperature range not specified', 'recommended', 'material', ARRAY['Ingredients', 'Packaging'], 'specifications', NULL, 33);


-- 1.3 Add Conditional Approval Columns to materials
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS conditional_approval_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conditional_approval_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS conditional_approval_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conditional_approval_reason TEXT;

-- Update approval_status constraint to include 'Conditional'
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_approval_status_check;
ALTER TABLE public.materials ADD CONSTRAINT materials_approval_status_check 
CHECK (approval_status IN ('Draft', 'Pending_QA', 'Conditional', 'Approved', 'Rejected', 'Archived', 'Probation'));

-- Add conditional approval columns to suppliers
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS conditional_approval_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conditional_approval_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS conditional_approval_expires_at TIMESTAMPTZ;

-- Add conditional approval columns to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS conditional_approval_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conditional_approval_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS conditional_approval_expires_at TIMESTAMPTZ;


-- 1.4 Add Permission Resources
INSERT INTO public.permission_resources (resource_key, resource_name, resource_type, description, sort_order, is_active) VALUES 
  ('qa_settings_manage', 'QA Settings - Manage', 'page', 'Access to QA Approval Rules settings', 113, true),
  ('qa_work_queue', 'QA Work Queue', 'page', 'Access to QA Work Queue dashboard', 114, true)
ON CONFLICT (resource_key) DO NOTHING;

INSERT INTO public.role_permissions (role, resource_key, access_level) VALUES 
  ('admin', 'qa_settings_manage', 'full'),
  ('admin', 'qa_work_queue', 'full'),
  ('manager', 'qa_settings_manage', 'read'),
  ('manager', 'qa_work_queue', 'full'),
  ('supervisor', 'qa_settings_manage', 'none'),
  ('supervisor', 'qa_work_queue', 'full'),
  ('employee', 'qa_settings_manage', 'none'),
  ('employee', 'qa_work_queue', 'read')
ON CONFLICT (role, resource_key) DO UPDATE SET access_level = EXCLUDED.access_level;