-- ============================================================================
-- TRAINING REGISTER SYSTEM
-- ============================================================================
-- This migration creates tables for managing policy training requirements
-- and employee training records integrated with HR systems.
-- ============================================================================

-- ============================================================================
-- 1. POLICY TRAINING REQUIREMENTS
-- ============================================================================

CREATE TABLE policy_training_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE UNIQUE,

  -- Training details
  training_required BOOLEAN DEFAULT false,
  training_name VARCHAR,
  training_description TEXT,

  -- Who needs this training
  required_for_job_positions VARCHAR[],  -- Array of job position names
  required_for_departments VARCHAR[],
  required_for_all_employees BOOLEAN DEFAULT false,

  -- Training specifications
  training_type VARCHAR,  -- Initial, Refresher, Annual, Change-Triggered
  training_method VARCHAR[],  -- Classroom, Online, On-the-job, Video, etc.
  training_duration_minutes INTEGER,

  -- Frequency
  initial_training_required BOOLEAN DEFAULT true,
  refresher_frequency_months INTEGER,  -- null = one-time only

  -- Assessment
  requires_quiz BOOLEAN DEFAULT false,
  minimum_passing_score INTEGER,  -- Percentage
  quiz_questions JSONB,  -- Array of questions with answers

  -- Trainer requirements
  must_be_trained_by VARCHAR,  -- Job position of trainer
  can_be_self_administered BOOLEAN DEFAULT false,

  -- Resources
  training_materials_urls TEXT[],
  training_video_url VARCHAR,
  training_presentation_url VARCHAR,

  -- Tracking
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_training_type CHECK (training_type IN ('Initial', 'Refresher', 'Annual', 'Change-Triggered'))
);

CREATE INDEX idx_training_requirements_policy ON policy_training_requirements(policy_id);
CREATE INDEX idx_training_requirements_active ON policy_training_requirements(is_active) WHERE is_active = true;

-- ============================================================================
-- 2. EMPLOYEE POLICY TRAINING
-- ============================================================================

CREATE TABLE employee_policy_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  training_requirement_id UUID REFERENCES policy_training_requirements(id),

  -- Training session details
  training_date DATE NOT NULL,
  training_type VARCHAR,  -- Initial, Refresher

  -- Delivery
  training_method VARCHAR,  -- Classroom, Online, etc.
  trainer_id UUID REFERENCES profiles(id),
  training_duration_minutes INTEGER,

  -- Assessment
  quiz_taken BOOLEAN DEFAULT false,
  quiz_score DECIMAL(5,2),  -- Percentage
  quiz_passed BOOLEAN,
  quiz_attempts INTEGER DEFAULT 0,
  quiz_responses JSONB,  -- Store answers for record

  -- Completion
  completed BOOLEAN DEFAULT false,
  completion_date DATE,

  -- Certificate/acknowledgement
  certificate_issued BOOLEAN DEFAULT false,
  certificate_url VARCHAR,
  acknowledgement_signature VARCHAR,  -- Digital signature or typed name
  acknowledgement_timestamp TIMESTAMP,

  -- Expiration (for refresher training)
  expires_at DATE,
  is_current BOOLEAN DEFAULT true,  -- False when expired or superseded

  -- Notes
  notes TEXT,
  training_location VARCHAR,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_employee_training_type CHECK (training_type IN ('Initial', 'Refresher', 'Annual', 'Change-Triggered'))
);

CREATE INDEX idx_employee_training_employee ON employee_policy_training(employee_id);
CREATE INDEX idx_employee_training_policy ON employee_policy_training(policy_id);
CREATE INDEX idx_employee_training_current ON employee_policy_training(is_current) WHERE is_current = true;
CREATE INDEX idx_employee_training_expires ON employee_policy_training(expires_at);

-- ============================================================================
-- 3. TRAINING COMPLIANCE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW employee_training_compliance AS
SELECT
  e.id as employee_id,
  e.full_name,
  p.id as policy_id,
  p.policy_number,
  p.title as policy_title,
  ptr.training_name,
  ptr.refresher_frequency_months,
  ept.training_date,
  ept.expires_at,
  ept.is_current,
  CASE
    WHEN ept.id IS NULL THEN 'Not_Trained'
    WHEN ept.expires_at < CURRENT_DATE THEN 'Expired'
    WHEN ept.expires_at < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring_Soon'
    WHEN ept.is_current = true THEN 'Current'
    ELSE 'Unknown'
  END as compliance_status
FROM profiles e
LEFT JOIN policy_training_requirements ptr ON
  (e.role = ANY(ptr.required_for_job_positions) OR ptr.required_for_all_employees = true)
LEFT JOIN policies p ON ptr.policy_id = p.id
LEFT JOIN employee_policy_training ept ON
  ept.employee_id = e.id AND
  ept.policy_id = p.id AND
  ept.is_current = true
WHERE ptr.is_active = true;

-- ============================================================================
-- 4. TRAINING REMINDERS
-- ============================================================================

CREATE TABLE training_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id),
  training_requirement_id UUID REFERENCES policy_training_requirements(id),

  reminder_type VARCHAR,  -- Initial_Training, Refresher_Due, Expiring_Soon, Overdue

  due_date DATE,
  reminder_sent_at TIMESTAMP,

  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP,

  completed BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT valid_reminder_type CHECK (reminder_type IN ('Initial_Training', 'Refresher_Due', 'Expiring_Soon', 'Overdue'))
);

CREATE INDEX idx_training_reminders_employee ON training_reminders(employee_id);
CREATE INDEX idx_training_reminders_due ON training_reminders(due_date);
CREATE INDEX idx_training_reminders_pending ON training_reminders(completed) WHERE completed = false;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE policy_training_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_policy_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_reminders ENABLE ROW LEVEL SECURITY;

-- Training Requirements - All authenticated users can read, managers can modify
CREATE POLICY "Anyone can view training requirements"
  ON policy_training_requirements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage training requirements"
  ON policy_training_requirements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'supervisor', 'hr')
    )
  );

-- Employee Training - Employees see their own, managers/HR see all
CREATE POLICY "Employees can view own training"
  ON employee_policy_training FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'supervisor', 'hr')
    )
  );

CREATE POLICY "Employees can record own training"
  ON employee_policy_training FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Managers can manage all training records"
  ON employee_policy_training FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'supervisor', 'hr')
    )
  );

-- Training Reminders - Employees see their own, managers see all
CREATE POLICY "Employees can view own reminders"
  ON training_reminders FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'supervisor', 'hr')
    )
  );

CREATE POLICY "System can create reminders"
  ON training_reminders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_training_requirements_updated_at
  BEFORE UPDATE ON policy_training_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_training_updated_at();

CREATE TRIGGER update_employee_training_updated_at
  BEFORE UPDATE ON employee_policy_training
  FOR EACH ROW
  EXECUTE FUNCTION update_training_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE policy_training_requirements IS 'Training requirements defined at policy level';
COMMENT ON TABLE employee_policy_training IS 'Employee training records for policies';
COMMENT ON TABLE training_reminders IS 'Automated training reminders for employees';
COMMENT ON VIEW employee_training_compliance IS 'Training compliance status by employee and policy';
