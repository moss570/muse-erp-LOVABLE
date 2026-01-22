-- Phase 1: Add size_type column to product_sizes
ALTER TABLE product_sizes 
ADD COLUMN IF NOT EXISTS size_type TEXT DEFAULT 'unit' 
CHECK (size_type IN ('unit', 'case', 'pallet'));

-- Update existing data based on units_per_case
UPDATE product_sizes 
SET size_type = CASE 
  WHEN units_per_case > 1 THEN 'case'
  ELSE 'unit'
END
WHERE size_type IS NULL OR size_type = 'unit';

-- Phase 2: Enhance pallets table
ALTER TABLE pallets 
ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'storage' CHECK (purpose IN ('storage', 'shipping', 'transfer'));

ALTER TABLE pallets 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Phase 3: Deactivate PACKAGE stage (production ends at CASE_PACK)
UPDATE production_stages_master 
SET is_active = FALSE 
WHERE stage_code = 'PACKAGE';

-- Add index for faster size_type filtering
CREATE INDEX IF NOT EXISTS idx_product_sizes_size_type ON product_sizes(size_type);

-- Add index for pallet purpose queries
CREATE INDEX IF NOT EXISTS idx_pallets_purpose ON pallets(purpose);