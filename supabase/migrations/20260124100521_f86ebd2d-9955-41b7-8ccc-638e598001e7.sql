-- Add missing columns to existing tables
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS allow_backorders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS early_pay_discount_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS early_pay_days INTEGER DEFAULT 0;

ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(5,4) DEFAULT 0.07;

-- Create sales_orders table
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_delivery_date DATE,
  ship_to_name TEXT,
  ship_to_address TEXT,
  ship_to_city TEXT,
  ship_to_state TEXT,
  ship_to_zip TEXT,
  ship_to_country TEXT DEFAULT 'USA',
  payment_terms TEXT,
  allow_backorders BOOLEAN DEFAULT true,
  tax_rate NUMERIC(5,4) DEFAULT 0,
  subtotal NUMERIC(12,2) DEFAULT 0,
  shipping_charge NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  is_partially_shipped BOOLEAN DEFAULT false,
  has_backorders BOOLEAN DEFAULT false,
  shipment_count INTEGER DEFAULT 0,
  notes TEXT,
  pick_request_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sales_order_items table
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity_ordered INTEGER NOT NULL DEFAULT 0,
  quantity_picked INTEGER DEFAULT 0,
  quantity_shipped INTEGER DEFAULT 0,
  quantity_invoiced INTEGER DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sales_shipments table
CREATE TABLE IF NOT EXISTS public.sales_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_number TEXT NOT NULL UNIQUE,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id),
  ship_date DATE NOT NULL DEFAULT CURRENT_DATE,
  carrier TEXT,
  tracking_number TEXT,
  total_cases INTEGER DEFAULT 0,
  total_weight NUMERIC(12,2) DEFAULT 0,
  freight_cost NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  shipped_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sales_shipment_items table
CREATE TABLE IF NOT EXISTS public.sales_shipment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.sales_shipments(id) ON DELETE CASCADE,
  sales_order_item_id UUID NOT NULL REFERENCES public.sales_order_items(id),
  quantity_shipped INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sales_invoices table
CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_type TEXT NOT NULL DEFAULT 'invoice',
  sales_order_id UUID REFERENCES public.sales_orders(id),
  shipment_id UUID REFERENCES public.sales_shipments(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  master_company_id UUID REFERENCES public.customers(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  freight_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  balance_due NUMERIC(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  emailed_at TIMESTAMPTZ,
  emailed_to TEXT,
  last_printed_at TIMESTAMPTZ,
  print_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sales_invoice_items table
CREATE TABLE IF NOT EXISTS public.sales_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for sales_orders
CREATE POLICY "Authenticated users can view sales orders" ON public.sales_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sales orders" ON public.sales_orders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales orders" ON public.sales_orders
  FOR UPDATE TO authenticated USING (true);

-- RLS policies for sales_order_items
CREATE POLICY "Authenticated users can view sales order items" ON public.sales_order_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sales order items" ON public.sales_order_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales order items" ON public.sales_order_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete sales order items" ON public.sales_order_items
  FOR DELETE TO authenticated USING (true);

-- RLS policies for sales_shipments
CREATE POLICY "Authenticated users can view sales shipments" ON public.sales_shipments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sales shipments" ON public.sales_shipments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales shipments" ON public.sales_shipments
  FOR UPDATE TO authenticated USING (true);

-- RLS policies for sales_shipment_items
CREATE POLICY "Authenticated users can view shipment items" ON public.sales_shipment_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert shipment items" ON public.sales_shipment_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- RLS policies for sales_invoices
CREATE POLICY "Authenticated users can view sales invoices" ON public.sales_invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sales invoices" ON public.sales_invoices
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales invoices" ON public.sales_invoices
  FOR UPDATE TO authenticated USING (true);

-- RLS policies for sales_invoice_items
CREATE POLICY "Authenticated users can view invoice items" ON public.sales_invoice_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert invoice items" ON public.sales_invoice_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create sequence for sales order numbers
CREATE SEQUENCE IF NOT EXISTS sales_order_number_seq START WITH 1000;

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000;

-- Create sequence for shipment numbers
CREATE SEQUENCE IF NOT EXISTS shipment_number_seq START WITH 1000;

-- Function to generate sales order number
CREATE OR REPLACE FUNCTION public.generate_sales_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'SO-' || LPAD(nextval('sales_order_number_seq')::TEXT, 6, '0');
END;
$$;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'INV-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
END;
$$;

-- Function to generate shipment number
CREATE OR REPLACE FUNCTION public.generate_shipment_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'SHP-' || LPAD(nextval('shipment_number_seq')::TEXT, 6, '0');
END;
$$;

-- Function to get customer price (placeholder - returns product unit_price)
CREATE OR REPLACE FUNCTION public.get_customer_price(
  p_customer_id UUID,
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_order_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  -- For now, return the product's base unit_price
  -- Future: implement customer-specific pricing, quantity breaks, etc.
  SELECT unit_price INTO v_price
  FROM products
  WHERE id = p_product_id;
  
  RETURN COALESCE(v_price, 0);
END;
$$;

-- Function to get master company (placeholder - returns the customer itself)
CREATE OR REPLACE FUNCTION public.get_master_company(p_customer_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For now, return the customer itself
  -- Future: implement parent/master company relationships
  RETURN p_customer_id;
END;
$$;

-- Function to record invoice email
CREATE OR REPLACE FUNCTION public.record_invoice_email(
  p_invoice_id UUID,
  p_email_to TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sales_invoices
  SET emailed_at = now(),
      emailed_to = p_email_to
  WHERE id = p_invoice_id;
END;
$$;

-- Function to record invoice print
CREATE OR REPLACE FUNCTION public.record_invoice_print(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sales_invoices
  SET last_printed_at = now(),
      print_count = COALESCE(print_count, 0) + 1
  WHERE id = p_invoice_id;
END;
$$;

-- Trigger to update sales order totals when items change
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
  
  -- Get order tax rate and shipping
  SELECT tax_rate, COALESCE(shipping_charge, 0) 
  INTO v_tax_rate, v_shipping
  FROM sales_orders 
  WHERE id = v_order_id;
  
  v_tax_amount := v_subtotal * COALESCE(v_tax_rate, 0);
  
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

CREATE TRIGGER update_sales_order_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_items
FOR EACH ROW EXECUTE FUNCTION public.update_sales_order_totals();

-- Update timestamp trigger for sales tables
CREATE TRIGGER update_sales_orders_updated_at
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_order_items_updated_at
BEFORE UPDATE ON public.sales_order_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_shipments_updated_at
BEFORE UPDATE ON public.sales_shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_invoices_updated_at
BEFORE UPDATE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();