-- =============================================
-- SALES MODULE ENHANCEMENTS
-- Customer Hierarchy, Digital Signatures, Invoice Features
-- =============================================

-- =============================================
-- 1. CUSTOMER HIERARCHY (Master Company + Child Locations)
-- =============================================

-- Add parent company relationship to existing customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES public.customers(id),
ADD COLUMN IF NOT EXISTS is_master_company BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_name TEXT;  -- e.g., "Orlando Warehouse", "Tampa Store"

-- Index for parent-child lookups
CREATE INDEX IF NOT EXISTS idx_customers_parent_company ON public.customers(parent_company_id);
CREATE INDEX IF NOT EXISTS idx_customers_master ON public.customers(is_master_company) WHERE is_master_company = true;

-- Comments
COMMENT ON COLUMN public.customers.parent_company_id IS 'Links child location to master billing company';
COMMENT ON COLUMN public.customers.is_master_company IS 'True if this is a master billing account (parent)';
COMMENT ON COLUMN public.customers.location_name IS 'Location identifier for child accounts (e.g., "Downtown Store")';

-- Function to get master company for a customer
CREATE OR REPLACE FUNCTION public.get_master_company(p_customer_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_master_id UUID;
  v_parent_id UUID;
BEGIN
  -- Get parent company ID
  SELECT parent_company_id INTO v_parent_id
  FROM public.customers
  WHERE id = p_customer_id;

  -- If no parent, this customer IS the master
  IF v_parent_id IS NULL THEN
    RETURN p_customer_id;
  ELSE
    RETURN v_parent_id;
  END IF;
END;
$$;

-- Function to get all child locations for a master company
CREATE OR REPLACE FUNCTION public.get_child_locations(p_master_company_id UUID)
RETURNS TABLE (
  location_id UUID,
  location_code TEXT,
  location_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as location_id,
    c.code as location_code,
    COALESCE(c.location_name, c.name) as location_name,
    c.address,
    c.city,
    c.state,
    c.zip
  FROM public.customers c
  WHERE c.parent_company_id = p_master_company_id
     OR c.id = p_master_company_id
  ORDER BY c.location_name NULLS FIRST, c.name;
END;
$$;

-- Update sales_orders to track both ship-to location and bill-to master company
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS ship_to_location_id UUID REFERENCES public.customers(id),
ADD COLUMN IF NOT EXISTS bill_to_company_id UUID;

COMMENT ON COLUMN public.sales_orders.ship_to_location_id IS 'Customer location where order ships (may be child location)';
COMMENT ON COLUMN public.sales_orders.bill_to_company_id IS 'Master company that gets invoiced (parent)';

-- Update invoices to always bill to master company
ALTER TABLE public.sales_invoices
ADD COLUMN IF NOT EXISTS bill_to_company_id UUID REFERENCES public.customers(id),
ADD COLUMN IF NOT EXISTS ship_to_location_id UUID REFERENCES public.customers(id);

COMMENT ON COLUMN public.sales_invoices.bill_to_company_id IS 'Master company being billed (parent account)';
COMMENT ON COLUMN public.sales_invoices.ship_to_location_id IS 'Ship-to location for reference';

-- =============================================
-- 2. DIGITAL DELIVERY SIGNATURES
-- =============================================

-- Add delivery signature fields to shipments
ALTER TABLE public.sales_shipments
ADD COLUMN IF NOT EXISTS signature_data TEXT,  -- Base64 encoded signature image
ADD COLUMN IF NOT EXISTS signature_name TEXT,  -- Name of person who signed
ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signature_location_lat NUMERIC(10,8),  -- GPS coordinates
ADD COLUMN IF NOT EXISTS signature_location_lng NUMERIC(11,8),
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,  -- Driver notes on delivery
ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT;  -- Photo of delivery (optional)

-- Index for signature tracking
CREATE INDEX IF NOT EXISTS idx_shipments_signature ON public.sales_shipments(signature_timestamp) WHERE signature_timestamp IS NOT NULL;

-- Create delivery confirmation view for driver tablet
CREATE OR REPLACE VIEW public.pending_deliveries AS
SELECT
  ss.id as shipment_id,
  ss.shipment_number,
  ss.ship_date,
  ss.carrier,
  ss.tracking_number,
  so.order_number,
  so.id as order_id,
  -- Ship-to location info
  COALESCE(ship_loc.location_name, ship_loc.name) as customer_name,
  ship_loc.code as customer_code,
  so.ship_to_address,
  so.ship_to_city,
  so.ship_to_state,
  so.ship_to_zip,
  -- Bill-to company info
  bill_comp.name as billing_company_name,
  -- Shipment details
  ss.total_cases,
  ss.total_pallets,
  ss.notes,
  bol.bol_number
FROM public.sales_shipments ss
JOIN public.sales_orders so ON so.id = ss.sales_order_id
LEFT JOIN public.customers ship_loc ON ship_loc.id = COALESCE(so.ship_to_location_id, so.customer_id)
LEFT JOIN public.customers bill_comp ON bill_comp.id = COALESCE(so.bill_to_company_id, so.customer_id)
LEFT JOIN public.bills_of_lading bol ON bol.id = ss.bol_id
WHERE ss.status IN ('shipped', 'in_transit')
  AND ss.signature_timestamp IS NULL
ORDER BY ss.ship_date, ss.shipment_number;

COMMENT ON VIEW public.pending_deliveries IS 'Shipments awaiting delivery confirmation signature';

-- Function to record delivery signature
CREATE OR REPLACE FUNCTION public.record_delivery_signature(
  p_shipment_id UUID,
  p_signature_data TEXT,
  p_signature_name TEXT,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_delivery_notes TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sales_shipments
  SET
    signature_data = p_signature_data,
    signature_name = p_signature_name,
    signature_timestamp = NOW(),
    signature_location_lat = p_latitude,
    signature_location_lng = p_longitude,
    delivery_notes = p_delivery_notes,
    delivery_photo_url = p_photo_url,
    status = 'delivered',
    delivered_date = CURRENT_DATE
  WHERE id = p_shipment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found';
  END IF;
END;
$$;

-- =============================================
-- 3. INVOICE PRINTING & EMAILING
-- =============================================

-- Add email tracking to invoices
ALTER TABLE public.sales_invoices
ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS emailed_to TEXT,
ADD COLUMN IF NOT EXISTS email_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_printed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS print_count INTEGER DEFAULT 0;

-- Invoice PDF generation metadata
ALTER TABLE public.sales_invoices
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pdf_url TEXT;  -- URL to stored PDF in Supabase Storage

CREATE INDEX IF NOT EXISTS idx_invoices_emailed ON public.sales_invoices(emailed_at) WHERE emailed_at IS NOT NULL;

-- Function to record invoice email sent
CREATE OR REPLACE FUNCTION public.record_invoice_email(
  p_invoice_id UUID,
  p_emailed_to TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sales_invoices
  SET
    emailed_at = NOW(),
    emailed_to = p_emailed_to,
    email_sent_count = COALESCE(email_sent_count, 0) + 1
  WHERE id = p_invoice_id;
END;
$$;

-- Function to record invoice print
CREATE OR REPLACE FUNCTION public.record_invoice_print(
  p_invoice_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sales_invoices
  SET
    last_printed_at = NOW(),
    print_count = COALESCE(print_count, 0) + 1
  WHERE id = p_invoice_id;
END;
$$;

-- =============================================
-- 4. CONSOLIDATED BILLING VIEW (Master Company Level)
-- =============================================

-- View showing all activity for a master company across all locations
CREATE OR REPLACE VIEW public.master_company_billing AS
SELECT
  master.id as master_company_id,
  master.code as master_company_code,
  master.name as master_company_name,
  master.current_balance as master_balance,
  -- Count of child locations
  (SELECT COUNT(*) FROM public.customers c WHERE c.parent_company_id = master.id) as location_count,
  -- Outstanding invoices across all locations
  COALESCE((
    SELECT SUM(si.balance_due)
    FROM public.sales_invoices si
    WHERE si.bill_to_company_id = master.id
      AND si.payment_status IN ('unpaid', 'partial', 'overdue')
  ), 0) as total_outstanding,
  -- Total sales this month
  COALESCE((
    SELECT SUM(so.total_amount)
    FROM public.sales_orders so
    WHERE COALESCE(so.bill_to_company_id, so.customer_id) = master.id
      AND so.order_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND so.status NOT IN ('cancelled', 'draft')
  ), 0) as monthly_sales,
  -- Total payments this month
  COALESCE((
    SELECT SUM(pr.payment_amount)
    FROM public.payment_receipts pr
    WHERE pr.customer_id = master.id
      AND pr.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
  ), 0) as monthly_payments
FROM public.customers master
WHERE master.is_master_company = true
   OR master.parent_company_id IS NULL;  -- Include standalone customers too

COMMENT ON VIEW public.master_company_billing IS 'Consolidated billing view for master companies across all locations';

-- =============================================
-- 5. PAYMENT APPLICATION ENHANCEMENT
-- =============================================

-- When applying payment, ensure it goes to master company's invoices
-- Add helper function to get all invoices for a master company
CREATE OR REPLACE FUNCTION public.get_master_company_invoices(
  p_customer_id UUID,
  p_status TEXT DEFAULT 'unpaid'
)
RETURNS TABLE (
  invoice_id UUID,
  invoice_number TEXT,
  invoice_date DATE,
  ship_to_location TEXT,
  total_amount NUMERIC,
  balance_due NUMERIC,
  due_date DATE
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_master_id UUID;
BEGIN
  -- Get master company ID
  v_master_id := public.get_master_company(p_customer_id);

  RETURN QUERY
  SELECT
    si.id as invoice_id,
    si.invoice_number,
    si.invoice_date,
    COALESCE(ship_loc.location_name, ship_loc.name) as ship_to_location,
    si.total_amount,
    si.balance_due,
    si.due_date
  FROM public.sales_invoices si
  LEFT JOIN public.customers ship_loc ON ship_loc.id = si.ship_to_location_id
  WHERE si.bill_to_company_id = v_master_id
    AND (p_status = 'all' OR si.payment_status = p_status)
  ORDER BY si.due_date NULLS LAST, si.invoice_date;
END;
$$;

-- =============================================
-- 6. CREDIT MEMO ENHANCEMENT FOR MASTER COMPANIES
-- =============================================

-- Ensure credit memos also link to master company
-- Credits can be applied across all locations of a master company

-- Function to apply credit to oldest invoice
CREATE OR REPLACE FUNCTION public.apply_credit_to_oldest_invoice(
  p_credit_memo_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_amount NUMERIC;
  v_customer_id UUID;
  v_master_id UUID;
  v_oldest_invoice RECORD;
  v_amount_to_apply NUMERIC;
BEGIN
  -- Get credit memo details
  SELECT ABS(total_amount), bill_to_company_id
  INTO v_credit_amount, v_customer_id
  FROM public.sales_invoices
  WHERE id = p_credit_memo_id
    AND invoice_type = 'credit_memo';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit memo not found';
  END IF;

  -- Get master company
  v_master_id := public.get_master_company(v_customer_id);

  -- Find oldest unpaid invoice for this master company
  SELECT id, balance_due INTO v_oldest_invoice
  FROM public.sales_invoices
  WHERE bill_to_company_id = v_master_id
    AND invoice_type = 'invoice'
    AND payment_status IN ('unpaid', 'partial')
  ORDER BY due_date NULLS LAST, invoice_date
  LIMIT 1;

  IF FOUND THEN
    -- Apply credit (up to invoice balance or credit amount, whichever is less)
    v_amount_to_apply := LEAST(v_credit_amount, v_oldest_invoice.balance_due);

    -- Update invoice
    UPDATE public.sales_invoices
    SET amount_credited = COALESCE(amount_credited, 0) + v_amount_to_apply
    WHERE id = v_oldest_invoice.id;
  END IF;
END;
$$;

-- =============================================
-- 7. REPORTING ENHANCEMENTS
-- =============================================

-- Customer statement view (master company level)
CREATE OR REPLACE VIEW public.customer_statement AS
SELECT
  master.id as customer_id,
  master.name as customer_name,
  master.code as customer_code,
  master.is_master_company,
  -- All invoices
  si.id as invoice_id,
  si.invoice_number,
  si.invoice_type,
  si.invoice_date,
  si.due_date,
  COALESCE(ship_loc.location_name, ship_loc.name) as ship_to_location,
  si.total_amount,
  si.amount_paid,
  si.amount_credited,
  si.balance_due,
  si.payment_status,
  -- Age calculation
  CASE
    WHEN si.payment_status = 'paid' THEN 'Paid'
    WHEN si.due_date IS NULL THEN 'No Due Date'
    WHEN CURRENT_DATE <= si.due_date THEN 'Current'
    WHEN CURRENT_DATE - si.due_date <= 30 THEN '1-30 Days'
    WHEN CURRENT_DATE - si.due_date <= 60 THEN '31-60 Days'
    WHEN CURRENT_DATE - si.due_date <= 90 THEN '61-90 Days'
    ELSE 'Over 90 Days'
  END as aging_bucket
FROM public.customers master
LEFT JOIN public.sales_invoices si ON si.bill_to_company_id = master.id
LEFT JOIN public.customers ship_loc ON ship_loc.id = si.ship_to_location_id
WHERE master.is_master_company = true OR master.parent_company_id IS NULL
ORDER BY master.name, si.invoice_date DESC;

COMMENT ON VIEW public.customer_statement IS 'Customer account statement with aging at master company level';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Update existing customers to set is_master_company flag
UPDATE public.customers
SET is_master_company = true
WHERE parent_company_id IS NULL;
