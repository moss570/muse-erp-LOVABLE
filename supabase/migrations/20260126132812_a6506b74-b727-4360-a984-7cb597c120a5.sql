-- ================================================================
-- POLICY & SOP MANAGEMENT SYSTEM - PHASE 3: HACCP TABLES
-- ================================================================

-- HACCP Plans
CREATE TABLE public.haccp_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
    plan_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    product_category TEXT,
    product_description TEXT,
    intended_use TEXT,
    target_consumer TEXT,
    scope TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
    version INTEGER DEFAULT 1,
    effective_date DATE,
    review_date DATE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.profiles(id),
    team_leader_id UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- HACCP Process Steps (Process Flow Diagram)
CREATE TABLE public.haccp_process_steps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    haccp_plan_id UUID NOT NULL REFERENCES public.haccp_plans(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    step_type TEXT DEFAULT 'process' CHECK (step_type IN ('receive', 'store', 'process', 'package', 'ship', 'ccp', 'decision', 'rework')),
    location TEXT,
    equipment TEXT,
    inputs TEXT,
    outputs TEXT,
    time_temp_requirements TEXT,
    is_ccp BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(haccp_plan_id, step_number)
);

-- HACCP Hazards
CREATE TABLE public.haccp_hazards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    haccp_plan_id UUID NOT NULL REFERENCES public.haccp_plans(id) ON DELETE CASCADE,
    process_step_id UUID REFERENCES public.haccp_process_steps(id) ON DELETE CASCADE,
    hazard_type TEXT NOT NULL CHECK (hazard_type IN ('biological', 'chemical', 'physical', 'allergen', 'radiological')),
    hazard_name TEXT NOT NULL,
    description TEXT,
    source TEXT,
    likelihood TEXT CHECK (likelihood IN ('low', 'medium', 'high')),
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    risk_score INTEGER,
    is_significant BOOLEAN DEFAULT false,
    justification TEXT,
    preventive_measures TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- HACCP Critical Control Points
CREATE TABLE public.haccp_critical_control_points (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    haccp_plan_id UUID NOT NULL REFERENCES public.haccp_plans(id) ON DELETE CASCADE,
    process_step_id UUID REFERENCES public.haccp_process_steps(id) ON DELETE CASCADE,
    hazard_id UUID REFERENCES public.haccp_hazards(id) ON DELETE SET NULL,
    ccp_number TEXT NOT NULL,
    ccp_type TEXT DEFAULT 'ccp' CHECK (ccp_type IN ('ccp', 'cp', 'pcp', 'oprp')),
    name TEXT NOT NULL,
    description TEXT,
    critical_limit_min NUMERIC,
    critical_limit_max NUMERIC,
    critical_limit_unit TEXT,
    critical_limit_text TEXT,
    target_value NUMERIC,
    monitoring_procedure TEXT,
    monitoring_frequency TEXT,
    monitoring_responsibility TEXT,
    corrective_action TEXT,
    verification_procedure TEXT,
    verification_frequency TEXT,
    records_kept TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    UNIQUE(haccp_plan_id, ccp_number)
);

-- HACCP CCP Verification Records
CREATE TABLE public.haccp_ccp_verification_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ccp_id UUID NOT NULL REFERENCES public.haccp_critical_control_points(id) ON DELETE CASCADE,
    production_lot_id UUID REFERENCES public.production_lots(id) ON DELETE SET NULL,
    verification_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    measured_value NUMERIC,
    measured_unit TEXT,
    is_within_limits BOOLEAN,
    limit_exceeded TEXT CHECK (limit_exceeded IN ('min', 'max', 'both', 'none')),
    corrective_action_taken TEXT,
    corrective_action_effective BOOLEAN,
    notes TEXT,
    photo_path TEXT,
    photo_url TEXT,
    verified_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- HACCP CCP Deviations
