-- =============================================
-- HACCP MANAGEMENT SYSTEM
-- Complete HACCP plan management with CCP verification and manufacturing integration
-- =============================================

-- =============================================
-- 1. HACCP PLANS (extends policies table)
-- =============================================

CREATE TABLE IF NOT EXISTS public.haccp_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE UNIQUE,

  -- Plan identification
  haccp_plan_number VARCHAR(100) UNIQUE NOT NULL,  -- Auto-generated or custom
  product_scope TEXT[],  -- Products covered by this plan
  process_scope TEXT[],  -- Processes covered

  -- Plan metadata
  haccp_team_leader UUID REFERENCES public.profiles(id),
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
  process_flow_diagram_url VARCHAR(500),  -- Link to flowchart image/PDF

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_haccp_plans_policy ON public.haccp_plans(policy_id);
CREATE INDEX IF NOT EXISTS idx_haccp_plans_team_leader ON public.haccp_plans(haccp_team_leader);

-- =============================================
-- 2. HACCP PROCESS STEPS
-- =============================================

CREATE TABLE IF NOT EXISTS public.haccp_process_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES public.haccp_plans(id) ON DELETE CASCADE,

  step_number INTEGER NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  step_description TEXT,
  step_type VARCHAR(100),  -- Receiving, Storage, Processing, Packaging, Shipping, etc.

  -- Visual positioning (for flowchart display)
  position_x INTEGER,
  position_y INTEGER,

  -- Connections (for flow diagram)
  previous_step_ids UUID[],  -- Array of step IDs (supports branching)
  next_step_ids UUID[],

  -- Associated data
  equipment_used TEXT[],
  typical_duration_minutes INTEGER,
  temperature_range VARCHAR(50),  -- e.g., "32-40°F"

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(haccp_plan_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_process_steps_plan ON public.haccp_process_steps(haccp_plan_id);
CREATE INDEX IF NOT EXISTS idx_process_steps_number ON public.haccp_process_steps(step_number);

-- =============================================
-- 3. HAZARD ANALYSIS
-- =============================================

CREATE TABLE IF NOT EXISTS public.haccp_hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES public.haccp_plans(id) ON DELETE CASCADE,
  process_step_id UUID REFERENCES public.haccp_process_steps(id) ON DELETE CASCADE,

  -- Hazard identification
  hazard_type VARCHAR(50) NOT NULL CHECK (hazard_type IN ('Biological', 'Chemical', 'Physical', 'Allergen', 'Radiological')),
  hazard_description TEXT NOT NULL,
  hazard_source TEXT,  -- Where does this hazard come from?

  -- Risk assessment
  severity VARCHAR(50) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  likelihood VARCHAR(50) CHECK (likelihood IN ('Rare', 'Unlikely', 'Possible', 'Likely', 'Almost_Certain')),
  risk_level VARCHAR(50),  -- Calculated: Low, Medium, High, Extreme

  -- Significance
  is_significant BOOLEAN DEFAULT false,  -- Is this a significant hazard requiring control?
  justification TEXT,  -- Why is/isn't this significant?

  -- Control measures
  control_measures TEXT[],  -- Preventative measures

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hazards_plan ON public.haccp_hazards(haccp_plan_id);
CREATE INDEX IF NOT EXISTS idx_hazards_step ON public.haccp_hazards(process_step_id);
CREATE INDEX IF NOT EXISTS idx_hazards_type ON public.haccp_hazards(hazard_type);
CREATE INDEX IF NOT EXISTS idx_hazards_significant ON public.haccp_hazards(is_significant) WHERE is_significant = true;

-- =============================================
-- 4. CRITICAL CONTROL POINTS (CCPs)
-- =============================================

CREATE TABLE IF NOT EXISTS public.haccp_critical_control_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES public.haccp_plans(id) ON DELETE CASCADE,
  process_step_id UUID REFERENCES public.haccp_process_steps(id),
  hazard_id UUID REFERENCES public.haccp_hazards(id),

  -- CCP identification
  ccp_number VARCHAR(50) NOT NULL,  -- e.g., "CCP-1", "CCP-2A"
  ccp_type VARCHAR(50) DEFAULT 'CCP' CHECK (ccp_type IN ('CCP', 'CP', 'PCP')),  -- CCP, CP (Control Point), PCP (Preventative Control Point)
  ccp_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Critical limits
  critical_limit_parameter VARCHAR(100),  -- Temperature, Time, pH, Water Activity, etc.
  critical_limit_value VARCHAR(255),  -- e.g., "165°F minimum", "pH < 4.6"
  critical_limit_min DECIMAL(10,2),  -- For numerical limits
  critical_limit_max DECIMAL(10,2),
  unit_of_measure VARCHAR(50),  -- °F, minutes, pH, aw

  -- Monitoring
  monitoring_procedure TEXT NOT NULL,
  monitoring_frequency VARCHAR(100),  -- Per batch, Every hour, Continuous, etc.
  monitoring_method VARCHAR(255),  -- Thermometer, pH meter, Visual, etc.

  -- Responsible party
  responsible_position VARCHAR(100),  -- Job position, not individual
  responsible_employee_id UUID REFERENCES public.profiles(id),  -- Can assign specific person

  -- Corrective actions
  corrective_action_procedure TEXT NOT NULL,
  corrective_action_examples TEXT[],

  -- Verification
  verification_procedure TEXT,
  verification_frequency VARCHAR(100),
  verification_responsible VARCHAR(100),

  -- Record keeping
  record_form_id UUID,  -- Link to form/template policy
  record_retention_months INTEGER DEFAULT 24,

  -- Manufacturing integration
  requires_manufacturing_verification BOOLEAN DEFAULT true,
  linked_production_step VARCHAR(100),  -- Link to manufacturing workflow step

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(haccp_plan_id, ccp_number)
);

