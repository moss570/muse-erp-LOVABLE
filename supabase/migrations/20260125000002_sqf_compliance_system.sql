-- =============================================
-- SQF COMPLIANCE SYSTEM
-- Manage SQF code editions, mappings, and compliance tracking
-- =============================================

-- =============================================
-- 1. SQF EDITIONS (VERSION CONTROL)
-- =============================================

CREATE TABLE IF NOT EXISTS public.sqf_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_name VARCHAR(100) UNIQUE NOT NULL,  -- "Edition 9.1", "Edition 10"
  release_year INTEGER NOT NULL,
  release_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Under_Review', 'Active', 'Archived')),
  is_active BOOLEAN DEFAULT false,  -- Only ONE can be active at a time

  -- Upload tracking
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMP DEFAULT now(),

  -- File references
  original_file_url VARCHAR(500),  -- Link to uploaded PDF in Supabase Storage
  original_file_name VARCHAR(255),
  original_file_path VARCHAR(500),

  -- AI Processing
  parsing_status VARCHAR(50) DEFAULT 'Pending' CHECK (parsing_status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Manual')),
  parsing_started_at TIMESTAMP,
  parsing_completed_at TIMESTAMP,
  parsing_error TEXT,
  total_codes_extracted INTEGER DEFAULT 0,
  ai_model_used VARCHAR(100),  -- Track which AI model was used

  -- Manual entry fallback
  allow_manual_entry BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Ensure only one active edition
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_sqf_edition
  ON public.sqf_editions(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sqf_editions_status ON public.sqf_editions(status);
CREATE INDEX IF NOT EXISTS idx_sqf_editions_year ON public.sqf_editions(release_year);

-- =============================================
-- 2. SQF CODES
-- =============================================

CREATE TABLE IF NOT EXISTS public.sqf_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES public.sqf_editions(id) ON DELETE CASCADE,

  code_number VARCHAR(50) NOT NULL,  -- "2.1.1.1"
  parent_code_id UUID REFERENCES public.sqf_codes(id),  -- For hierarchical structure

  title VARCHAR(500) NOT NULL,
  requirement_text TEXT NOT NULL,
  guidance_text TEXT,
  intent TEXT,

  -- Classification
  category VARCHAR(255),  -- "Food Safety Plan", "GMP", "HACCP"
  module VARCHAR(100),  -- "Module 2", "Module 11"
  section_number INTEGER,  -- For ordering

  is_fundamental BOOLEAN DEFAULT false,
  applies_to TEXT[],  -- ['manufacturing', 'distribution', 'storage']

  -- AI extraction metadata
  extraction_confidence DECIMAL(3,2),  -- 0.00-1.00
  extracted_via VARCHAR(50),  -- AI, Manual
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(edition_id, code_number)
);

CREATE INDEX IF NOT EXISTS idx_sqf_codes_edition ON public.sqf_codes(edition_id);
CREATE INDEX IF NOT EXISTS idx_sqf_codes_number ON public.sqf_codes(code_number);
CREATE INDEX IF NOT EXISTS idx_sqf_codes_category ON public.sqf_codes(category);
CREATE INDEX IF NOT EXISTS idx_sqf_codes_fundamental ON public.sqf_codes(is_fundamental) WHERE is_fundamental = true;

-- =============================================
-- 3. EDITION TRANSITIONS
-- =============================================

-- Track transitions between SQF editions
CREATE TABLE IF NOT EXISTS public.sqf_edition_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_edition_id UUID REFERENCES public.sqf_editions(id),
  to_edition_id UUID REFERENCES public.sqf_editions(id) NOT NULL,

  transition_date DATE NOT NULL,
  transitioned_by UUID REFERENCES public.profiles(id),

  -- Policy review tracking
  total_policies_count INTEGER,
  policies_reviewed_count INTEGER DEFAULT 0,
  policies_requiring_update_count INTEGER DEFAULT 0,

  -- Compliance impact
  new_codes_count INTEGER,
  removed_codes_count INTEGER,
  modified_codes_count INTEGER,

  completion_status VARCHAR(50) DEFAULT 'In_Progress' CHECK (completion_status IN ('In_Progress', 'Completed')),
  target_completion_date DATE,

  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_transition_status CHECK (completion_status IN ('In_Progress', 'Completed'))
);

CREATE INDEX IF NOT EXISTS idx_edition_transitions_from ON public.sqf_edition_transitions(from_edition_id);
CREATE INDEX IF NOT EXISTS idx_edition_transitions_to ON public.sqf_edition_transitions(to_edition_id);

