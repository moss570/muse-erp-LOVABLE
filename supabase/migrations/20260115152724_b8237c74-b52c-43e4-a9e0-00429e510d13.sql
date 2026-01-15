-- Add SKU prefix to product_categories
ALTER TABLE public.product_categories
ADD COLUMN IF NOT EXISTS sku_prefix TEXT;

COMMENT ON COLUMN public.product_categories.sku_prefix IS 'SKU prefix for products in this category (e.g., G, IC14, IC10, SOR)';

-- Add unique constraint for sku_prefix
ALTER TABLE public.product_categories
ADD CONSTRAINT product_categories_sku_prefix_unique UNIQUE (sku_prefix);

-- Create container_sizes table
CREATE TABLE IF NOT EXISTS public.container_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  volume_gallons NUMERIC NOT NULL,
  sku_code TEXT NOT NULL UNIQUE,
  target_weight_kg NUMERIC,
  min_weight_kg NUMERIC,
  max_weight_kg NUMERIC,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.container_sizes IS 'Standardized container sizes with volume, SKU codes, and weight specifications for quality control';
COMMENT ON COLUMN public.container_sizes.name IS 'Container name (e.g., Half Gallon, Pint, Quart)';
COMMENT ON COLUMN public.container_sizes.volume_gallons IS 'Volume in gallons for production reporting';
COMMENT ON COLUMN public.container_sizes.sku_code IS '2-digit code used in SKU generation (e.g., 08, 16, 32)';
COMMENT ON COLUMN public.container_sizes.target_weight_kg IS 'Target weight in kilograms for this container size';
COMMENT ON COLUMN public.container_sizes.min_weight_kg IS 'Minimum acceptable weight (quality control lower limit)';
COMMENT ON COLUMN public.container_sizes.max_weight_kg IS 'Maximum acceptable weight (quality control upper limit)';

-- Enable RLS
ALTER TABLE public.container_sizes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view container sizes"
  ON public.container_sizes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage container sizes"
  ON public.container_sizes FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_container_sizes_updated_at
  BEFORE UPDATE ON public.container_sizes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default container sizes
INSERT INTO public.container_sizes (name, volume_gallons, sku_code, target_weight_kg, min_weight_kg, max_weight_kg, sort_order) VALUES
  ('Pint', 0.0625, '16', 0.28, 0.27, 0.30, 1),
  ('Quart', 0.25, '32', 0.57, 0.55, 0.60, 2),
  ('Half Gallon', 0.5, '08', 2.27, 2.20, 2.35, 3),
  ('Gallon', 1.0, '01', 4.54, 4.40, 4.70, 4);

-- Enhance product_sizes table
ALTER TABLE public.product_sizes
ADD COLUMN IF NOT EXISTS container_size_id UUID REFERENCES public.container_sizes(id),
ADD COLUMN IF NOT EXISTS box_material_id UUID REFERENCES public.materials(id),
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS min_weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS max_weight_kg NUMERIC;

COMMENT ON COLUMN public.product_sizes.container_size_id IS 'Links to standardized container size configuration';
COMMENT ON COLUMN public.product_sizes.box_material_id IS 'Box material used for this case pack (references materials with category = Boxes)';
COMMENT ON COLUMN public.product_sizes.sku IS 'Generated SKU for this product size';
COMMENT ON COLUMN public.product_sizes.target_weight_kg IS 'Product-specific target weight override (uses container_size default if null)';
COMMENT ON COLUMN public.product_sizes.min_weight_kg IS 'Product-specific minimum weight override (uses container_size default if null)';
COMMENT ON COLUMN public.product_sizes.max_weight_kg IS 'Product-specific maximum weight override (uses container_size default if null)';