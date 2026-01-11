-- =====================================================
-- APPROVAL & COMPLIANCE ENGINE - DATABASE ARCHITECTURE
-- =====================================================

-- 1. Create approval_status type for consistency
DO $$ BEGIN
  CREATE TYPE approval_status_enum AS ENUM ('Draft', 'Pending_QA', 'Approved', 'Rejected', 'Archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add approval columns to MATERIALS table
-- Note: materials already has material_status, we'll add the new columns alongside
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Draft' CHECK (approval_status IN ('Draft', 'Pending_QA', 'Approved', 'Rejected', 'Archived')),
ADD COLUMN IF NOT EXISTS qa_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qa_verified_by UUID REFERENCES public.profiles(id);

-- Migrate existing material_status to approval_status where applicable
UPDATE public.materials 
SET approval_status = CASE 
  WHEN material_status = 'approved' THEN 'Approved'
  WHEN material_status = 'pending' THEN 'Pending_QA'
  WHEN material_status = 'draft' THEN 'Draft'
  WHEN material_status = 'rejected' THEN 'Rejected'
  WHEN material_status = 'archived' THEN 'Archived'
  ELSE 'Draft'
END
WHERE approval_status IS NULL OR approval_status = 'Draft';

-- 3. Add approval columns to PRODUCTS table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Draft' CHECK (approval_status IN ('Draft', 'Pending_QA', 'Approved', 'Rejected', 'Archived')),
ADD COLUMN IF NOT EXISTS qa_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qa_verified_by UUID REFERENCES public.profiles(id);

-- 4. Add approval columns to PRODUCTION_LOTS table
ALTER TABLE public.production_lots 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Draft' CHECK (approval_status IN ('Draft', 'Pending_QA', 'Approved', 'Rejected', 'Archived')),
ADD COLUMN IF NOT EXISTS qa_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qa_verified_by UUID REFERENCES public.profiles(id);

-- 5. Add approval columns to PO_RECEIVING_SESSIONS table
ALTER TABLE public.po_receiving_sessions 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Draft' CHECK (approval_status IN ('Draft', 'Pending_QA', 'Approved', 'Rejected', 'Archived')),
ADD COLUMN IF NOT EXISTS qa_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qa_verified_by UUID REFERENCES public.profiles(id);

-- 6. Add approval columns to SUPPLIERS table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Draft' CHECK (approval_status IN ('Draft', 'Pending_QA', 'Approved', 'Rejected', 'Archived')),
ADD COLUMN IF NOT EXISTS qa_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qa_verified_by UUID REFERENCES public.profiles(id);

-- =====================================================
-- 7. CREATE APPROVAL_LOGS TABLE (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_record_id UUID NOT NULL,
  related_table_name TEXT NOT NULL CHECK (related_table_name IN ('materials', 'products', 'production_lots', 'po_receiving_sessions', 'suppliers', 'compliance_documents')),
  action TEXT NOT NULL CHECK (action IN ('Created', 'Submitted', 'Approved', 'Rejected', 'Archived', 'Updated', 'Restored')),
  previous_status TEXT,
  new_status TEXT,
  user_id UUID REFERENCES public.profiles(id),
  timestamp TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on approval_logs
ALTER TABLE public.approval_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approval_logs
CREATE POLICY "Authenticated users can view approval logs"
ON public.approval_logs FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert approval logs"
ON public.approval_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Function to validate rejection notes
CREATE OR REPLACE FUNCTION public.validate_rejection_notes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action = 'Rejected' AND (NEW.notes IS NULL OR trim(NEW.notes) = '') THEN
    RAISE EXCEPTION 'Notes are required when rejecting an item';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for rejection notes validation
DROP TRIGGER IF EXISTS require_rejection_notes ON public.approval_logs;
CREATE TRIGGER require_rejection_notes
BEFORE INSERT ON public.approval_logs
FOR EACH ROW EXECUTE FUNCTION public.validate_rejection_notes();

-- Create indexes for approval_logs
CREATE INDEX IF NOT EXISTS idx_approval_logs_record ON public.approval_logs(related_record_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_table ON public.approval_logs(related_table_name);
CREATE INDEX IF NOT EXISTS idx_approval_logs_timestamp ON public.approval_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_approval_logs_user ON public.approval_logs(user_id);

-- =====================================================
-- 8. CREATE COMPLIANCE_DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_entity_id UUID NOT NULL,
  related_entity_type TEXT NOT NULL CHECK (related_entity_type IN ('supplier', 'material', 'product')),
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT,
  file_path TEXT,
  storage_provider TEXT DEFAULT 'supabase' CHECK (storage_provider IN ('supabase', 'google_drive')),
  expiration_date DATE,
  is_current BOOLEAN DEFAULT true,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES public.profiles(id),
  replaced_by_id UUID REFERENCES public.compliance_documents(id),
  notes TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on compliance_documents
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance_documents
CREATE POLICY "Authenticated users can view compliance documents"
ON public.compliance_documents FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert compliance documents"
ON public.compliance_documents FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update compliance documents"
ON public.compliance_documents FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create indexes for compliance_documents
CREATE INDEX IF NOT EXISTS idx_compliance_docs_entity ON public.compliance_documents(related_entity_id, related_entity_type);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_expiration ON public.compliance_documents(expiration_date) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_compliance_docs_current ON public.compliance_documents(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_compliance_docs_type ON public.compliance_documents(document_type);

-- Trigger to update updated_at
CREATE TRIGGER update_compliance_documents_updated_at
BEFORE UPDATE ON public.compliance_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 9. ADD COMPLIANCE DOCUMENT TYPES TO DROPDOWN_OPTIONS
-- =====================================================
INSERT INTO public.dropdown_options (dropdown_type, label, value, sort_order, is_active)
VALUES 
  ('compliance_document_type', 'Liability Insurance', 'liability_insurance', 1, true),
  ('compliance_document_type', 'Certificate of Insurance (COI)', 'coi', 2, true),
  ('compliance_document_type', 'Spec Sheet', 'spec_sheet', 3, true),
  ('compliance_document_type', 'Certificate of Analysis (COA)', 'coa', 4, true),
  ('compliance_document_type', 'Kosher Certificate', 'kosher_cert', 5, true),
  ('compliance_document_type', 'Halal Certificate', 'halal_cert', 6, true),
  ('compliance_document_type', 'Organic Certificate', 'organic_cert', 7, true),
  ('compliance_document_type', 'Non-GMO Certificate', 'non_gmo_cert', 8, true),
  ('compliance_document_type', 'Allergen Statement', 'allergen_statement', 9, true),
  ('compliance_document_type', 'Safety Data Sheet (SDS)', 'sds', 10, true),
  ('compliance_document_type', 'Quality Agreement', 'quality_agreement', 11, true),
  ('compliance_document_type', 'Supplier Questionnaire', 'supplier_questionnaire', 12, true),
  ('compliance_document_type', 'GFSI Certificate', 'gfsi_cert', 13, true),
  ('compliance_document_type', 'Food Safety Plan', 'food_safety_plan', 14, true),
  ('compliance_document_type', 'Letter of Guarantee', 'log', 15, true)
ON CONFLICT (dropdown_type, value) DO NOTHING;

-- =====================================================
-- 10. GATEKEEPING FUNCTIONS
-- =====================================================

-- Function to check if a material is approved for production use
CREATE OR REPLACE FUNCTION public.is_material_approved(p_material_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.materials 
    WHERE id = p_material_id AND approval_status = 'Approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if a production lot can be shipped (positive release)
CREATE OR REPLACE FUNCTION public.can_ship_production_lot(p_lot_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.production_lots 
    WHERE id = p_lot_id AND approval_status = 'Approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get unapproved materials in a recipe
CREATE OR REPLACE FUNCTION public.get_unapproved_recipe_materials(p_recipe_id UUID)
RETURNS TABLE(material_id UUID, material_name TEXT, approval_status TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.name, m.approval_status
  FROM public.product_recipe_items pri
  JOIN public.materials m ON m.id = pri.material_id
  WHERE pri.recipe_id = p_recipe_id
    AND (m.approval_status IS NULL OR m.approval_status != 'Approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if supplier has valid compliance documents
CREATE OR REPLACE FUNCTION public.supplier_has_valid_documents(p_supplier_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if there are any expired current documents
  RETURN NOT EXISTS (
    SELECT 1 FROM public.compliance_documents 
    WHERE related_entity_id = p_supplier_id 
      AND related_entity_type = 'supplier'
      AND is_current = true
      AND expiration_date IS NOT NULL
      AND expiration_date < CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 11. CREATE VIEW FOR QA DASHBOARD PENDING ITEMS
-- =====================================================
CREATE OR REPLACE VIEW public.qa_pending_items AS
SELECT 
  id,
  'materials' as table_name,
  name as item_name,
  code as item_code,
  approval_status,
  created_at,
  updated_at,
  NULL::UUID as qa_verified_by
FROM public.materials WHERE approval_status = 'Pending_QA'
UNION ALL
SELECT 
  id,
  'suppliers' as table_name,
  name as item_name,
  code as item_code,
  approval_status,
  created_at,
  updated_at,
  qa_verified_by
FROM public.suppliers WHERE approval_status = 'Pending_QA'
UNION ALL
SELECT 
  id,
  'products' as table_name,
  name as item_name,
  sku as item_code,
  approval_status,
  created_at,
  updated_at,
  qa_verified_by
FROM public.products WHERE approval_status = 'Pending_QA'
UNION ALL
SELECT 
  id,
  'production_lots' as table_name,
  lot_number as item_name,
  lot_number as item_code,
  approval_status,
  created_at,
  updated_at,
  qa_verified_by
FROM public.production_lots WHERE approval_status = 'Pending_QA';

-- =====================================================
-- 12. CREATE VIEW FOR STALE DRAFT ITEMS (>7 days)
-- =====================================================
CREATE OR REPLACE VIEW public.stale_draft_items AS
SELECT 
  id,
  'materials' as table_name,
  name as item_name,
  code as item_code,
  approval_status,
  created_at,
  updated_at,
  EXTRACT(DAY FROM now() - created_at)::INT as days_stale
FROM public.materials 
WHERE approval_status = 'Draft' AND created_at < now() - interval '7 days'
UNION ALL
SELECT 
  id,
  'suppliers' as table_name,
  name as item_name,
  code as item_code,
  approval_status,
  created_at,
  updated_at,
  EXTRACT(DAY FROM now() - created_at)::INT as days_stale
FROM public.suppliers 
WHERE approval_status = 'Draft' AND created_at < now() - interval '7 days'
UNION ALL
SELECT 
  id,
  'products' as table_name,
  name as item_name,
  sku as item_code,
  approval_status,
  created_at,
  updated_at,
  EXTRACT(DAY FROM now() - created_at)::INT as days_stale
FROM public.products 
WHERE approval_status = 'Draft' AND created_at < now() - interval '7 days';

-- =====================================================
-- 13. CREATE VIEW FOR DOCUMENT EXPIRATION WATCHLIST
-- =====================================================
CREATE OR REPLACE VIEW public.document_expiration_watchlist AS
SELECT 
  cd.id,
  cd.related_entity_id,
  cd.related_entity_type,
  cd.document_type,
  cd.document_name,
  cd.file_url,
  cd.expiration_date,
  cd.uploaded_by,
  cd.created_at,
  CASE 
    WHEN cd.expiration_date < CURRENT_DATE THEN 'expired'
    WHEN cd.expiration_date < CURRENT_DATE + interval '45 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as expiration_status,
  CASE 
    WHEN s.id IS NOT NULL THEN s.name
    WHEN m.id IS NOT NULL THEN m.name
    WHEN p.id IS NOT NULL THEN p.name
    ELSE 'Unknown'
  END as entity_name
FROM public.compliance_documents cd
LEFT JOIN public.suppliers s ON cd.related_entity_id = s.id AND cd.related_entity_type = 'supplier'
LEFT JOIN public.materials m ON cd.related_entity_id = m.id AND cd.related_entity_type = 'material'
LEFT JOIN public.products p ON cd.related_entity_id = p.id AND cd.related_entity_type = 'product'
WHERE cd.is_current = true
  AND cd.expiration_date IS NOT NULL
ORDER BY cd.expiration_date ASC;

-- Enable realtime for compliance_documents
ALTER PUBLICATION supabase_realtime ADD TABLE public.compliance_documents;