CREATE INDEX IF NOT EXISTS idx_ccps_plan ON public.haccp_critical_control_points(haccp_plan_id);
CREATE INDEX IF NOT EXISTS idx_ccps_step ON public.haccp_critical_control_points(process_step_id);
CREATE INDEX IF NOT EXISTS idx_ccps_hazard ON public.haccp_critical_control_points(hazard_id);
CREATE INDEX IF NOT EXISTS idx_ccps_number ON public.haccp_critical_control_points(ccp_number);
CREATE INDEX IF NOT EXISTS idx_ccps_active ON public.haccp_critical_control_points(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ccps_manufacturing ON public.haccp_critical_control_points(requires_manufacturing_verification) WHERE requires_manufacturing_verification = true;

-- =============================================
-- 5. CCP VERIFICATION RECORDS (Production)
-- =============================================

CREATE TABLE IF NOT EXISTS public.haccp_ccp_verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ccp_id UUID REFERENCES public.haccp_critical_control_points(id) ON DELETE CASCADE,
  haccp_plan_id UUID REFERENCES public.haccp_plans(id),

  -- Link to production (if exists)
  production_lot_id UUID,  -- Link to manufacturing production_lots table
  production_run_id UUID,
  work_order_id UUID,

  -- Verification details
  verified_at TIMESTAMP DEFAULT now(),
  verified_by UUID REFERENCES public.profiles(id),

  -- Measurement
  parameter_measured VARCHAR(100),
  measured_value DECIMAL(10,2),
  unit_of_measure VARCHAR(50),

  -- Status
  is_within_limits BOOLEAN,
  deviation_detected BOOLEAN DEFAULT false,

  -- Corrective action (if needed)
  corrective_action_taken TEXT,
  corrective_action_by UUID REFERENCES public.profiles(id),
  corrective_action_at TIMESTAMP,

  -- Documentation
  notes TEXT,
  photo_urls TEXT[],

  -- Location data
  location_id UUID,
  gps_coordinates VARCHAR(100),

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_ccp ON public.haccp_ccp_verification_records(ccp_id);
CREATE INDEX IF NOT EXISTS idx_verification_plan ON public.haccp_ccp_verification_records(haccp_plan_id);
CREATE INDEX IF NOT EXISTS idx_verification_lot ON public.haccp_ccp_verification_records(production_lot_id);
CREATE INDEX IF NOT EXISTS idx_verification_date ON public.haccp_ccp_verification_records(verified_at);
CREATE INDEX IF NOT EXISTS idx_verification_deviations ON public.haccp_ccp_verification_records(deviation_detected) WHERE deviation_detected = true;

-- =============================================
-- 6. CCP DEVIATIONS & NON-CONFORMANCES
-- =============================================

CREATE TABLE IF NOT EXISTS public.haccp_ccp_deviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ccp_id UUID REFERENCES public.haccp_critical_control_points(id),
  verification_record_id UUID REFERENCES public.haccp_ccp_verification_records(id),
  haccp_plan_id UUID REFERENCES public.haccp_plans(id),

  -- Deviation details
  deviation_date TIMESTAMP NOT NULL,
  detected_by UUID REFERENCES public.profiles(id),

  -- What happened
  deviation_description TEXT NOT NULL,
  affected_product_quantity DECIMAL(10,2),
  affected_product_unit VARCHAR(50),
  affected_lot_numbers TEXT[],

  -- Root cause
  root_cause TEXT,
  root_cause_category VARCHAR(100),  -- Equipment failure, Human error, Raw material, etc.

  -- Corrective action
  immediate_action TEXT NOT NULL,
  corrective_action TEXT NOT NULL,
  preventive_action TEXT,

  action_taken_by UUID REFERENCES public.profiles(id),
  action_completed_at TIMESTAMP,

  -- Product disposition
  product_disposition VARCHAR(50) CHECK (product_disposition IN ('Released', 'Rework', 'Reject', 'Hold', NULL)),
  disposition_justification TEXT,
  disposition_approved_by UUID REFERENCES public.profiles(id),

  -- Follow-up
  requires_haccp_plan_revision BOOLEAN DEFAULT false,
  requires_training BOOLEAN DEFAULT false,

  status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'Under_Investigation', 'Resolved', 'Closed')),
  closed_at TIMESTAMP,
  closed_by UUID REFERENCES public.profiles(id),

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deviations_ccp ON public.haccp_ccp_deviations(ccp_id);
CREATE INDEX IF NOT EXISTS idx_deviations_verification ON public.haccp_ccp_deviations(verification_record_id);
CREATE INDEX IF NOT EXISTS idx_deviations_plan ON public.haccp_ccp_deviations(haccp_plan_id);
CREATE INDEX IF NOT EXISTS idx_deviations_status ON public.haccp_ccp_deviations(status);
CREATE INDEX IF NOT EXISTS idx_deviations_open ON public.haccp_ccp_deviations(status) WHERE status IN ('Open', 'Under_Investigation');
CREATE INDEX IF NOT EXISTS idx_deviations_date ON public.haccp_ccp_deviations(deviation_date);

