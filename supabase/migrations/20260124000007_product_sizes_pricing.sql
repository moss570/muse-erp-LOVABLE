-- Add pricing columns to product_sizes table for default SKU-level pricing
-- This provides tier-based pricing at the SKU level, which is the lowest priority
-- in the pricing hierarchy: customer_product_pricing > price_sheets > product_sizes pricing

ALTER TABLE public.product_sizes
ADD COLUMN IF NOT EXISTS distributor_price NUMERIC(12,4) CHECK (distributor_price >= 0),
ADD COLUMN IF NOT EXISTS direct_price NUMERIC(12,4) CHECK (direct_price >= 0);

-- Add indexes for pricing queries
CREATE INDEX IF NOT EXISTS idx_product_sizes_pricing ON public.product_sizes(product_id, distributor_price, direct_price)
WHERE is_active = true;

COMMENT ON COLUMN public.product_sizes.distributor_price IS 'Default distributor tier pricing for this SKU (lowest priority in pricing hierarchy)';
COMMENT ON COLUMN public.product_sizes.direct_price IS 'Default direct tier pricing for this SKU (lowest priority in pricing hierarchy)';
