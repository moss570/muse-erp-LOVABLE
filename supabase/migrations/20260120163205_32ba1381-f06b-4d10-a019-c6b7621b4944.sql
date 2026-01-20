
-- ============================================
-- MANUFACTURING MODULE - PHASE 1 PART 1
-- Database Foundation for Lot/Batch System & Production Lines
-- ============================================

-- 1. Production Lines Table
CREATE TABLE IF NOT EXISTS production_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_code VARCHAR(50) UNIQUE NOT NULL,
  line_name VARCHAR(100) NOT NULL,
  line_type VARCHAR(50) NOT NULL CHECK (line_type IN ('Batch', 'Continuous')),
  capacity_value DECIMAL(10,2),
  capacity_uom VARCHAR(20),
  capacity_basis VARCHAR(50) CHECK (capacity_basis IN ('per_batch', 'per_hour', 'per_day')),
  average_runtime_hours DECIMAL(5,2),
  changeover_time_minutes INTEGER DEFAULT 30,
  cleaning_time_minutes INTEGER DEFAULT 45,
  is_allergen_dedicated BOOLEAN DEFAULT false,
  dedicated_allergen VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_production_lines_active ON production_lines(is_active);
CREATE INDEX IF NOT EXISTS idx_production_lines_type ON production_lines(line_type);
CREATE INDEX IF NOT EXISTS idx_production_lines_code ON production_lines(line_code);

-- RLS Policies
ALTER TABLE production_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view production lines"
  ON production_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage production lines"
  ON production_lines FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Production Line Capacity Rules Table