-- =============================================
-- 7. HACCP PLAN VALIDATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS public.haccp_plan_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haccp_plan_id UUID REFERENCES public.haccp_plans(id) ON DELETE CASCADE,

  validation_date DATE NOT NULL,
  validation_type VARCHAR(50) CHECK (validation_type IN ('Initial', 'Annual', 'Revalidation', 'Change-Triggered')),

  -- Validation team
  lead_validator UUID REFERENCES public.profiles(id),
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
  validation_status VARCHAR(50) CHECK (validation_status IN ('Passed', 'Failed', 'Passed_With_Observations')),
  observations TEXT[],

  -- Required actions
  action_items TEXT[],
  action_items_completed BOOLEAN DEFAULT false,

  -- Documentation
  validation_report_url VARCHAR(500),

  next_validation_due DATE,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_validations_plan ON public.haccp_plan_validations(haccp_plan_id);
CREATE INDEX IF NOT EXISTS idx_validations_type ON public.haccp_plan_validations(validation_type);
CREATE INDEX IF NOT EXISTS idx_validations_date ON public.haccp_plan_validations(validation_date);

-- =============================================
-- 8. RLS POLICIES
-- =============================================

-- Enable Row Level Security
ALTER TABLE public.haccp_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_process_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_critical_control_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_ccp_verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_ccp_deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_plan_validations ENABLE ROW LEVEL SECURITY;

-- Anyone can view HACCP plans and CCPs
CREATE POLICY "Anyone can view HACCP plans"
  ON public.haccp_plans FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage HACCP plans"
  ON public.haccp_plans FOR ALL
  USING (is_policy_admin_or_manager());

CREATE POLICY "Anyone can view process steps"
  ON public.haccp_process_steps FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage process steps"
  ON public.haccp_process_steps FOR ALL
  USING (is_policy_admin_or_manager());

