-- Create function to generate material code based on category
CREATE OR REPLACE FUNCTION public.generate_material_code(p_category text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_sequence integer;
BEGIN
  -- Map category to 3-letter prefix
  v_prefix := CASE p_category
    WHEN 'Ingredients' THEN 'ING'
    WHEN 'Packaging' THEN 'PAC'
    WHEN 'Boxes' THEN 'BOX'
    WHEN 'Chemical' THEN 'CHE'
    WHEN 'Supplies' THEN 'SUP'
    WHEN 'Maintenance' THEN 'MAI'
    WHEN 'Direct Sale' THEN 'DIR'
    ELSE 'MAT'
  END;
  
  -- Get next sequence number for this category
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS integer)), 0) + 1 
  INTO v_sequence
  FROM public.materials 
  WHERE code LIKE v_prefix || '%' 
    AND LENGTH(code) = 9
    AND SUBSTRING(code FROM 4) ~ '^[0-9]+$';
  
  RETURN v_prefix || lpad(v_sequence::text, 6, '0');
END;
$function$;