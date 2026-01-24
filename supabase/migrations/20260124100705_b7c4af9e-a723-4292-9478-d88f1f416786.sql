-- Add missing columns to payment_receipts
ALTER TABLE public.payment_receipts 
ADD COLUMN IF NOT EXISTS early_pay_discount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS remittance_file_url TEXT;

-- Add missing columns to production_lots
ALTER TABLE public.production_lots 
ADD COLUMN IF NOT EXISTS cases_produced INTEGER DEFAULT 0;

-- Add missing columns to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS remittance_email TEXT,
ADD COLUMN IF NOT EXISTS sales_notification_email TEXT,
ADD COLUMN IF NOT EXISTS threeppl_release_email TEXT;

-- Create rma_requests table (Return Merchandise Authorization)
CREATE TABLE IF NOT EXISTS public.rma_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rma_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  invoice_id UUID REFERENCES public.sales_invoices(id),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolution TEXT,
  credit_amount NUMERIC(12,2) DEFAULT 0,
  restocking_fee NUMERIC(12,2) DEFAULT 0,
  received_date DATE,
  inspected_by UUID REFERENCES auth.users(id),
  inspection_notes TEXT,
  disposition TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create rma_items table
CREATE TABLE IF NOT EXISTS public.rma_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rma_id UUID NOT NULL REFERENCES public.rma_requests(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2) DEFAULT 0,
  reason TEXT,
  condition TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rma_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rma_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for rma_requests
CREATE POLICY "Authenticated users can view RMA requests" ON public.rma_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert RMA requests" ON public.rma_requests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update RMA requests" ON public.rma_requests
  FOR UPDATE TO authenticated USING (true);

-- RLS policies for rma_items
CREATE POLICY "Authenticated users can view RMA items" ON public.rma_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert RMA items" ON public.rma_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create sequence for RMA numbers
CREATE SEQUENCE IF NOT EXISTS rma_number_seq START WITH 1000;

-- Function to generate RMA number
CREATE OR REPLACE FUNCTION public.generate_rma_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'RMA-' || LPAD(nextval('rma_number_seq')::TEXT, 6, '0');
END;
$$;

-- Create price_sheets table
CREATE TABLE IF NOT EXISTS public.price_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_tier TEXT NOT NULL DEFAULT 'direct',
  status TEXT NOT NULL DEFAULT 'draft',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  submitted_for_approval_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create price_sheet_items table
CREATE TABLE IF NOT EXISTS public.price_sheet_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_sheet_id UUID NOT NULL REFERENCES public.price_sheets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_sheet_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for price_sheets
CREATE POLICY "Authenticated users can view price sheets" ON public.price_sheets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert price sheets" ON public.price_sheets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update price sheets" ON public.price_sheets
  FOR UPDATE TO authenticated USING (true);

-- RLS policies for price_sheet_items
CREATE POLICY "Authenticated users can view price sheet items" ON public.price_sheet_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert price sheet items" ON public.price_sheet_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update price sheet items" ON public.price_sheet_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete price sheet items" ON public.price_sheet_items
  FOR DELETE TO authenticated USING (true);

-- Function to submit price sheet for approval
CREATE OR REPLACE FUNCTION public.submit_price_sheet_for_approval(p_price_sheet_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE price_sheets
  SET status = 'pending_approval',
      submitted_for_approval_at = now(),
      submitted_by = auth.uid(),
      updated_at = now()
  WHERE id = p_price_sheet_id;
END;
$$;

-- Function to approve price sheet
CREATE OR REPLACE FUNCTION public.approve_price_sheet(p_price_sheet_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE price_sheets
  SET status = 'approved',
      approved_at = now(),
      approved_by = auth.uid(),
      is_active = true,
      updated_at = now()
  WHERE id = p_price_sheet_id;
END;
$$;

-- Function to reject price sheet
CREATE OR REPLACE FUNCTION public.reject_price_sheet(p_price_sheet_id UUID, p_rejection_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE price_sheets
  SET status = 'rejected',
      rejection_reason = p_rejection_reason,
      updated_at = now()
  WHERE id = p_price_sheet_id;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_rma_requests_updated_at
BEFORE UPDATE ON public.rma_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_price_sheets_updated_at
BEFORE UPDATE ON public.price_sheets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_price_sheet_items_updated_at
BEFORE UPDATE ON public.price_sheet_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();