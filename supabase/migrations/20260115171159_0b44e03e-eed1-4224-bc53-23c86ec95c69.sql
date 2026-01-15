-- Add packaging dimension and weight fields to materials table
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS box_weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS box_length_cm NUMERIC,
ADD COLUMN IF NOT EXISTS box_width_cm NUMERIC,
ADD COLUMN IF NOT EXISTS box_height_cm NUMERIC;

-- Add pallet configuration fields to product_sizes table
ALTER TABLE public.product_sizes
ADD COLUMN IF NOT EXISTS packaging_material_id UUID REFERENCES public.materials(id),
ADD COLUMN IF NOT EXISTS units_per_case INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS ti_count INTEGER,
ADD COLUMN IF NOT EXISTS hi_count INTEGER;

-- Add comment for clarity
COMMENT ON COLUMN public.materials.box_weight_kg IS 'Weight of empty box/container in kg';
COMMENT ON COLUMN public.materials.box_length_cm IS 'Box length in cm';
COMMENT ON COLUMN public.materials.box_width_cm IS 'Box width in cm';
COMMENT ON COLUMN public.materials.box_height_cm IS 'Box height in cm';
COMMENT ON COLUMN public.product_sizes.packaging_material_id IS 'Reference to packaging material (box) used for this product size';
COMMENT ON COLUMN public.product_sizes.units_per_case IS 'Number of units packed per case';
COMMENT ON COLUMN public.product_sizes.ti_count IS 'Number of cases per layer on pallet (Tier)';
COMMENT ON COLUMN public.product_sizes.hi_count IS 'Number of layers on pallet (Height)';