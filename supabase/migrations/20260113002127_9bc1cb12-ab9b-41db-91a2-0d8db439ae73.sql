-- Multi-tiered production workflow: Base → Flavoring → Freezing/Tubbing
-- Each stage creates a new production lot with parent traceability

-- Add production stage enum type
DO $$ BEGIN
  CREATE TYPE production_stage AS ENUM ('base', 'flavoring', 'finished');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add stage and parent tracking to production_lots
ALTER TABLE public.production_lots 
ADD COLUMN IF NOT EXISTS production_stage text DEFAULT 'finished',
ADD COLUMN IF NOT EXISTS parent_production_lot_id uuid REFERENCES public.production_lots(id),
ADD COLUMN IF NOT EXISTS quantity_consumed_from_parent numeric,
ADD COLUMN IF NOT EXISTS stage_released_at timestamptz,
ADD COLUMN IF NOT EXISTS stage_released_by uuid REFERENCES public.profiles(id);

-- Add index for parent lookups
CREATE INDEX IF NOT EXISTS idx_production_lots_parent 
ON public.production_lots(parent_production_lot_id);

-- Add index for stage filtering
CREATE INDEX IF NOT EXISTS idx_production_lots_stage 
ON public.production_lots(production_stage);

-- Add comments
COMMENT ON COLUMN public.production_lots.production_stage IS 
'Stage in multi-tier workflow: base (initial mix), flavoring (adds flavors to base), finished (tubbed/packaged)';

COMMENT ON COLUMN public.production_lots.parent_production_lot_id IS 
'Links to the parent lot this was produced from (e.g., flavored lot links to base lot)';

COMMENT ON COLUMN public.production_lots.quantity_consumed_from_parent IS 
'How much of the parent lot was consumed to create this lot (supports splitting base into multiple flavored lots)';

COMMENT ON COLUMN public.production_lots.stage_released_at IS 
'When QA released this lot for the next production stage';

COMMENT ON COLUMN public.production_lots.stage_released_by IS 
'Who released this lot for the next production stage';

-- Add a field to products to indicate if they require multi-stage production
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS requires_base_stage boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS base_product_id uuid REFERENCES public.products(id);

COMMENT ON COLUMN public.products.requires_base_stage IS 
'If true, this product requires a base stage before flavoring';

COMMENT ON COLUMN public.products.base_product_id IS 
'For flavored products, links to the base product they are made from';