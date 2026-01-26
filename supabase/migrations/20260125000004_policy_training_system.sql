-- =============================================
-- POLICY TRAINING SYSTEM
-- Complete training requirements, tracking, and compliance management
-- =============================================

-- =============================================
-- 1. TRAINING REQUIREMENTS (Policy-Level)
-- =============================================

CREATE TABLE IF NOT EXISTS public.policy_training_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,

  -- Training details
  training_required BOOLEAN DEFAULT false,
  training_name VARCHAR(255),
  training_description TEXT,

  -- Who needs this training
  required_for_job_positions VARCHAR[],  -- Array of job position names
  required_for_departments VARCHAR[],
  required_for_all_employees BOOLEAN DEFAULT false,

  -- Training specifications
  training_type VARCHAR(50) CHECK (training_type IN ('Initial', 'Refresher', 'Annual', 'Change-Triggered')),
  training_method VARCHAR[] DEFAULT ARRAY['Online'],  -- Classroom, Online, On-the-job, Video, etc.
  training_duration_minutes INTEGER,

  -- Frequency
  initial_training_required BOOLEAN DEFAULT true,
  refresher_frequency_months INTEGER,  -- null = one-time only

  -- Assessment
  requires_quiz BOOLEAN DEFAULT false,
  minimum_passing_score INTEGER,  -- Percentage
  quiz_questions JSONB,  -- Array of questions with answers
  max_quiz_attempts INTEGER DEFAULT 3,

  -- Trainer requirements
  must_be_trained_by VARCHAR(100),  -- Job position of trainer
  can_be_self_administered BOOLEAN DEFAULT false,

  -- Resources
  training_materials_urls TEXT[],
  training_video_url VARCHAR(500),
  training_presentation_url VARCHAR(500),

  -- Tracking
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_req_policy ON public.policy_training_requirements(policy_id);
CREATE INDEX IF NOT EXISTS idx_training_req_active ON public.policy_training_requirements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_training_req_all_employees ON public.policy_training_requirements(required_for_all_employees) WHERE required_for_all_employees = true;

-- =============================================
-- 2. EMPLOYEE TRAINING RECORDS
-- =============================================