-- =============================================
-- 4. CODE CHANGES BETWEEN EDITIONS
-- =============================================

-- Map codes between editions (for tracking changes)
CREATE TABLE IF NOT EXISTS public.sqf_code_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_id UUID REFERENCES public.sqf_edition_transitions(id) ON DELETE CASCADE,

  old_code_id UUID REFERENCES public.sqf_codes(id),  -- null if new code
  new_code_id UUID REFERENCES public.sqf_codes(id),  -- null if removed code

  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('New', 'Removed', 'Modified', 'Renumbered', 'Unchanged')),
  change_description TEXT,

  -- Impact on policies
  affects_policy_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_code_changes_transition ON public.sqf_code_changes(transition_id);
CREATE INDEX IF NOT EXISTS idx_code_changes_type ON public.sqf_code_changes(change_type);

-- =============================================
-- 5. POLICY-SQF MAPPINGS
-- =============================================

-- Map policies to SQF codes
CREATE TABLE IF NOT EXISTS public.policy_sqf_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  sqf_code_id UUID REFERENCES public.sqf_codes(id) ON DELETE CASCADE,
  edition_id UUID REFERENCES public.sqf_editions(id),

  -- Mapping confidence & details
  confidence_score DECIMAL(3,2),  -- 0.00-1.00 (AI-generated initially)
  mapping_type VARCHAR(50) CHECK (mapping_type IN ('Full_Coverage', 'Partial', 'Referenced', 'AI_Suggested')),

  -- Specific section mapping (for overlay feature)
  policy_section_ids TEXT[],  -- Tiptap node IDs that relate to this code
  highlighted_text TEXT,  -- Specific excerpt that addresses the code

  -- Evidence & validation
  evidence_notes TEXT,  -- How this policy addresses the code
  evidence_links JSONB,  -- Links to ERP data: {"type": "production_lot", "id": "..."}
  gap_identified BOOLEAN DEFAULT false,
  gap_description TEXT,

  -- Current status
  is_current BOOLEAN DEFAULT true,  -- Mark old mappings as not current when edition changes
  review_status VARCHAR(50) DEFAULT 'Pending' CHECK (review_status IN ('Pending', 'Reviewed', 'Needs_Update')),

  -- Audit trail
  mapped_by UUID REFERENCES public.profiles(id),  -- null if AI-mapped
  mapped_at TIMESTAMP DEFAULT now(),
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_sqf_policy ON public.policy_sqf_mappings(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_sqf_code ON public.policy_sqf_mappings(sqf_code_id);
CREATE INDEX IF NOT EXISTS idx_policy_sqf_edition ON public.policy_sqf_mappings(edition_id, is_current);
CREATE INDEX IF NOT EXISTS idx_policy_sqf_gaps ON public.policy_sqf_mappings(gap_identified) WHERE gap_identified = true;

-- =============================================
-- 6. SQF COMPLIANCE CARDS
-- =============================================

-- SQF compliance status (the "card" for each code)
CREATE TABLE IF NOT EXISTS public.sqf_compliance_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sqf_code_id UUID REFERENCES public.sqf_codes(id) ON DELETE CASCADE UNIQUE,

  -- Overall status
  compliance_status VARCHAR(50) DEFAULT 'Not_Assessed' CHECK (compliance_status IN ('Compliant', 'Partial', 'Gap_Identified', 'Not_Assessed')),
  last_assessed_date DATE,
  assessed_by UUID REFERENCES public.profiles(id),

  -- Evidence logging
  evidence_summary TEXT,  -- How we meet this requirement
  evidence_documents JSONB,  -- Links to policies, procedures, records

  -- Gap analysis
  gaps_identified TEXT[],
  remediation_plan TEXT,
  target_completion_date DATE,

  -- Audit notes
  audit_notes TEXT,  -- Used during 3rd party audits
  last_audit_date DATE,
  last_audit_finding VARCHAR(50) CHECK (last_audit_finding IN ('Conformance', 'Minor_NC', 'Major_NC', 'Critical', NULL)),

  updated_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_cards_code ON public.sqf_compliance_cards(sqf_code_id);
CREATE INDEX IF NOT EXISTS idx_compliance_cards_status ON public.sqf_compliance_cards(compliance_status);
CREATE INDEX IF NOT EXISTS idx_compliance_cards_gaps ON public.sqf_compliance_cards(compliance_status) WHERE compliance_status = 'Gap_Identified';

-- =============================================
-- 7. SQF DOCUMENT UPLOADS
-- =============================================

-- Upload full SQF code document for AI parsing
CREATE TABLE IF NOT EXISTS public.sqf_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES public.sqf_editions(id) ON DELETE CASCADE,

  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),  -- pdf, word
  file_size_bytes BIGINT,

  upload_date TIMESTAMP DEFAULT now(),
  uploaded_by UUID REFERENCES public.profiles(id),

  -- AI parsing status
  parsing_job_id VARCHAR(255),  -- Track async parsing job
  parsing_logs TEXT,

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sqf_documents_edition ON public.sqf_documents(edition_id);

