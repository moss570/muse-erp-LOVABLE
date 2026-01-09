-- Add code column to material_purchase_units for alternative purchase unit codes
ALTER TABLE public.material_purchase_units 
ADD COLUMN code text;

-- Add comment explaining the column
COMMENT ON COLUMN public.material_purchase_units.code IS 'Unique material code for this specific purchase unit configuration';