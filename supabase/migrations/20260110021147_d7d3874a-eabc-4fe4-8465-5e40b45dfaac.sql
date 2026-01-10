-- =============================================
-- PHASE 1: PURCHASE ORDERS & RECEIVING SYSTEM
-- Full traceability for recalls, landed cost calculation
-- =============================================

-- System Settings for approval thresholds and integrations
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default PO approval threshold
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('po_approval_threshold', '{"amount": 5000, "currency": "USD"}', 'PO amount above which manager approval is required'),
  ('xero_integration', '{"enabled": false, "tenant_id": null}', 'Xero accounting integration settings');

-- =============================================
-- PURCHASE ORDERS
-- =============================================

-- PO Status enum-like constraint
-- draft -> pending_approval -> approved -> sent -> partially_received -> received -> closed -> cancelled

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  
  -- Dates
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  
  -- Status & Approval
  status text NOT NULL DEFAULT 'draft',
  requires_approval boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  approval_notes text,
  
  -- Delivery info
  delivery_location_id uuid REFERENCES public.locations(id),
  shipping_method text,
  shipping_terms text, -- FOB, CIF, etc.
  
  -- Totals (calculated)
  subtotal numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  shipping_amount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  
  -- Email tracking
  sent_at timestamptz,
  sent_by uuid REFERENCES public.profiles(id),
  sent_to_emails text[],
  
  -- Audit
  notes text,
  internal_notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PO Line Items
CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  
  -- Material reference
  material_id uuid NOT NULL REFERENCES public.materials(id),
  
  -- Ordering details
  quantity_ordered numeric(12,4) NOT NULL,
  unit_id uuid NOT NULL REFERENCES public.units_of_measure(id),
  unit_cost numeric(12,4) NOT NULL,
  line_total numeric(12,2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
  
  -- Receiving tracking
  quantity_received numeric(12,4) NOT NULL DEFAULT 0,
  quantity_remaining numeric(12,4) GENERATED ALWAYS AS (quantity_ordered - quantity_received) STORED,
  is_fully_received boolean GENERATED ALWAYS AS (quantity_received >= quantity_ordered) STORED,
  
  -- Supplier item info
  supplier_item_number text,
  
  -- Notes
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- RECEIVING SESSIONS (against POs)
-- =============================================

CREATE TABLE public.po_receiving_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id),
  
  -- Receiving info
  receiving_number text NOT NULL UNIQUE,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  received_by uuid REFERENCES public.profiles(id),
  
  -- Delivery info
  location_id uuid REFERENCES public.locations(id),
  carrier_name text,
  driver_name text,
  truck_number text,
  trailer_number text,
  seal_number text,
  seal_intact boolean,
  
  -- Status
  status text NOT NULL DEFAULT 'in_progress', -- in_progress, completed, cancelled
  
  -- Overall inspection result
  inspection_passed boolean,
  inspection_notes text,
  
  -- Audit
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Individual items received in a session
CREATE TABLE public.po_receiving_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_session_id uuid NOT NULL REFERENCES public.po_receiving_sessions(id) ON DELETE CASCADE,
  po_item_id uuid NOT NULL REFERENCES public.purchase_order_items(id),
  
  -- Quantities
  quantity_received numeric(12,4) NOT NULL,
  unit_id uuid NOT NULL REFERENCES public.units_of_measure(id),
  quantity_in_base_unit numeric(12,4) NOT NULL,
  
  -- Lot tracking (critical for recalls)
  supplier_lot_number text,
  internal_lot_number text NOT NULL,
  expiry_date date,
  manufacture_date date,
  
  -- Temperature (food safety)
  temperature_reading numeric(5,2),
  temperature_unit text DEFAULT 'F', -- F or C
  temperature_in_range boolean,
  
  -- Creates a receiving_lot record
  receiving_lot_id uuid REFERENCES public.receiving_lots(id),
  
  -- Inspection status
  inspection_status text DEFAULT 'pending', -- pending, passed, failed, conditional
  rejection_reason text,
  
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- FOOD SAFETY INSPECTIONS
-- =============================================

CREATE TABLE public.receiving_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_item_id uuid NOT NULL REFERENCES public.po_receiving_items(id) ON DELETE CASCADE,
  
  -- Inspection checklist items
  check_type text NOT NULL, -- temperature, packaging, seal, pest, contamination, coa, documentation
  check_name text NOT NULL,
  passed boolean,
  actual_value text, -- e.g., "38°F" for temperature
  expected_value text, -- e.g., "32-40°F"
  
  notes text,
  inspected_by uuid REFERENCES public.profiles(id),
  inspected_at timestamptz NOT NULL DEFAULT now(),
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- INVOICES & LANDED COST
-- =============================================

