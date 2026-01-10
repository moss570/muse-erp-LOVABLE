-- Add code column to listed_material_names table
ALTER TABLE public.listed_material_names
ADD COLUMN code text;

-- Create unique index for code (only for non-null values)
CREATE UNIQUE INDEX idx_listed_material_names_code 
ON public.listed_material_names(code) 
WHERE code IS NOT NULL;

-- Create function to generate listed material code
CREATE OR REPLACE FUNCTION public.generate_listed_material_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sequence integer;
BEGIN
  -- Get next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS integer)), 0) + 1 
  INTO v_sequence
  FROM public.listed_material_names 
  WHERE code LIKE 'LM-%' 
    AND LENGTH(code) = 8
    AND SUBSTRING(code FROM 4) ~ '^[0-9]+$';
  
  RETURN 'LM-' || lpad(v_sequence::text, 5, '0');
END;
$$;