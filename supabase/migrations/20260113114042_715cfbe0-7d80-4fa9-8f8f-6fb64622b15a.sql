-- Add requires_upc column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS requires_upc boolean NOT NULL DEFAULT false;

-- Add sku column to product_sizes table
ALTER TABLE public.product_sizes 
ADD COLUMN IF NOT EXISTS sku text;

-- Add packaging_indicator column to product_sizes for per-size override
ALTER TABLE public.product_sizes 
ADD COLUMN IF NOT EXISTS packaging_indicator text DEFAULT '1';

-- Add default_packaging_indicator to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS default_packaging_indicator text DEFAULT '1';

-- Add comment explaining the packaging indicator values
COMMENT ON COLUMN public.company_settings.default_packaging_indicator IS 'Default packaging indicator (1-8) for GTIN-14 case UPC generation. 1=standard inner carton, 2=outer case, etc.';
COMMENT ON COLUMN public.product_sizes.packaging_indicator IS 'Override packaging indicator for this specific size. Uses company default if null.';