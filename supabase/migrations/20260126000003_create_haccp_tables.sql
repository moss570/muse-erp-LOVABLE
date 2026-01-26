-- ============================================================================
-- HACCP PLAN MANAGEMENT SYSTEM
-- ============================================================================
-- This migration creates tables for managing HACCP (Hazard Analysis and
-- Critical Control Points) plans with integration to policies and manufacturing.
-- ============================================================================

-- ============================================================================
-- 1. HACCP PLANS (extends policies table)
-- ============================================================================

CREATE TABLE haccp_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE UNIQUE,

  -- Plan identification
  haccp_plan_number VARCHAR UNIQUE NOT NULL,
  product_scope TEXT[],  -- Products covered by this plan
  process_scope TEXT[],  -- Processes covered

  -- Plan metadata
  haccp_team_leader UUID REFERENCES profiles(id),
  team_members UUID[],  -- Array of profile IDs

  -- Regulatory info
  regulatory_basis TEXT[],  -- ['FDA FSMA', 'SQF', 'GFSI']
  allergens_present TEXT[],  -- ['milk', 'soy', 'wheat', etc.]

  -- Verification schedule
  verification_frequency_days INTEGER DEFAULT 30,
  last_verification_date DATE,
  next_verification_due DATE,

  -- Process flow
  has_process_flow BOOLEAN DEFAULT true,
  process_flow_diagram_url VARCHAR,  -- Link to flowchart image/PDF

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_haccp_plans_policy ON haccp_plans(policy_id);
CREATE INDEX idx_haccp_plans_verification_due ON haccp_plans(next_verification_due);

-- ============================================================================
-- 2. HACCP PROCESS STEPS
-- ============================================================================

CREATE TABLE haccp_process_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES haccp_plans(id) ON DELETE CASCADE,

  step_number INTEGER NOT NULL,
  step_name VARCHAR NOT NULL,
  step_description TEXT,
  step_type VARCHAR,  -- Receiving, Storage, Processing, Packaging, Shipping, etc.

  -- Visual positioning (for flowchart display)
  position_x INTEGER,
  position_y INTEGER,

  -- Connections
  previous_step_ids UUID[],  -- Array of step IDs (supports branching)
  next_step_ids UUID[],

  -- Associated data
  equipment_used TEXT[],
  typical_duration_minutes INTEGER,
  temperature_range VARCHAR,  -- e.g., "32-40°F"

  created_at TIMESTAMP DEFAULT now(),

  UNIQUE(haccp_plan_id, step_number)
);

CREATE INDEX idx_haccp_steps_plan ON haccp_process_steps(haccp_plan_id);

-- ============================================================================
-- 3. HACCP HAZARDS
-- ============================================================================

CREATE TABLE haccp_hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES haccp_plans(id) ON DELETE CASCADE,
  process_step_id UUID REFERENCES haccp_process_steps(id) ON DELETE CASCADE,

  -- Hazard identification
  hazard_type VARCHAR NOT NULL,  -- Biological, Chemical, Physical, Allergen, Radiological
  hazard_description TEXT NOT NULL,
  hazard_source TEXT,  -- Where does this hazard come from?

  -- Risk assessment
  severity VARCHAR,  -- Low, Medium, High, Critical
  likelihood VARCHAR,  -- Rare, Unlikely, Possible, Likely, Almost_Certain
  risk_level VARCHAR,  -- Calculated: Low, Medium, High, Extreme

  -- Significance
  is_significant BOOLEAN DEFAULT false,  -- Is this a significant hazard requiring control?
  justification TEXT,  -- Why is/isn't this significant?

  -- Control measures
  control_measures TEXT[],  -- Preventative measures

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_hazard_type CHECK (hazard_type IN ('Biological', 'Chemical', 'Physical', 'Allergen', 'Radiological')),
  CONSTRAINT valid_severity CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  CONSTRAINT valid_likelihood CHECK (likelihood IN ('Rare', 'Unlikely', 'Possible', 'Likely', 'Almost_Certain'))
);

