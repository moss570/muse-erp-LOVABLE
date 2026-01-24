-- Add missing columns to sales_order_items
ALTER TABLE public.sales_order_items 
ADD COLUMN IF NOT EXISTS quantity_packed INTEGER DEFAULT 0;

-- Add missing columns to pallets
ALTER TABLE public.pallets 
ADD COLUMN IF NOT EXISTS current_cases INTEGER DEFAULT 0;

-- Add missing columns to locations
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS code TEXT;

-- Add missing columns to pick_requests
ALTER TABLE public.pick_requests 
ADD COLUMN IF NOT EXISTS source_type TEXT,
ADD COLUMN IF NOT EXISTS release_email_sent_at TIMESTAMPTZ;

-- Create pending_deliveries view
CREATE OR REPLACE VIEW public.pending_deliveries AS
SELECT 
  s.id as shipment_id,
  s.shipment_number,
  so.order_number,
  c.name as customer_name,
  c.code as customer_code,
  so.ship_to_address,
  so.ship_to_city,
  so.ship_to_state,
  so.ship_to_zip,
  s.total_cases,
  s.tracking_number,
  s.status,
  s.ship_date,
  b.bol_number,
  so.notes
FROM sales_shipments s
JOIN sales_orders so ON so.id = s.sales_order_id
JOIN customers c ON c.id = so.customer_id
LEFT JOIN bills_of_lading b ON b.id = (
  SELECT bol.id FROM bills_of_lading bol
  JOIN bol_pallets bp ON bp.bol_id = bol.id
  LIMIT 1
)
WHERE s.status IN ('pending', 'in_transit');

-- Create payment_receipts table
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  applied_amount NUMERIC(12,2) DEFAULT 0,
  unapplied_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_receipts
CREATE POLICY "Authenticated users can view payment receipts" ON public.payment_receipts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert payment receipts" ON public.payment_receipts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update payment receipts" ON public.payment_receipts
  FOR UPDATE TO authenticated USING (true);

-- Create payment_receipt_applications junction table
CREATE TABLE IF NOT EXISTS public.payment_receipt_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES public.payment_receipts(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id),
  applied_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.payment_receipt_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payment applications" ON public.payment_receipt_applications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert payment applications" ON public.payment_receipt_applications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create sequence for payment receipt numbers
CREATE SEQUENCE IF NOT EXISTS payment_receipt_number_seq START WITH 1000;

-- Function to generate payment receipt number
CREATE OR REPLACE FUNCTION public.generate_payment_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'PMT-' || LPAD(nextval('payment_receipt_number_seq')::TEXT, 6, '0');
END;
$$;

-- Function to get customer balance
CREATE OR REPLACE FUNCTION public.get_customer_balance(p_customer_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(balance_due), 0) INTO v_balance
  FROM sales_invoices
  WHERE customer_id = p_customer_id
    AND payment_status IN ('unpaid', 'partial', 'overdue');
  
  RETURN v_balance;
END;
$$;

-- Function to apply payment to invoices
CREATE OR REPLACE FUNCTION public.apply_payment_to_invoices(
  p_receipt_id UUID,
  p_applications JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app JSONB;
  v_invoice_id UUID;
  v_amount NUMERIC;
  v_user_id UUID;
  v_total_applied NUMERIC := 0;
BEGIN
  v_user_id := auth.uid();
  
  FOR v_app IN SELECT * FROM jsonb_array_elements(p_applications)
  LOOP
    v_invoice_id := (v_app->>'invoice_id')::UUID;
    v_amount := (v_app->>'amount')::NUMERIC;
    
    -- Insert application record
    INSERT INTO payment_receipt_applications (receipt_id, invoice_id, applied_amount, applied_by)
    VALUES (p_receipt_id, v_invoice_id, v_amount, v_user_id);
    
    -- Update invoice balance
    UPDATE sales_invoices
    SET balance_due = balance_due - v_amount,
        amount_paid = amount_paid + v_amount,
        payment_status = CASE 
          WHEN balance_due - v_amount <= 0 THEN 'paid'
          ELSE 'partial'
        END,
        updated_at = now()
    WHERE id = v_invoice_id;
    
    v_total_applied := v_total_applied + v_amount;
  END LOOP;
  
  -- Update receipt applied amounts
  UPDATE payment_receipts
  SET applied_amount = applied_amount + v_total_applied,
      unapplied_amount = amount - (applied_amount + v_total_applied),
      status = CASE
        WHEN amount <= (applied_amount + v_total_applied) THEN 'applied'
        ELSE 'partial'
      END,
      updated_at = now()
  WHERE id = p_receipt_id;
END;
$$;

-- Function to record delivery signature
CREATE OR REPLACE FUNCTION public.record_delivery_signature(
  p_shipment_id UUID,
  p_signature_data TEXT,
  p_signer_name TEXT,
  p_delivery_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sales_shipments
  SET status = 'delivered',
      updated_at = now()
  WHERE id = p_shipment_id;
  
  -- Update the associated sales order status
  UPDATE sales_orders
  SET status = 'shipped',
      updated_at = now()
  WHERE id = (SELECT sales_order_id FROM sales_shipments WHERE id = p_shipment_id);
END;
$$;

-- Add trigger for payment_receipts updated_at
CREATE TRIGGER update_payment_receipts_updated_at
BEFORE UPDATE ON public.payment_receipts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();