-- PHASE 5 PART 1: Production Scheduling Database Foundation

-- 1. Production Schedule Table
CREATE TABLE IF NOT EXISTS public.production_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Work Order Reference (optional)
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  
  -- Schedule Details
  schedule_date DATE NOT NULL,
  production_line_id UUID REFERENCES public.production_lines(id) NOT NULL,
  
  -- Product Information (FK to products, not materials)
  product_id UUID REFERENCES public.products(id),
  recipe_id UUID REFERENCES public.product_recipes(id),
  
  -- Quantities
  planned_quantity DECIMAL(15,3) NOT NULL,
  planned_uom VARCHAR(20) NOT NULL DEFAULT 'gal',
  actual_quantity DECIMAL(15,3),
  
  -- Package Type
  package_type VARCHAR(100),
  
  -- Time Slot
  start_time TIME,
  end_time TIME,
  estimated_duration_hours DECIMAL(5,2),
  
  -- Priority & Status
  priority VARCHAR(20) DEFAULT 'Standard' CHECK (priority IN ('Low', 'Standard', 'High', 'Rush')),
  schedule_status VARCHAR(50) DEFAULT 'Scheduled' CHECK (schedule_status IN ('Planned', 'Scheduled', 'In Progress', 'Completed', 'Cancelled')),
  
  -- Labor Planning
  required_labor_hours DECIMAL(8,2),
  required_employees INTEGER,
  estimated_labor_cost DECIMAL(15,2),
  
  -- Cost Estimates
  estimated_material_cost DECIMAL(15,2),
  estimated_overhead_cost DECIMAL(15,2),
  estimated_total_cost DECIMAL(15,2),
  estimated_cost_per_unit DECIMAL(15,4),
  
  -- Allergen Information
  allergens TEXT[],
  allergen_sequence_score INTEGER DEFAULT 0,
  
  -- Capacity Warnings
  exceeds_line_capacity BOOLEAN DEFAULT false,
  capacity_utilization_pct DECIMAL(5,2),
  
  -- Labor Warnings
  insufficient_labor BOOLEAN DEFAULT false,
  excess_labor BOOLEAN DEFAULT false,
  labor_efficiency_target DECIMAL(8,2),
  
  -- Visual Position (for drag-and-drop)
  sort_order INTEGER,
  visual_column INTEGER,
  
  -- Notes
  notes TEXT,
  special_instructions TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for production_schedule
CREATE INDEX IF NOT EXISTS idx_prod_schedule_date ON public.production_schedule(schedule_date);
CREATE INDEX IF NOT EXISTS idx_prod_schedule_line ON public.production_schedule(production_line_id);
CREATE INDEX IF NOT EXISTS idx_prod_schedule_status ON public.production_schedule(schedule_status);
CREATE INDEX IF NOT EXISTS idx_prod_schedule_wo ON public.production_schedule(work_order_id);
CREATE INDEX IF NOT EXISTS idx_prod_schedule_date_line ON public.production_schedule(schedule_date, production_line_id);

-- 2. Daily Production Targets Table
CREATE TABLE IF NOT EXISTS public.daily_production_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  target_date DATE NOT NULL,
  production_line_id UUID REFERENCES public.production_lines(id),
  
  -- Targets
  target_quantity DECIMAL(15,3) NOT NULL,
  target_uom VARCHAR(20) NOT NULL DEFAULT 'gal',
  
  -- Actual Performance
  actual_quantity DECIMAL(15,3),
  achievement_percentage DECIMAL(5,2),
  
  -- Labor Targets
  target_labor_hours DECIMAL(8,2),
  target_labor_cost DECIMAL(15,2),
  actual_labor_hours DECIMAL(8,2),
  actual_labor_cost DECIMAL(15,2),
  
  -- Efficiency Metrics
  target_efficiency DECIMAL(8,2),
  actual_efficiency DECIMAL(8,2),
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_target_date_line UNIQUE NULLS NOT DISTINCT (target_date, production_line_id)
);

CREATE INDEX IF NOT EXISTS idx_targets_date ON public.daily_production_targets(target_date);
CREATE INDEX IF NOT EXISTS idx_targets_line ON public.daily_production_targets(production_line_id);

