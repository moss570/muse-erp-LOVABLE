-- Add usage_unit_conversion column to materials table
ALTER TABLE public.materials 
ADD COLUMN usage_unit_conversion numeric;

-- Add comment explaining the field
COMMENT ON COLUMN public.materials.usage_unit_conversion IS 'Number of usage units in one purchase unit (e.g., 22.68 KG per BAG)';