CREATE TABLE IF NOT EXISTS public.employee_policy_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  training_requirement_id UUID REFERENCES public.policy_training_requirements(id),

  -- Training session details
  training_date DATE NOT NULL,
  training_type VARCHAR(50) CHECK (training_type IN ('Initial', 'Refresher', 'Annual', 'Change-Triggered')),

  -- Delivery
  training_method VARCHAR(50),  -- Classroom, Online, etc.
  trainer_id UUID REFERENCES public.profiles(id),
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
  certificate_url VARCHAR(500),
  acknowledgement_signature TEXT,  -- Digital signature or typed name
  acknowledgement_timestamp TIMESTAMP,

  -- Expiration (for refresher training)
  expires_at DATE,
  is_current BOOLEAN DEFAULT true,  -- False when expired or superseded

  -- Notes
  notes TEXT,
  training_location VARCHAR(255),

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_training_employee ON public.employee_policy_training(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_training_policy ON public.employee_policy_training(policy_id);
CREATE INDEX IF NOT EXISTS idx_emp_training_requirement ON public.employee_policy_training(training_requirement_id);
CREATE INDEX IF NOT EXISTS idx_emp_training_current ON public.employee_policy_training(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_emp_training_expires ON public.employee_policy_training(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emp_training_incomplete ON public.employee_policy_training(completed) WHERE completed = false;

-- =============================================
-- 3. QUIZ TEMPLATES
-- =============================================

CREATE TABLE IF NOT EXISTS public.policy_quiz_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template details
  template_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,

  -- Questions
  questions JSONB NOT NULL,  -- Array of question objects
  total_questions INTEGER,
  estimated_duration_minutes INTEGER,

  -- Settings
  passing_score INTEGER DEFAULT 80,
  randomize_questions BOOLEAN DEFAULT false,
  randomize_answers BOOLEAN DEFAULT false,
  allow_review BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_quiz_templates_active ON public.policy_quiz_templates(is_active) WHERE is_active = true;

-- =============================================
-- 4. TRAINING MATRIX
-- =============================================

-- Training matrix (who needs what)
CREATE TABLE IF NOT EXISTS public.training_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_position VARCHAR(255),
  department VARCHAR(255),

  -- Required policies/SOPs
  required_policy_ids UUID[],  -- Array of policy IDs

  -- Summary
  total_training_hours DECIMAL(5,2),
  training_completion_requirement VARCHAR(100) DEFAULT 'All_Required',  -- All_Required, 80_Percent, etc.

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_matrix_position ON public.training_matrix(job_position);
CREATE INDEX IF NOT EXISTS idx_training_matrix_department ON public.training_matrix(department);

-- =============================================
-- 5. TRAINING REMINDERS
-- =============================================

CREATE TABLE IF NOT EXISTS public.training_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.policies(id),
  training_requirement_id UUID REFERENCES public.policy_training_requirements(id),

  reminder_type VARCHAR(50) CHECK (reminder_type IN ('Initial_Training', 'Refresher_Due', 'Expiring_Soon', 'Overdue')),

  due_date DATE,
  reminder_sent_at TIMESTAMP,
  reminder_count INTEGER DEFAULT 0,

  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP,

  completed BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_employee ON public.training_reminders(employee_id);
CREATE INDEX IF NOT EXISTS idx_reminders_policy ON public.training_reminders(policy_id);
CREATE INDEX IF NOT EXISTS idx_reminders_type ON public.training_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON public.training_reminders(completed) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_reminders_due ON public.training_reminders(due_date);

-- =============================================
-- 6. TRAINING ASSIGNMENTS (Tasks Integration)
-- =============================================

-- This links to the existing tasks system
-- Training assignments create tasks with category = 'policy_training'
-- The task.metadata JSONB field stores: {policy_id, training_requirement_id, due_date}

-- =============================================
-- 7. CERTIFICATE TEMPLATES
-- =============================================

CREATE TABLE IF NOT EXISTS public.training_certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template details
  template_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,

  -- Design
  template_html TEXT NOT NULL,  -- HTML template with placeholders
  template_css TEXT,  -- Custom CSS for styling

  -- Placeholders available: {{employee_name}}, {{training_name}}, {{completion_date}}, {{score}}, etc.

  -- Settings
  include_company_logo BOOLEAN DEFAULT true,
  include_signature BOOLEAN DEFAULT true,
  signature_title VARCHAR(255),
  signature_name VARCHAR(255),

  -- Metadata
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cert_templates_active ON public.training_certificate_templates(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_cert_template
  ON public.training_certificate_templates(is_default)
  WHERE is_default = true;

-- =============================================
-- 8. RLS POLICIES
-- =============================================

-- Enable Row Level Security
ALTER TABLE public.policy_training_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_policy_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_certificate_templates ENABLE ROW LEVEL SECURITY;

-- Training Requirements: Managers manage, everyone can view
CREATE POLICY "Anyone can view training requirements"
  ON public.policy_training_requirements FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage training requirements"
  ON public.policy_training_requirements FOR ALL
  USING (is_policy_admin_or_manager());

-- Employee Training: Users can view own, managers view all
CREATE POLICY "Users can view own training records"
  ON public.employee_policy_training FOR SELECT
  USING (employee_id = auth.uid() OR is_policy_admin_or_manager());

CREATE POLICY "Users can create own training records"
  ON public.employee_policy_training FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Users can update own training records"
  ON public.employee_policy_training FOR UPDATE
  USING (employee_id = auth.uid() OR is_policy_admin_or_manager());

-- Quiz Templates: Managers only
CREATE POLICY "Anyone can view quiz templates"
  ON public.policy_quiz_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Managers can manage quiz templates"
  ON public.policy_quiz_templates FOR ALL
  USING (is_policy_admin_or_manager());

-- Training Matrix: Managers only
CREATE POLICY "Anyone can view training matrix"
  ON public.training_matrix FOR SELECT
  USING (true);

CREATE POLICY "Managers can manage training matrix"
  ON public.training_matrix FOR ALL
  USING (is_policy_admin_or_manager());

-- Training Reminders: Users see own, managers see all
CREATE POLICY "Users can view own reminders"
  ON public.training_reminders FOR SELECT
  USING (employee_id = auth.uid() OR is_policy_admin_or_manager());

CREATE POLICY "System can create reminders"
  ON public.training_reminders FOR INSERT
  WITH CHECK (true);  -- System-generated

-- Certificate Templates: Managers only
CREATE POLICY "Anyone can view certificate templates"
  ON public.training_certificate_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Managers can manage certificate templates"
  ON public.training_certificate_templates FOR ALL
  USING (is_policy_admin_or_manager());

-- =============================================
-- 9. HELPER VIEWS
-- =============================================

-- View: Employee Training Compliance
CREATE OR REPLACE VIEW public.employee_training_compliance AS
SELECT
  e.id as employee_id,
  e.first_name,
  e.last_name,
  e.email,
  e.current_position as job_position,
  e.department_id,
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
  END as compliance_status,
  CASE
    WHEN ept.id IS NULL THEN 0
    WHEN ept.expires_at < CURRENT_DATE THEN 1
    WHEN ept.expires_at < CURRENT_DATE + INTERVAL '30 days' THEN 2
    WHEN ept.is_current = true THEN 3
    ELSE 0
  END as compliance_priority
FROM public.profiles e
CROSS JOIN public.policy_training_requirements ptr
JOIN public.policies p ON ptr.policy_id = p.id
LEFT JOIN public.employee_policy_training ept ON
  ept.employee_id = e.id AND
  ept.policy_id = p.id AND
  ept.is_current = true
WHERE ptr.is_active = true
  AND (
    ptr.required_for_all_employees = true
    OR e.current_position = ANY(ptr.required_for_job_positions)
  );

-- View: Training Due Soon (next 30 days)
CREATE OR REPLACE VIEW public.training_due_soon AS
SELECT
  etc.*
FROM public.employee_training_compliance etc
WHERE etc.compliance_status IN ('Expiring_Soon', 'Expired', 'Not_Trained')
ORDER BY etc.compliance_priority DESC, etc.expires_at ASC NULLS FIRST;

-- View: Training Completion Summary by Policy
CREATE OR REPLACE VIEW public.training_completion_summary AS
SELECT
  p.id as policy_id,
  p.policy_number,
  p.title as policy_title,
  ptr.training_name,
  COUNT(DISTINCT etc.employee_id) as total_employees,
  COUNT(DISTINCT CASE WHEN etc.compliance_status = 'Current' THEN etc.employee_id END) as current_count,
  COUNT(DISTINCT CASE WHEN etc.compliance_status = 'Expired' THEN etc.employee_id END) as expired_count,
  COUNT(DISTINCT CASE WHEN etc.compliance_status = 'Not_Trained' THEN etc.employee_id END) as not_trained_count,
  COUNT(DISTINCT CASE WHEN etc.compliance_status = 'Expiring_Soon' THEN etc.employee_id END) as expiring_soon_count,
  ROUND(
    (COUNT(DISTINCT CASE WHEN etc.compliance_status = 'Current' THEN etc.employee_id END)::NUMERIC /
     NULLIF(COUNT(DISTINCT etc.employee_id), 0)) * 100,
    2
  ) as compliance_percentage
FROM public.policies p
JOIN public.policy_training_requirements ptr ON p.id = ptr.policy_id
LEFT JOIN public.employee_training_compliance etc ON p.id = etc.policy_id
WHERE ptr.is_active = true
GROUP BY p.id, p.policy_number, p.title, ptr.training_name;

-- View: My Training Dashboard (for logged-in user)
CREATE OR REPLACE VIEW public.my_training_dashboard AS
SELECT
  etc.*
FROM public.employee_training_compliance etc
WHERE etc.employee_id = auth.uid()
ORDER BY etc.compliance_priority DESC, etc.expires_at ASC NULLS FIRST;

-- =============================================
-- 10. DEFAULT DATA
-- =============================================

-- Insert default certificate template
INSERT INTO public.training_certificate_templates (
  template_name,
  description,
  template_html,
  is_default,
  include_company_logo,
  include_signature
) VALUES (
  'Standard Training Certificate',
  'Default certificate template for policy training completion',
  '<div style="text-align: center; padding: 40px; font-family: Arial, sans-serif;">
    <h1 style="font-size: 32px; margin-bottom: 20px;">Certificate of Completion</h1>
    <p style="font-size: 18px; margin: 20px 0;">This certifies that</p>
    <h2 style="font-size: 28px; margin: 20px 0; font-weight: bold;">{{employee_name}}</h2>
    <p style="font-size: 18px; margin: 20px 0;">has successfully completed</p>
    <h3 style="font-size: 24px; margin: 20px 0; font-weight: bold;">{{training_name}}</h3>
    <div style="display: flex; justify-content: space-around; margin-top: 40px;">
      <div>
        <p style="font-size: 14px; color: #666;">Completion Date</p>
        <p style="font-size: 16px; font-weight: bold;">{{completion_date}}</p>
      </div>
      <div>
        <p style="font-size: 14px; color: #666;">Score</p>
        <p style="font-size: 16px; font-weight: bold;">{{score}}%</p>
      </div>
    </div>
  </div>',
  true,
  true,
  true
) ON CONFLICT (template_name) DO NOTHING;

-- =============================================
-- 11. FUNCTIONS FOR TRAINING AUTOMATION
-- =============================================

-- Function: Auto-create training assignments when new employee joins or training requirement added
CREATE OR REPLACE FUNCTION public.create_training_assignments_for_employee(employee_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  assignment_count INTEGER := 0;
  req RECORD;
BEGIN
  -- Find all training requirements applicable to this employee
  FOR req IN
    SELECT
      ptr.id as training_requirement_id,
      ptr.policy_id,
      p.title,
      ptr.training_name
    FROM public.policy_training_requirements ptr
    JOIN public.policies p ON ptr.policy_id = p.id
    JOIN public.profiles e ON e.id = employee_uuid
    WHERE ptr.is_active = true
      AND (
        ptr.required_for_all_employees = true
        OR e.current_position = ANY(ptr.required_for_job_positions)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.employee_policy_training ept
        WHERE ept.employee_id = employee_uuid
          AND ept.policy_id = ptr.policy_id
          AND ept.is_current = true
      )
  LOOP
    -- Create training reminder
    INSERT INTO public.training_reminders (
      employee_id,
      policy_id,
      training_requirement_id,
      reminder_type,
      due_date
    ) VALUES (
      employee_uuid,
      req.policy_id,
      req.training_requirement_id,
      'Initial_Training',
      CURRENT_DATE + INTERVAL '14 days'  -- Due in 2 weeks
    );

    assignment_count := assignment_count + 1;
  END LOOP;

  RETURN assignment_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check for expiring training and create reminders
CREATE OR REPLACE FUNCTION public.check_expiring_training()
RETURNS INTEGER AS $$
DECLARE
  reminder_count INTEGER := 0;
  expiring_training RECORD;
BEGIN
  -- Find training expiring in next 30 days that doesn't have a reminder yet
  FOR expiring_training IN
    SELECT
      ept.employee_id,
      ept.policy_id,
      ptr.id as training_requirement_id,
      ept.expires_at
    FROM public.employee_policy_training ept
    JOIN public.policy_training_requirements ptr ON ept.training_requirement_id = ptr.id
    WHERE ept.is_current = true
      AND ept.expires_at <= CURRENT_DATE + INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.training_reminders tr
        WHERE tr.employee_id = ept.employee_id
          AND tr.policy_id = ept.policy_id
          AND tr.reminder_type IN ('Refresher_Due', 'Expiring_Soon')
          AND tr.completed = false
      )
  LOOP
    INSERT INTO public.training_reminders (
      employee_id,
      policy_id,
      training_requirement_id,
      reminder_type,
      due_date
    ) VALUES (
      expiring_training.employee_id,
      expiring_training.policy_id,
      expiring_training.training_requirement_id,
      CASE
        WHEN expiring_training.expires_at <= CURRENT_DATE THEN 'Overdue'
        WHEN expiring_training.expires_at <= CURRENT_DATE + INTERVAL '7 days' THEN 'Expiring_Soon'
        ELSE 'Refresher_Due'
      END,
      expiring_training.expires_at
    );

    reminder_count := reminder_count + 1;
  END LOOP;

  RETURN reminder_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
