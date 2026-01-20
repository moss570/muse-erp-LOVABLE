-- =====================================================
-- PHASE 2: Work Orders & Cost Tracking Database
-- =====================================================

-- 1. Work Orders Table
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number VARCHAR(50) UNIQUE NOT NULL,
  wo_type VARCHAR(50) NOT NULL CHECK (wo_type IN ('Make-to-Stock', 'Make-to-Order', 'Rework', 'R&D Sample')),
  wo_status VARCHAR(50) NOT NULL DEFAULT 'Created' CHECK (wo_status IN ('Created', 'Released', 'In Progress', 'QA Hold', 'Approved', 'Completed', 'Closed', 'Cancelled')),
  
  -- Product Information
  product_id UUID REFERENCES materials(id),
  recipe_id UUID,
  production_line_id UUID REFERENCES production_lines(id),
  
  -- Quantities
  target_quantity DECIMAL(15,3) NOT NULL,
  target_uom VARCHAR(20) NOT NULL,
  actual_quantity DECIMAL(15,3),
  actual_uom VARCHAR(20),
  yield_percentage DECIMAL(5,2),
  
  -- Scheduling
  priority VARCHAR(20) CHECK (priority IN ('Low', 'Standard', 'High', 'Rush')),
  scheduled_date DATE,
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Customer (for MTO)
  customer_reference VARCHAR(100),
  customer_po VARCHAR(100),
  
  -- Cost Tracking - Planned/Standard
  planned_material_cost DECIMAL(15,2) DEFAULT 0,
  planned_labor_cost DECIMAL(15,2) DEFAULT 0,
  planned_overhead_cost DECIMAL(15,2) DEFAULT 0,
  planned_total_cost DECIMAL(15,2) DEFAULT 0,
  planned_cost_per_unit DECIMAL(15,4),
  
  -- Cost Tracking - Actual
  actual_material_cost DECIMAL(15,2) DEFAULT 0,
  actual_labor_cost DECIMAL(15,2) DEFAULT 0,
  actual_overhead_cost DECIMAL(15,2) DEFAULT 0,
  actual_total_cost DECIMAL(15,2) DEFAULT 0,
  actual_cost_per_unit DECIMAL(15,4),
  
  -- Cost Variances
  material_variance DECIMAL(15,2),
  labor_variance DECIMAL(15,2),
  overhead_variance DECIMAL(15,2),
  total_variance DECIMAL(15,2),
  
  -- Labor Tracking
  estimated_labor_hours DECIMAL(8,2),
  actual_labor_hours DECIMAL(8,2),
  labor_rate_per_hour DECIMAL(10,2),
  
  -- Overhead Allocation
  overhead_allocation_method VARCHAR(50) CHECK (overhead_allocation_method IN ('Labor Hours', 'Machine Hours', 'Units Produced', 'Fixed Amount')),
  overhead_rate DECIMAL(10,4),
  
  -- Additional Info
  special_instructions TEXT,
  allergen_warnings TEXT[],
  is_rework BOOLEAN DEFAULT false,
  original_wo_id UUID REFERENCES work_orders(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  released_by UUID,
  released_at TIMESTAMPTZ,
  completed_by UUID
);

-- Indexes
CREATE INDEX idx_wo_number ON work_orders(wo_number);
CREATE INDEX idx_wo_status ON work_orders(wo_status);
CREATE INDEX idx_wo_type ON work_orders(wo_type);
CREATE INDEX idx_wo_product ON work_orders(product_id);
CREATE INDEX idx_wo_scheduled_date ON work_orders(scheduled_date);
CREATE INDEX idx_wo_due_date ON work_orders(due_date);
CREATE INDEX idx_wo_priority ON work_orders(priority);
CREATE INDEX idx_wo_line ON work_orders(production_line_id);

-- RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work orders" ON work_orders 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create work orders" ON work_orders 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update work orders" ON work_orders 
  FOR UPDATE TO authenticated USING (true);

