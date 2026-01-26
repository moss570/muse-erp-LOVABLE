-- ============================================================================
-- SQF CODE MANAGEMENT SYSTEM
-- ============================================================================
-- This migration creates tables for managing SQF (Safe Quality Food) codes
-- and their integration with policies for compliance tracking.
-- ============================================================================

-- ============================================================================
-- 1. SQF EDITIONS
-- ============================================================================
-- Stores different versions of SQF code editions (e.g., Edition 9, 9.1, etc.)

CREATE TABLE sqf_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Edition identification
  edition_name VARCHAR NOT NULL UNIQUE, -- e.g., "Edition 9.1", "Edition 9.0"
  edition_number DECIMAL(4,2), -- e.g., 9.1, 9.0, 8.0
  release_date DATE NOT NULL,
  effective_date DATE,

  -- Document source
  source_document_url VARCHAR, -- URL to uploaded PDF/document
  source_document_filename VARCHAR,
  source_file_size_bytes BIGINT,

  -- Parsing status
  parsing_status VARCHAR DEFAULT 'Pending', -- Pending, Parsing, Completed, Failed
  parsing_started_at TIMESTAMP,
  parsing_completed_at TIMESTAMP,
  parsing_error TEXT,

  -- Extraction results
  total_codes_extracted INTEGER DEFAULT 0,
  total_sections INTEGER DEFAULT 0,

  -- Edition status
  is_active BOOLEAN DEFAULT false, -- Only one edition should be active at a time
  status VARCHAR DEFAULT 'Draft', -- Draft, Active, Archived, Deprecated

  -- Metadata
  description TEXT,
  change_summary TEXT, -- What changed in this edition
  applicable_to TEXT[], -- Array of industries/sectors this applies to

  -- Audit fields
  created_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP DEFAULT now(),
  updated_by UUID REFERENCES profiles(id),

  CONSTRAINT valid_parsing_status CHECK (parsing_status IN ('Pending', 'Parsing', 'Completed', 'Failed')),
  CONSTRAINT valid_status CHECK (status IN ('Draft', 'Active', 'Archived', 'Deprecated'))
);

-- Create index for active edition lookup
CREATE INDEX idx_sqf_editions_active ON sqf_editions(is_active) WHERE is_active = true;
CREATE INDEX idx_sqf_editions_status ON sqf_editions(status);

-- ============================================================================
-- 2. SQF CODES
-- ============================================================================
-- Individual SQF requirement codes extracted from editions

CREATE TABLE sqf_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sqf_edition_id UUID REFERENCES sqf_editions(id) ON DELETE CASCADE,

  -- Code identification
  code_number VARCHAR NOT NULL, -- e.g., "2.4.3.2", "11.2.4"
  full_code_reference VARCHAR, -- e.g., "SQF Edition 9.1 - 2.4.3.2"

  -- Code details
  title VARCHAR NOT NULL,
  description TEXT,
  requirement_text TEXT NOT NULL, -- The actual requirement

  -- Code classification
  section VARCHAR, -- Main section (e.g., "2", "11")
  sub_section VARCHAR, -- Sub-section (e.g., "2.4", "11.2")
  category VARCHAR, -- e.g., "Food Safety", "Quality", "Good Manufacturing Practice"
  module VARCHAR, -- e.g., "Module 2", "Module 11"

  -- Compliance attributes
  is_fundamental BOOLEAN DEFAULT false, -- Is this a fundamental requirement?
  is_mandatory BOOLEAN DEFAULT true,
  applies_to TEXT[], -- Array of facility types this applies to

  -- Implementation guidance
  guidance_notes TEXT,
  examples TEXT,
  common_pitfalls TEXT,

  -- Verification requirements
  verification_methods TEXT[],
  evidence_required TEXT[],
  documentation_needed TEXT[],

  -- Related codes
  related_code_ids UUID[], -- Array of related SQF code IDs
  supersedes_code_id UUID REFERENCES sqf_codes(id), -- Code this one replaces

  -- Audit fields
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(sqf_edition_id, code_number)
);