CREATE TABLE public.purchase_order_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id),
  
  -- Invoice details
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  
  -- Supplier reference
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  
  -- Amounts
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  
  -- Payment status
  payment_status text DEFAULT 'unpaid', -- unpaid, partial, paid
  amount_paid numeric(12,2) DEFAULT 0,
  payment_date date,
  payment_reference text,
  
  -- Xero sync
  xero_invoice_id text,
  xero_synced_at timestamptz,
  xero_sync_status text, -- pending, synced, error
  xero_sync_error text,
  
  -- Audit
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(supplier_id, invoice_number)
);

-- Invoice line items (maps to PO items)
CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.purchase_order_invoices(id) ON DELETE CASCADE,
  po_item_id uuid REFERENCES public.purchase_order_items(id),
  receiving_item_id uuid REFERENCES public.po_receiving_items(id),
  
  -- Item details
  description text NOT NULL,
  quantity numeric(12,4) NOT NULL,
  unit_cost numeric(12,4) NOT NULL,
  line_total numeric(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  
  -- For landed cost allocation
  material_id uuid REFERENCES public.materials(id),
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Additional costs for landed cost calculation
CREATE TABLE public.invoice_additional_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.purchase_order_invoices(id) ON DELETE CASCADE,
  
  cost_type text NOT NULL, -- freight, duty, insurance, handling, customs, other
  description text,
  amount numeric(12,2) NOT NULL,
  
  -- Allocation method for landed cost
  allocation_method text DEFAULT 'proportional', -- proportional (by value), by_weight, by_quantity, specific
  allocated_to_item_id uuid REFERENCES public.invoice_line_items(id), -- if specific allocation
  
  -- Xero account mapping
  xero_account_code text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Landed cost calculation results (stored for audit trail)
CREATE TABLE public.landed_cost_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.purchase_order_invoices(id) ON DELETE CASCADE,
  receiving_lot_id uuid NOT NULL REFERENCES public.receiving_lots(id),
  
  -- Cost breakdown
  material_cost numeric(12,4) NOT NULL,
  freight_allocated numeric(12,4) DEFAULT 0,
  duty_allocated numeric(12,4) DEFAULT 0,
  other_costs_allocated numeric(12,4) DEFAULT 0,
  total_landed_cost numeric(12,4) NOT NULL,
  
  -- Per-unit cost
  quantity_in_base_unit numeric(12,4) NOT NULL,
  cost_per_base_unit numeric(12,6) NOT NULL,
  
  -- Audit
  calculated_at timestamptz NOT NULL DEFAULT now(),
  calculated_by uuid REFERENCES public.profiles(id)
);

-- =============================================
-- RECALL TRACKING
-- =============================================

CREATE TABLE public.recall_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recall identification
  recall_number text NOT NULL UNIQUE,
  recall_type text NOT NULL, -- supplier_initiated, internal, regulatory
  
  -- Scope
  recall_class text, -- Class I (serious), Class II (temporary), Class III (minor)
  reason text NOT NULL,
  
  -- Status
  status text NOT NULL DEFAULT 'initiated', -- initiated, investigating, in_progress, completed, closed
  
  -- Dates
  initiated_date date NOT NULL DEFAULT CURRENT_DATE,
  completed_date date,
  
  -- Source (what triggered the recall)
  source_type text, -- receiving_lot, production_lot, supplier_notification, customer_complaint
  source_supplier_id uuid REFERENCES public.suppliers(id),
  source_supplier_lot text,
  
  -- Impact assessment
  estimated_affected_quantity numeric(12,4),
  actual_affected_quantity numeric(12,4),
  
  -- Response
  corrective_actions text,
  preventive_actions text,
  
  -- Regulatory
  regulatory_notified boolean DEFAULT false,
  regulatory_notification_date date,
  regulatory_reference text,
  
  -- Audit
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Lots affected by recall (bidirectional tracing)
CREATE TABLE public.recall_affected_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_id uuid NOT NULL REFERENCES public.recall_events(id) ON DELETE CASCADE,
  
  -- Can link to receiving or production lots
  receiving_lot_id uuid REFERENCES public.receiving_lots(id),
  production_lot_id uuid REFERENCES public.production_lots(id),
  
  -- Status
  status text NOT NULL DEFAULT 'identified', -- identified, quarantined, recovered, destroyed, released
  
  -- Quantities
  quantity_affected numeric(12,4),
  quantity_recovered numeric(12,4) DEFAULT 0,
  quantity_destroyed numeric(12,4) DEFAULT 0,
  
  -- Location tracking
  current_location_id uuid REFERENCES public.locations(id),
  
  -- Customer impact (if shipped)
  customer_id uuid REFERENCES public.customers(id),
  bol_id uuid REFERENCES public.bills_of_lading(id),
  
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- At least one lot type must be specified
  CONSTRAINT lot_type_check CHECK (receiving_lot_id IS NOT NULL OR production_lot_id IS NOT NULL)
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Generate PO number
CREATE OR REPLACE FUNCTION public.generate_po_number(p_order_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(po_number, '-', 3) AS integer)), 0) + 1 
  INTO v_sequence
  FROM public.purchase_orders 
  WHERE order_date = p_order_date;
  
  RETURN 'PO-' || to_char(p_order_date, 'YYYYMMDD') || '-' || lpad(v_sequence::text, 3, '0');
