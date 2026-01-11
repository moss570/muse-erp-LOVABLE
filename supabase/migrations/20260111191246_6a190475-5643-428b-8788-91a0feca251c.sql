-- Add HACCP (Hazard Analysis Critical Control Point) fields to materials table

-- Biological Hazards
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS haccp_kill_step_applied boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS haccp_rte_or_kill_step text DEFAULT NULL;

-- Chemical Hazards & Allergens
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS haccp_new_allergen boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS haccp_new_allergen_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS haccp_heavy_metal_limits boolean DEFAULT NULL;

-- Physical Hazards
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS haccp_foreign_material_controls text[] DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.materials.haccp_kill_step_applied IS 'Biological Hazards: Does the manufacturer apply a validated kill step?';
COMMENT ON COLUMN public.materials.haccp_rte_or_kill_step IS 'If no kill step: Is this ingredient RTE or will we apply a kill step?';
COMMENT ON COLUMN public.materials.haccp_new_allergen IS 'Chemical Hazards: Does this material introduce a NEW allergen to our facility?';
COMMENT ON COLUMN public.materials.haccp_new_allergen_name IS 'If new allergen: What is that allergen?';
COMMENT ON COLUMN public.materials.haccp_heavy_metal_limits IS 'Are there specific limits for heavy metals, pesticides, or mycotoxins?';
COMMENT ON COLUMN public.materials.haccp_foreign_material_controls IS 'Physical Hazards: Foreign Material Control methods used by manufacturer';