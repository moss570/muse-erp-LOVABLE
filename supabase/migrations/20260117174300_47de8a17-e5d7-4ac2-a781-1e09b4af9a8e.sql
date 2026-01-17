-- Update generate_material_code function with advisory lock to prevent race conditions
CREATE OR REPLACE FUNCTION public.generate_material_code(p_category text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_sequence integer;
  v_lock_id bigint;
BEGIN
  -- Map category to prefix
  v_prefix := CASE p_category
    WHEN 'Ingredients' THEN 'ING'
    WHEN 'Packaging' THEN 'PAX'
    WHEN 'Boxes' THEN 'BOX'
    WHEN 'Chemical' THEN 'CHE'
    WHEN 'Supplies' THEN 'SUP'
    WHEN 'Maintenance' THEN 'MAI'
    WHEN 'Direct Sale' THEN 'DIR'
    ELSE 'MAT'
  END;
  
  -- Create a lock ID based on prefix (ensures same-category calls are serialized)
  v_lock_id := hashtext(v_prefix);
  
  -- Acquire advisory lock (released at end of transaction)
  PERFORM pg_advisory_xact_lock(v_lock_id);
  
  -- Now safely get next sequence
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS integer)), 0) + 1 
  INTO v_sequence
  FROM public.materials 
  WHERE code LIKE v_prefix || '%' 
    AND LENGTH(code) = 9
    AND SUBSTRING(code FROM 4) ~ '^[0-9]+$';
  
  RETURN v_prefix || lpad(v_sequence::text, 6, '0');
END;
$$;