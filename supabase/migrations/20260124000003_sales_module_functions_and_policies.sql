-- =============================================
-- SALES MODULE - FUNCTIONS, TRIGGERS, AND RLS POLICIES
-- Part 2 of sales module migration
-- =============================================

-- =============================================
-- 1. NUMBER GENERATION FUNCTIONS
-- =============================================

-- Generate sales order number (SO-YYYYMMDD-NNN)
CREATE OR REPLACE FUNCTION public.generate_sales_order_number(
  p_order_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM public.sales_orders
  WHERE order_date = p_order_date;

  RETURN 'SO-' || to_char(p_order_date, 'YYYYMMDD') || '-' || lpad(v_sequence::TEXT, 3, '0');
END;
$$;

-- Generate shipment number (SHIP-YYYYMMDD-NNN)
CREATE OR REPLACE FUNCTION public.generate_shipment_number(
  p_ship_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(shipment_number, '-', 3) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM public.sales_shipments
  WHERE ship_date = p_ship_date;

  RETURN 'SHIP-' || to_char(p_ship_date, 'YYYYMMDD') || '-' || lpad(v_sequence::TEXT, 3, '0');
END;
$$;

-- Generate invoice number (INV-YYYYMMDD-NNN)
CREATE OR REPLACE FUNCTION public.generate_invoice_number(
  p_invoice_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM public.sales_invoices
  WHERE invoice_date = p_invoice_date
    AND invoice_type = 'invoice';

  RETURN 'INV-' || to_char(p_invoice_date, 'YYYYMMDD') || '-' || lpad(v_sequence::TEXT, 3, '0');
END;
$$;

-- Generate credit memo number (CM-YYYYMMDD-NNN)
CREATE OR REPLACE FUNCTION public.generate_credit_memo_number(
  p_invoice_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM public.sales_invoices
  WHERE invoice_date = p_invoice_date
    AND invoice_type = 'credit_memo';

  RETURN 'CM-' || to_char(p_invoice_date, 'YYYYMMDD') || '-' || lpad(v_sequence::TEXT, 3, '0');
END;
$$;

-- Generate RMA number (RMA-YYYYMMDD-NNN)
CREATE OR REPLACE FUNCTION public.generate_rma_number(
  p_request_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(rma_number, '-', 3) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM public.rma_requests
  WHERE request_date = p_request_date;

  RETURN 'RMA-' || to_char(p_request_date, 'YYYYMMDD') || '-' || lpad(v_sequence::TEXT, 3, '0');
END;
$$;

-- Generate payment receipt number (PMT-YYYYMMDD-NNN)
CREATE OR REPLACE FUNCTION public.generate_payment_receipt_number(
  p_payment_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receipt_number, '-', 3) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM public.payment_receipts
  WHERE payment_date = p_payment_date;

  RETURN 'PMT-' || to_char(p_payment_date, 'YYYYMMDD') || '-' || lpad(v_sequence::TEXT, 3, '0');
END;
$$;

-- =============================================
-- 2. BUSINESS LOGIC FUNCTIONS
-- =============================================

-- Update sales order totals when items change
CREATE OR REPLACE FUNCTION public.update_sales_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal NUMERIC(12,2);
  v_tax_rate NUMERIC(5,4);
  v_tax_amount NUMERIC(12,2);
  v_shipping NUMERIC(12,2);
  v_total NUMERIC(12,2);
  v_customer_taxable BOOLEAN;
BEGIN
  -- Calculate subtotal from line items
  SELECT COALESCE(SUM(line_total), 0)
  INTO v_subtotal
  FROM public.sales_order_items
  WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);

  -- Get tax rate and shipping from order
  SELECT
    so.tax_rate,
    so.shipping_charge,
    c.tax_exempt
  INTO v_tax_rate, v_shipping, v_customer_taxable
  FROM public.sales_orders so
  JOIN public.customers c ON c.id = so.customer_id
  WHERE so.id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);

  -- Calculate tax (only if customer is taxable)
  IF v_customer_taxable = false THEN
    v_tax_amount := v_subtotal * COALESCE(v_tax_rate, 0);
  ELSE
    v_tax_amount := 0;
  END IF;

  -- Calculate total
  v_total := v_subtotal + v_tax_amount + COALESCE(v_shipping, 0);

  -- Update sales order
  UPDATE public.sales_orders
  SET
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total_amount = v_total
  WHERE id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update shipment item quantities on sales order items
CREATE OR REPLACE FUNCTION public.update_order_item_shipped_quantities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_shipped INTEGER;
BEGIN
  -- Calculate total shipped for this order item
  SELECT COALESCE(SUM(ssi.quantity_shipped), 0)
  INTO v_total_shipped
  FROM public.sales_shipment_items ssi
  WHERE ssi.sales_order_item_id = COALESCE(NEW.sales_order_item_id, OLD.sales_order_item_id);

  -- Update sales order item
  UPDATE public.sales_order_items
  SET quantity_shipped = v_total_shipped
  WHERE id = COALESCE(NEW.sales_order_item_id, OLD.sales_order_item_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update invoice payment status when payments applied
CREATE OR REPLACE FUNCTION public.update_invoice_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_applied NUMERIC(12,2);
  v_invoice_total NUMERIC(12,2);
  v_new_status TEXT;
BEGIN
  -- Calculate total applied to this invoice
  SELECT
    COALESCE(SUM(pa.amount_applied), 0),
    si.total_amount
  INTO v_total_applied, v_invoice_total
  FROM public.sales_invoices si
  LEFT JOIN public.payment_applications pa ON pa.sales_invoice_id = si.id
  WHERE si.id = COALESCE(NEW.sales_invoice_id, OLD.sales_invoice_id)
  GROUP BY si.total_amount;

  -- Determine payment status
  IF v_total_applied = 0 THEN
    v_new_status := 'unpaid';
  ELSIF v_total_applied >= v_invoice_total THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Update invoice
  UPDATE public.sales_invoices
  SET
    amount_paid = v_total_applied,
    payment_status = v_new_status
  WHERE id = COALESCE(NEW.sales_invoice_id, OLD.sales_invoice_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update payment receipt applied amount
CREATE OR REPLACE FUNCTION public.update_payment_receipt_applied()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_applied NUMERIC(12,2);
  v_payment_amount NUMERIC(12,2);
  v_new_status TEXT;
BEGIN
  -- Calculate total applied from this receipt
  SELECT
    COALESCE(SUM(pa.amount_applied), 0),
    pr.payment_amount
  INTO v_total_applied, v_payment_amount
  FROM public.payment_receipts pr
  LEFT JOIN public.payment_applications pa ON pa.payment_receipt_id = pr.id
  WHERE pr.id = COALESCE(NEW.payment_receipt_id, OLD.payment_receipt_id)
  GROUP BY pr.payment_amount;

  -- Determine status
  IF v_total_applied = 0 THEN
    v_new_status := 'pending';
  ELSIF v_total_applied >= v_payment_amount THEN
    v_new_status := 'applied';
  ELSE
    v_new_status := 'partially_applied';
  END IF;

  -- Update receipt
  UPDATE public.payment_receipts
  SET
    amount_applied = v_total_applied,
    status = v_new_status
  WHERE id = COALESCE(NEW.payment_receipt_id, OLD.payment_receipt_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================
-- 3. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Sales Orders
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales orders viewable by authenticated"
  ON public.sales_orders FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can create sales orders"
  ON public.sales_orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update their own draft orders"
  ON public.sales_orders FOR UPDATE
  USING (created_by = auth.uid() AND status = 'draft');

CREATE POLICY "Managers can update all orders"
  ON public.sales_orders FOR UPDATE
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Only admins can delete orders"
  ON public.sales_orders FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Sales Order Items
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales order items viewable by authenticated"
  ON public.sales_order_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can manage items on their draft orders"
  ON public.sales_order_items FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sales_orders so
      WHERE so.id = sales_order_items.sales_order_id
      AND (so.created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()))
    )
  );

-- Sales Shipments
ALTER TABLE public.sales_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shipments viewable by authenticated"
  ON public.sales_shipments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage shipments"
  ON public.sales_shipments FOR ALL
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Sales Shipment Items
ALTER TABLE public.sales_shipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shipment items viewable by authenticated"
  ON public.sales_shipment_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage shipment items"
  ON public.sales_shipment_items FOR ALL
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Sales Invoices
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoices viewable by authenticated"
  ON public.sales_invoices FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage invoices"
  ON public.sales_invoices FOR ALL
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Sales Invoice Items
ALTER TABLE public.sales_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoice items viewable by authenticated"
  ON public.sales_invoice_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage invoice items"
  ON public.sales_invoice_items FOR ALL
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Payment Receipts
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment receipts viewable by authenticated"
  ON public.payment_receipts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage payment receipts"
  ON public.payment_receipts FOR ALL
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Payment Applications
ALTER TABLE public.payment_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment applications viewable by authenticated"
  ON public.payment_applications FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage payment applications"
  ON public.payment_applications FOR ALL
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- RMA Requests
ALTER TABLE public.rma_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RMA requests viewable by authenticated"
  ON public.rma_requests FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can create RMA requests"
  ON public.rma_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update their own draft RMAs"
  ON public.rma_requests FOR UPDATE
  USING (created_by = auth.uid() AND status = 'requested');

CREATE POLICY "Managers can update all RMAs"
  ON public.rma_requests FOR UPDATE
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Only admins can delete RMAs"
  ON public.rma_requests FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RMA Items
ALTER TABLE public.rma_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RMA items viewable by authenticated"
  ON public.rma_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can manage items on their RMAs"
  ON public.rma_items FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.rma_requests rma
      WHERE rma.id = rma_items.rma_id
      AND (rma.created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()))
    )
  );