-- Create indexes for performance
CREATE INDEX idx_sqf_codes_edition ON sqf_codes(sqf_edition_id);
CREATE INDEX idx_sqf_codes_number ON sqf_codes(code_number);
CREATE INDEX idx_sqf_codes_category ON sqf_codes(category);
CREATE INDEX idx_sqf_codes_fundamental ON sqf_codes(is_fundamental) WHERE is_fundamental = true;
CREATE INDEX idx_sqf_codes_section ON sqf_codes(section, sub_section);

-- Full-text search index
CREATE INDEX idx_sqf_codes_search ON sqf_codes
USING gin(to_tsvector('english',
  coalesce(title, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(requirement_text, '')
));

-- ============================================================================
-- 3. POLICY-SQF CODE MAPPINGS
-- ============================================================================
-- Links policies to SQF codes they address

CREATE TABLE policy_sqf_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  sqf_code_id UUID REFERENCES sqf_codes(id) ON DELETE CASCADE,

  -- Mapping details
  mapping_type VARCHAR DEFAULT 'Addresses', -- Addresses, Partially_Addresses, References, Related
  coverage_level VARCHAR, -- Full, Partial, Minimal

  -- Evidence
  evidence_location TEXT, -- Where in the policy is this addressed? (section, page)
  evidence_description TEXT, -- How does this policy address the SQF requirement?
  evidence_strength VARCHAR, -- Strong, Moderate, Weak

  -- Gap analysis
  has_gaps BOOLEAN DEFAULT false,
  gap_description TEXT,
  gap_severity VARCHAR, -- Critical, High, Medium, Low
  gap_action_required TEXT,
  gap_remediation_plan TEXT,
  gap_target_date DATE,
  gap_resolved BOOLEAN DEFAULT false,
  gap_resolved_date DATE,
  gap_resolved_by UUID REFERENCES profiles(id),

  -- Compliance status
  compliance_status VARCHAR DEFAULT 'Compliant', -- Compliant, Partial, Non_Compliant, Not_Applicable
  last_verified_date DATE,
  next_verification_due DATE,
  verified_by UUID REFERENCES profiles(id),
  verification_notes TEXT,

  -- Audit trail
  mapped_by UUID REFERENCES profiles(id),
  mapped_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(policy_id, sqf_code_id),

  CONSTRAINT valid_mapping_type CHECK (mapping_type IN ('Addresses', 'Partially_Addresses', 'References', 'Related')),
  CONSTRAINT valid_coverage CHECK (coverage_level IN ('Full', 'Partial', 'Minimal', NULL)),
  CONSTRAINT valid_evidence_strength CHECK (evidence_strength IN ('Strong', 'Moderate', 'Weak', NULL)),
  CONSTRAINT valid_gap_severity CHECK (gap_severity IN ('Critical', 'High', 'Medium', 'Low', NULL)),
  CONSTRAINT valid_compliance_status CHECK (compliance_status IN ('Compliant', 'Partial', 'Non_Compliant', 'Not_Applicable'))
);

-- Create indexes
CREATE INDEX idx_policy_sqf_mappings_policy ON policy_sqf_mappings(policy_id);
CREATE INDEX idx_policy_sqf_mappings_code ON policy_sqf_mappings(sqf_code_id);
CREATE INDEX idx_policy_sqf_mappings_compliance ON policy_sqf_mappings(compliance_status);
CREATE INDEX idx_policy_sqf_mappings_gaps ON policy_sqf_mappings(has_gaps) WHERE has_gaps = true;

-- ============================================================================
-- 4. SQF COMPLIANCE AUDITS
-- ============================================================================
-- Track SQF audit findings and their remediation

