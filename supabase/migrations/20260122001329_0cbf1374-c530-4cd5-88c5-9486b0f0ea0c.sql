-- =============================================
-- Multi-Stage WIP Production Workflow Migration
-- =============================================

-- 1. Add product_size_id to production_lots for tracking sized WIP items (e.g., G-CHOC-08 tubs)
ALTER TABLE production_lots 
ADD COLUMN IF NOT EXISTS product_size_id UUID REFERENCES product_sizes(id);

COMMENT ON COLUMN production_lots.product_size_id IS 
'For stages that produce sized items (tubs, cases). NULL for bulk WIP (e.g., base mix).';

-- 2. Add target_stage_code and product_size_id to work_orders
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS target_stage_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS product_size_id UUID REFERENCES product_sizes(id),
ADD COLUMN IF NOT EXISTS input_lot_id UUID REFERENCES production_lots(id);

COMMENT ON COLUMN work_orders.target_stage_code IS 
'Which production stage this WO is completing (BASE_PREP, FLAVOR, FREEZE, CASE_PACK).';

COMMENT ON COLUMN work_orders.product_size_id IS 
'Target output size for FREEZE/CASE_PACK stages (e.g., G-CHOC-08 or G-CHOC-08-CS4).';

COMMENT ON COLUMN work_orders.input_lot_id IS 
'The WIP lot being consumed from the previous stage.';

-- 3. Add output configuration to production_stages_master
ALTER TABLE production_stages_master 
ADD COLUMN IF NOT EXISTS default_output_uom VARCHAR(20) DEFAULT 'KG';

COMMENT ON COLUMN production_stages_master.default_output_uom IS 
'Default UOM for this stage output: KG, GAL, or EA (eaches for discrete items like tubs/cases).';

-- 4. Update FREEZE stage to create intermediate lots and use EA output
UPDATE production_stages_master 
SET creates_intermediate_lot = TRUE,
    default_output_uom = 'EA'
WHERE stage_code = 'FREEZE';

-- 5. Add CASE_PACK stage if it doesn't exist
INSERT INTO production_stages_master (
  stage_code, 
  stage_name, 
  sequence_order, 
  stage_type, 
  captures_material_cost, 
  captures_labor_cost, 
  captures_overhead, 
  requires_qc_approval, 
  creates_intermediate_lot,
  default_output_uom,
  is_active
)
SELECT 
  'CASE_PACK',
  'Case Packing',
  5,
  'Packaging',
  TRUE,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  'EA',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM production_stages_master WHERE stage_code = 'CASE_PACK'
);

-- 6. Shift existing stages if CASE_PACK was inserted
UPDATE production_stages_master 
SET sequence_order = sequence_order + 1 
WHERE stage_code IN ('PACKAGE', 'QC_FINAL') 
  AND sequence_order >= 5
  AND EXISTS (SELECT 1 FROM production_stages_master WHERE stage_code = 'CASE_PACK');

-- 7. Add wip_lot_id to work_order_stage_progress for tracking stage output
ALTER TABLE work_order_stage_progress 
ADD COLUMN IF NOT EXISTS wip_lot_id UUID REFERENCES production_lots(id),
ADD COLUMN IF NOT EXISTS output_product_size_id UUID REFERENCES product_sizes(id);

COMMENT ON COLUMN work_order_stage_progress.wip_lot_id IS 
'The WIP lot created when this stage was completed (for stages with creates_intermediate_lot = TRUE).';

COMMENT ON COLUMN work_order_stage_progress.output_product_size_id IS 
'The product size being produced at this stage (for FREEZE/CASE_PACK).';

