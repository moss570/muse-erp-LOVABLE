-- Phase 1: Database Schema Enhancements for Enhanced Work Order Planning

-- 1.1 Create stage-to-category mapping table
CREATE TABLE IF NOT EXISTS stage_category_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_code VARCHAR(50) NOT NULL,
  category_code VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_stage_category UNIQUE (stage_code, category_code)
);

-- Enable RLS
ALTER TABLE stage_category_mapping ENABLE ROW LEVEL SECURITY;

-- Create policy for reading
CREATE POLICY "Allow all users to read stage_category_mapping"
ON stage_category_mapping FOR SELECT
USING (true);

-- Seed data for stage-category mappings
INSERT INTO stage_category_mapping (stage_code, category_code, is_primary) VALUES
  ('BASE_PREP', 'BASE', true),
  ('FLAVOR', 'GELATO', true),
  ('FLAVOR', 'ICE_CREAM', true),
  ('FLAVOR', 'SHERBET', true),
  ('FLAVOR', 'SORBET', true),
  ('FLAVOR', 'FROZEN_YOGURT', true)
ON CONFLICT (stage_code, category_code) DO NOTHING;

-- 1.2 Add default_line_id to production_stages_master
ALTER TABLE production_stages_master 
ADD COLUMN IF NOT EXISTS default_line_id UUID REFERENCES production_lines(id);

-- Set default production lines for each stage
UPDATE production_stages_master SET default_line_id = '4f3e1047-f809-4bce-b807-940a2aa36450' WHERE stage_code = 'BASE_PREP'; -- VAT
UPDATE production_stages_master SET default_line_id = '51dbb846-7b98-4ba9-83a4-1ab349b79e7f' WHERE stage_code = 'FLAVOR'; -- Mixing
UPDATE production_stages_master SET default_line_id = '9b75c7e2-d773-4074-b792-0566ee9c31f1' WHERE stage_code = 'FREEZE'; -- Continuous Freezer

-- 1.3 Add product family tracking columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_family_head BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS family_head_id UUID REFERENCES products(id);

-- Create index for family lookups
CREATE INDEX IF NOT EXISTS idx_products_family_head ON products(family_head_id) WHERE family_head_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_family_head ON products(is_family_head) WHERE is_family_head = true;

-- 1.4 Create function to check input availability for WO planning
CREATE OR REPLACE FUNCTION check_wo_input_availability(
  p_stage_code TEXT,
  p_product_id UUID,
  p_recipe_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  result JSON;
  input_stage_code TEXT;
  inventory_data JSONB;
  scheduled_data JSONB;
  total_inventory NUMERIC := 0;
  total_scheduled NUMERIC := 0;
  base_material_info JSONB;
BEGIN
  -- Determine which stage's output we need as input
  CASE p_stage_code
    WHEN 'FLAVOR' THEN input_stage_code := 'BASE_PREP';
    WHEN 'FREEZE' THEN input_stage_code := 'FLAVOR';
    WHEN 'CASE_PACK' THEN input_stage_code := 'FREEZE';
    ELSE input_stage_code := NULL;
  END CASE;
  
  -- If BASE_PREP, no input needed
  IF input_stage_code IS NULL THEN
    RETURN json_build_object(
      'needs_input', false,
      'message', 'This stage does not require input from a previous stage'
    );
  END IF;
  
  -- Get available inventory from previous stage
  SELECT 
    COALESCE(SUM(pl.quantity_available), 0),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'lot_id', pl.id,
        'lot_number', pl.lot_number,
        'quantity', pl.quantity_available,
        'uom', pl.volume_uom
      )
    ) FILTER (WHERE pl.quantity_available > 0), '[]'::jsonb)
  INTO total_inventory, inventory_data
  FROM production_lots pl
  WHERE pl.product_id = p_product_id
    AND pl.production_stage = input_stage_code
    AND pl.approval_status = 'Approved'
    AND pl.quantity_available > 0;
  
  -- Get scheduled production for previous stage
  SELECT 
    COALESCE(SUM(wo.target_quantity), 0),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'wo_id', wo.id,
        'wo_number', wo.wo_number,
        'quantity', wo.target_quantity,
        'uom', wo.target_uom,
        'scheduled_date', wo.scheduled_date
      )
    ) FILTER (WHERE wo.scheduled_date IS NOT NULL), '[]'::jsonb)
  INTO total_scheduled, scheduled_data
  FROM work_orders wo
  WHERE wo.product_id = p_product_id
    AND wo.target_stage_code = input_stage_code
    AND wo.wo_status IN ('Created', 'Scheduled', 'In Progress')
    AND wo.scheduled_date IS NOT NULL;
  
  -- Build result
  RETURN json_build_object(
    'needs_input', true,
    'input_stage', input_stage_code,
    'inventory_available', total_inventory,
    'inventory_lots', inventory_data,
    'scheduled_quantity', total_scheduled,
    'scheduled_work_orders', scheduled_data,
    'total_available', total_inventory + total_scheduled,
    'status', CASE
      WHEN total_inventory > 0 THEN 'inventory_available'
      WHEN total_scheduled > 0 THEN 'scheduled_only'
      ELSE 'none_available'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;