CREATE TABLE sqf_compliance_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Audit identification
  audit_name VARCHAR NOT NULL,
  audit_number VARCHAR UNIQUE,
  audit_type VARCHAR, -- Internal, Pre-Assessment, Certification, Surveillance, Recertification
  sqf_edition_id UUID REFERENCES sqf_editions(id),

  -- Audit dates
  audit_date DATE NOT NULL,
  audit_start_date DATE,
  audit_end_date DATE,

  -- Auditor information
  auditor_name VARCHAR,
  auditor_organization VARCHAR,
  auditor_certification_number VARCHAR,

  -- Audit scope
  audit_scope TEXT,
  areas_audited TEXT[],
  sqf_codes_audited UUID[], -- Array of sqf_code IDs

  -- Overall results
  overall_rating VARCHAR, -- Excellent, Good, Satisfactory, Non_Compliant
  overall_score DECIMAL(5,2),
  certification_status VARCHAR, -- Certified, Conditional, Not_Certified
  certification_date DATE,
  certification_expiry_date DATE,

  -- Summary
  total_findings INTEGER DEFAULT 0,
  critical_findings INTEGER DEFAULT 0,
  major_findings INTEGER DEFAULT 0,
  minor_findings INTEGER DEFAULT 0,
  observations INTEGER DEFAULT 0,

  -- Documents
  audit_report_url VARCHAR,
  certificate_url VARCHAR,

  -- Status
  status VARCHAR DEFAULT 'Scheduled', -- Scheduled, In_Progress, Completed, Cancelled

  -- Audit fields
  created_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_audit_type CHECK (audit_type IN ('Internal', 'Pre-Assessment', 'Certification', 'Surveillance', 'Recertification')),
  CONSTRAINT valid_overall_rating CHECK (overall_rating IN ('Excellent', 'Good', 'Satisfactory', 'Non_Compliant', NULL)),
  CONSTRAINT valid_certification_status CHECK (certification_status IN ('Certified', 'Conditional', 'Not_Certified', NULL)),
  CONSTRAINT valid_status CHECK (status IN ('Scheduled', 'In_Progress', 'Completed', 'Cancelled'))
);

CREATE INDEX idx_sqf_audits_date ON sqf_compliance_audits(audit_date DESC);
CREATE INDEX idx_sqf_audits_status ON sqf_compliance_audits(status);
CREATE INDEX idx_sqf_audits_certification ON sqf_compliance_audits(certification_status);

-- ============================================================================
-- 5. SQF AUDIT FINDINGS
-- ============================================================================
-- Individual findings from SQF audits

CREATE TABLE sqf_audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES sqf_compliance_audits(id) ON DELETE CASCADE,

  -- Finding identification
  finding_number VARCHAR,
  sqf_code_id UUID REFERENCES sqf_codes(id),

  -- Finding details
  finding_type VARCHAR, -- Critical, Major, Minor, Observation
  finding_title VARCHAR NOT NULL,
  finding_description TEXT NOT NULL,

  -- Non-conformance details
  requirement_not_met TEXT,
  objective_evidence TEXT, -- What the auditor observed

  -- Root cause
  root_cause TEXT,
  root_cause_category VARCHAR, -- Process, People, Equipment, Material, Method

  -- Corrective action
  corrective_action_required TEXT,
  corrective_action_taken TEXT,
  corrective_action_responsible UUID REFERENCES profiles(id),
  corrective_action_due_date DATE,
  corrective_action_completed_date DATE,

  -- Preventive action
  preventive_action TEXT,
  preventive_action_responsible UUID REFERENCES profiles(id),

  -- Verification
  verification_required BOOLEAN DEFAULT true,
  verification_method TEXT,
  verified BOOLEAN DEFAULT false,
  verified_date DATE,
  verified_by UUID REFERENCES profiles(id),
  verification_notes TEXT,

  -- Related entities
  related_policy_ids UUID[], -- Policies that need updating
  related_area VARCHAR, -- Department or area affected

  -- Status tracking
  status VARCHAR DEFAULT 'Open', -- Open, In_Progress, Pending_Verification, Closed
  closed_date DATE,
  closed_by UUID REFERENCES profiles(id),

  -- Audit fields
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_finding_type CHECK (finding_type IN ('Critical', 'Major', 'Minor', 'Observation')),
  CONSTRAINT valid_root_cause_category CHECK (root_cause_category IN ('Process', 'People', 'Equipment', 'Material', 'Method', NULL)),
  CONSTRAINT valid_finding_status CHECK (status IN ('Open', 'In_Progress', 'Pending_Verification', 'Closed'))
);

