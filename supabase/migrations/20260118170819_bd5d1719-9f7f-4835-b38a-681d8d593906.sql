-- =========================================
-- PRODUCTION TEST FAILURE CATEGORIES
-- =========================================

INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order, is_active) VALUES
  ('production_failure_category', 'temperature', 'Temperature Deviation', 1, true),
  ('production_failure_category', 'overrun', 'Overrun Out of Spec', 2, true),
  ('production_failure_category', 'weight', 'Weight/Fill Variance', 3, true),
  ('production_failure_category', 'appearance', 'Appearance Defect', 4, true),
  ('production_failure_category', 'texture', 'Texture/Consistency Issue', 5, true),
  ('production_failure_category', 'flavor', 'Flavor/Taste Defect', 6, true),
  ('production_failure_category', 'contamination', 'Contamination/Foreign Material', 7, true),
  ('production_failure_category', 'micro', 'Microbiological Failure', 8, true),
  ('production_failure_category', 'packaging', 'Packaging Defect', 9, true),
  ('production_failure_category', 'labeling', 'Labeling Error', 10, true),
  ('production_failure_category', 'equipment', 'Equipment Malfunction', 11, true),
  ('production_failure_category', 'process', 'Process Deviation', 12, true),
  ('production_failure_category', 'ingredient', 'Ingredient Issue', 13, true),
  ('production_failure_category', 'other', 'Other', 99, true)
ON CONFLICT DO NOTHING;

-- =========================================
-- ENHANCE PRODUCTION LOTS FOR CAPA
-- =========================================

ALTER TABLE public.production_lots
ADD COLUMN IF NOT EXISTS capa_id UUID REFERENCES public.corrective_actions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS qa_hold_reason TEXT,
ADD COLUMN IF NOT EXISTS qa_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS failure_category TEXT;

CREATE INDEX IF NOT EXISTS idx_production_lots_capa ON public.production_lots(capa_id) WHERE capa_id IS NOT NULL;

-- =========================================
-- ENHANCE PRODUCTION LOT QA TESTS FOR CAPA
-- =========================================

ALTER TABLE public.production_lot_qa_tests
ADD COLUMN IF NOT EXISTS capa_id UUID REFERENCES public.corrective_actions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS failure_category TEXT,
ADD COLUMN IF NOT EXISTS failure_notes TEXT,
ADD COLUMN IF NOT EXISTS capa_required BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_production_qa_tests_capa ON public.production_lot_qa_tests(capa_id) WHERE capa_id IS NOT NULL;

-- =========================================
-- PRODUCTION QA CAPA SETTINGS
-- =========================================

INSERT INTO public.capa_settings (setting_key, setting_value, setting_type, description) VALUES
  ('auto_suggest_capa_on_test_fail', 'true', 'boolean', 'Prompt to create CAPA when production test fails'),
  ('require_capa_for_batch_rejection', 'true', 'boolean', 'Require CAPA when rejecting a production batch'),
  ('require_capa_for_batch_hold', 'false', 'boolean', 'Require CAPA when placing batch on hold'),
  ('production_capa_severity_mapping', '{"contamination": "critical", "micro": "critical", "temperature": "major", "overrun": "minor", "weight": "minor", "appearance": "minor", "texture": "major", "flavor": "major", "packaging": "minor", "labeling": "minor", "equipment": "major", "process": "major", "ingredient": "major", "other": "minor"}', 'json', 'Default CAPA severity by production failure category')
ON CONFLICT (setting_key) DO NOTHING;