-- 2. Work Order Materials Table
CREATE TABLE IF NOT EXISTS work_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  
  -- Planned Requirements
  planned_quantity DECIMAL(15,3) NOT NULL,
  planned_uom VARCHAR(20) NOT NULL,
  planned_unit_cost DECIMAL(15,4),
  planned_total_cost DECIMAL(15,2),
  
  -- Actual Usage
  actual_quantity DECIMAL(15,3) DEFAULT 0,
  actual_uom VARCHAR(20),
  actual_unit_cost DECIMAL(15,4),
  actual_total_cost DECIMAL(15,2) DEFAULT 0,
  
  -- Variance
  quantity_variance DECIMAL(15,3),
  cost_variance DECIMAL(15,2),
  
  -- Tracking
  is_consumed BOOLEAN DEFAULT false,
  consumed_at TIMESTAMPTZ,
  consumed_from_lot_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wo_materials_wo ON work_order_materials(work_order_id);
CREATE INDEX idx_wo_materials_material ON work_order_materials(material_id);

ALTER TABLE work_order_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view WO materials" ON work_order_materials 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage WO materials" ON work_order_materials 
  FOR ALL TO authenticated USING (true);

-- 3. Work Order Labor Tracking Table
CREATE TABLE IF NOT EXISTS work_order_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  employee_id UUID,
  
  -- Labor Details
  labor_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  hours_worked DECIMAL(8,2) NOT NULL,
  
  -- Cost
  hourly_rate DECIMAL(10,2) NOT NULL,
  labor_cost DECIMAL(15,2) NOT NULL,
  
  -- Production Stage
  stage VARCHAR(50) CHECK (stage IN ('Base Preparation', 'Flavoring', 'Freezing', 'Packaging', 'Other')),
  
  -- Tracking
  is_overtime BOOLEAN DEFAULT false,
  overtime_multiplier DECIMAL(3,2) DEFAULT 1.0,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wo_labor_wo ON work_order_labor(work_order_id);
CREATE INDEX idx_wo_labor_employee ON work_order_labor(employee_id);
CREATE INDEX idx_wo_labor_date ON work_order_labor(labor_date);

ALTER TABLE work_order_labor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view WO labor" ON work_order_labor 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage WO labor" ON work_order_labor 
  FOR ALL TO authenticated USING (true);

-- 4. Work Order Overhead Allocation Table
CREATE TABLE IF NOT EXISTS work_order_overhead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  
  allocation_method VARCHAR(50),
  allocation_basis DECIMAL(15,3),
  allocation_rate DECIMAL(10,4),
  allocated_amount DECIMAL(15,2),
  fixed_cost_allocation DECIMAL(15,2) DEFAULT 0,
  
  allocation_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_wo_overhead_wo ON work_order_overhead(work_order_id);

ALTER TABLE work_order_overhead ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view WO overhead" ON work_order_overhead 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage WO overhead" ON work_order_overhead 
  FOR ALL TO authenticated USING (true);

-- 5. Work Order Status History Table
CREATE TABLE IF NOT EXISTS work_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID,
  notes TEXT
);

CREATE INDEX idx_wo_status_history_wo ON work_order_status_history(work_order_id);

ALTER TABLE work_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view WO status history" ON work_order_status_history 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage WO status history" ON work_order_status_history 
  FOR ALL TO authenticated USING (true);

-- 6. Manufacturing Cost Settings Table
CREATE TABLE IF NOT EXISTS manufacturing_cost_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value DECIMAL(15,4) NOT NULL,
  setting_uom VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE DEFAULT CURRENT_DATE,
  expires_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

CREATE INDEX idx_cost_settings_key ON manufacturing_cost_settings(setting_key);
CREATE INDEX idx_cost_settings_active ON manufacturing_cost_settings(is_active);

ALTER TABLE manufacturing_cost_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost settings" ON manufacturing_cost_settings 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage cost settings" ON manufacturing_cost_settings 
  FOR ALL TO authenticated USING (true);