CREATE INDEX idx_sqf_findings_audit ON sqf_audit_findings(audit_id);
CREATE INDEX idx_sqf_findings_code ON sqf_audit_findings(sqf_code_id);
CREATE INDEX idx_sqf_findings_type ON sqf_audit_findings(finding_type);
CREATE INDEX idx_sqf_findings_status ON sqf_audit_findings(status);
CREATE INDEX idx_sqf_findings_due ON sqf_audit_findings(corrective_action_due_date) WHERE status != 'Closed';

-- ============================================================================
-- 6. SQF COMPLIANCE VIEW
-- ============================================================================
-- Aggregated view of compliance status by SQF code

CREATE OR REPLACE VIEW sqf_compliance_summary AS
SELECT
  sc.id as sqf_code_id,
  sc.sqf_edition_id,
  sc.code_number,
  sc.title as code_title,
  sc.category,
  sc.is_fundamental,

  -- Mapping counts
  COUNT(DISTINCT psm.id) as total_policies_mapped,
  COUNT(DISTINCT psm.id) FILTER (WHERE psm.compliance_status = 'Compliant') as compliant_policies,
  COUNT(DISTINCT psm.id) FILTER (WHERE psm.has_gaps = true) as policies_with_gaps,

  -- Gap analysis
  BOOL_OR(psm.has_gaps) as has_any_gaps,
  MAX(psm.gap_severity) as highest_gap_severity,

  -- Overall compliance
  CASE
    WHEN COUNT(DISTINCT psm.id) = 0 THEN 'Not_Addressed'
    WHEN COUNT(DISTINCT psm.id) FILTER (WHERE psm.compliance_status = 'Compliant') = COUNT(DISTINCT psm.id) THEN 'Fully_Compliant'
    WHEN COUNT(DISTINCT psm.id) FILTER (WHERE psm.compliance_status IN ('Compliant', 'Partial')) > 0 THEN 'Partially_Compliant'
    ELSE 'Non_Compliant'
  END as overall_compliance_status,

  -- Audit findings
  COUNT(DISTINCT saf.id) as total_findings,
  COUNT(DISTINCT saf.id) FILTER (WHERE saf.finding_type = 'Critical') as critical_findings,
  COUNT(DISTINCT saf.id) FILTER (WHERE saf.finding_type = 'Major') as major_findings,
  COUNT(DISTINCT saf.id) FILTER (WHERE saf.status != 'Closed') as open_findings

FROM sqf_codes sc
LEFT JOIN policy_sqf_mappings psm ON sc.id = psm.sqf_code_id
LEFT JOIN sqf_audit_findings saf ON sc.id = saf.sqf_code_id AND saf.status != 'Closed'
GROUP BY sc.id, sc.sqf_edition_id, sc.code_number, sc.title, sc.category, sc.is_fundamental;

-- ============================================================================
-- 7. FUNCTIONS
-- ============================================================================

