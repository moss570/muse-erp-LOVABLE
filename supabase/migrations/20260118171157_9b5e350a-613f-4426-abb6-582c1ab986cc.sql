-- =========================================
-- CUSTOMER COMPLAINTS TABLE
-- =========================================

CREATE TABLE public.customer_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number TEXT NOT NULL UNIQUE,
  
  -- Customer Info
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Complaint Classification
  complaint_type TEXT NOT NULL CHECK (complaint_type IN (
    'quality', 'foreign_material', 'illness', 'allergen', 'packaging',
    'labeling', 'taste', 'texture', 'appearance', 'temperature',
    'delivery', 'service', 'other'
  )),
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'acknowledged', 'investigating', 'resolved', 'closed', 'escalated'
  )),
  
  -- Product Info
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  product_sku TEXT,
  production_lot_number TEXT,
  best_by_date DATE,
  purchase_date DATE,
  purchase_location TEXT,
  
  -- Complaint Details
  complaint_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_via TEXT CHECK (received_via IN ('phone', 'email', 'social_media', 'letter', 'in_person', 'website', 'retailer', 'other')),
  description TEXT NOT NULL,
  
  -- Investigation
  sample_received BOOLEAN DEFAULT false,
  sample_received_date DATE,
  sample_condition TEXT,
  investigation_notes TEXT,
  root_cause TEXT,
  
  -- Resolution
  resolution_type TEXT CHECK (resolution_type IN (
    'replacement', 'refund', 'credit', 'coupon', 'apology', 'no_action', 'other'
  )),
  resolution_details TEXT,
  resolution_date DATE,
  resolved_by UUID REFERENCES public.profiles(id),
  
  -- Customer Follow-up
  customer_satisfied BOOLEAN,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  
  -- CAPA Link
  capa_id UUID REFERENCES public.corrective_actions(id) ON DELETE SET NULL,
  capa_required BOOLEAN DEFAULT false,
  
  -- Regulatory
  reportable_event BOOLEAN DEFAULT false,
  regulatory_report_filed BOOLEAN DEFAULT false,
  regulatory_report_date DATE,
  
  -- Financial
  refund_amount NUMERIC(10,2),
  replacement_cost NUMERIC(10,2),
  
  -- Metadata
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_complaints_status ON public.customer_complaints(status);
CREATE INDEX idx_complaints_type ON public.customer_complaints(complaint_type);
CREATE INDEX idx_complaints_capa ON public.customer_complaints(capa_id) WHERE capa_id IS NOT NULL;
CREATE INDEX idx_complaints_customer ON public.customer_complaints(customer_id);
CREATE INDEX idx_complaints_product ON public.customer_complaints(product_id);

-- Enable RLS
ALTER TABLE public.customer_complaints ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view complaints"
  ON public.customer_complaints FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create complaints"
  ON public.customer_complaints FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update complaints"
  ON public.customer_complaints FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can delete complaints"
  ON public.customer_complaints FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_customer_complaints_updated_at
  BEFORE UPDATE ON public.customer_complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Complaint number generator function
CREATE OR REPLACE FUNCTION public.generate_complaint_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(complaint_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.customer_complaints
  WHERE complaint_number LIKE 'CMP-' || year_prefix || '-%';
  
  RETURN 'CMP-' || year_prefix || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =========================================
-- COMPLAINT TYPE DROPDOWN OPTIONS
-- =========================================

INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order, is_active) VALUES
  ('complaint_type', 'quality', 'General Quality Issue', 1, true),
  ('complaint_type', 'foreign_material', 'Foreign Material', 2, true),
  ('complaint_type', 'illness', 'Reported Illness', 3, true),
  ('complaint_type', 'allergen', 'Allergen Issue', 4, true),
  ('complaint_type', 'packaging', 'Packaging Problem', 5, true),
  ('complaint_type', 'labeling', 'Labeling Error', 6, true),
  ('complaint_type', 'taste', 'Taste/Flavor Issue', 7, true),
  ('complaint_type', 'texture', 'Texture Issue', 8, true),
  ('complaint_type', 'appearance', 'Appearance Issue', 9, true),
  ('complaint_type', 'temperature', 'Temperature Abuse', 10, true),
  ('complaint_type', 'delivery', 'Delivery Problem', 11, true),
  ('complaint_type', 'service', 'Service Issue', 12, true),
  ('complaint_type', 'other', 'Other', 99, true)
ON CONFLICT DO NOTHING;

-- =========================================
-- CAPA SETTINGS FOR COMPLAINTS
-- =========================================

INSERT INTO public.capa_settings (setting_key, setting_value, setting_type, description) VALUES
  ('require_capa_for_illness_complaint', 'true', 'boolean', 'Require CAPA when complaint involves reported illness'),
  ('require_capa_for_foreign_material', 'true', 'boolean', 'Require CAPA when complaint involves foreign material'),
  ('require_capa_for_allergen_complaint', 'true', 'boolean', 'Require CAPA when complaint involves allergen issue'),
  ('complaint_capa_severity_mapping', '{"illness": "critical", "foreign_material": "critical", "allergen": "critical", "quality": "major", "taste": "major", "texture": "major", "appearance": "minor", "packaging": "minor", "labeling": "minor", "temperature": "major", "delivery": "minor", "service": "minor", "other": "minor"}', 'json', 'Default CAPA severity by complaint type')
ON CONFLICT (setting_key) DO NOTHING;