-- Insert default cost settings
INSERT INTO manufacturing_cost_settings (setting_key, setting_value, setting_uom, description) VALUES
  ('labor_cost_per_gallon', 1.85, 'USD/gal', 'Target labor cost per gallon'),
  ('fixed_cost_per_month', 50000.00, 'USD', 'Monthly fixed overhead costs'),
  ('overhead_rate_labor_hours', 25.00, 'USD/hour', 'Overhead allocation per labor hour'),
  ('default_overtime_multiplier', 1.5, 'multiplier', 'Overtime pay multiplier'),
  ('waste_threshold_percentage', 2.0, 'percent', 'Acceptable waste percentage'),
  ('minimum_batch_efficiency', 85.0, 'percent', 'Minimum acceptable production efficiency')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- 1. Generate Work Order Number Function
CREATE OR REPLACE FUNCTION generate_wo_number(p_wo_type VARCHAR DEFAULT 'Make-to-Stock')
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wo_number VARCHAR(50);
  v_prefix VARCHAR(10);
  v_year VARCHAR(4);
  v_sequence VARCHAR(6);
  v_counter INTEGER;
BEGIN
  -- Set prefix based on type
  CASE p_wo_type
    WHEN 'Make-to-Stock' THEN v_prefix := 'MTS';
    WHEN 'Make-to-Order' THEN v_prefix := 'MTO';
    WHEN 'Rework' THEN v_prefix := 'RWK';
    WHEN 'R&D Sample' THEN v_prefix := 'RND';
    ELSE v_prefix := 'WO';
  END CASE;
  
  -- Get current year
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get next sequence number for this year and type
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(wo_number FROM '\d{6}$') AS INTEGER)), 0
  ) + 1
  INTO v_counter
  FROM work_orders
  WHERE wo_number LIKE v_prefix || '-' || v_year || '-%'
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Format sequence number (zero-padded to 6 digits)
  v_sequence := LPAD(v_counter::TEXT, 6, '0');
  
  -- Construct WO number: PREFIX-YYYY-NNNNNN
  v_wo_number := v_prefix || '-' || v_year || '-' || v_sequence;
  
  RETURN v_wo_number;
END;
$$;