-- Function to set an SQF edition as active (and deactivate others)
CREATE OR REPLACE FUNCTION set_active_sqf_edition(edition_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Deactivate all editions
  UPDATE sqf_editions SET is_active = false, updated_at = now();

  -- Activate the specified edition
  UPDATE sqf_editions
  SET is_active = true, status = 'Active', updated_at = now()
  WHERE id = edition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate compliance percentage for an edition
CREATE OR REPLACE FUNCTION calculate_sqf_compliance_percentage(edition_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_codes INTEGER;
  compliant_codes INTEGER;
  percentage DECIMAL(5,2);
BEGIN
  -- Get total fundamental codes in edition
  SELECT COUNT(*) INTO total_codes
  FROM sqf_codes
  WHERE sqf_edition_id = edition_id AND is_fundamental = true;

  -- Get compliant codes
  SELECT COUNT(DISTINCT sc.id) INTO compliant_codes
  FROM sqf_codes sc
  INNER JOIN policy_sqf_mappings psm ON sc.id = psm.sqf_code_id
  WHERE sc.sqf_edition_id = edition_id
    AND sc.is_fundamental = true
    AND psm.compliance_status = 'Compliant';

  -- Calculate percentage
  IF total_codes = 0 THEN
    RETURN 0;
  ELSE
    percentage := (compliant_codes::DECIMAL / total_codes::DECIMAL) * 100;
    RETURN ROUND(percentage, 2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE sqf_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sqf_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_sqf_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sqf_compliance_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sqf_audit_findings ENABLE ROW LEVEL SECURITY;

-- SQF Editions - All authenticated users can read, only managers+ can modify
CREATE POLICY "Anyone can view SQF editions"
  ON sqf_editions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage SQF editions"
  ON sqf_editions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'supervisor', 'quality_director')
    )
  );

-- SQF Codes - All authenticated users can read
CREATE POLICY "Anyone can view SQF codes"
  ON sqf_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage SQF codes"
  ON sqf_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'supervisor', 'quality_director')
    )
  );

-- Policy-SQF Mappings - All authenticated users can read, managers can modify
CREATE POLICY "Anyone can view policy-SQF mappings"
  ON policy_sqf_mappings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage mappings"
  ON policy_sqf_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'supervisor', 'quality_director')
    )
  );

-- Audits - All authenticated users can read, quality/managers can modify
CREATE POLICY "Anyone can view audits"
  ON sqf_compliance_audits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Quality team can manage audits"
  ON sqf_compliance_audits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'quality_director', 'qa_specialist')
    )
  );

-- Audit Findings - All authenticated users can read, quality team can modify
CREATE POLICY "Anyone can view findings"
  ON sqf_audit_findings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Quality team can manage findings"
  ON sqf_audit_findings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'quality_director', 'qa_specialist')
    )
  );

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sqf_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sqf_editions_updated_at
  BEFORE UPDATE ON sqf_editions
  FOR EACH ROW
  EXECUTE FUNCTION update_sqf_updated_at();

CREATE TRIGGER update_sqf_codes_updated_at
  BEFORE UPDATE ON sqf_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_sqf_updated_at();

CREATE TRIGGER update_policy_sqf_mappings_updated_at
  BEFORE UPDATE ON policy_sqf_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_sqf_updated_at();

CREATE TRIGGER update_sqf_audits_updated_at
  BEFORE UPDATE ON sqf_compliance_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_sqf_updated_at();

CREATE TRIGGER update_sqf_findings_updated_at
  BEFORE UPDATE ON sqf_audit_findings
  FOR EACH ROW
  EXECUTE FUNCTION update_sqf_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sqf_editions IS 'Stores different versions of SQF code editions';
COMMENT ON TABLE sqf_codes IS 'Individual SQF requirement codes from editions';
COMMENT ON TABLE policy_sqf_mappings IS 'Links policies to SQF codes for compliance tracking';
COMMENT ON TABLE sqf_compliance_audits IS 'SQF audit records and results';
COMMENT ON TABLE sqf_audit_findings IS 'Individual findings from SQF audits';
COMMENT ON VIEW sqf_compliance_summary IS 'Aggregated compliance status by SQF code';
