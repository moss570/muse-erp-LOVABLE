
-- Fix the calculate_landed_costs function to use invoice line item quantity_in_base_unit correctly
-- The quantity should come from the invoice line items, not po_receiving_items
CREATE OR REPLACE FUNCTION public.calculate_landed_costs(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal NUMERIC;
  v_tax_amount NUMERIC;
  v_freight_amount NUMERIC;
  v_additional_costs NUMERIC := 0;
  v_total_costs_to_allocate NUMERIC;
  v_total_usage_quantity NUMERIC;
  v_line RECORD;
  v_usage_quantity NUMERIC;
  v_allocation_ratio NUMERIC;
  v_freight_allocated NUMERIC;
  v_duty_allocated NUMERIC;
  v_other_allocated NUMERIC;
  v_total_landed NUMERIC;
  v_cost_per_unit NUMERIC;
  v_receiving_lot_id UUID;
BEGIN
  -- Get invoice details
  SELECT subtotal, tax_amount, freight_amount 
  INTO v_subtotal, v_tax_amount, v_freight_amount
  FROM public.purchase_order_invoices 
  WHERE id = p_invoice_id;

  IF v_subtotal IS NULL THEN
    RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
  END IF;

  -- Handle nulls
  v_tax_amount := COALESCE(v_tax_amount, 0);
  v_freight_amount := COALESCE(v_freight_amount, 0);

  -- Get total additional costs
  SELECT COALESCE(SUM(amount), 0) INTO v_additional_costs
  FROM public.invoice_additional_costs
  WHERE invoice_id = p_invoice_id;

  -- Total costs to allocate = tax + freight + additional costs
  v_total_costs_to_allocate := v_tax_amount + v_freight_amount + v_additional_costs;

  -- Calculate total usage quantity from INVOICE LINE ITEMS
  -- Use quantity from invoice_line_items (which represents base unit quantity)
  -- multiplied by material's usage_unit_conversion
  SELECT COALESCE(SUM(
    ili.quantity * COALESCE(m.usage_unit_conversion, 1)
  ), 0) INTO v_total_usage_quantity
  FROM public.invoice_line_items ili
  JOIN public.materials m ON m.id = ili.material_id
  WHERE ili.invoice_id = p_invoice_id
    AND ili.receiving_item_id IS NOT NULL;

  -- Delete existing allocations for this invoice
  DELETE FROM public.landed_cost_allocations WHERE invoice_id = p_invoice_id;

  -- If no usage quantity, nothing to allocate
  IF v_total_usage_quantity = 0 THEN
    RETURN;
  END IF;

  -- Allocate costs to each line item with a receiving lot
  FOR v_line IN 
    SELECT 
      ili.id as line_item_id,
      ili.quantity as line_qty,  -- This is the quantity from invoice line item
      ili.line_total as material_cost,
      ili.material_id,
      pri.receiving_lot_id,
      COALESCE(m.usage_unit_conversion, 1) as usage_conversion
    FROM public.invoice_line_items ili
    JOIN public.po_receiving_items pri ON pri.id = ili.receiving_item_id
    JOIN public.materials m ON m.id = ili.material_id
    WHERE ili.invoice_id = p_invoice_id
      AND pri.receiving_lot_id IS NOT NULL
  LOOP
    -- Calculate usage quantity for this line (using invoice line qty)
    v_usage_quantity := v_line.line_qty * v_line.usage_conversion;
    
    -- Calculate allocation ratio based on usage quantity
    v_allocation_ratio := v_usage_quantity / v_total_usage_quantity;
    
    -- Allocate freight proportionally
    v_freight_allocated := v_freight_amount * v_allocation_ratio;
    
    -- Allocate tax/duty proportionally
    v_duty_allocated := v_tax_amount * v_allocation_ratio;
    
    -- Allocate other costs proportionally
    v_other_allocated := v_additional_costs * v_allocation_ratio;
    
    -- Calculate total landed cost
    v_total_landed := COALESCE(v_line.material_cost, 0) + v_freight_allocated + v_duty_allocated + v_other_allocated;
    
    -- Calculate cost per base unit (using invoice line qty which is in base units)
    IF v_line.line_qty > 0 THEN
      v_cost_per_unit := v_total_landed / v_line.line_qty;
    ELSE
      v_cost_per_unit := 0;
    END IF;
    
    -- Insert landed cost allocation
    INSERT INTO public.landed_cost_allocations (
      invoice_id,
      receiving_lot_id,
      material_cost,
      freight_allocated,
      duty_allocated,
      other_costs_allocated,
      total_landed_cost,
      quantity_in_base_unit,
      cost_per_base_unit
    ) VALUES (
      p_invoice_id,
      v_line.receiving_lot_id,
      COALESCE(v_line.material_cost, 0),
      v_freight_allocated,
      v_duty_allocated,
      v_other_allocated,
      v_total_landed,
      v_line.line_qty,  -- Use invoice line qty (base unit)
      v_cost_per_unit
    );
  END LOOP;
END;
$$;