END;
$$;

-- Generate Receiving number
CREATE OR REPLACE FUNCTION public.generate_receiving_number(p_received_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receiving_number, '-', 3) AS integer)), 0) + 1 
  INTO v_sequence
  FROM public.po_receiving_sessions 
  WHERE received_date = p_received_date;
  
  RETURN 'RCV-' || to_char(p_received_date, 'YYYYMMDD') || '-' || lpad(v_sequence::text, 3, '0');
END;
$$;

-- Generate Recall number
CREATE OR REPLACE FUNCTION public.generate_recall_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_sequence integer;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SPLIT_PART(recall_number, '-', 2) AS integer)), 0) + 1 
  INTO v_sequence
  FROM public.recall_events 
  WHERE recall_number LIKE 'RCL-' || v_year || '-%';
  
  RETURN 'RCL-' || v_year || '-' || lpad(v_sequence::text, 4, '0');
END;
$$;

-- Calculate and allocate landed costs
CREATE OR REPLACE FUNCTION public.calculate_landed_costs(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice record;
  v_line record;
  v_total_material_cost numeric;
  v_total_additional_costs numeric;
  v_additional_cost_ratio numeric;
BEGIN
  -- Get invoice totals
  SELECT subtotal INTO v_total_material_cost
  FROM public.purchase_order_invoices WHERE id = p_invoice_id;
  
  -- Get total additional costs
  SELECT COALESCE(SUM(amount), 0) INTO v_total_additional_costs
  FROM public.invoice_additional_costs 
  WHERE invoice_id = p_invoice_id AND allocation_method = 'proportional';
  
  -- Calculate ratio for proportional allocation
  IF v_total_material_cost > 0 THEN
    v_additional_cost_ratio := v_total_additional_costs / v_total_material_cost;
  ELSE
    v_additional_cost_ratio := 0;
  END IF;
  
  -- Delete existing allocations for this invoice
  DELETE FROM public.landed_cost_allocations WHERE invoice_id = p_invoice_id;
  
  -- Create new allocations for each line item with a receiving lot
  FOR v_line IN 
    SELECT 
      ili.id as line_id,
      ili.line_total,
      pri.receiving_lot_id,
      pri.quantity_in_base_unit
    FROM public.invoice_line_items ili
    JOIN public.po_receiving_items pri ON pri.id = ili.receiving_item_id
    WHERE ili.invoice_id = p_invoice_id
      AND pri.receiving_lot_id IS NOT NULL
  LOOP
    INSERT INTO public.landed_cost_allocations (
      invoice_id,
      receiving_lot_id,
      material_cost,
      other_costs_allocated,
      total_landed_cost,
      quantity_in_base_unit,
      cost_per_base_unit
    ) VALUES (
      p_invoice_id,
      v_line.receiving_lot_id,
      v_line.line_total,
      v_line.line_total * v_additional_cost_ratio,
      v_line.line_total * (1 + v_additional_cost_ratio),
      v_line.quantity_in_base_unit,
      CASE WHEN v_line.quantity_in_base_unit > 0 
        THEN (v_line.line_total * (1 + v_additional_cost_ratio)) / v_line.quantity_in_base_unit
        ELSE 0 
      END
    );
    
    -- Update the receiving lot with the landed cost
    UPDATE public.receiving_lots
    SET cost_per_base_unit = (
      SELECT cost_per_base_unit 
      FROM public.landed_cost_allocations 
      WHERE receiving_lot_id = v_line.receiving_lot_id
      ORDER BY calculated_at DESC LIMIT 1
    )
    WHERE id = v_line.receiving_lot_id;
  END LOOP;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update PO totals when items change
CREATE OR REPLACE FUNCTION public.update_po_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal numeric;
BEGIN
  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM public.purchase_order_items
  WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  UPDATE public.purchase_orders
  SET 
    subtotal = v_subtotal,
    total_amount = v_subtotal + COALESCE(tax_amount, 0) + COALESCE(shipping_amount, 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_po_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
FOR EACH ROW EXECUTE FUNCTION public.update_po_totals();

-- Update PO item received quantities
CREATE OR REPLACE FUNCTION public.update_po_item_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_received numeric;
BEGIN
  SELECT COALESCE(SUM(quantity_received), 0) INTO v_total_received
  FROM public.po_receiving_items
  WHERE po_item_id = COALESCE(NEW.po_item_id, OLD.po_item_id);
  
  UPDATE public.purchase_order_items
  SET 
    quantity_received = v_total_received,
    updated_at = now()
  WHERE id = COALESCE(NEW.po_item_id, OLD.po_item_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_po_item_received_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.po_receiving_items
FOR EACH ROW EXECUTE FUNCTION public.update_po_item_received();

-- Update invoice totals
CREATE OR REPLACE FUNCTION public.update_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal numeric;
  v_additional numeric;
BEGIN
  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM public.invoice_line_items
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  SELECT COALESCE(SUM(amount), 0) INTO v_additional
  FROM public.invoice_additional_costs
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  UPDATE public.purchase_order_invoices
  SET 
    subtotal = v_subtotal,
    total_amount = v_subtotal + COALESCE(tax_amount, 0) + v_additional,
    updated_at = now()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_invoice_totals_line_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
FOR EACH ROW EXECUTE FUNCTION public.update_invoice_totals();

CREATE TRIGGER update_invoice_totals_costs_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_additional_costs
FOR EACH ROW EXECUTE FUNCTION public.update_invoice_totals();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_orders_order_date ON public.purchase_orders(order_date);
CREATE INDEX idx_po_items_material ON public.purchase_order_items(material_id);
CREATE INDEX idx_po_receiving_po ON public.po_receiving_sessions(purchase_order_id);
CREATE INDEX idx_po_receiving_items_lot ON public.po_receiving_items(internal_lot_number);
CREATE INDEX idx_po_receiving_items_supplier_lot ON public.po_receiving_items(supplier_lot_number);
CREATE INDEX idx_invoices_po ON public.purchase_order_invoices(purchase_order_id);
CREATE INDEX idx_invoices_xero ON public.purchase_order_invoices(xero_invoice_id);
CREATE INDEX idx_recall_affected_receiving ON public.recall_affected_lots(receiving_lot_id);
CREATE INDEX idx_recall_affected_production ON public.recall_affected_lots(production_lot_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_receiving_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_receiving_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_additional_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landed_cost_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_affected_lots ENABLE ROW LEVEL SECURITY;

-- System Settings policies
CREATE POLICY "Settings viewable by authenticated" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can manage settings" ON public.system_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Purchase Orders policies
CREATE POLICY "POs viewable by authenticated" ON public.purchase_orders FOR SELECT USING (true);
CREATE POLICY "Admins and managers can insert POs" ON public.purchase_orders FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "Admins and managers can update POs" ON public.purchase_orders FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Only admins can delete POs" ON public.purchase_orders FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- PO Items policies
CREATE POLICY "PO items viewable by authenticated" ON public.purchase_order_items FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage PO items" ON public.purchase_order_items FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Receiving Sessions policies
CREATE POLICY "Receiving sessions viewable by authenticated" ON public.po_receiving_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert receiving sessions" ON public.po_receiving_sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can update receiving sessions" ON public.po_receiving_sessions FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Only admins can delete receiving sessions" ON public.po_receiving_sessions FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Receiving Items policies
CREATE POLICY "Receiving items viewable by authenticated" ON public.po_receiving_items FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert receiving items" ON public.po_receiving_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can update receiving items" ON public.po_receiving_items FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Only admins can delete receiving items" ON public.po_receiving_items FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Inspections policies
CREATE POLICY "Inspections viewable by authenticated" ON public.receiving_inspections FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert inspections" ON public.receiving_inspections FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can update inspections" ON public.receiving_inspections FOR UPDATE USING (is_admin_or_manager(auth.uid()));

-- Invoice policies
CREATE POLICY "Invoices viewable by authenticated" ON public.purchase_order_invoices FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage invoices" ON public.purchase_order_invoices FOR ALL USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Invoice lines viewable by authenticated" ON public.invoice_line_items FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage invoice lines" ON public.invoice_line_items FOR ALL USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Additional costs viewable by authenticated" ON public.invoice_additional_costs FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage additional costs" ON public.invoice_additional_costs FOR ALL USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Landed costs viewable by authenticated" ON public.landed_cost_allocations FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage landed costs" ON public.landed_cost_allocations FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Recall policies
CREATE POLICY "Recalls viewable by authenticated" ON public.recall_events FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage recalls" ON public.recall_events FOR ALL USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Recall lots viewable by authenticated" ON public.recall_affected_lots FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage recall lots" ON public.recall_affected_lots FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Updated at triggers for new tables
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_po_items_updated_at BEFORE UPDATE ON public.purchase_order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_po_receiving_sessions_updated_at BEFORE UPDATE ON public.po_receiving_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_po_receiving_items_updated_at BEFORE UPDATE ON public.po_receiving_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.purchase_order_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_recall_events_updated_at BEFORE UPDATE ON public.recall_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_recall_lots_updated_at BEFORE UPDATE ON public.recall_affected_lots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();