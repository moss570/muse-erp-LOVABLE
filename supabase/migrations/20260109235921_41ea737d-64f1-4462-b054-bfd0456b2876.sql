-- Create function to generate supplier codes
CREATE OR REPLACE FUNCTION public.generate_supplier_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence integer;
BEGIN
  -- Get next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS integer)), 0) + 1 
  INTO v_sequence
  FROM public.suppliers 
  WHERE code LIKE 'SUP-%' 
    AND LENGTH(code) = 9
    AND SUBSTRING(code FROM 5) ~ '^[0-9]+$';
  
  RETURN 'SUP-' || lpad(v_sequence::text, 5, '0');
END;
$$;