-- 3. Allergen Sequence Rules Table
CREATE TABLE IF NOT EXISTS public.allergen_sequence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  allergen VARCHAR(100) NOT NULL UNIQUE,
  sequence_priority INTEGER NOT NULL,
  
  requires_deep_clean_after BOOLEAN DEFAULT false,
  cleaning_time_minutes INTEGER DEFAULT 45,
  
  warning_if_after TEXT[],
  
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allergen_rules_priority ON public.allergen_sequence_rules(sequence_priority);

-- Insert default allergen sequencing rules
INSERT INTO public.allergen_sequence_rules (allergen, sequence_priority, requires_deep_clean_after, warning_if_after) VALUES
('None', 0, false, ARRAY[]::TEXT[]),
('Dairy', 10, false, ARRAY[]::TEXT[]),
('Eggs', 20, false, ARRAY['None']),
('Soy', 30, false, ARRAY['None']),
('Wheat', 40, false, ARRAY['None']),
('Tree Nuts', 50, true, ARRAY['None', 'Dairy']),
('Peanuts', 60, true, ARRAY['None', 'Dairy', 'Tree Nuts'])
ON CONFLICT (allergen) DO NOTHING;

-- 4. Schedule Optimization Suggestions Table
CREATE TABLE IF NOT EXISTS public.schedule_optimization_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  schedule_date DATE NOT NULL,
  suggestion_type VARCHAR(50) CHECK (suggestion_type IN ('Allergen Sequence', 'Capacity', 'Labor', 'Efficiency')),
  
  severity VARCHAR(20) CHECK (severity IN ('Info', 'Warning', 'Critical')),
  
  current_situation TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  expected_benefit TEXT,
  
  production_schedule_id UUID REFERENCES public.production_schedule(id) ON DELETE CASCADE,
  
  is_dismissed BOOLEAN DEFAULT false,
  is_applied BOOLEAN DEFAULT false,
  dismissed_by UUID REFERENCES auth.users(id),
  dismissed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_date ON public.schedule_optimization_suggestions(schedule_date);
CREATE INDEX IF NOT EXISTS idx_suggestions_dismissed ON public.schedule_optimization_suggestions(is_dismissed);

-- 5. Enable RLS on all new tables
ALTER TABLE public.production_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_production_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allergen_sequence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_optimization_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for production_schedule
CREATE POLICY "Users can view production schedule"
  ON public.production_schedule FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage production schedule"
  ON public.production_schedule FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for daily_production_targets
CREATE POLICY "Users can view daily targets"
  ON public.daily_production_targets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage daily targets"
  ON public.daily_production_targets FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for allergen_sequence_rules
CREATE POLICY "Users can view allergen rules"
  ON public.allergen_sequence_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage allergen rules"
  ON public.allergen_sequence_rules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for schedule_optimization_suggestions
CREATE POLICY "Users can view schedule suggestions"
  ON public.schedule_optimization_suggestions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage schedule suggestions"
  ON public.schedule_optimization_suggestions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Update Timestamp Trigger for production_schedule
CREATE TRIGGER update_production_schedule_updated_at
  BEFORE UPDATE ON public.production_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Check Capacity Warnings Function
