-- Add box-specific specification fields to materials table
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS box_strength_type text,
ADD COLUMN IF NOT EXISTS box_strength_value text,
ADD COLUMN IF NOT EXISTS box_flute_type text,
ADD COLUMN IF NOT EXISTS box_dimensions_internal text,
ADD COLUMN IF NOT EXISTS box_joint_style text,
ADD COLUMN IF NOT EXISTS box_style_code text,
ADD COLUMN IF NOT EXISTS box_recycled_content_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS box_allergen_free_adhesives boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS box_heavy_metals_coneg boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS box_foreign_material_control boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.materials.box_strength_type IS 'ECT or Burst for box strength measurement type';
COMMENT ON COLUMN public.materials.box_strength_value IS 'e.g., 32 ECT or 200# Test';
COMMENT ON COLUMN public.materials.box_flute_type IS 'B-Flute, C-Flute, BC-Flute (double wall)';
COMMENT ON COLUMN public.materials.box_dimensions_internal IS 'Internal dimensions (L x W x H)';
COMMENT ON COLUMN public.materials.box_joint_style IS 'Glued or Stitched';
COMMENT ON COLUMN public.materials.box_style_code IS 'FEFCO code e.g., RSC 0201';
COMMENT ON COLUMN public.materials.box_recycled_content_verified IS 'Verification that recycled content is free from source contamination';
COMMENT ON COLUMN public.materials.box_allergen_free_adhesives IS 'Confirmation adhesives do not contain undeclared wheat/gluten';
COMMENT ON COLUMN public.materials.box_heavy_metals_coneg IS 'CONEG compliance: Pb, Hg, Cd, Cr(VI) <100ppm';
COMMENT ON COLUMN public.materials.box_foreign_material_control IS 'Supplier confirms mechanical stripping to prevent loose scraps';