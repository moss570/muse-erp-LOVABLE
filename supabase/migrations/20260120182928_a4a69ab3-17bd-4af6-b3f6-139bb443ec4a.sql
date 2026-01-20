-- ============================================================
-- PHASE 3: RECIPE & BOM MANAGEMENT ENHANCEMENTS
-- ============================================================

-- Add approval workflow columns to product_recipes if not exists
ALTER TABLE public.product_recipes 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Draft' CHECK (approval_status IN ('Draft', 'Pending Review', 'Approved', 'Archived')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recipe_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS material_cost_per_batch DECIMAL(15,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_cost_per_batch DECIMAL(15,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS overhead_cost_per_batch DECIMAL(15,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost_per_batch DECIMAL(15,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(15,6) DEFAULT 0;

-- Recipes table for manufacturing (independent from product_recipes)
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_code VARCHAR(50) UNIQUE NOT NULL,
  recipe_name VARCHAR(200) NOT NULL,
  recipe_version VARCHAR(20) DEFAULT '1.0',
  product_id UUID REFERENCES materials(id),
  
  -- Batch sizing
  batch_size DECIMAL(15,4) NOT NULL DEFAULT 1,
  batch_uom VARCHAR(50) DEFAULT 'kg',
  
  -- Cost fields (calculated)
  material_cost_per_batch DECIMAL(15,4) DEFAULT 0,
  labor_cost_per_batch DECIMAL(15,4) DEFAULT 0,
  overhead_cost_per_batch DECIMAL(15,4) DEFAULT 0,
  total_cost_per_batch DECIMAL(15,4) DEFAULT 0,
  cost_per_unit DECIMAL(15,6) DEFAULT 0,
  
  -- Labor estimates
  standard_labor_hours DECIMAL(10,4) DEFAULT 0,
  standard_machine_hours DECIMAL(10,4) DEFAULT 0,
  
  -- Approval workflow
  approval_status VARCHAR(50) DEFAULT 'Draft' CHECK (approval_status IN ('Draft', 'Pending Review', 'Approved', 'Archived')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Recipe BOM items
CREATE TABLE IF NOT EXISTS recipe_bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  
  -- Quantity
  quantity_required DECIMAL(15,6) NOT NULL,
  quantity_uom VARCHAR(50) NOT NULL,
  
  -- Cost (snapshot from material at time of calculation)
  unit_cost DECIMAL(15,6) DEFAULT 0,
  extended_cost DECIMAL(15,4) DEFAULT 0,
  
  -- Usage
  waste_percentage DECIMAL(5,2) DEFAULT 0,
  is_optional BOOLEAN DEFAULT false,
  sequence_order INTEGER DEFAULT 0,
  stage VARCHAR(50),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe cost history for tracking changes over time
CREATE TABLE IF NOT EXISTS recipe_cost_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Costs at this point in time
  material_cost DECIMAL(15,4),
  labor_cost DECIMAL(15,4),
  overhead_cost DECIMAL(15,4),
  total_cost DECIMAL(15,4),
  cost_per_unit DECIMAL(15,6),
  
  -- What triggered the recalculation
  calculation_reason VARCHAR(100),
  
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- PHASE 4, PART 1: MATERIAL STAGING & COST CAPTURE
-- ============================================================

-- Add columns to lot_consumption table
ALTER TABLE lot_consumption 
ADD COLUMN IF NOT EXISTS actual_unit_cost DECIMAL(15,4),
ADD COLUMN IF NOT EXISTS actual_total_cost DECIMAL(15,2);

-- Add columns to work_order_materials table  
ALTER TABLE work_order_materials 
ADD COLUMN IF NOT EXISTS consumed_lot_ids UUID[],
ADD COLUMN IF NOT EXISTS consumption_complete BOOLEAN DEFAULT false;

-- Material consumption staging table
CREATE TABLE IF NOT EXISTS material_consumption_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  lot_id UUID REFERENCES manufacturing_lots(id),
  
  -- Scanned/Entered Information
  scanned_lot_number VARCHAR(50) NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  scanned_by UUID REFERENCES auth.users(id),
  scan_method VARCHAR(20) CHECK (scan_method IN ('Barcode', 'Manual', 'NFC')),
  
  -- Quantity Information
  quantity_to_use DECIMAL(15,3) NOT NULL,
  quantity_uom VARCHAR(20) NOT NULL,
  
  -- Cost Information
  lot_unit_cost DECIMAL(15,4),
  lot_total_cost DECIMAL(15,2),
  
  -- AI Validation
  ai_validation_status VARCHAR(50) CHECK (ai_validation_status IN ('Pending', 'Approved', 'Warning', 'Failed')),
  ai_validation_notes TEXT,
  ai_validation_checks JSONB,
  
  -- Supervisor Override
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  override_reason TEXT,
  
  -- Stage Assignment
  production_stage VARCHAR(50),
  
  -- Status
  is_committed BOOLEAN DEFAULT false,
  committed_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for staging table
CREATE INDEX IF NOT EXISTS idx_consumption_staging_wo ON material_consumption_staging(work_order_id);
CREATE INDEX IF NOT EXISTS idx_consumption_staging_lot ON material_consumption_staging(lot_id);
CREATE INDEX IF NOT EXISTS idx_consumption_staging_committed ON material_consumption_staging(is_committed);

-- ============================================================
-- PHASE 4, PART 2: PRODUCTION STAGES & COST ACCUMULATION
-- ============================================================

-- Production stages master table
CREATE TABLE IF NOT EXISTS production_stages_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_code VARCHAR(50) UNIQUE NOT NULL,
  stage_name VARCHAR(100) NOT NULL,
  sequence_order INTEGER NOT NULL,
  
  -- Cost Capture Settings
  captures_material_cost BOOLEAN DEFAULT true,
  captures_labor_cost BOOLEAN DEFAULT true,
  captures_overhead BOOLEAN DEFAULT false,
  
  -- Stage Type
  stage_type VARCHAR(50) CHECK (stage_type IN ('Preparation', 'Processing', 'Finishing', 'Packaging', 'Quality')),
  
  -- Completion Settings
  requires_qc_approval BOOLEAN DEFAULT false,
  creates_intermediate_lot BOOLEAN DEFAULT false,
  
  -- Labor Estimation
  standard_labor_hours_per_unit DECIMAL(8,4),
  
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for stages master
CREATE INDEX IF NOT EXISTS idx_stages_master_code ON production_stages_master(stage_code);
CREATE INDEX IF NOT EXISTS idx_stages_master_active ON production_stages_master(is_active);
CREATE INDEX IF NOT EXISTS idx_stages_master_order ON production_stages_master(sequence_order);

-- Insert default stages for ice cream production
INSERT INTO production_stages_master (stage_code, stage_name, sequence_order, stage_type, creates_intermediate_lot, standard_labor_hours_per_unit) VALUES
  ('BASE_PREP', 'Base Preparation', 1, 'Preparation', true, 0.15),
  ('FLAVOR', 'Flavoring', 2, 'Processing', true, 0.10),
  ('FREEZE', 'Freezing & Tubbing', 3, 'Processing', false, 0.20),
  ('HARDEN', 'Hardening', 4, 'Finishing', false, 0.05),
  ('PACKAGE', 'Final Packaging', 5, 'Packaging', false, 0.10),
  ('QC_FINAL', 'Final QC', 6, 'Quality', false, 0.05)
ON CONFLICT (stage_code) DO NOTHING;

-- Work order stage progress table
CREATE TABLE IF NOT EXISTS work_order_stage_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES production_stages_master(id),
  
  -- Stage Status
  stage_status VARCHAR(50) DEFAULT 'Pending' CHECK (stage_status IN ('Pending', 'In Progress', 'QC Hold', 'Completed', 'Skipped')),
  
  -- Timing
  started_at TIMESTAMPTZ,
  started_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  
  -- Quantity Tracking
  input_quantity DECIMAL(15,3),
  output_quantity DECIMAL(15,3),
  waste_quantity DECIMAL(15,3),
  yield_percentage DECIMAL(5,2),
  
  -- Cost Accumulation at this Stage
  material_cost_this_stage DECIMAL(15,2) DEFAULT 0,
  labor_cost_this_stage DECIMAL(15,2) DEFAULT 0,
  overhead_cost_this_stage DECIMAL(15,2) DEFAULT 0,
  total_cost_this_stage DECIMAL(15,2) DEFAULT 0,
  
  -- Cumulative Costs (carried forward from previous stages)
  cumulative_material_cost DECIMAL(15,2) DEFAULT 0,
  cumulative_labor_cost DECIMAL(15,2) DEFAULT 0,
  cumulative_overhead_cost DECIMAL(15,2) DEFAULT 0,
  cumulative_total_cost DECIMAL(15,2) DEFAULT 0,
  
  -- WIP Lot (if intermediate lot created)
  wip_lot_id UUID REFERENCES manufacturing_lots(id),
  
  -- QC
  qc_approved BOOLEAN DEFAULT false,
  qc_approved_by UUID REFERENCES auth.users(id),
  qc_approved_at TIMESTAMPTZ,
  qc_notes TEXT,
  
  -- Notes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for stage progress
CREATE INDEX IF NOT EXISTS idx_stage_progress_wo ON work_order_stage_progress(work_order_id);
CREATE INDEX IF NOT EXISTS idx_stage_progress_stage ON work_order_stage_progress(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_progress_status ON work_order_stage_progress(stage_status);

-- WIP valuation snapshots
CREATE TABLE IF NOT EXISTS wip_valuation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  
  -- WIP Summary
  total_wip_value DECIMAL(15,2) NOT NULL,
  work_order_count INTEGER NOT NULL,
  
  -- Cost Breakdown
  total_material_cost DECIMAL(15,2),
  total_labor_cost DECIMAL(15,2),
  total_overhead_cost DECIMAL(15,2),
  
  -- Details by Stage
  wip_by_stage JSONB,
  
  -- GL Integration
  gl_entry_posted BOOLEAN DEFAULT false,
  gl_entry_id VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(snapshot_date)
);

-- Indexes for WIP snapshots
CREATE INDEX IF NOT EXISTS idx_wip_snapshots_date ON wip_valuation_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_wip_snapshots_posted ON wip_valuation_snapshots(gl_entry_posted);

-- ============================================================
-- DATABASE FUNCTIONS
-- ============================================================

-- Function: Calculate recipe cost
CREATE OR REPLACE FUNCTION calculate_recipe_cost(p_recipe_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_material_cost DECIMAL(15,4) := 0;
  v_labor_cost DECIMAL(15,4) := 0;
  v_overhead_cost DECIMAL(15,4) := 0;
  v_total_cost DECIMAL(15,4) := 0;
  v_cost_per_unit DECIMAL(15,6) := 0;
  v_batch_size DECIMAL(15,4);
  v_labor_hours DECIMAL(10,4);
  v_labor_rate DECIMAL(15,4);
  v_overhead_rate DECIMAL(15,4);
BEGIN
  -- Get recipe info
  SELECT batch_size, standard_labor_hours 
  INTO v_batch_size, v_labor_hours
  FROM recipes WHERE id = p_recipe_id;
  
  -- Get labor rate from settings
  SELECT COALESCE(setting_value, 20.00) INTO v_labor_rate
  FROM manufacturing_cost_settings 
  WHERE setting_key = 'standard_labor_rate' AND is_active = true
  LIMIT 1;
  
  -- Get overhead rate
  SELECT COALESCE(setting_value, 1.50) INTO v_overhead_rate
  FROM manufacturing_cost_settings 
  WHERE setting_key = 'overhead_multiplier' AND is_active = true
  LIMIT 1;
  
  -- Calculate material cost from BOM
  SELECT COALESCE(SUM(
    rbi.quantity_required * COALESCE(m.current_cost, 0) * (1 + COALESCE(rbi.waste_percentage, 0) / 100)
  ), 0) INTO v_material_cost
  FROM recipe_bom_items rbi
  JOIN materials m ON m.id = rbi.material_id
  WHERE rbi.recipe_id = p_recipe_id;
  
  -- Calculate labor cost
  v_labor_cost := COALESCE(v_labor_hours, 0) * COALESCE(v_labor_rate, 20.00);
  
  -- Calculate overhead
  v_overhead_cost := v_labor_cost * COALESCE(v_overhead_rate, 1.50);
  
  -- Total
  v_total_cost := v_material_cost + v_labor_cost + v_overhead_cost;
  
  -- Cost per unit
  IF v_batch_size > 0 THEN
    v_cost_per_unit := v_total_cost / v_batch_size;
  END IF;
  
  -- Update recipe
  UPDATE recipes SET
    material_cost_per_batch = v_material_cost,
    labor_cost_per_batch = v_labor_cost,
    overhead_cost_per_batch = v_overhead_cost,
    total_cost_per_batch = v_total_cost,
    cost_per_unit = v_cost_per_unit,
    updated_at = NOW()
  WHERE id = p_recipe_id;
  
  -- Update BOM item costs
  UPDATE recipe_bom_items rbi SET
    unit_cost = COALESCE((SELECT current_cost FROM materials WHERE id = rbi.material_id), 0),
    extended_cost = rbi.quantity_required * COALESCE((SELECT current_cost FROM materials WHERE id = rbi.material_id), 0) * (1 + COALESCE(rbi.waste_percentage, 0) / 100),
    updated_at = NOW()
  WHERE recipe_id = p_recipe_id;
  
  -- Record in cost history
  INSERT INTO recipe_cost_history (recipe_id, material_cost, labor_cost, overhead_cost, total_cost, cost_per_unit, calculation_reason, calculated_by)
  VALUES (p_recipe_id, v_material_cost, v_labor_cost, v_overhead_cost, v_total_cost, v_cost_per_unit, 'Manual recalculation', auth.uid());
  
  RETURN jsonb_build_object(
    'material_cost', v_material_cost,
    'labor_cost', v_labor_cost,
    'overhead_cost', v_overhead_cost,
    'total_cost', v_total_cost,
    'cost_per_unit', v_cost_per_unit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Initialize work order stages
CREATE OR REPLACE FUNCTION initialize_wo_stages(p_work_order_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO work_order_stage_progress (work_order_id, stage_id, stage_status)
  SELECT p_work_order_id, id, 'Pending'
  FROM production_stages_master
  WHERE is_active = true
  ORDER BY sequence_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Start production stage
CREATE OR REPLACE FUNCTION start_production_stage(
  p_work_order_id UUID,
  p_stage_code VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_stage_id UUID;
  v_stage_progress_id UUID;
  v_previous_stage RECORD;
  v_input_quantity DECIMAL(15,3);
BEGIN
  -- Get stage ID
  SELECT id INTO v_stage_id
  FROM production_stages_master
  WHERE stage_code = p_stage_code;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stage % not found', p_stage_code;
  END IF;
  
  -- Get previous stage costs to carry forward
  SELECT output_quantity, cumulative_material_cost, cumulative_labor_cost,
         cumulative_overhead_cost, cumulative_total_cost
  INTO v_previous_stage
  FROM work_order_stage_progress
  WHERE work_order_id = p_work_order_id
    AND stage_status = 'Completed'
  ORDER BY (SELECT sequence_order FROM production_stages_master WHERE id = stage_id) DESC
  LIMIT 1;
  
  -- Determine input quantity
  IF FOUND THEN
    v_input_quantity := v_previous_stage.output_quantity;
  ELSE
    SELECT target_quantity INTO v_input_quantity
    FROM work_orders WHERE id = p_work_order_id;
  END IF;
  
  -- Update stage progress
  UPDATE work_order_stage_progress SET
    stage_status = 'In Progress',
    started_at = NOW(),
    started_by = auth.uid(),
    input_quantity = v_input_quantity,
    cumulative_material_cost = COALESCE(v_previous_stage.cumulative_material_cost, 0),
    cumulative_labor_cost = COALESCE(v_previous_stage.cumulative_labor_cost, 0),
    cumulative_overhead_cost = COALESCE(v_previous_stage.cumulative_overhead_cost, 0),
    cumulative_total_cost = COALESCE(v_previous_stage.cumulative_total_cost, 0),
    updated_at = NOW()
  WHERE work_order_id = p_work_order_id AND stage_id = v_stage_id
  RETURNING id INTO v_stage_progress_id;
  
  -- Update work order status
  UPDATE work_orders SET
    wo_status = 'In Progress',
    started_at = COALESCE(started_at, NOW()),
    updated_at = NOW()
  WHERE id = p_work_order_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'stage_progress_id', v_stage_progress_id,
    'input_quantity', v_input_quantity,
    'cumulative_costs', jsonb_build_object(
      'material', COALESCE(v_previous_stage.cumulative_material_cost, 0),
      'labor', COALESCE(v_previous_stage.cumulative_labor_cost, 0),
      'overhead', COALESCE(v_previous_stage.cumulative_overhead_cost, 0),
      'total', COALESCE(v_previous_stage.cumulative_total_cost, 0)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Complete production stage
CREATE OR REPLACE FUNCTION complete_production_stage(
  p_work_order_id UUID,
  p_stage_code VARCHAR,
  p_output_quantity DECIMAL,
  p_waste_quantity DECIMAL DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_stage_id UUID;
  v_stage_progress RECORD;
  v_material_cost DECIMAL(15,2);
  v_labor_cost DECIMAL(15,2);
  v_overhead_cost DECIMAL(15,2);
  v_total_stage_cost DECIMAL(15,2);
  v_yield_pct DECIMAL(5,2);
BEGIN
  -- Get stage ID
  SELECT id INTO v_stage_id
  FROM production_stages_master
  WHERE stage_code = p_stage_code;
  
  -- Get current stage progress
  SELECT * INTO v_stage_progress
  FROM work_order_stage_progress
  WHERE work_order_id = p_work_order_id AND stage_id = v_stage_id;
  
  -- Calculate costs added at this stage
  
  -- Material cost (from consumption in this stage)
  SELECT COALESCE(SUM(lot_total_cost), 0) INTO v_material_cost
  FROM material_consumption_staging
  WHERE work_order_id = p_work_order_id
    AND production_stage = p_stage_code
    AND is_committed = true;
  
  -- Labor cost (from time tracking)
  SELECT COALESCE(SUM(labor_cost), 0) INTO v_labor_cost
  FROM work_order_labor
  WHERE work_order_id = p_work_order_id
    AND stage = p_stage_code;
  
  -- Overhead (simplified - 50% of labor)
  v_overhead_cost := v_labor_cost * 0.50;
  
  -- Total this stage
  v_total_stage_cost := v_material_cost + v_labor_cost + v_overhead_cost;
  
  -- Calculate yield
  IF v_stage_progress.input_quantity > 0 THEN
    v_yield_pct := (p_output_quantity / v_stage_progress.input_quantity) * 100;
  ELSE
    v_yield_pct := 100;
  END IF;
  
  -- Update stage progress
  UPDATE work_order_stage_progress SET
    stage_status = 'Completed',
    completed_at = NOW(),
    completed_by = auth.uid(),
    output_quantity = p_output_quantity,
    waste_quantity = p_waste_quantity,
    yield_percentage = v_yield_pct,
    material_cost_this_stage = v_material_cost,
    labor_cost_this_stage = v_labor_cost,
    overhead_cost_this_stage = v_overhead_cost,
    total_cost_this_stage = v_total_stage_cost,
    cumulative_material_cost = cumulative_material_cost + v_material_cost,
    cumulative_labor_cost = cumulative_labor_cost + v_labor_cost,
    cumulative_overhead_cost = cumulative_overhead_cost + v_overhead_cost,
    cumulative_total_cost = cumulative_total_cost + v_total_stage_cost,
    updated_at = NOW()
  WHERE work_order_id = p_work_order_id AND stage_id = v_stage_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'yield_percentage', v_yield_pct,
    'stage_costs', jsonb_build_object(
      'material', v_material_cost,
      'labor', v_labor_cost,
      'overhead', v_overhead_cost,
      'total', v_total_stage_cost
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Stage material for consumption
CREATE OR REPLACE FUNCTION stage_material_for_consumption(
  p_work_order_id UUID,
  p_lot_number VARCHAR,
  p_material_id UUID,
  p_quantity DECIMAL,
  p_scan_method VARCHAR DEFAULT 'Manual',
  p_production_stage VARCHAR DEFAULT 'BASE_PREP'
)
RETURNS JSONB AS $$
DECLARE
  v_lot RECORD;
  v_lot_cost DECIMAL(15,4);
  v_total_cost DECIMAL(15,2);
  v_requires_approval BOOLEAN := false;
  v_staging_id UUID;
  v_validation_status VARCHAR;
BEGIN
  -- Find the lot
  SELECT * INTO v_lot 
  FROM manufacturing_lots 
  WHERE lot_number = p_lot_number;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lot not found',
      'lot_number', p_lot_number
    );
  END IF;
  
  -- Validate lot status
  IF v_lot.lot_status = 'Rejected' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lot is REJECTED');
  END IF;
  
  IF v_lot.lot_status = 'Hold' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lot is on HOLD');
  END IF;
  
  -- Get lot cost from material
  SELECT COALESCE(m.current_cost, 0) INTO v_lot_cost
  FROM materials m WHERE m.id = v_lot.material_id;
  
  -- Calculate total cost
  v_total_cost := p_quantity * v_lot_cost;
  
  -- Manual entry requires approval
  IF p_scan_method = 'Manual' THEN
    v_requires_approval := true;
    v_validation_status := 'Pending';
  ELSE
    v_validation_status := 'Approved';
  END IF;
  
  -- Insert into staging
  INSERT INTO material_consumption_staging (
    work_order_id, material_id, lot_id, scanned_lot_number,
    scanned_by, scan_method, quantity_to_use, quantity_uom,
    lot_unit_cost, lot_total_cost, ai_validation_status,
    requires_approval, production_stage
  ) VALUES (
    p_work_order_id, p_material_id, v_lot.id, p_lot_number,
    auth.uid(), p_scan_method, p_quantity, COALESCE(v_lot.quantity_uom, 'kg'),
    v_lot_cost, v_total_cost, v_validation_status,
    v_requires_approval, p_production_stage
  ) RETURNING id INTO v_staging_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'staging_id', v_staging_id,
    'lot_id', v_lot.id,
    'lot_cost', v_lot_cost,
    'total_cost', v_total_cost,
    'requires_approval', v_requires_approval
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Commit staged materials
CREATE OR REPLACE FUNCTION commit_staged_materials(p_work_order_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_staged RECORD;
  v_committed_count INTEGER := 0;
  v_total_cost DECIMAL(15,2) := 0;
BEGIN
  FOR v_staged IN
    SELECT * FROM material_consumption_staging
    WHERE work_order_id = p_work_order_id
      AND is_committed = false
      AND (ai_validation_status = 'Approved' OR (requires_approval = true AND approved_by IS NOT NULL))
  LOOP
    -- Create lot consumption record
    INSERT INTO lot_consumption (
      work_order_id, consumed_lot_id, material_id,
      quantity_consumed, quantity_uom, consumption_type,
      consumption_method, scanned_at, scanned_by,
      ai_validation_status, stage, actual_unit_cost, actual_total_cost,
      created_by
    ) VALUES (
      v_staged.work_order_id, v_staged.lot_id, v_staged.material_id,
      v_staged.quantity_to_use, v_staged.quantity_uom, 'Actual',
      v_staged.scan_method, v_staged.scanned_at, v_staged.scanned_by,
      v_staged.ai_validation_status, v_staged.production_stage,
      v_staged.lot_unit_cost, v_staged.lot_total_cost,
      auth.uid()
    );
    
    -- Update work_order_materials
    UPDATE work_order_materials SET
      actual_quantity = COALESCE(actual_quantity, 0) + v_staged.quantity_to_use,
      actual_unit_cost = v_staged.lot_unit_cost,
      actual_total_cost = COALESCE(actual_total_cost, 0) + v_staged.lot_total_cost,
      consumed_lot_ids = array_append(COALESCE(consumed_lot_ids, ARRAY[]::UUID[]), v_staged.lot_id),
      updated_at = NOW()
    WHERE work_order_id = v_staged.work_order_id
      AND material_id = v_staged.material_id;
    
    -- Mark staging as committed
    UPDATE material_consumption_staging SET
      is_committed = true,
      committed_at = NOW()
    WHERE id = v_staged.id;
    
    v_committed_count := v_committed_count + 1;
    v_total_cost := v_total_cost + v_staged.lot_total_cost;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'committed_count', v_committed_count,
    'total_cost', v_total_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_cost_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_consumption_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_stages_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_stage_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE wip_valuation_snapshots ENABLE ROW LEVEL SECURITY;

-- Recipes policies
CREATE POLICY "Users can view recipes" ON recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage recipes" ON recipes FOR ALL TO authenticated USING (true);

-- Recipe BOM items policies
CREATE POLICY "Users can view recipe BOM" ON recipe_bom_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage recipe BOM" ON recipe_bom_items FOR ALL TO authenticated USING (true);

-- Recipe cost history policies
CREATE POLICY "Users can view cost history" ON recipe_cost_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert cost history" ON recipe_cost_history FOR INSERT TO authenticated WITH CHECK (true);

-- Material staging policies
CREATE POLICY "Users can view staging" ON material_consumption_staging FOR SELECT TO authenticated USING (true);
CREATE POLICY "Production users can manage staging" ON material_consumption_staging FOR ALL TO authenticated USING (true);

-- Production stages policies
CREATE POLICY "Users can view stages" ON production_stages_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage stages" ON production_stages_master FOR ALL TO authenticated USING (true);

-- Stage progress policies
CREATE POLICY "Users can view stage progress" ON work_order_stage_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "Production users can manage progress" ON work_order_stage_progress FOR ALL TO authenticated USING (true);

-- WIP snapshot policies
CREATE POLICY "Users can view WIP snapshots" ON wip_valuation_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage WIP snapshots" ON wip_valuation_snapshots FOR ALL TO authenticated USING (true);