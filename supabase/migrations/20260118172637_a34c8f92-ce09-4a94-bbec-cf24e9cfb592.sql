-- =========================================
-- ENHANCE RECEIVING TABLES FOR CAPA LINKING
-- =========================================

-- Add CAPA reference to receiving_lots (if not already present)
ALTER TABLE public.receiving_lots
ADD COLUMN IF NOT EXISTS capa_id UUID REFERENCES public.corrective_actions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS capa_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_category TEXT;

-- Add CAPA reference to po_receiving_items (if not already present)  
ALTER TABLE public.po_receiving_items
ADD COLUMN IF NOT EXISTS capa_id UUID REFERENCES public.corrective_actions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_category TEXT;

-- Create index for finding receiving records by CAPA
CREATE INDEX IF NOT EXISTS idx_receiving_lots_capa ON public.receiving_lots(capa_id) WHERE capa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receiving_items_capa ON public.po_receiving_items(capa_id) WHERE capa_id IS NOT NULL;

-- =========================================
-- CAPA CREATION SETTINGS FOR RECEIVING
-- =========================================

INSERT INTO public.capa_settings (setting_key, setting_value, setting_type, description) VALUES
  ('auto_suggest_capa_on_rejection', 'true', 'boolean', 'Prompt to create CAPA when rejecting receiving lot'),
  ('require_capa_for_rejection', 'false', 'boolean', 'Require CAPA creation for all rejections'),
  ('auto_capa_severity_mapping', '{"temperature": "major", "contamination": "critical", "quality": "major", "documentation": "minor", "packaging": "minor", "specification": "major", "quantity": "minor", "expiration": "major", "other": "minor"}', 'json', 'Default CAPA severity by rejection category')
ON CONFLICT (setting_key) DO NOTHING;

-- =========================================
-- REJECTION CATEGORY DROPDOWN OPTIONS
-- =========================================

INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order, is_active) VALUES
  ('rejection_category', 'temperature', 'Temperature Excursion', 1, true),
  ('rejection_category', 'contamination', 'Contamination/Foreign Material', 2, true),
  ('rejection_category', 'quality', 'Quality Defect', 3, true),
  ('rejection_category', 'specification', 'Out of Specification', 4, true),
  ('rejection_category', 'documentation', 'Documentation Issue', 5, true),
  ('rejection_category', 'packaging', 'Packaging Damage', 6, true),
  ('rejection_category', 'quantity', 'Quantity Discrepancy', 7, true),
  ('rejection_category', 'expiration', 'Expiration/Dating Issue', 8, true),
  ('rejection_category', 'other', 'Other', 99, true)
ON CONFLICT DO NOTHING;