CREATE TABLE public.haccp_ccp_deviations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ccp_id UUID NOT NULL REFERENCES public.haccp_critical_control_points(id) ON DELETE CASCADE,
    verification_record_id UUID REFERENCES public.haccp_ccp_verification_records(id) ON DELETE SET NULL,
    production_lot_id UUID REFERENCES public.production_lots(id) ON DELETE SET NULL,
    deviation_number TEXT NOT NULL UNIQUE,
    deviation_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deviation_type TEXT CHECK (deviation_type IN ('critical_limit', 'monitoring', 'process', 'other')),
    description TEXT NOT NULL,
    measured_value NUMERIC,
    critical_limit_value NUMERIC,
    immediate_action TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    product_disposition TEXT CHECK (product_disposition IN ('release', 'hold', 'rework', 'reject', 'destroy')),
    quantity_affected NUMERIC,
    quantity_unit TEXT,
    capa_id UUID REFERENCES public.corrective_actions(id),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'corrective_action', 'closed')),
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- HACCP Plan Validations
CREATE TABLE public.haccp_plan_validations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    haccp_plan_id UUID NOT NULL REFERENCES public.haccp_plans(id) ON DELETE CASCADE,
    validation_date DATE NOT NULL,
    validation_type TEXT CHECK (validation_type IN ('initial', 'annual', 'change', 'reassessment')),
    validator_name TEXT,
    validator_id UUID REFERENCES public.profiles(id),
    scope TEXT,
    methodology TEXT,
    findings TEXT,
    conclusions TEXT,
    is_valid BOOLEAN,
    next_validation_date DATE,
    report_file_path TEXT,
    report_file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Indexes
CREATE INDEX idx_haccp_plans_policy ON public.haccp_plans(policy_id);
CREATE INDEX idx_haccp_process_steps_plan ON public.haccp_process_steps(haccp_plan_id);
CREATE INDEX idx_haccp_hazards_plan ON public.haccp_hazards(haccp_plan_id);
CREATE INDEX idx_haccp_ccps_plan ON public.haccp_critical_control_points(haccp_plan_id);
CREATE INDEX idx_haccp_verifications_ccp ON public.haccp_ccp_verification_records(ccp_id);
CREATE INDEX idx_haccp_verifications_lot ON public.haccp_ccp_verification_records(production_lot_id);
CREATE INDEX idx_haccp_deviations_ccp ON public.haccp_ccp_deviations(ccp_id);

-- Enable RLS
ALTER TABLE public.haccp_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_process_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_critical_control_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_ccp_verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_ccp_deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_plan_validations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated can view haccp_plans" ON public.haccp_plans FOR SELECT USING (true);
CREATE POLICY "Managers can manage haccp_plans" ON public.haccp_plans FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view haccp_process_steps" ON public.haccp_process_steps FOR SELECT USING (true);
CREATE POLICY "Managers can manage haccp_process_steps" ON public.haccp_process_steps FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view haccp_hazards" ON public.haccp_hazards FOR SELECT USING (true);
CREATE POLICY "Managers can manage haccp_hazards" ON public.haccp_hazards FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view haccp_ccps" ON public.haccp_critical_control_points FOR SELECT USING (true);
CREATE POLICY "Managers can manage haccp_ccps" ON public.haccp_critical_control_points FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view ccp_verifications" ON public.haccp_ccp_verification_records FOR SELECT USING (true);
CREATE POLICY "Authenticated can create ccp_verifications" ON public.haccp_ccp_verification_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can view haccp_deviations" ON public.haccp_ccp_deviations FOR SELECT USING (true);
CREATE POLICY "Managers can manage haccp_deviations" ON public.haccp_ccp_deviations FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view haccp_validations" ON public.haccp_plan_validations FOR SELECT USING (true);
CREATE POLICY "Managers can manage haccp_validations" ON public.haccp_plan_validations FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Triggers
CREATE TRIGGER update_haccp_plans_updated_at BEFORE UPDATE ON public.haccp_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_haccp_process_steps_updated_at BEFORE UPDATE ON public.haccp_process_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_haccp_hazards_updated_at BEFORE UPDATE ON public.haccp_hazards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_haccp_ccps_updated_at BEFORE UPDATE ON public.haccp_critical_control_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_haccp_deviations_updated_at BEFORE UPDATE ON public.haccp_ccp_deviations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_haccp_validations_updated_at BEFORE UPDATE ON public.haccp_plan_validations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();