CREATE INDEX idx_haccp_hazards_plan ON haccp_hazards(haccp_plan_id);
CREATE INDEX idx_haccp_hazards_step ON haccp_hazards(process_step_id);
CREATE INDEX idx_haccp_hazards_significant ON haccp_hazards(is_significant) WHERE is_significant = true;

-- ============================================================================
-- 4. HACCP CRITICAL CONTROL POINTS (CCPs)
-- ============================================================================

CREATE TABLE haccp_critical_control_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES haccp_plans(id) ON DELETE CASCADE,
  process_step_id UUID REFERENCES haccp_process_steps(id),
  hazard_id UUID REFERENCES haccp_hazards(id),

  -- CCP identification
  ccp_number VARCHAR NOT NULL,  -- e.g., "CCP-1", "CCP-2A"
  ccp_type VARCHAR DEFAULT 'CCP',  -- CCP, CP (Control Point), PCP (Preventative Control Point)
  ccp_name VARCHAR NOT NULL,
  description TEXT,

  -- Critical limits
  critical_limit_parameter VARCHAR,  -- Temperature, Time, pH, Water Activity, etc.
  critical_limit_value VARCHAR,  -- e.g., "165°F minimum", "pH < 4.6"
  critical_limit_min DECIMAL(10,2),  -- For numerical limits
  critical_limit_max DECIMAL(10,2),
  unit_of_measure VARCHAR,  -- °F, minutes, pH, aw

  -- Monitoring
  monitoring_procedure TEXT NOT NULL,
  monitoring_frequency VARCHAR,  -- Per batch, Every hour, Continuous, etc.
  monitoring_method VARCHAR,  -- Thermometer, pH meter, Visual, etc.

  -- Responsible party
  responsible_position VARCHAR,  -- Job position, not individual
  responsible_employee_id UUID REFERENCES profiles(id),  -- Can assign specific person

  -- Corrective actions
  corrective_action_procedure TEXT NOT NULL,
  corrective_action_examples TEXT[],

  -- Verification
  verification_procedure TEXT,
  verification_frequency VARCHAR,
  verification_responsible VARCHAR,

  -- Record keeping
  record_form_id UUID,  -- Link to form/template
  record_retention_months INTEGER DEFAULT 24,

  -- Manufacturing integration
  requires_manufacturing_verification BOOLEAN DEFAULT true,
  linked_production_step VARCHAR,  -- Link to manufacturing workflow step

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_ccp_type CHECK (ccp_type IN ('CCP', 'CP', 'PCP')),
  UNIQUE(haccp_plan_id, ccp_number)
);

CREATE INDEX idx_haccp_ccps_plan ON haccp_critical_control_points(haccp_plan_id);
CREATE INDEX idx_haccp_ccps_step ON haccp_critical_control_points(process_step_id);
CREATE INDEX idx_haccp_ccps_active ON haccp_critical_control_points(is_active) WHERE is_active = true;

-- ============================================================================
-- 5. CCP VERIFICATION RECORDS (generated during production)
-- ============================================================================

CREATE TABLE haccp_ccp_verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ccp_id UUID REFERENCES haccp_critical_control_points(id) ON DELETE CASCADE,
  haccp_plan_id UUID REFERENCES haccp_plans(id),

  -- Link to production
  production_lot_id UUID,  -- Link to manufacturing production_lots table
  production_run_id UUID,
  work_order_id UUID,

  -- Verification details
  verified_at TIMESTAMP DEFAULT now(),
  verified_by UUID REFERENCES profiles(id),

  -- Measurement
  parameter_measured VARCHAR,
  measured_value DECIMAL(10,2),
  unit_of_measure VARCHAR,

  -- Status
  is_within_limits BOOLEAN,
  deviation_detected BOOLEAN DEFAULT false,

  -- Corrective action (if needed)
  corrective_action_taken TEXT,
  corrective_action_by UUID REFERENCES profiles(id),
  corrective_action_at TIMESTAMP,

  -- Documentation
  notes TEXT,
  photo_urls TEXT[],

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_ccp_verifications_ccp ON haccp_ccp_verification_records(ccp_id);
CREATE INDEX idx_ccp_verifications_plan ON haccp_ccp_verification_records(haccp_plan_id);
CREATE INDEX idx_ccp_verifications_lot ON haccp_ccp_verification_records(production_lot_id);
CREATE INDEX idx_ccp_verifications_date ON haccp_ccp_verification_records(verified_at DESC);
CREATE INDEX idx_ccp_verifications_deviations ON haccp_ccp_verification_records(deviation_detected) WHERE deviation_detected = true;