-- Lot Returns
ALTER TABLE public.lot_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lot returns viewable by authenticated"
  ON public.lot_returns FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage lot returns"
  ON public.lot_returns FOR ALL
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- =============================================
-- 4. TRIGGERS FOR updated_at
-- =============================================

CREATE TRIGGER update_sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_sales_order_items_updated_at
  BEFORE UPDATE ON public.sales_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_sales_shipments_updated_at
  BEFORE UPDATE ON public.sales_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_sales_invoices_updated_at
  BEFORE UPDATE ON public.sales_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payment_receipts_updated_at
  BEFORE UPDATE ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_rma_requests_updated_at
  BEFORE UPDATE ON public.rma_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 5. BUSINESS LOGIC TRIGGERS
-- =============================================

-- Update order totals when items change
CREATE TRIGGER sales_order_items_update_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_sales_order_totals();

-- Update shipped quantities when shipments change
CREATE TRIGGER sales_shipment_items_update_quantities
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_shipment_items
  FOR EACH ROW EXECUTE FUNCTION public.update_order_item_shipped_quantities();

-- Update invoice payment status when payments applied
CREATE TRIGGER payment_applications_update_invoice
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payment_status();

-- Update payment receipt applied amounts
CREATE TRIGGER payment_applications_update_receipt
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_payment_receipt_applied();

-- =============================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE public.sales_orders IS 'Sales orders with complete workflow from draft to invoiced';
COMMENT ON TABLE public.sales_order_items IS 'Line items for sales orders with fulfillment tracking';
COMMENT ON TABLE public.sales_shipments IS 'Individual shipments (supports partial shipments per order)';
COMMENT ON TABLE public.sales_shipment_items IS 'Links order items to shipments';
COMMENT ON TABLE public.sales_invoices IS 'Sales invoices and credit memos';
COMMENT ON TABLE public.sales_invoice_items IS 'Line items for invoices';
COMMENT ON TABLE public.payment_receipts IS 'Customer payments with AI remittance processing';
COMMENT ON TABLE public.payment_applications IS 'Links payments to specific invoices';
COMMENT ON TABLE public.rma_requests IS 'Return merchandise authorizations with approval workflow';
COMMENT ON TABLE public.rma_items IS 'Items being returned in RMA';
COMMENT ON TABLE public.lot_returns IS 'Track returned production lots with disposition';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
