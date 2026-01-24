-- Create a function to recalculate order totals when order fields change
CREATE OR REPLACE FUNCTION public.recalculate_sales_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal NUMERIC;
  v_tax_rate NUMERIC;
  v_shipping NUMERIC;
  v_tax_amount NUMERIC;
  v_customer_tax_exempt BOOLEAN;
BEGIN
  -- Only recalculate if shipping_charge or tax_rate changed
  IF OLD.shipping_charge IS DISTINCT FROM NEW.shipping_charge 
     OR OLD.tax_rate IS DISTINCT FROM NEW.tax_rate THEN
    
    -- Get current subtotal
    v_subtotal := COALESCE(NEW.subtotal, 0);
    v_tax_rate := COALESCE(NEW.tax_rate, 0);
    v_shipping := COALESCE(NEW.shipping_charge, 0);
    
    -- Get customer tax exempt status
    SELECT COALESCE(tax_exempt, false) INTO v_customer_tax_exempt
    FROM customers
    WHERE id = NEW.customer_id;
    
    -- Calculate tax only if customer is NOT tax exempt
    IF v_customer_tax_exempt = true THEN
      v_tax_amount := 0;
    ELSE
      v_tax_amount := v_subtotal * v_tax_rate;
    END IF;
    
    -- Update the totals
    NEW.tax_amount := v_tax_amount;
    NEW.total_amount := v_subtotal + v_shipping + v_tax_amount;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on sales_orders BEFORE UPDATE
DROP TRIGGER IF EXISTS recalculate_sales_order_totals_trigger ON public.sales_orders;
CREATE TRIGGER recalculate_sales_order_totals_trigger
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.recalculate_sales_order_totals();