-- 8. Create or replace function to handle stage completion with WIP lot creation
CREATE OR REPLACE FUNCTION complete_production_stage_v2(
  p_work_order_id UUID,
  p_stage_code VARCHAR(50),
  p_output_quantity NUMERIC,
  p_waste_quantity NUMERIC DEFAULT 0,
  p_output_product_size_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_work_order RECORD;
  v_stage RECORD;
  v_stage_progress RECORD;
  v_input_quantity NUMERIC;
  v_yield_percentage NUMERIC;
  v_wip_lot_id UUID;
  v_wip_lot_number TEXT;
  v_cumulative_costs RECORD;
  v_result JSONB;
BEGIN
  -- Get work order details
  SELECT * INTO v_work_order 
  FROM work_orders 
  WHERE id = p_work_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Work order not found');
  END IF;
  
  -- Get stage configuration
  SELECT * INTO v_stage 
  FROM production_stages_master 
  WHERE stage_code = p_stage_code AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Stage not found or inactive');
  END IF;
  
  -- Get stage progress record
  SELECT * INTO v_stage_progress 
  FROM work_order_stage_progress 
  WHERE work_order_id = p_work_order_id 
    AND stage_id = v_stage.id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Stage progress record not found');
  END IF;
  
  -- Calculate yield
  v_input_quantity := COALESCE(v_stage_progress.input_quantity, v_work_order.target_quantity);
  v_yield_percentage := CASE 
    WHEN v_input_quantity > 0 THEN (p_output_quantity / v_input_quantity) * 100 
    ELSE 0 
  END;
  
  -- Get cumulative costs from stage progress
  SELECT 
    COALESCE(cumulative_material_cost, 0) AS material,
    COALESCE(cumulative_labor_cost, 0) AS labor,
    COALESCE(cumulative_overhead_cost, 0) AS overhead,
    COALESCE(cumulative_total_cost, 0) AS total
  INTO v_cumulative_costs
  FROM work_order_stage_progress
  WHERE work_order_id = p_work_order_id AND stage_id = v_stage.id;
  
  -- If this stage creates an intermediate lot, create the WIP lot
  IF v_stage.creates_intermediate_lot THEN
    -- Generate lot number
    SELECT generate_lot_number() INTO v_wip_lot_number;
    
    -- Create WIP lot
    INSERT INTO production_lots (
      lot_number,
      product_id,
      product_size_id,
      production_stage,
      quantity_produced,
      quantity_available,
      production_date,
      julian_day,
      batch_number,
      machine_id,
      approval_status,
      work_order_id,
      parent_production_lot_id,
      material_cost,
      labor_cost,
      overhead_cost,
      total_cost,
      quantity_volume,
      volume_uom
    ) VALUES (
      v_wip_lot_number,
      v_work_order.product_id,
      COALESCE(p_output_product_size_id, v_work_order.product_size_id),
      p_stage_code,
      p_output_quantity,
      p_output_quantity,
      CURRENT_DATE,
      EXTRACT(DOY FROM CURRENT_DATE)::INTEGER,
      1,
      (SELECT machine_id FROM production_lots WHERE work_order_id = p_work_order_id LIMIT 1),
      CASE WHEN v_stage.requires_qc_approval THEN 'Pending' ELSE 'Approved' END,
      p_work_order_id,
      v_work_order.input_lot_id,
      v_cumulative_costs.material,
      v_cumulative_costs.labor,
      v_cumulative_costs.overhead,
      v_cumulative_costs.total,
      CASE WHEN v_stage.default_output_uom = 'EA' THEN NULL ELSE p_output_quantity END,
      CASE WHEN v_stage.default_output_uom = 'EA' THEN NULL ELSE v_stage.default_output_uom END
    )
    RETURNING id INTO v_wip_lot_id;
  END IF;
  
  -- Update stage progress record
  UPDATE work_order_stage_progress 
  SET 
    stage_status = 'Completed',
    output_quantity = p_output_quantity,
    waste_quantity = p_waste_quantity,
    yield_percentage = v_yield_percentage,
    wip_lot_id = v_wip_lot_id,
    output_product_size_id = COALESCE(p_output_product_size_id, v_work_order.product_size_id),
    completed_at = NOW(),
    completed_by = auth.uid()
  WHERE work_order_id = p_work_order_id AND stage_id = v_stage.id;
  
  -- Build result
  v_result := jsonb_build_object(
    'success', TRUE,
    'yield_percentage', v_yield_percentage,
    'wip_lot_id', v_wip_lot_id,
    'wip_lot_number', v_wip_lot_number,
    'creates_wip', v_stage.creates_intermediate_lot,
    'stage_costs', jsonb_build_object(
      'material', v_cumulative_costs.material,
      'labor', v_cumulative_costs.labor,
      'overhead', v_cumulative_costs.overhead,
      'total', v_cumulative_costs.total
    )
  );
  
  RETURN v_result;
END;
$$;