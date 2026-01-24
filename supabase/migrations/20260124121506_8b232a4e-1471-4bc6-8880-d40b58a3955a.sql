-- Fix the update_sales_order_totals function to respect customer tax_exempt status
CREATE OR REPLACE FUNCTION public.update_sales_order_totals()
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
  v_order_id UUID;
  v_customer_tax_exempt BOOLEAN;
BEGIN
  -- Get the order ID
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.sales_order_id;
  ELSE
    v_order_id := NEW.sales_order_id;
  END IF;
  
  -- Calculate new subtotal
  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM sales_order_items
  WHERE sales_order_id = v_order_id;
  
  -- Get order tax rate, shipping, and customer tax exempt status
  SELECT so.tax_rate, COALESCE(so.shipping_charge, 0), COALESCE(c.tax_exempt, false)
  INTO v_tax_rate, v_shipping, v_customer_tax_exempt
  FROM sales_orders so
  JOIN customers c ON c.id = so.customer_id
  WHERE so.id = v_order_id;
  
  -- Only calculate tax if customer is NOT tax exempt
  IF v_customer_tax_exempt = true THEN
    v_tax_amount := 0;
  ELSE
    v_tax_amount := v_subtotal * COALESCE(v_tax_rate, 0);
  END IF;
  
  -- Update order totals
  UPDATE sales_orders
  SET subtotal = v_subtotal,
      tax_amount = v_tax_amount,
      total_amount = v_subtotal + v_shipping + v_tax_amount,
      updated_at = now()
  WHERE id = v_order_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;