-- ============================================================================
-- 6. CCP DEVIATIONS AND NON-CONFORMANCES
-- ============================================================================

CREATE TABLE haccp_ccp_deviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ccp_id UUID REFERENCES haccp_critical_control_points(id),
  verification_record_id UUID REFERENCES haccp_ccp_verification_records(id),
  haccp_plan_id UUID REFERENCES haccp_plans(id),

  -- Deviation details
  deviation_date TIMESTAMP NOT NULL,
  detected_by UUID REFERENCES profiles(id),

  -- What happened
  deviation_description TEXT NOT NULL,
  affected_product_quantity DECIMAL(10,2),
  affected_product_unit VARCHAR,
  affected_lot_numbers TEXT[],

  -- Root cause
  root_cause TEXT,
  root_cause_category VARCHAR,  -- Equipment failure, Human error, Raw material, etc.

  -- Corrective action
  immediate_action TEXT NOT NULL,
  corrective_action TEXT NOT NULL,
  preventive_action TEXT,

  action_taken_by UUID REFERENCES profiles(id),
  action_completed_at TIMESTAMP,

  -- Product disposition
  product_disposition VARCHAR,  -- Released, Rework, Reject, Hold
  disposition_justification TEXT,
  disposition_approved_by UUID REFERENCES profiles(id),

  -- Follow-up
  requires_haccp_plan_revision BOOLEAN DEFAULT false,
  requires_training BOOLEAN DEFAULT false,

  status VARCHAR DEFAULT 'Open',  -- Open, Under_Investigation, Resolved, Closed
  closed_at TIMESTAMP,
  closed_by UUID REFERENCES profiles(id),

  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_disposition CHECK (product_disposition IN ('Released', 'Rework', 'Reject', 'Hold', NULL)),
  CONSTRAINT valid_deviation_status CHECK (status IN ('Open', 'Under_Investigation', 'Resolved', 'Closed'))
);

CREATE INDEX idx_ccp_deviations_ccp ON haccp_ccp_deviations(ccp_id);
CREATE INDEX idx_ccp_deviations_plan ON haccp_ccp_deviations(haccp_plan_id);
CREATE INDEX idx_ccp_deviations_status ON haccp_ccp_deviations(status);
CREATE INDEX idx_ccp_deviations_date ON haccp_ccp_deviations(deviation_date DESC);
CREATE INDEX idx_ccp_deviations_open ON haccp_ccp_deviations(status) WHERE status != 'Closed';

-- ============================================================================
-- 7. HACCP PLAN VALIDATIONS
-- ============================================================================

CREATE TABLE haccp_plan_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES haccp_plans(id) ON DELETE CASCADE,

  validation_date DATE NOT NULL,
  validation_type VARCHAR,  -- Initial, Annual, Revalidation, Change-Triggered

  -- Validation team
  lead_validator UUID REFERENCES profiles(id),
  validation_team UUID[],

  -- Validation scope
  scope_description TEXT,
  changes_since_last_validation TEXT,

  -- Findings
  findings TEXT,
  ccps_validated BOOLEAN DEFAULT true,
  critical_limits_validated BOOLEAN DEFAULT true,
  monitoring_procedures_validated BOOLEAN DEFAULT true,
  corrective_actions_validated BOOLEAN DEFAULT true,
  verification_procedures_validated BOOLEAN DEFAULT true,

  -- Overall result
  validation_status VARCHAR,  -- Passed, Failed, Passed_With_Observations
  observations TEXT[],

  -- Required actions
  action_items TEXT[],
  action_items_completed BOOLEAN DEFAULT false,

  -- Documentation
  validation_report_url VARCHAR,

  next_validation_due DATE,

  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_validation_type CHECK (validation_type IN ('Initial', 'Annual', 'Revalidation', 'Change-Triggered')),
  CONSTRAINT valid_validation_status CHECK (validation_status IN ('Passed', 'Failed', 'Passed_With_Observations'))
);

