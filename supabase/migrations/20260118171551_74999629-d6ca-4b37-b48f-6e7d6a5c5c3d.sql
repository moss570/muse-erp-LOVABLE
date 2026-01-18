-- =========================================
-- SUPPLIER PERFORMANCE METRICS
-- =========================================

CREATE TABLE public.supplier_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  rolling_months INTEGER NOT NULL DEFAULT 12,
  
  -- Receiving Metrics
  total_lots_received INTEGER NOT NULL DEFAULT 0,
  lots_accepted INTEGER NOT NULL DEFAULT 0,
  lots_rejected INTEGER NOT NULL DEFAULT 0,
  lots_on_hold INTEGER NOT NULL DEFAULT 0,
  rejection_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  
  -- Quality Metrics
  temperature_failures INTEGER NOT NULL DEFAULT 0,
  spec_failures INTEGER NOT NULL DEFAULT 0,
  documentation_failures INTEGER NOT NULL DEFAULT 0,
  
  -- CAPA Metrics
  total_capas INTEGER NOT NULL DEFAULT 0,
  open_capas INTEGER NOT NULL DEFAULT 0,
  closed_capas INTEGER NOT NULL DEFAULT 0,
  critical_capas INTEGER NOT NULL DEFAULT 0,
  major_capas INTEGER NOT NULL DEFAULT 0,
  minor_capas INTEGER NOT NULL DEFAULT 0,
  avg_capa_closure_days NUMERIC(5,1),
  
  -- Document Compliance
  total_required_documents INTEGER NOT NULL DEFAULT 0,
  valid_documents INTEGER NOT NULL DEFAULT 0,
  expired_documents INTEGER NOT NULL DEFAULT 0,
  expiring_soon_documents INTEGER NOT NULL DEFAULT 0,
  missing_documents INTEGER NOT NULL DEFAULT 0,
  document_compliance_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  
  -- On-Time Delivery
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  on_time_deliveries INTEGER NOT NULL DEFAULT 0,
  late_deliveries INTEGER NOT NULL DEFAULT 0,
  on_time_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  
  -- Calculated Score
  base_score INTEGER NOT NULL DEFAULT 100,
  total_deductions INTEGER NOT NULL DEFAULT 0,
  final_score INTEGER NOT NULL DEFAULT 100,
  score_grade TEXT NOT NULL DEFAULT 'A' CHECK (score_grade IN ('A', 'B', 'C', 'D', 'F')),
  
  -- Status Triggers
  probation_triggered BOOLEAN NOT NULL DEFAULT false,
  review_required BOOLEAN NOT NULL DEFAULT false,
  trigger_reasons JSONB DEFAULT '[]'::jsonb,
  
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculated_by TEXT DEFAULT 'system',
  notes TEXT,
  
  UNIQUE(supplier_id, period_start, period_end)
);

CREATE INDEX idx_supplier_metrics_supplier ON public.supplier_performance_metrics(supplier_id);
CREATE INDEX idx_supplier_metrics_date ON public.supplier_performance_metrics(period_end DESC);
CREATE INDEX idx_supplier_metrics_score ON public.supplier_performance_metrics(final_score);

ALTER TABLE public.supplier_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view supplier metrics" ON public.supplier_performance_metrics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage supplier metrics" ON public.supplier_performance_metrics
  FOR ALL TO authenticated USING (true);

-- =========================================
-- SUPPLIER SCORING RULES
-- =========================================

CREATE TABLE public.supplier_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_code TEXT NOT NULL UNIQUE,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('deduction', 'threshold', 'bonus')),
  metric_key TEXT NOT NULL,
  deduction_per_unit NUMERIC(5,2),
  max_deduction INTEGER,
  threshold_value NUMERIC(10,2),
  threshold_operator TEXT CHECK (threshold_operator IN ('gt', 'gte', 'lt', 'lte', 'eq')),
  action_type TEXT CHECK (action_type IN ('probation', 'review', 'alert', 'block')),
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

INSERT INTO public.supplier_scoring_rules 
  (rule_name, rule_code, description, rule_type, metric_key, deduction_per_unit, max_deduction, threshold_value, threshold_operator, action_type, priority) 
