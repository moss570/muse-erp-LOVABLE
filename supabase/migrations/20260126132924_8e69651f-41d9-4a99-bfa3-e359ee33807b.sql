-- ================================================================
-- POLICY & SOP MANAGEMENT SYSTEM - PHASE 4: TRAINING REGISTER TABLES
-- ================================================================

-- Policy Training Requirements
CREATE TABLE public.policy_training_requirements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false,
    training_type TEXT DEFAULT 'read_acknowledge' CHECK (training_type IN ('read_acknowledge', 'quiz', 'practical', 'certification', 'classroom')),
    duration_minutes INTEGER,
    passing_score INTEGER DEFAULT 80,
    max_attempts INTEGER DEFAULT 3,
    initial_due_days INTEGER DEFAULT 30,
    refresher_frequency_days INTEGER,
    target_job_positions UUID[],
    target_departments UUID[],
    target_all_employees BOOLEAN DEFAULT false,
    quiz_questions JSONB,
    training_materials_url TEXT,
    certificate_template TEXT,
    notifications_enabled BOOLEAN DEFAULT true,
    reminder_days_before INTEGER DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    UNIQUE(policy_id)
);

-- Employee Policy Training Records
CREATE TABLE public.employee_policy_training (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    training_requirement_id UUID REFERENCES public.policy_training_requirements(id) ON DELETE SET NULL,
    policy_version INTEGER NOT NULL,
    training_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'expired', 'waived')),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    due_date DATE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    quiz_score INTEGER,
    quiz_attempts INTEGER DEFAULT 0,
    quiz_answers JSONB,
    passed BOOLEAN,
    time_spent_minutes INTEGER,
    certificate_number TEXT,
    certificate_issued_at TIMESTAMP WITH TIME ZONE,
    certificate_file_path TEXT,
    certificate_file_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    waived_by UUID REFERENCES public.profiles(id),
    waived_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Training Reminders
CREATE TABLE public.training_reminders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_training_id UUID NOT NULL REFERENCES public.employee_policy_training(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('initial', 'reminder', 'overdue', 'expiring')),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'in_app', 'both')),
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes with unique names
CREATE INDEX idx_policy_training_reqs_policy ON public.policy_training_requirements(policy_id);
CREATE INDEX idx_emp_policy_training_employee ON public.employee_policy_training(employee_id);
CREATE INDEX idx_emp_policy_training_policy ON public.employee_policy_training(policy_id);
CREATE INDEX idx_emp_policy_training_status ON public.employee_policy_training(status);
CREATE INDEX idx_emp_policy_training_due ON public.employee_policy_training(due_date);
CREATE INDEX idx_policy_training_reminders_scheduled ON public.training_reminders(scheduled_for);

-- Enable RLS
ALTER TABLE public.policy_training_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_policy_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated can view training_requirements" ON public.policy_training_requirements FOR SELECT USING (true);
CREATE POLICY "Managers can manage training_requirements" ON public.policy_training_requirements FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Employees can view own policy training" ON public.employee_policy_training FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees WHERE id = employee_id AND profile_id = auth.uid())
    OR public.is_admin_or_manager(auth.uid())
);
CREATE POLICY "Authenticated can create policy training" ON public.employee_policy_training FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Employees can update own policy training" ON public.employee_policy_training FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.employees WHERE id = employee_id AND profile_id = auth.uid())
    OR public.is_admin_or_manager(auth.uid())
);
CREATE POLICY "Managers can delete policy training" ON public.employee_policy_training FOR DELETE USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Managers can view policy training_reminders" ON public.training_reminders FOR SELECT USING (public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Managers can manage policy training_reminders" ON public.training_reminders FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Triggers
CREATE TRIGGER update_policy_training_reqs_updated_at BEFORE UPDATE ON public.policy_training_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_emp_policy_training_updated_at BEFORE UPDATE ON public.employee_policy_training FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- View for training compliance
CREATE OR REPLACE VIEW public.policy_training_compliance AS
SELECT 
    e.id AS employee_id,
    e.first_name,
    e.last_name,
    e.employee_number,
    e.job_position_id,
    e.department_id,
    p.id AS policy_id,
    p.title AS policy_title,
    p.policy_number,
    ptr.id AS requirement_id,
    ptr.training_type,
    ptr.passing_score,
    ept.id AS training_id,
    ept.status AS training_status,
    ept.due_date,
    ept.completed_at,
    ept.quiz_score,
    ept.passed,
    ept.expires_at,
    CASE 
        WHEN ept.id IS NULL THEN 'not_assigned'
        WHEN ept.status = 'completed' AND (ept.expires_at IS NULL OR ept.expires_at > now()) THEN 'compliant'
        WHEN ept.status = 'completed' AND ept.expires_at <= now() THEN 'expired'
        WHEN ept.due_date < CURRENT_DATE AND ept.status NOT IN ('completed', 'waived') THEN 'overdue'
        WHEN ept.status IN ('pending', 'in_progress') THEN 'in_progress'
        ELSE 'non_compliant'
    END AS compliance_status
FROM public.employees e
CROSS JOIN public.policies p
JOIN public.policy_training_requirements ptr ON p.id = ptr.policy_id AND ptr.is_required = true
LEFT JOIN public.employee_policy_training ept ON e.id = ept.employee_id AND p.id = ept.policy_id
WHERE e.employment_status = 'active';