CREATE INDEX idx_haccp_validations_plan ON haccp_plan_validations(haccp_plan_id);
CREATE INDEX idx_haccp_validations_date ON haccp_plan_validations(validation_date DESC);

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE haccp_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_process_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_critical_control_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_ccp_verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_ccp_deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_plan_validations ENABLE ROW LEVEL SECURITY;

-- HACCP Plans - All authenticated users can read, quality/managers can modify
CREATE POLICY "Anyone can view HACCP plans"
  ON haccp_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Quality team can manage HACCP plans"
  ON haccp_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'quality_director', 'qa_specialist')
    )
  );

-- Process Steps - All authenticated users can read, quality team can modify
CREATE POLICY "Anyone can view process steps"
  ON haccp_process_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Quality team can manage process steps"
  ON haccp_process_steps FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'quality_director', 'qa_specialist')
    )
  );

-- Hazards - All authenticated users can read, quality team can modify
CREATE POLICY "Anyone can view hazards"
  ON haccp_hazards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Quality team can manage hazards"
  ON haccp_hazards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'quality_director', 'qa_specialist')
    )
  );

-- CCPs - All authenticated users can read, quality team can modify
CREATE POLICY "Anyone can view CCPs"
  ON haccp_critical_control_points FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Quality team can manage CCPs"
  ON haccp_critical_control_points FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'quality_director', 'qa_specialist')
    )
  );

-- CCP Verifications - All production users can create, everyone can read
CREATE POLICY "Anyone can view CCP verifications"
  ON haccp_ccp_verification_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Production users can create verifications"
  ON haccp_ccp_verification_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'production_worker', 'quality_director', 'qa_specialist')
    )
  );

-- Deviations - All authenticated users can read, quality/production can manage
CREATE POLICY "Anyone can view deviations"
  ON haccp_ccp_deviations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Quality and production can manage deviations"
  ON haccp_ccp_deviations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'quality_director', 'qa_specialist', 'production_worker')
    )
  );

-- Validations - All authenticated users can read, quality team can modify
CREATE POLICY "Anyone can view validations"
  ON haccp_plan_validations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Quality team can manage validations"
  ON haccp_plan_validations FOR ALL
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
CREATE OR REPLACE FUNCTION update_haccp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_haccp_plans_updated_at
  BEFORE UPDATE ON haccp_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_haccp_updated_at();

CREATE TRIGGER update_haccp_hazards_updated_at
  BEFORE UPDATE ON haccp_hazards
  FOR EACH ROW
  EXECUTE FUNCTION update_haccp_updated_at();

CREATE TRIGGER update_haccp_ccps_updated_at
  BEFORE UPDATE ON haccp_critical_control_points
  FOR EACH ROW
  EXECUTE FUNCTION update_haccp_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE haccp_plans IS 'HACCP plans extending policies for food safety management';
COMMENT ON TABLE haccp_process_steps IS 'Process flow steps in HACCP plans';
COMMENT ON TABLE haccp_hazards IS 'Identified hazards with risk assessment';
COMMENT ON TABLE haccp_critical_control_points IS 'Critical control points (CCPs) for hazard control';
COMMENT ON TABLE haccp_ccp_verification_records IS 'Real-time CCP verification records from production';
COMMENT ON TABLE haccp_ccp_deviations IS 'CCP deviations and corrective actions';
COMMENT ON TABLE haccp_plan_validations IS 'HACCP plan validation records';