VALUES
  ('Rejection Rate Penalty', 'rejection_rate_deduction', 'Deduct 2 points for each percentage point of rejection rate', 'deduction', 'rejection_rate', 2, 30, NULL, NULL, NULL, 10),
  ('CAPA Count Penalty', 'capa_count_deduction', 'Deduct 3 points for each CAPA in the period', 'deduction', 'total_capas', 3, 20, NULL, NULL, NULL, 20),
  ('Critical CAPA Penalty', 'critical_capa_deduction', 'Deduct 10 points for each critical CAPA', 'deduction', 'critical_capas', 10, 30, NULL, NULL, NULL, 15),
  ('Major CAPA Penalty', 'major_capa_deduction', 'Deduct 5 points for each major CAPA', 'deduction', 'major_capas', 5, 20, NULL, NULL, NULL, 16),
  ('Expired Documents Penalty', 'expired_docs_deduction', 'Deduct 5 points for each expired document', 'deduction', 'expired_documents', 5, 20, NULL, NULL, NULL, 30),
  ('Open CAPA Penalty', 'open_capa_deduction', 'Deduct 2 points for each open CAPA', 'deduction', 'open_capas', 2, 15, NULL, NULL, NULL, 25),
  ('Low Score Probation', 'low_score_probation', 'Trigger probation when score falls below 60', 'threshold', 'final_score', NULL, NULL, 60, 'lt', 'probation', 5),
  ('Multiple CAPAs Probation', 'multi_capa_probation', 'Trigger probation when 3+ CAPAs in rolling period', 'threshold', 'total_capas', NULL, NULL, 3, 'gte', 'probation', 6),
  ('Critical CAPA Probation', 'critical_capa_probation', 'Trigger probation for any critical CAPA', 'threshold', 'critical_capas', NULL, NULL, 1, 'gte', 'probation', 1),
  ('Score Review Required', 'score_review', 'Flag for review when score drops below 75', 'threshold', 'final_score', NULL, NULL, 75, 'lt', 'review', 50),
  ('High Rejection Review', 'high_rejection_review', 'Flag for review when rejection rate exceeds 10%', 'threshold', 'rejection_rate', NULL, NULL, 10, 'gt', 'review', 51);

ALTER TABLE public.supplier_scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scoring rules" ON public.supplier_scoring_rules
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage scoring rules" ON public.supplier_scoring_rules
  FOR ALL TO authenticated USING (true);

-- =========================================
-- SUPPLIER STATUS HISTORY
-- =========================================

CREATE TABLE public.supplier_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  change_reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('system', 'user')),
  triggered_by_user_id UUID REFERENCES public.profiles(id),
  performance_score_at_change INTEGER,
  metrics_snapshot_id UUID REFERENCES public.supplier_performance_metrics(id),
  trigger_details JSONB,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_supplier_status_history_supplier ON public.supplier_status_history(supplier_id);
CREATE INDEX idx_supplier_status_history_date ON public.supplier_status_history(created_at DESC);

ALTER TABLE public.supplier_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view status history" ON public.supplier_status_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create status history" ON public.supplier_status_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- =========================================
-- ADD PERFORMANCE FIELDS TO SUPPLIERS
-- =========================================

ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS current_score INTEGER,
ADD COLUMN IF NOT EXISTS current_grade TEXT CHECK (current_grade IN ('A', 'B', 'C', 'D', 'F')),
ADD COLUMN IF NOT EXISTS last_score_date DATE,
ADD COLUMN IF NOT EXISTS probation_start_date DATE,
ADD COLUMN IF NOT EXISTS probation_end_date DATE,
ADD COLUMN IF NOT EXISTS probation_review_date DATE,
ADD COLUMN IF NOT EXISTS score_trend TEXT CHECK (score_trend IN ('improving', 'stable', 'declining'));

-- =========================================
-- FUNCTION: Calculate Score Grade
-- =========================================

CREATE OR REPLACE FUNCTION public.calculate_score_grade(score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF score >= 90 THEN RETURN 'A';
  ELSIF score >= 80 THEN RETURN 'B';
  ELSIF score >= 70 THEN RETURN 'C';
  ELSIF score >= 60 THEN RETURN 'D';
  ELSE RETURN 'F';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;