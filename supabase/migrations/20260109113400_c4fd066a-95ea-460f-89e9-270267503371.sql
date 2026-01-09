-- =============================================
-- PHASE 2: INVENTORY & TRACEABILITY SCHEMA
-- =============================================

-- 1. Units of Measure
CREATE TABLE public.units_of_measure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  unit_type text NOT NULL CHECK (unit_type IN ('weight', 'volume', 'count')),
  is_base_unit boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Machines (for production lot format)
CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_number text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  location_id uuid REFERENCES public.locations(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Suppliers
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  country text DEFAULT 'USA',
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 4. Materials (raw ingredients)
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  base_unit_id uuid REFERENCES public.units_of_measure(id) NOT NULL,
  cost_per_base_unit numeric(12,4) DEFAULT 0,
  min_stock_level numeric(12,4),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 5. Products (finished goods)
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  unit_id uuid REFERENCES public.units_of_measure(id) NOT NULL,
  units_per_case integer DEFAULT 1,
  case_weight_kg numeric(10,4),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 6. Unit Conversions (per-material flexibility)
CREATE TABLE public.unit_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE,
  from_unit_id uuid REFERENCES public.units_of_measure(id) NOT NULL,
  to_unit_id uuid REFERENCES public.units_of_measure(id) NOT NULL,
  conversion_factor numeric(12,6) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(material_id, from_unit_id, to_unit_id)
);

-- 7. Receiving Lots (incoming materials with dual lot tracking)
CREATE TABLE public.receiving_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_lot_number text NOT NULL UNIQUE,
  supplier_lot_number text,
  material_id uuid REFERENCES public.materials(id) NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id),
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  quantity_received numeric(12,4) NOT NULL,
  unit_id uuid REFERENCES public.units_of_measure(id) NOT NULL,
  quantity_in_base_unit numeric(12,4) NOT NULL,
  cost_total numeric(12,2),
  cost_per_base_unit numeric(12,4),
  location_id uuid REFERENCES public.locations(id),
  received_by uuid REFERENCES public.profiles(id),
  status text DEFAULT 'available' CHECK (status IN ('available', 'quarantine', 'consumed', 'expired')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 8. Production Lots (YY-JJJ-MMBB format)
CREATE TABLE public.production_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number text NOT NULL UNIQUE,
  product_id uuid REFERENCES public.products(id) NOT NULL,
  machine_id uuid REFERENCES public.machines(id) NOT NULL,
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  julian_day integer NOT NULL,
  batch_number integer NOT NULL,
  quantity_produced integer NOT NULL,
  quantity_available integer NOT NULL,
  expiry_date date,
  produced_by uuid REFERENCES public.profiles(id),
  status text DEFAULT 'available' CHECK (status IN ('in_progress', 'available', 'packed', 'on_hold', 'recalled')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 9. Production Lot Materials (traceability: which materials went into which batch)
CREATE TABLE public.production_lot_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_lot_id uuid REFERENCES public.production_lots(id) ON DELETE CASCADE NOT NULL,
  receiving_lot_id uuid REFERENCES public.receiving_lots(id) NOT NULL,
  quantity_used numeric(12,4) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 10. Add is_3pl flag to existing locations table
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_3pl boolean DEFAULT false;

-- 11. Pallets (PAL-YYYYMMDD-NNN format)
CREATE TABLE public.pallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_number text NOT NULL UNIQUE,
  build_date date NOT NULL DEFAULT CURRENT_DATE,
  location_id uuid REFERENCES public.locations(id),
  status text DEFAULT 'building' CHECK (status IN ('building', 'complete', 'in_transit', 'delivered', 'empty')),
  total_cases integer DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 12. Pallet Cases (cases loaded on pallets)
CREATE TABLE public.pallet_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_id uuid REFERENCES public.pallets(id) ON DELETE CASCADE NOT NULL,
  production_lot_id uuid REFERENCES public.production_lots(id) NOT NULL,
  product_id uuid REFERENCES public.products(id) NOT NULL,
  quantity integer NOT NULL,
  added_at timestamptz DEFAULT now() NOT NULL,
  added_by uuid REFERENCES public.profiles(id),
  removed_at timestamptz,
  removed_by uuid REFERENCES public.profiles(id)
);

-- 13. Bills of Lading
CREATE TABLE public.bills_of_lading (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bol_number text NOT NULL UNIQUE,
  from_location_id uuid REFERENCES public.locations(id) NOT NULL,
  to_location_id uuid REFERENCES public.locations(id) NOT NULL,
  carrier_name text,
  driver_name text,
  truck_number text,
  trailer_number text,
  seal_number text,
  ship_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'shipped', 'in_transit', 'delivered', 'cancelled')),
  total_pallets integer DEFAULT 0,
  total_cases integer DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 14. BOL Pallets (which pallets on each BOL)
