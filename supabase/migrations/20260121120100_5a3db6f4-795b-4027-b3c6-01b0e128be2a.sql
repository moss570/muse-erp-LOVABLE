-- Add volume yield fields to product_recipes table
ALTER TABLE public.product_recipes
  ADD COLUMN IF NOT EXISTS batch_weight_kg NUMERIC(10,4) DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS batch_volume NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS batch_volume_unit VARCHAR(20) DEFAULT 'GAL';

-- Add volume yield fields to recipes table (standalone manufacturing recipes)
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS batch_weight_kg NUMERIC(10,4) DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS batch_volume NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS batch_volume_unit VARCHAR(20) DEFAULT 'GAL';

-- Add volume tracking to work_orders
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS target_volume NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS target_volume_uom VARCHAR(20);

-- Add volume tracking to production_schedule
ALTER TABLE public.production_schedule
  ADD COLUMN IF NOT EXISTS planned_volume NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS planned_volume_uom VARCHAR(20);

-- Add volume tracking to production_lots
ALTER TABLE public.production_lots
  ADD COLUMN IF NOT EXISTS quantity_volume NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS volume_uom VARCHAR(20);

-- Add comment for documentation
COMMENT ON COLUMN public.product_recipes.batch_weight_kg IS 'Standard batch weight in KG (always 1 KG per batch)';
COMMENT ON COLUMN public.product_recipes.batch_volume IS 'Volume yield per 1 KG batch';
COMMENT ON COLUMN public.product_recipes.batch_volume_unit IS 'Volume unit: GAL, L, FL_OZ';

COMMENT ON COLUMN public.recipes.batch_weight_kg IS 'Standard batch weight in KG (always 1 KG per batch)';
COMMENT ON COLUMN public.recipes.batch_volume IS 'Volume yield per 1 KG batch';
COMMENT ON COLUMN public.recipes.batch_volume_unit IS 'Volume unit: GAL, L, FL_OZ';