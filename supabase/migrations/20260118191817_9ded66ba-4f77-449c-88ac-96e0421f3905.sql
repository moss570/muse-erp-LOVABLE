-- =========================================
-- CAPA TASKS (for action plan tracking)
-- =========================================

CREATE TABLE public.capa_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES public.corrective_actions(id) ON DELETE CASCADE,
  
  -- Task details
  task_type TEXT NOT NULL CHECK (task_type IN (
    'containment', 'investigation', 'corrective', 'preventive', 'verification', 'effectiveness'
  )),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES public.profiles(id),
  due_date DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'cancelled', 'overdue'
  )),
  completed_date DATE,
  completed_by UUID REFERENCES public.profiles(id),
  completion_notes TEXT,
  
  -- Evidence
  evidence_required BOOLEAN DEFAULT false,
  evidence_attached BOOLEAN DEFAULT false,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_capa_tasks_capa ON public.capa_tasks(capa_id);
CREATE INDEX idx_capa_tasks_assigned ON public.capa_tasks(assigned_to);
CREATE INDEX idx_capa_tasks_status ON public.capa_tasks(status);

ALTER TABLE public.capa_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage CAPA tasks" ON public.capa_tasks
  FOR ALL TO authenticated USING (true);

-- =========================================
-- ROOT CAUSE ANALYSIS
-- =========================================

CREATE TABLE public.capa_root_cause_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES public.corrective_actions(id) ON DELETE CASCADE,
  
  -- Analysis method
  method TEXT NOT NULL CHECK (method IN ('five_whys', 'fishbone', 'fault_tree', 'pareto', 'other')),
  
  -- Five Whys specific
  five_whys_data JSONB,
  
  -- Fishbone specific  
  fishbone_data JSONB,
  
  -- General
  analysis_summary TEXT,
  root_cause_statement TEXT,
  contributing_factors TEXT[],
  
  -- Metadata
  analyzed_by UUID REFERENCES public.profiles(id),
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rca_capa ON public.capa_root_cause_analysis(capa_id);

ALTER TABLE public.capa_root_cause_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage RCA" ON public.capa_root_cause_analysis
  FOR ALL TO authenticated USING (true);

-- =========================================
-- CAPA APPROVALS
-- =========================================

CREATE TABLE public.capa_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES public.corrective_actions(id) ON DELETE CASCADE,
  
  -- Approval stage
  stage TEXT NOT NULL CHECK (stage IN (
    'containment', 'root_cause', 'action_plan', 'implementation', 'verification', 'closure'
  )),
  
  -- Approval details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Comments
  comments TEXT,
  revision_comments TEXT,
  
  -- Metadata
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  requested_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_capa_approvals_capa ON public.capa_approvals(capa_id);
CREATE INDEX idx_capa_approvals_stage ON public.capa_approvals(stage);

ALTER TABLE public.capa_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage CAPA approvals" ON public.capa_approvals
  FOR ALL TO authenticated USING (true);

-- =========================================
-- ENHANCE CORRECTIVE_ACTIONS TABLE
-- =========================================

ALTER TABLE public.corrective_actions
ADD COLUMN IF NOT EXISTS containment_actions TEXT,
ADD COLUMN IF NOT EXISTS containment_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS containment_verified_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS investigation_summary TEXT,
ADD COLUMN IF NOT EXISTS root_cause_category TEXT CHECK (root_cause_category IN (
  'human_error', 'equipment_failure', 'material_defect', 'method_deviation',
  'environmental', 'measurement_error', 'management_system', 'other'
)),
ADD COLUMN IF NOT EXISTS root_cause_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS corrective_actions_text TEXT,
ADD COLUMN IF NOT EXISTS preventive_actions_text TEXT,
ADD COLUMN IF NOT EXISTS implementation_evidence TEXT,
ADD COLUMN IF NOT EXISTS verification_results TEXT,
ADD COLUMN IF NOT EXISTS verification_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS effectiveness_criteria TEXT,
ADD COLUMN IF NOT EXISTS effectiveness_results TEXT,
ADD COLUMN IF NOT EXISTS effectiveness_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS effectiveness_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS effectiveness_verified_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS recurrence_check_date DATE,
ADD COLUMN IF NOT EXISTS recurrence_found BOOLEAN;