CREATE TABLE public.bol_pallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bol_id uuid REFERENCES public.bills_of_lading(id) ON DELETE CASCADE NOT NULL,
  pallet_id uuid REFERENCES public.pallets(id) NOT NULL,
  added_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(bol_id, pallet_id)
);

-- 15. Pallet Transfers (movement history)
CREATE TABLE public.pallet_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_id uuid REFERENCES public.pallets(id) NOT NULL,
  from_location_id uuid REFERENCES public.locations(id),
  to_location_id uuid REFERENCES public.locations(id) NOT NULL,
  transfer_date timestamptz DEFAULT now() NOT NULL,
  bol_id uuid REFERENCES public.bills_of_lading(id),
  transferred_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- FUNCTIONS FOR LOT NUMBER GENERATION
-- =============================================

-- Generate Production Lot Number (YY-JJJ-MMBB)
CREATE OR REPLACE FUNCTION public.generate_production_lot_number(
  p_machine_id uuid,
  p_production_date date DEFAULT CURRENT_DATE
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_julian_day text;
  v_machine_number text;
  v_batch_number integer;
BEGIN
  v_year := to_char(p_production_date, 'YY');
  v_julian_day := lpad(extract(doy from p_production_date)::text, 3, '0');
  
  SELECT machine_number INTO v_machine_number
  FROM public.machines WHERE id = p_machine_id;
  
  IF v_machine_number IS NULL THEN
    RAISE EXCEPTION 'Machine not found';
  END IF;
  
  SELECT COALESCE(MAX(batch_number), 0) + 1 INTO v_batch_number
  FROM public.production_lots
  WHERE machine_id = p_machine_id AND production_date = p_production_date;
  
  RETURN v_year || '-' || v_julian_day || '-' || lpad(v_machine_number, 2, '0') || lpad(v_batch_number::text, 2, '0');
END;
$$;

-- Generate Pallet Number (PAL-YYYYMMDD-NNN)
CREATE OR REPLACE FUNCTION public.generate_pallet_number(
  p_build_date date DEFAULT CURRENT_DATE
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(pallet_number, '-', 3) AS integer)), 0) + 1 
  INTO v_sequence
  FROM public.pallets WHERE build_date = p_build_date;
  
  RETURN 'PAL-' || to_char(p_build_date, 'YYYYMMDD') || '-' || lpad(v_sequence::text, 3, '0');
END;
$$;

-- Generate Receiving Lot Number (MAT-YYYYMMDD-NNN)
CREATE OR REPLACE FUNCTION public.generate_receiving_lot_number(
  p_received_date date DEFAULT CURRENT_DATE
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(internal_lot_number, '-', 3) AS integer)), 0) + 1 
  INTO v_sequence
  FROM public.receiving_lots WHERE received_date = p_received_date;
  
  RETURN 'MAT-' || to_char(p_received_date, 'YYYYMMDD') || '-' || lpad(v_sequence::text, 3, '0');
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.units_of_measure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_lot_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pallet_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills_of_lading ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bol_pallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pallet_transfers ENABLE ROW LEVEL SECURITY;