-- 2. Calculate Planned Costs Function
CREATE OR REPLACE FUNCTION calculate_planned_wo_costs(p_work_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_material_cost DECIMAL(15,2);
  v_labor_cost DECIMAL(15,2);
  v_overhead_cost DECIMAL(15,2);
  v_total_cost DECIMAL(15,2);
  v_labor_hours DECIMAL(8,2);
  v_target_quantity DECIMAL(15,3);
  v_cost_per_unit DECIMAL(15,4);
  v_result JSONB;
BEGIN
  -- Get target quantity
  SELECT target_quantity INTO v_target_quantity
  FROM work_orders
  WHERE id = p_work_order_id;
  
  -- Calculate total planned material cost
  SELECT COALESCE(SUM(planned_total_cost), 0) INTO v_material_cost
  FROM work_order_materials
  WHERE work_order_id = p_work_order_id;
  
  -- Get estimated labor hours and calculate labor cost
  SELECT estimated_labor_hours, COALESCE(estimated_labor_hours, 0) * COALESCE(labor_rate_per_hour, 0)
  INTO v_labor_hours, v_labor_cost
  FROM work_orders
  WHERE id = p_work_order_id;
  
  -- Calculate overhead based on allocation method
  SELECT CASE overhead_allocation_method
    WHEN 'Labor Hours' THEN COALESCE(v_labor_hours, 0) * COALESCE(overhead_rate, 0)
    WHEN 'Units Produced' THEN COALESCE(v_target_quantity, 0) * COALESCE(overhead_rate, 0)
    WHEN 'Fixed Amount' THEN COALESCE(overhead_rate, 0)
    ELSE 0
  END INTO v_overhead_cost
  FROM work_orders
  WHERE id = p_work_order_id;
  
  -- Calculate total
  v_total_cost := COALESCE(v_material_cost, 0) + COALESCE(v_labor_cost, 0) + COALESCE(v_overhead_cost, 0);
  
  -- Calculate cost per unit
  IF v_target_quantity > 0 THEN
    v_cost_per_unit := v_total_cost / v_target_quantity;
  ELSE
    v_cost_per_unit := 0;
  END IF;
  
  -- Update work order
  UPDATE work_orders
  SET planned_material_cost = v_material_cost,
      planned_labor_cost = v_labor_cost,
      planned_overhead_cost = v_overhead_cost,
      planned_total_cost = v_total_cost,
      planned_cost_per_unit = v_cost_per_unit,
      updated_at = NOW()
  WHERE id = p_work_order_id;
  
  -- Build result JSON
  v_result := jsonb_build_object(
    'material_cost', v_material_cost,
    'labor_cost', v_labor_cost,
    'overhead_cost', v_overhead_cost,
    'total_cost', v_total_cost,
    'cost_per_unit', v_cost_per_unit
  );
  
  RETURN v_result;
END;
$$;

-- 3. Calculate Actual Costs Function
CREATE OR REPLACE FUNCTION calculate_actual_wo_costs(p_work_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_material_cost DECIMAL(15,2);
  v_labor_cost DECIMAL(15,2);
  v_overhead_cost DECIMAL(15,2);
  v_total_cost DECIMAL(15,2);
  v_actual_quantity DECIMAL(15,3);
  v_cost_per_unit DECIMAL(15,4);
  v_result JSONB;
BEGIN
  -- Get actual quantity
  SELECT actual_quantity INTO v_actual_quantity
  FROM work_orders
  WHERE id = p_work_order_id;
  
  -- Calculate total actual material cost from consumption records
  SELECT COALESCE(SUM(actual_total_cost), 0) INTO v_material_cost
  FROM work_order_materials
  WHERE work_order_id = p_work_order_id AND is_consumed = true;
  
  -- Calculate total actual labor cost
  SELECT COALESCE(SUM(labor_cost), 0) INTO v_labor_cost
  FROM work_order_labor
  WHERE work_order_id = p_work_order_id;
  
  -- Get allocated overhead
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_overhead_cost
  FROM work_order_overhead
  WHERE work_order_id = p_work_order_id;
  
  -- Calculate total
  v_total_cost := v_material_cost + v_labor_cost + v_overhead_cost;
  
  -- Calculate cost per unit
  IF v_actual_quantity > 0 THEN
    v_cost_per_unit := v_total_cost / v_actual_quantity;
  ELSE
    v_cost_per_unit := 0;
  END IF;
  
  -- Update work order with actual costs and variances
  UPDATE work_orders
  SET actual_material_cost = v_material_cost,
      actual_labor_cost = v_labor_cost,
      actual_overhead_cost = v_overhead_cost,
      actual_total_cost = v_total_cost,
      actual_cost_per_unit = v_cost_per_unit,
      material_variance = v_material_cost - planned_material_cost,
      labor_variance = v_labor_cost - planned_labor_cost,
      overhead_variance = v_overhead_cost - planned_overhead_cost,
      total_variance = v_total_cost - planned_total_cost,
      updated_at = NOW()
  WHERE id = p_work_order_id;
  
  -- Build result JSON
  v_result := jsonb_build_object(
    'material_cost', v_material_cost,
    'labor_cost', v_labor_cost,
    'overhead_cost', v_overhead_cost,
    'total_cost', v_total_cost,
    'cost_per_unit', v_cost_per_unit
  );
  
  RETURN v_result;
END;
$$;

-- 4. Work Order Status Change Trigger
CREATE OR REPLACE FUNCTION log_wo_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.wo_status IS DISTINCT FROM NEW.wo_status THEN
    INSERT INTO work_order_status_history (
      work_order_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.wo_status,
      NEW.wo_status,
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wo_status_change ON work_orders;
CREATE TRIGGER trg_wo_status_change
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  WHEN (OLD.wo_status IS DISTINCT FROM NEW.wo_status)
  EXECUTE FUNCTION log_wo_status_change();

-- 5. Auto-Calculate Costs Trigger on Material Update
CREATE OR REPLACE FUNCTION auto_calculate_wo_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate planned costs when materials are updated
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM calculate_planned_wo_costs(NEW.work_order_id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_calc_planned_costs ON work_order_materials;
CREATE TRIGGER trg_auto_calc_planned_costs
  AFTER INSERT OR UPDATE ON work_order_materials
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_wo_costs();