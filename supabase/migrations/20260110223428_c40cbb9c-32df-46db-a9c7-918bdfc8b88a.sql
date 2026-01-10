-- Fix: Update generate_receiving_lot_number to check po_receiving_items 
-- instead of receiving_lots to get unique lot numbers per item
CREATE OR REPLACE FUNCTION public.generate_receiving_lot_number(p_received_date date DEFAULT CURRENT_DATE)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sequence integer;
  v_max_receiving_items integer;
  v_max_receiving_lots integer;
BEGIN
  -- Check BOTH tables to find the highest sequence for this date
  -- This ensures uniqueness even if some items haven't been completed yet
  
  -- Check po_receiving_items
  SELECT COALESCE(MAX(CAST(SPLIT_PART(internal_lot_number, '-', 3) AS integer)), 0)
  INTO v_max_receiving_items
  FROM public.po_receiving_items 
  WHERE internal_lot_number LIKE 'MAT-' || to_char(p_received_date, 'YYYYMMDD') || '-%';
  
  -- Check receiving_lots
  SELECT COALESCE(MAX(CAST(SPLIT_PART(internal_lot_number, '-', 3) AS integer)), 0)
  INTO v_max_receiving_lots
  FROM public.receiving_lots 
  WHERE internal_lot_number LIKE 'MAT-' || to_char(p_received_date, 'YYYYMMDD') || '-%';
  
  -- Use the higher of the two + 1
  v_sequence := GREATEST(v_max_receiving_items, v_max_receiving_lots) + 1;
  
  RETURN 'MAT-' || to_char(p_received_date, 'YYYYMMDD') || '-' || lpad(v_sequence::text, 3, '0');
END;
$function$;