-- =============================================
-- 8. RLS POLICIES
-- =============================================

-- Enable Row Level Security
ALTER TABLE public.sqf_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sqf_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sqf_edition_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sqf_code_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_sqf_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sqf_compliance_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sqf_documents ENABLE ROW LEVEL SECURITY;

-- Anyone can view active SQF codes
CREATE POLICY "Anyone can view active SQF editions"
  ON public.sqf_editions FOR SELECT
  USING (status = 'Active' OR is_policy_admin_or_manager());

CREATE POLICY "Managers can manage SQF editions"
  ON public.sqf_editions FOR ALL
  USING (is_policy_admin_or_manager());

CREATE POLICY "Anyone can view SQF codes"
  ON public.sqf_codes FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage SQF codes"
  ON public.sqf_codes FOR ALL
  USING (is_policy_admin_or_manager());

CREATE POLICY "Anyone can view policy-SQF mappings"
  ON public.policy_sqf_mappings FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage policy-SQF mappings"
  ON public.policy_sqf_mappings FOR ALL
  USING (is_policy_admin_or_manager());

CREATE POLICY "Anyone can view compliance cards"
  ON public.sqf_compliance_cards FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage compliance cards"
  ON public.sqf_compliance_cards FOR ALL
  USING (is_policy_admin_or_manager());

-- Managers only for transitions and changes
CREATE POLICY "Managers can view edition transitions"
  ON public.sqf_edition_transitions FOR SELECT
  USING (is_policy_admin_or_manager());

CREATE POLICY "Managers can view code changes"
  ON public.sqf_code_changes FOR SELECT
  USING (is_policy_admin_or_manager());

CREATE POLICY "Managers can view SQF documents"
  ON public.sqf_documents FOR SELECT
  USING (is_policy_admin_or_manager());

-- =============================================
-- 9. HELPER VIEWS
-- =============================================

-- View: Active SQF codes with compliance status
CREATE OR REPLACE VIEW public.active_sqf_codes_view AS
SELECT
  c.*,
  e.edition_name,
  e.release_year,
  cc.compliance_status,
  cc.last_assessed_date,
  cc.last_audit_finding,
  (SELECT COUNT(*) FROM public.policy_sqf_mappings m WHERE m.sqf_code_id = c.id AND m.is_current = true) as policies_mapped_count
FROM public.sqf_codes c
JOIN public.sqf_editions e ON c.edition_id = e.id
LEFT JOIN public.sqf_compliance_cards cc ON c.id = cc.sqf_code_id
WHERE e.is_active = true;

-- View: SQF compliance summary
CREATE OR REPLACE VIEW public.sqf_compliance_summary AS
SELECT
  e.id as edition_id,
  e.edition_name,
  COUNT(c.id) as total_codes,
  COUNT(CASE WHEN cc.compliance_status = 'Compliant' THEN 1 END) as compliant_count,
  COUNT(CASE WHEN cc.compliance_status = 'Partial' THEN 1 END) as partial_count,
  COUNT(CASE WHEN cc.compliance_status = 'Gap_Identified' THEN 1 END) as gap_count,
  COUNT(CASE WHEN cc.compliance_status = 'Not_Assessed' THEN 1 END) as not_assessed_count,
  ROUND(
    (COUNT(CASE WHEN cc.compliance_status = 'Compliant' THEN 1 END)::NUMERIC / NULLIF(COUNT(c.id), 0)) * 100,
    2
  ) as compliance_percentage
FROM public.sqf_editions e
LEFT JOIN public.sqf_codes c ON e.id = c.edition_id
LEFT JOIN public.sqf_compliance_cards cc ON c.id = cc.sqf_code_id
WHERE e.is_active = true
GROUP BY e.id, e.edition_name;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
