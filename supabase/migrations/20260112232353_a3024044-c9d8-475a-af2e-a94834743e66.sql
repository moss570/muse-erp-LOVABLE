-- Phase 4.1: UPC Generation
-- Add company prefix for UPC generation
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS company_prefix text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gs1_company_prefix text DEFAULT NULL;

COMMENT ON COLUMN public.company_settings.company_prefix IS 'GS1 Company Prefix for UPC/EAN generation (6-10 digits)';

-- Add UPC codes to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS upc_code text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS case_upc_code text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS case_pack_quantity integer DEFAULT 1;

COMMENT ON COLUMN public.products.upc_code IS 'UPC-A code for individual units';
COMMENT ON COLUMN public.products.case_upc_code IS 'UPC-A code for master cases';
COMMENT ON COLUMN public.products.case_pack_quantity IS 'Number of units per master case';

-- Phase 4.2: Enhance pallet/case tracking
ALTER TABLE public.pallet_cases
ADD COLUMN IF NOT EXISTS case_label_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sscc_code text DEFAULT NULL;

-- Phase 4.4: Pick Requests for 3PL Release
CREATE TABLE IF NOT EXISTS public.pick_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number text NOT NULL UNIQUE,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  location_id uuid NOT NULL REFERENCES public.locations(id),
  customer_id uuid REFERENCES public.customers(id),
  status text NOT NULL DEFAULT 'draft',
  priority text DEFAULT 'normal',
  requested_by uuid REFERENCES public.profiles(id),
  assigned_to uuid REFERENCES public.profiles(id),
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pick_request_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pick_request_id uuid NOT NULL REFERENCES public.pick_requests(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity_requested integer NOT NULL,
  quantity_picked integer DEFAULT 0,
  unit_type text DEFAULT 'case',
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pick_request_picks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pick_request_item_id uuid NOT NULL REFERENCES public.pick_request_items(id) ON DELETE CASCADE,
  pallet_id uuid REFERENCES public.pallets(id),
  pallet_case_id uuid REFERENCES public.pallet_cases(id),
  production_lot_id uuid REFERENCES public.production_lots(id),
  quantity_picked integer NOT NULL,
  picked_by uuid REFERENCES public.profiles(id),
  picked_at timestamptz NOT NULL DEFAULT now(),
  scan_verified boolean DEFAULT false,
  notes text
);

-- Enable RLS
ALTER TABLE public.pick_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_request_picks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view pick requests"
ON public.pick_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage pick requests"
ON public.pick_requests FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view pick request items"
ON public.pick_request_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage pick request items"
ON public.pick_request_items FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view pick request picks"
ON public.pick_request_picks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage pick request picks"
ON public.pick_request_picks FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pick_requests_location ON public.pick_requests(location_id);
CREATE INDEX IF NOT EXISTS idx_pick_requests_status ON public.pick_requests(status);
CREATE INDEX IF NOT EXISTS idx_pick_request_items_request ON public.pick_request_items(pick_request_id);
CREATE INDEX IF NOT EXISTS idx_pick_request_picks_item ON public.pick_request_picks(pick_request_item_id);

-- Function to generate pick request number
CREATE OR REPLACE FUNCTION public.generate_pick_request_number(p_request_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sequence integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(request_number, '-', 3) AS integer)), 0) + 1 
  INTO v_sequence
  FROM public.pick_requests 
  WHERE request_date = p_request_date;
  
  RETURN 'PICK-' || to_char(p_request_date, 'YYYYMMDD') || '-' || lpad(v_sequence::text, 3, '0');
END;
$$;

-- Dropdown options for pick status
INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order, is_active)
VALUES 
  ('pick_status', 'draft', 'Draft', 1, true),
  ('pick_status', 'pending', 'Pending', 2, true),
  ('pick_status', 'in_progress', 'In Progress', 3, true),
  ('pick_status', 'completed', 'Completed', 4, true),
  ('pick_status', 'cancelled', 'Cancelled', 5, true),
  ('pick_priority', 'low', 'Low', 1, true),
  ('pick_priority', 'normal', 'Normal', 2, true),
  ('pick_priority', 'high', 'High', 3, true),
  ('pick_priority', 'urgent', 'Urgent', 4, true)
ON CONFLICT DO NOTHING;