CREATE POLICY "Anyone can view hazards"
  ON public.haccp_hazards FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage hazards"
  ON public.haccp_hazards FOR ALL
  USING (is_policy_admin_or_manager());

CREATE POLICY "Anyone can view CCPs"
  ON public.haccp_critical_control_points FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage CCPs"
  ON public.haccp_critical_control_points FOR ALL
  USING (is_policy_admin_or_manager());

-- Verification records: Production staff can create, everyone can view
CREATE POLICY "Anyone can view verification records"
  ON public.haccp_ccp_verification_records FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create verifications"
  ON public.haccp_ccp_verification_records FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own verifications"
  ON public.haccp_ccp_verification_records FOR UPDATE
  USING (verified_by = auth.uid() OR is_policy_admin_or_manager());

-- Deviations: Production staff can create, managers manage
CREATE POLICY "Anyone can view deviations"
  ON public.haccp_ccp_deviations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create deviations"
  ON public.haccp_ccp_deviations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage deviations"
  ON public.haccp_ccp_deviations FOR UPDATE
  USING (is_policy_admin_or_manager());

-- Validations: Managers only
CREATE POLICY "Managers can view validations"
  ON public.haccp_plan_validations FOR SELECT
  USING (is_policy_admin_or_manager());

CREATE POLICY "Managers can manage validations"
  ON public.haccp_plan_validations FOR ALL
  USING (is_policy_admin_or_manager());

-- =============================================
-- 9. HELPER VIEWS
-- =============================================

-- View: Active CCPs with verification status
CREATE OR REPLACE VIEW public.active_ccps_view AS
SELECT
  ccp.*,
  hp.haccp_plan_number,
  hp.product_scope,
  step.step_name,
  step.step_number,
  hazard.hazard_type,
  hazard.hazard_description,
  (SELECT COUNT(*) FROM public.haccp_ccp_verification_records vr WHERE vr.ccp_id = ccp.id) as total_verifications,
  (SELECT COUNT(*) FROM public.haccp_ccp_verification_records vr WHERE vr.ccp_id = ccp.id AND vr.deviation_detected = true) as deviation_count,
  (SELECT MAX(verified_at) FROM public.haccp_ccp_verification_records vr WHERE vr.ccp_id = ccp.id) as last_verification_date
FROM public.haccp_critical_control_points ccp
JOIN public.haccp_plans hp ON ccp.haccp_plan_id = hp.id
LEFT JOIN public.haccp_process_steps step ON ccp.process_step_id = step.id
LEFT JOIN public.haccp_hazards hazard ON ccp.hazard_id = hazard.id
WHERE ccp.is_active = true;

-- View: Open HACCP deviations
CREATE OR REPLACE VIEW public.open_haccp_deviations_view AS
SELECT
  d.*,
  ccp.ccp_number,
  ccp.ccp_name,
  hp.haccp_plan_number,
  detector.first_name || ' ' || detector.last_name as detected_by_name,
  action_taker.first_name || ' ' || action_taker.last_name as action_taken_by_name
FROM public.haccp_ccp_deviations d
JOIN public.haccp_critical_control_points ccp ON d.ccp_id = ccp.id
JOIN public.haccp_plans hp ON d.haccp_plan_id = hp.id
LEFT JOIN public.profiles detector ON d.detected_by = detector.id
LEFT JOIN public.profiles action_taker ON d.action_taken_by = action_taker.id
WHERE d.status IN ('Open', 'Under_Investigation');

-- View: Today's CCP verifications
CREATE OR REPLACE VIEW public.todays_ccp_verifications AS
SELECT
  v.*,
  ccp.ccp_number,
  ccp.ccp_name,
  ccp.critical_limit_value,
  hp.haccp_plan_number,
  verifier.first_name || ' ' || verifier.last_name as verified_by_name
FROM public.haccp_ccp_verification_records v
JOIN public.haccp_critical_control_points ccp ON v.ccp_id = ccp.id
JOIN public.haccp_plans hp ON v.haccp_plan_id = hp.id
LEFT JOIN public.profiles verifier ON v.verified_by = verifier.id
WHERE DATE(v.verified_at) = CURRENT_DATE;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
