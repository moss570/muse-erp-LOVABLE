-- Add packaging specification columns to materials table
ALTER TABLE public.materials
ADD COLUMN pkg_fda_food_contact boolean DEFAULT false,
ADD COLUMN pkg_material_type text,
ADD COLUMN pkg_weight_kg numeric,
ADD COLUMN pkg_volume numeric,
ADD COLUMN pkg_volume_uom_id uuid REFERENCES public.units_of_measure(id),
ADD COLUMN pkg_recyclable boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.materials.pkg_fda_food_contact IS 'Approved by FDA for food contact';
COMMENT ON COLUMN public.materials.pkg_material_type IS 'Material type (e.g., Plastic, Glass, Metal)';
COMMENT ON COLUMN public.materials.pkg_weight_kg IS 'Weight of packaging in KG';
COMMENT ON COLUMN public.materials.pkg_volume IS 'Volume of container';
COMMENT ON COLUMN public.materials.pkg_volume_uom_id IS 'Unit of measure for volume';
COMMENT ON COLUMN public.materials.pkg_recyclable IS 'Can be recycled';