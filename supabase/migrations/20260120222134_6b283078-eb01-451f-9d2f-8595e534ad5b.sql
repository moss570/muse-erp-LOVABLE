-- Add inventory threshold columns to material_purchase_units
ALTER TABLE material_purchase_units
  ADD COLUMN IF NOT EXISTS par_level numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reorder_point numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_stock_level numeric DEFAULT NULL;

COMMENT ON COLUMN material_purchase_units.par_level IS 'Target inventory level for this pack size';
COMMENT ON COLUMN material_purchase_units.reorder_point IS 'Threshold to trigger reorder alert';
COMMENT ON COLUMN material_purchase_units.max_stock_level IS 'Maximum inventory cap for this pack size';