CREATE OR REPLACE FUNCTION public.check_capacity_warnings(
  p_schedule_date DATE,
  p_production_line_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line_capacity DECIMAL(15,3);
  v_scheduled_quantity DECIMAL(15,3);
  v_utilization_pct DECIMAL(5,2);
  v_is_over_capacity BOOLEAN := false;
  v_warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get line daily capacity
  SELECT COALESCE(capacity_value, 1000) INTO v_line_capacity
  FROM production_lines
  WHERE id = p_production_line_id;
  
  -- Get total scheduled quantity for this line/date
  SELECT COALESCE(SUM(planned_quantity), 0)
  INTO v_scheduled_quantity
  FROM production_schedule
  WHERE schedule_date = p_schedule_date
    AND production_line_id = p_production_line_id
    AND schedule_status NOT IN ('Cancelled');
  
  -- Calculate utilization
  IF v_line_capacity > 0 THEN
    v_utilization_pct := (v_scheduled_quantity / v_line_capacity) * 100;
  ELSE
    v_utilization_pct := 0;
  END IF;
  
  -- Determine warnings
  IF v_utilization_pct > 100 THEN
    v_is_over_capacity := true;
    v_warnings := array_append(v_warnings, 
      format('Line is %s%% over capacity', (v_utilization_pct - 100)::INTEGER));
  ELSIF v_utilization_pct > 90 THEN
    v_warnings := array_append(v_warnings, 
      'Line is near capacity - schedule may be tight');
  ELSIF v_utilization_pct < 50 AND v_scheduled_quantity > 0 THEN
    v_warnings := array_append(v_warnings, 
      'Line is under-utilized - consider adding production');
  END IF;
  
  RETURN jsonb_build_object(
    'line_capacity', v_line_capacity,
    'scheduled_quantity', v_scheduled_quantity,
    'utilization_pct', v_utilization_pct,
    'exceeds_capacity', v_is_over_capacity,
    'warnings', v_warnings
  );
END;
$$;

-- 8. Check Labor Balance Function
CREATE OR REPLACE FUNCTION public.check_labor_balance(
  p_date DATE,
  p_production_line_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_required_hours DECIMAL(8,2) := 0;
  v_scheduled_hours DECIMAL(8,2) := 0;
  v_planned_production DECIMAL(15,3) := 0;
  v_warnings TEXT[] := ARRAY[]::TEXT[];
  v_status TEXT := 'BALANCED';
  v_recommendation TEXT;
BEGIN
  -- Get required labor hours from scheduled production
  SELECT 
    COALESCE(SUM(required_labor_hours), 0),
    COALESCE(SUM(planned_quantity), 0)
  INTO 
    v_required_hours,
    v_planned_production
  FROM production_schedule
  WHERE schedule_date = p_date
    AND (p_production_line_id IS NULL OR production_line_id = p_production_line_id)
    AND schedule_status NOT IN ('Cancelled', 'Completed');
  
  -- Get scheduled employee hours from employee_schedules table
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (shift_end_time - shift_start_time)) / 3600
  ), 0)
  INTO v_scheduled_hours
  FROM employee_schedules
  WHERE schedule_date = p_date
    AND (p_production_line_id IS NULL OR assigned_production_line_id = p_production_line_id)
    AND schedule_status != 'Called Off';
  
  -- Compare and generate warnings
  IF v_scheduled_hours < v_required_hours * 0.9 AND v_required_hours > 0 THEN
    v_status := 'UNDERSTAFFED';
    v_warnings := array_append(v_warnings,
      format('Need %s hrs, have %s hrs scheduled', 
        ROUND(v_required_hours)::INTEGER, ROUND(v_scheduled_hours)::INTEGER));
    v_recommendation := format('Add %s more labor hours', ROUND(v_required_hours - v_scheduled_hours)::INTEGER);
  ELSIF v_scheduled_hours > v_required_hours * 1.2 AND v_required_hours > 0 THEN
    v_status := 'OVERSTAFFED';
    v_warnings := array_append(v_warnings,
      format('Have %s hrs scheduled but only need %s hrs', 
        ROUND(v_scheduled_hours)::INTEGER, ROUND(v_required_hours)::INTEGER));
    v_recommendation := format('Consider reducing %s labor hours', ROUND(v_scheduled_hours - v_required_hours)::INTEGER);
  END IF;
  
  -- Check if production scheduled but no employees
  IF v_planned_production > 0 AND v_scheduled_hours = 0 THEN
    v_status := 'UNDERSTAFFED';
    v_warnings := array_append(v_warnings, 'Production scheduled but no employees assigned');
    v_recommendation := 'Assign employees to this date';
  END IF;
  
  RETURN jsonb_build_object(
    'required_hours', v_required_hours,
    'scheduled_hours', v_scheduled_hours,
    'planned_production', v_planned_production,
    'status', v_status,
    'warnings', v_warnings,
    'recommendation', v_recommendation
  );
END;
$$;