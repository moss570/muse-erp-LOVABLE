
-- ==============================================
-- MANUFACTURING & STANDARD COSTING SCHEMA UPDATE
-- ==============================================

-- PART 1A: Add missing fields to PRODUCTS (Item Master)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS standard_labor_rate NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS standard_overhead_rate NUMERIC(12,4) DEFAULT 0;

COMMENT ON COLUMN public.products.standard_labor_rate IS 'Standard labor cost rate per unit for costing';
COMMENT ON COLUMN public.products.standard_overhead_rate IS 'Standard overhead rate per unit for costing';

-- PART 1B: Create PRODUCT_RECIPES table (BOM/Recipe Header)
CREATE TABLE IF NOT EXISTS public.product_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  recipe_name TEXT NOT NULL,
  recipe_version TEXT DEFAULT '1.0',
  batch_size NUMERIC(12,4) NOT NULL DEFAULT 1,
  batch_unit_id UUID REFERENCES public.units_of_measure(id),
  standard_labor_hours NUMERIC(10,4) DEFAULT 0,
  standard_machine_hours NUMERIC(10,4) DEFAULT 0,
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on product_recipes
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recipes" 
  ON public.product_recipes FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage recipes" 
  ON public.product_recipes FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- PART 1C: Create PRODUCT_RECIPE_ITEMS table (BOM/Recipe Lines)
CREATE TABLE IF NOT EXISTS public.product_recipe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.product_recipes(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id),
  quantity_required NUMERIC(12,4) NOT NULL,
  wastage_percentage NUMERIC(5,2) DEFAULT 0,
  unit_id UUID REFERENCES public.units_of_measure(id),
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on product_recipe_items
ALTER TABLE public.product_recipe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recipe items" 
  ON public.product_recipe_items FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage recipe items" 
  ON public.product_recipe_items FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- PART 1D: Add missing fields to PRODUCTION_LOTS for Xero sync and costing
ALTER TABLE public.production_lots
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.product_recipes(id),
  ADD COLUMN IF NOT EXISTS labor_hours NUMERIC(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS machine_hours NUMERIC(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_cost NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overhead_cost NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_synced_to_xero BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS xero_journal_id TEXT,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.production_lots.is_synced_to_xero IS 'Whether this production run has been synced to Xero as part of a daily journal';
COMMENT ON COLUMN public.production_lots.xero_journal_id IS 'Xero Manual Journal ID for the daily batch sync';

-- PART 1E: Add missing fields to PURCHASE_ORDERS for Xero sync
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS xero_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS xero_synced_at TIMESTAMPTZ;

-- PART 1F: Create XERO_MANUFACTURING_ACCOUNT_MAPPINGS table
-- This stores the 4 key manufacturing account mappings for Xero Manual Journals
CREATE TABLE IF NOT EXISTS public.xero_manufacturing_account_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mapping_key TEXT NOT NULL UNIQUE,
  xero_account_id TEXT,
  xero_account_code TEXT,
  xero_account_name TEXT,
  xero_account_type TEXT,
  helper_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.xero_manufacturing_account_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mappings" 
  ON public.xero_manufacturing_account_mappings FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage mappings" 
  ON public.xero_manufacturing_account_mappings FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Insert the 4 required manufacturing account mappings with helper text
INSERT INTO public.xero_manufacturing_account_mappings (mapping_key, helper_text) VALUES
  ('applied_labor', 'Select the Expense account where you want to offset your payroll. This allows us to move labor costs into Inventory. (e.g., Select ''Factory Labor Offset'' or similar).'),
  ('applied_overhead', 'Select the Expense account to offset factory overhead. (e.g., Select ''Factory Rent'' or a dedicated ''Applied Overhead'' clearing account).'),
  ('wip_inventory', 'Select the Asset account used to hold value while product is being made.'),
  ('raw_material_inventory', 'Select the Asset account that holds the value of raw materials purchased.'),
  ('finished_goods_inventory', 'Select the Asset account that holds the value of completed products.')
ON CONFLICT (mapping_key) DO NOTHING;

-- PART 1G: Create XERO_JOURNAL_BATCHES table to track daily sync batches
CREATE TABLE IF NOT EXISTS public.xero_journal_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_date DATE NOT NULL,
  batch_type TEXT NOT NULL DEFAULT 'production', -- 'production' or 'completion'
  xero_journal_id TEXT,
  total_wip_amount NUMERIC(12,4) DEFAULT 0,
  total_material_amount NUMERIC(12,4) DEFAULT 0,
  total_labor_amount NUMERIC(12,4) DEFAULT 0,
  total_overhead_amount NUMERIC(12,4) DEFAULT 0,
  production_lot_ids UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'error'
  sync_error TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.xero_journal_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view journal batches" 
  ON public.xero_journal_batches FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage journal batches" 
  ON public.xero_journal_batches FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_xero_journal_batches_date ON public.xero_journal_batches(batch_date);
CREATE INDEX IF NOT EXISTS idx_production_lots_synced ON public.production_lots(is_synced_to_xero, status);

-- PART 1H: Add overhead settings if missing
INSERT INTO public.overhead_settings (setting_key, setting_value, description)
VALUES 
  ('standard_labor_rate', 25, 'Default standard labor rate per hour'),
  ('overhead_application_rate', 1.5, 'Overhead multiplier applied to labor costs')
ON CONFLICT (setting_key) DO NOTHING;

-- PART 1I: Add triggers for updated_at
CREATE OR REPLACE TRIGGER update_product_recipes_updated_at
  BEFORE UPDATE ON public.product_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_xero_mappings_updated_at
  BEFORE UPDATE ON public.xero_manufacturing_account_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
