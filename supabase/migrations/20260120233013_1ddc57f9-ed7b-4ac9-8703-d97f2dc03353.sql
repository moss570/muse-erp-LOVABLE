-- Create function to generate sequential work order numbers
CREATE OR REPLACE FUNCTION public.generate_wo_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_year text;
  next_seq integer;
  new_wo_number text;
BEGIN
  current_year := to_char(current_date, 'YYYY');
  
  -- Get the next sequence number for the current year
  SELECT COALESCE(MAX(
    CASE 
      WHEN wo_number ~ ('^WO-' || current_year || '-[0-9]+$') 
      THEN CAST(substring(wo_number from 9) AS integer)
      ELSE 0 
    END
  ), 0) + 1 INTO next_seq
  FROM work_orders
  WHERE wo_number LIKE 'WO-' || current_year || '-%';
  
  -- Format as WO-YYYY-NNNN (4 digits padded with zeros)
  new_wo_number := 'WO-' || current_year || '-' || lpad(next_seq::text, 4, '0');
  
  RETURN new_wo_number;
END;
$$;