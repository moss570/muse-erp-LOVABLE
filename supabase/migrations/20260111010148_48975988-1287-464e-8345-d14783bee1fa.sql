-- Fix the calculate_landed_costs function - correct variable assignment
CREATE OR REPLACE FUNCTION public.calculate_landed_costs(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_line record;
  v_subtotal numeric := 0;
  v_total_usage_quantity numeric := 0;
  v_total_costs_to_allocate numeric := 0;
  v_tax_amount numeric := 0;
  v_freight_amount numeric := 0;
  v_additional_costs numeric := 0;
  v_cost_per_usage_unit numeric := 0;
BEGIN
  -- Get invoice details including tax and freight
  SELECT 
    COALESCE(subtotal, 0), 
    COALESCE(tax_amount, 0), 
    COALESCE(freight_amount, 0)
  INTO 
    v_subtotal, 
    v_tax_amount, 
    v_freight_amount
  FROM public.purchase_order_invoices 
  WHERE id = p_invoice_id;
  
  -- Get total additional costs (from separate additional costs table)
  SELECT COALESCE(SUM(amount), 0) INTO v_additional_costs
  FROM public.invoice_additional_costs 
  WHERE invoice_id = p_invoice_id;
  
  -- Total costs to allocate = tax + freight + additional costs
  v_total_costs_to_allocate := v_tax_amount + v_freight_amount + v_additional_costs;
  
  -- Calculate total usage quantity (convert base unit qty to usage units)
  SELECT COALESCE(SUM(
    pri.quantity_in_base_unit * COALESCE(m.usage_unit_conversion, 1)
  ), 0) INTO v_total_usage_quantity
  FROM public.invoice_line_items ili
  JOIN public.po_receiving_items pri ON pri.id = ili.receiving_item_id
  JOIN public.materials m ON m.id = ili.material_id
  WHERE ili.invoice_id = p_invoice_id
    AND pri.receiving_lot_id IS NOT NULL;
  
  -- Calculate cost per usage unit for allocation
  IF v_total_usage_quantity > 0 THEN
    v_cost_per_usage_unit := v_total_costs_to_allocate / v_total_usage_quantity;
  ELSE
    v_cost_per_usage_unit := 0;
  END IF;
  
  -- Delete existing allocations for this invoice
  DELETE FROM public.landed_cost_allocations WHERE invoice_id = p_invoice_id;
  
  -- Create new allocations for each line item with a receiving lot
  FOR v_line IN 
    SELECT 
      ili.id as line_id,
      ili.line_total,
      pri.receiving_lot_id,
      pri.quantity_in_base_unit,
      m.usage_unit_conversion,
      pri.quantity_in_base_unit * COALESCE(m.usage_unit_conversion, 1) as usage_quantity
    FROM public.invoice_line_items ili
    JOIN public.po_receiving_items pri ON pri.id = ili.receiving_item_id
    JOIN public.materials m ON m.id = ili.material_id
    WHERE ili.invoice_id = p_invoice_id
      AND pri.receiving_lot_id IS NOT NULL
  LOOP
    DECLARE
      v_allocated_costs numeric;
      v_total_landed numeric;
      v_cost_per_base numeric;
      v_freight_alloc numeric;
      v_duty_alloc numeric;
      v_other_alloc numeric;
    BEGIN
      -- Calculate allocated costs based on usage quantity proportion
      v_allocated_costs := v_line.usage_quantity * v_cost_per_usage_unit;
      
      -- Break down by cost type (proportionally)
      IF v_total_costs_to_allocate > 0 THEN
        v_freight_alloc := v_allocated_costs * (v_freight_amount / v_total_costs_to_allocate);
        v_duty_alloc := v_allocated_costs * (v_tax_amount / v_total_costs_to_allocate);
        v_other_alloc := v_allocated_costs * (v_additional_costs / v_total_costs_to_allocate);
      ELSE
        v_freight_alloc := 0;
        v_duty_alloc := 0;
        v_other_alloc := 0;
      END IF;
      
      v_total_landed := v_line.line_total + v_allocated_costs;
      
      IF v_line.quantity_in_base_unit > 0 THEN
        v_cost_per_base := v_total_landed / v_line.quantity_in_base_unit;
      ELSE
        v_cost_per_base := 0;
      END IF;
      
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
        v_line.line_total,
        v_freight_alloc,
        v_duty_alloc,
        v_other_alloc,
        v_total_landed,
        v_line.quantity_in_base_unit,
        v_cost_per_base
      );
      
      UPDATE public.receiving_lots
      SET cost_per_base_unit = v_cost_per_base
      WHERE id = v_line.receiving_lot_id;
    END;
  END LOOP;
END;
$function$;