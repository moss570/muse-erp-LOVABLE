-- Add usage_unit_id column to materials table
ALTER TABLE public.materials 
ADD COLUMN usage_unit_id uuid REFERENCES public.units_of_measure(id);

-- Add comment explaining the field
COMMENT ON COLUMN public.materials.usage_unit_id IS 'Unit used when issuing materials to production (e.g., KG for ingredients, EACH for packaging)';