-- Units of Measure policies
CREATE POLICY "Units viewable by authenticated" ON public.units_of_measure FOR SELECT USING (true);
CREATE POLICY "Admins can manage units" ON public.units_of_measure FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Machines policies
CREATE POLICY "Machines viewable by authenticated" ON public.machines FOR SELECT USING (true);
CREATE POLICY "Admins and managers can insert machines" ON public.machines FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "Admins and managers can update machines" ON public.machines FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Only admins can delete machines" ON public.machines FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Suppliers policies
CREATE POLICY "Suppliers viewable by authenticated" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Admins and managers can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "Admins and managers can update suppliers" ON public.suppliers FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Only admins can delete suppliers" ON public.suppliers FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Materials policies
CREATE POLICY "Materials viewable by authenticated" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Admins and managers can insert materials" ON public.materials FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "Admins and managers can update materials" ON public.materials FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Only admins can delete materials" ON public.materials FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Products policies
CREATE POLICY "Products viewable by authenticated" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins and managers can insert products" ON public.products FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "Admins and managers can update products" ON public.products FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Only admins can delete products" ON public.products FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Unit Conversions policies
CREATE POLICY "Unit conversions viewable by authenticated" ON public.unit_conversions FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage conversions" ON public.unit_conversions FOR ALL USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));

-- Receiving Lots policies
CREATE POLICY "Receiving lots viewable by authenticated" ON public.receiving_lots FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert receiving lots" ON public.receiving_lots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can update receiving lots" ON public.receiving_lots FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Only admins can delete receiving lots" ON public.receiving_lots FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Production Lots policies
CREATE POLICY "Production lots viewable by authenticated" ON public.production_lots FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert production lots" ON public.production_lots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and managers can update production lots" ON public.production_lots FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Only admins can delete production lots" ON public.production_lots FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Production Lot Materials policies
CREATE POLICY "Production lot materials viewable by authenticated" ON public.production_lot_materials FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert production lot materials" ON public.production_lot_materials FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Pallets policies
CREATE POLICY "Pallets viewable by authenticated" ON public.pallets FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert pallets" ON public.pallets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update pallets" ON public.pallets FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admins can delete pallets" ON public.pallets FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Pallet Cases policies
CREATE POLICY "Pallet cases viewable by authenticated" ON public.pallet_cases FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert pallet cases" ON public.pallet_cases FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update pallet cases" ON public.pallet_cases FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admins can delete pallet cases" ON public.pallet_cases FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Bills of Lading policies
CREATE POLICY "BOLs viewable by authenticated" ON public.bills_of_lading FOR SELECT USING (true);
CREATE POLICY "Admins and managers can insert BOLs" ON public.bills_of_lading FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "Admins and managers can update BOLs" ON public.bills_of_lading FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "Only admins can delete BOLs" ON public.bills_of_lading FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- BOL Pallets policies
CREATE POLICY "BOL pallets viewable by authenticated" ON public.bol_pallets FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage BOL pallets" ON public.bol_pallets FOR ALL USING (is_admin_or_manager(auth.uid())) WITH CHECK (is_admin_or_manager(auth.uid()));

-- Pallet Transfers policies
CREATE POLICY "Pallet transfers viewable by authenticated" ON public.pallet_transfers FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert pallet transfers" ON public.pallet_transfers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================

CREATE TRIGGER update_units_of_measure_updated_at BEFORE UPDATE ON public.units_of_measure FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_unit_conversions_updated_at BEFORE UPDATE ON public.unit_conversions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_receiving_lots_updated_at BEFORE UPDATE ON public.receiving_lots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_production_lots_updated_at BEFORE UPDATE ON public.production_lots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_pallets_updated_at BEFORE UPDATE ON public.pallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_bills_of_lading_updated_at BEFORE UPDATE ON public.bills_of_lading FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- SEED DATA: Common Units of Measure
-- =============================================

INSERT INTO public.units_of_measure (code, name, unit_type, is_base_unit) VALUES
  ('KG', 'Kilogram', 'weight', true),
  ('G', 'Gram', 'weight', true),
  ('LB', 'Pound', 'weight', false),
  ('OZ', 'Ounce', 'weight', false),
  ('L', 'Liter', 'volume', true),
  ('ML', 'Milliliter', 'volume', true),
  ('GAL', 'Gallon', 'volume', false),
  ('QT', 'Quart', 'volume', false),
  ('PT', 'Pint', 'volume', false),
  ('FL_OZ', 'Fluid Ounce', 'volume', false),
  ('EACH', 'Each', 'count', true),
  ('CASE', 'Case', 'count', false),
  ('BOX', 'Box', 'count', false),
  ('PALLET', 'Pallet', 'count', false);