CREATE TABLE IF NOT EXISTS production_line_capacity_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_line_id UUID REFERENCES production_lines(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  package_type VARCHAR(100),
  capacity_per_hour DECIMAL(10,2),
  capacity_uom VARCHAR(20),
  setup_time_minutes INTEGER DEFAULT 15,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(production_line_id, material_id, package_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_line_capacity_line ON production_line_capacity_rules(production_line_id);
CREATE INDEX IF NOT EXISTS idx_line_capacity_material ON production_line_capacity_rules(material_id);

-- RLS Policies
ALTER TABLE production_line_capacity_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view capacity rules"
  ON production_line_capacity_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage capacity rules"
  ON production_line_capacity_rules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Manufacturing Lots Table (core lot tracking)
CREATE TABLE IF NOT EXISTS manufacturing_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number VARCHAR(50) UNIQUE NOT NULL,
  material_id UUID REFERENCES materials(id),
  lot_type VARCHAR(50) NOT NULL CHECK (lot_type IN ('Raw Material', 'Base', 'Flavored Mix', 'Finished Good', 'Packaging', 'Rework', 'WIP')),
  production_date DATE NOT NULL,
  expiration_date DATE,
  quantity DECIMAL(15,3) NOT NULL,
  quantity_uom VARCHAR(20) NOT NULL,
  quantity_remaining DECIMAL(15,3) NOT NULL,
  production_line_id UUID REFERENCES production_lines(id),
  work_order_id UUID,
  lot_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (lot_status IN ('Pending', 'Approved', 'Hold', 'Rejected', 'Consumed', 'Expired')),
  hold_reason TEXT,
  hold_date TIMESTAMPTZ,
  hold_by UUID REFERENCES auth.users(id),
  approved_date TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_date TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  temperature_log JSONB,
  storage_location VARCHAR(100),
  operator_id UUID REFERENCES auth.users(id),
  shift VARCHAR(20),
  is_opened BOOLEAN DEFAULT false,
  opened_date TIMESTAMPTZ,
  opened_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mfg_lots_number ON manufacturing_lots(lot_number);
CREATE INDEX IF NOT EXISTS idx_mfg_lots_material ON manufacturing_lots(material_id);
CREATE INDEX IF NOT EXISTS idx_mfg_lots_status ON manufacturing_lots(lot_status);
CREATE INDEX IF NOT EXISTS idx_mfg_lots_type ON manufacturing_lots(lot_type);
CREATE INDEX IF NOT EXISTS idx_mfg_lots_prod_date ON manufacturing_lots(production_date);
CREATE INDEX IF NOT EXISTS idx_mfg_lots_exp_date ON manufacturing_lots(expiration_date);

-- RLS Policies
ALTER TABLE manufacturing_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lots"
  ON manufacturing_lots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage lots"
  ON manufacturing_lots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Lot Genealogy Table (Parent-Child Relationships)
CREATE TABLE IF NOT EXISTS lot_genealogy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_lot_id UUID REFERENCES manufacturing_lots(id) ON DELETE CASCADE,
  child_lot_id UUID REFERENCES manufacturing_lots(id) ON DELETE CASCADE,
  quantity_used DECIMAL(15,3) NOT NULL,
  quantity_uom VARCHAR(20) NOT NULL,
  usage_date TIMESTAMPTZ DEFAULT NOW(),
  stage VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(parent_lot_id, child_lot_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_genealogy_parent ON lot_genealogy(parent_lot_id);
CREATE INDEX IF NOT EXISTS idx_genealogy_child ON lot_genealogy(child_lot_id);
CREATE INDEX IF NOT EXISTS idx_genealogy_usage_date ON lot_genealogy(usage_date);

-- RLS Policies
ALTER TABLE lot_genealogy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view genealogy"
  ON lot_genealogy FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage genealogy"
  ON lot_genealogy FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Lot Consumption Tracking Table
CREATE TABLE IF NOT EXISTS lot_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID,
  consumed_lot_id UUID REFERENCES manufacturing_lots(id),
  material_id UUID REFERENCES materials(id),
  quantity_consumed DECIMAL(15,3) NOT NULL,
  quantity_uom VARCHAR(20) NOT NULL,
  consumption_type VARCHAR(50) CHECK (consumption_type IN ('Planned', 'Actual', 'Variance')),
  consumption_method VARCHAR(50) CHECK (consumption_method IN ('Scanned', 'Manual', 'Backflushed')),
  scanned_at TIMESTAMPTZ,
  scanned_by UUID REFERENCES auth.users(id),
  manually_entered_at TIMESTAMPTZ,
  manually_entered_by UUID REFERENCES auth.users(id),
  ai_validation_status VARCHAR(50) CHECK (ai_validation_status IN ('Pending', 'Approved', 'Warning', 'Failed')),
  ai_validation_notes TEXT,
  supervisor_override BOOLEAN DEFAULT false,
  override_reason TEXT,
  override_by UUID REFERENCES auth.users(id),
  override_at TIMESTAMPTZ,
  stage VARCHAR(50),
  actual_unit_cost DECIMAL(15,4),
  actual_total_cost DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consumption_wo ON lot_consumption(work_order_id);
CREATE INDEX IF NOT EXISTS idx_consumption_lot ON lot_consumption(consumed_lot_id);
CREATE INDEX IF NOT EXISTS idx_consumption_material ON lot_consumption(material_id);

-- RLS Policies
ALTER TABLE lot_consumption ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consumption"
  ON lot_consumption FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage consumption"
  ON lot_consumption FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Manufacturing Audit Log Table
CREATE TABLE IF NOT EXISTS manufacturing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'APPROVAL', 'HOLD', 'RELEASE')),
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_table ON manufacturing_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON manufacturing_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON manufacturing_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_date ON manufacturing_audit_log(changed_at);

-- RLS Policies
ALTER TABLE manufacturing_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit log"
  ON manufacturing_audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert audit log"
  ON manufacturing_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- 1. Lot Number Generator Function
CREATE OR REPLACE FUNCTION generate_lot_number(
  p_material_id UUID,
  p_production_date DATE DEFAULT CURRENT_DATE
)
RETURNS VARCHAR AS $$
DECLARE
  v_lot_number VARCHAR(50);
  v_year VARCHAR(2);
  v_julian_day VARCHAR(3);
  v_material_code VARCHAR(10);
  v_batch_number VARCHAR(2);
  v_counter INTEGER;
BEGIN
  -- Get year (last 2 digits)
  v_year := TO_CHAR(p_production_date, 'YY');
  
  -- Get Julian day (day of year, zero-padded to 3 digits)
  v_julian_day := LPAD(TO_CHAR(p_production_date, 'DDD'), 3, '0');
  
  -- Get material code from materials table
  SELECT material_code INTO v_material_code
  FROM materials
  WHERE id = p_material_id;
  
  IF v_material_code IS NULL THEN
    v_material_code := 'XX';
  END IF;
  
  -- Get next batch number for this material on this day
  SELECT COALESCE(MAX(
    CASE 
      WHEN lot_number ~ '\d{2}$' 
      THEN CAST(SUBSTRING(lot_number FROM '\d{2}$') AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1
  INTO v_counter
  FROM manufacturing_lots
  WHERE material_id = p_material_id
    AND production_date = p_production_date;
  
  -- Format batch number (zero-padded to 2 digits)
  v_batch_number := LPAD(v_counter::TEXT, 2, '0');
  
  -- Construct lot number: YY-JJJ-MMBB
  v_lot_number := v_year || '-' || v_julian_day || '-' || v_material_code || v_batch_number;
  
  RETURN v_lot_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Validate Lot Number Format Function
CREATE OR REPLACE FUNCTION validate_lot_number_format(p_lot_number VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_is_valid BOOLEAN := true;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check overall format: YY-JJJ-MMBB
  IF NOT p_lot_number ~ '^\d{2}-\d{3}-[A-Z0-9]{2,6}\d{2}$' THEN
    v_is_valid := false;
    v_errors := array_append(v_errors, 'Invalid lot number format. Expected: YY-JJJ-MMBB');
  END IF;
  
  -- Build result JSON
  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'errors', v_errors,
    'warnings', v_warnings,
    'lot_number', p_lot_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get Lot Genealogy Tree Function
CREATE OR REPLACE FUNCTION get_lot_genealogy_tree(
  p_lot_id UUID,
  p_direction VARCHAR DEFAULT 'both'
)
RETURNS TABLE (
  lot_id UUID,
  lot_number VARCHAR,
  material_name VARCHAR,
  lot_type VARCHAR,
  quantity DECIMAL,
  quantity_uom VARCHAR,
  production_date DATE,
  lot_status VARCHAR,
  relationship VARCHAR,
  depth INTEGER
) AS $$
BEGIN
  -- Get parent lots (backward trace)
  IF p_direction IN ('backward', 'both') THEN
    RETURN QUERY
    WITH RECURSIVE parent_tree AS (
      SELECT 
        ml.id,
        ml.lot_number,
        m.material_name,
        ml.lot_type,
        ml.quantity,
        ml.quantity_uom,
        ml.production_date,
        ml.lot_status,
        'parent'::VARCHAR as relationship,
        1 as depth
      FROM lot_genealogy lg
      JOIN manufacturing_lots ml ON ml.id = lg.parent_lot_id
      JOIN materials m ON m.id = ml.material_id
      WHERE lg.child_lot_id = p_lot_id
      
      UNION ALL
      
      SELECT 
        ml.id,
        ml.lot_number,
        m.material_name,
        ml.lot_type,
        ml.quantity,
        ml.quantity_uom,
        ml.production_date,
        ml.lot_status,
        'parent'::VARCHAR,
        pt.depth + 1
      FROM lot_genealogy lg
      JOIN manufacturing_lots ml ON ml.id = lg.parent_lot_id
      JOIN materials m ON m.id = ml.material_id
      JOIN parent_tree pt ON pt.id = lg.child_lot_id
      WHERE pt.depth < 10
    )
    SELECT * FROM parent_tree;
  END IF;
  
  -- Get child lots (forward trace)
  IF p_direction IN ('forward', 'both') THEN
    RETURN QUERY
    WITH RECURSIVE child_tree AS (
      SELECT 
        ml.id,
        ml.lot_number,
        m.material_name,
        ml.lot_type,
        ml.quantity,
        ml.quantity_uom,
        ml.production_date,
        ml.lot_status,
        'child'::VARCHAR as relationship,
        1 as depth
      FROM lot_genealogy lg
      JOIN manufacturing_lots ml ON ml.id = lg.child_lot_id
      JOIN materials m ON m.id = ml.material_id
      WHERE lg.parent_lot_id = p_lot_id
      
      UNION ALL
      
      SELECT 
        ml.id,
        ml.lot_number,
        m.material_name,
        ml.lot_type,
        ml.quantity,
        ml.quantity_uom,
        ml.production_date,
        ml.lot_status,
        'child'::VARCHAR,
        ct.depth + 1
      FROM lot_genealogy lg
      JOIN manufacturing_lots ml ON ml.id = lg.child_lot_id
      JOIN materials m ON m.id = ml.material_id
      JOIN child_tree ct ON ct.id = lg.parent_lot_id
      WHERE ct.depth < 10
    )
    SELECT * FROM child_tree;
  END IF;
  
  -- Return the lot itself
  RETURN QUERY
  SELECT 
    ml.id,
    ml.lot_number,
    m.material_name,
    ml.lot_type,
    ml.quantity,
    ml.quantity_uom,
    ml.production_date,
    ml.lot_status,
    'self'::VARCHAR as relationship,
    0 as depth
  FROM manufacturing_lots ml
  JOIN materials m ON m.id = ml.material_id
  WHERE ml.id = p_lot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update Lot Remaining Quantity Trigger
CREATE OR REPLACE FUNCTION update_lot_remaining_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update remaining quantity when consumption is recorded
  UPDATE manufacturing_lots
  SET 
    quantity_remaining = quantity_remaining - NEW.quantity_consumed,
    updated_at = NOW()
  WHERE id = NEW.consumed_lot_id;
  
  -- If quantity reaches zero, update status
  UPDATE manufacturing_lots
  SET lot_status = 'Consumed'
  WHERE id = NEW.consumed_lot_id
    AND quantity_remaining <= 0;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_lot_remaining ON lot_consumption;
CREATE TRIGGER trg_update_lot_remaining
  AFTER INSERT ON lot_consumption
  FOR EACH ROW
  EXECUTE FUNCTION update_lot_remaining_quantity();

-- ============================================
-- INITIAL DATA SEEDING
-- ============================================

-- Insert Default Production Lines
INSERT INTO production_lines (line_code, line_name, line_type, capacity_value, capacity_uom, capacity_basis, average_runtime_hours, is_active, sort_order)
VALUES
  ('VAT', 'Vat', 'Batch', 300, 'gal', 'per_batch', 2.0, true, 1),
  ('MIXING', 'Mixing', 'Batch', 500, 'gal', 'per_batch', 3.0, true, 2),
  ('CONT_FREEZER', 'Continuous Freezer', 'Continuous', 200, 'gal', 'per_hour', NULL, true, 3),
  ('BATCH_FREEZER', 'Batch Freezer', 'Batch', 100, 'gal', 'per_batch', 4.0, true, 4),
  ('TABLE_TOP', 'Table Top', 'Batch', 50, 'gal', 'per_batch', 1.0, true, 5)
ON CONFLICT (line_code) DO NOTHING;
