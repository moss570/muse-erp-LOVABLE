-- Create product_categories table for category-specific settings
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  qa_parameters JSONB DEFAULT '[]'::jsonb,
  spec_sheet_sections JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product_sizes table for pack configurations
CREATE TABLE public.product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_name TEXT NOT NULL,
  size_value NUMERIC NOT NULL,
  size_unit_id UUID REFERENCES public.units_of_measure(id),
  upc_code TEXT,
  case_upc_code TEXT,
  units_per_case INTEGER DEFAULT 1,
  case_weight_kg NUMERIC,
  case_cube_m3 NUMERIC,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product_qa_requirements table for quality parameters
CREATE TABLE public.product_qa_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  parameter_name TEXT NOT NULL,
  target_value TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  uom TEXT,
  required_at_stage TEXT,
  is_critical BOOLEAN DEFAULT FALSE,
  test_method TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product_attributes table for allergens, claims, certifications
CREATE TABLE public.product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_type TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend products table with new columns
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS flavor_family_id UUID REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS product_category_id UUID REFERENCES public.product_categories(id),
  ADD COLUMN IF NOT EXISTS nutritional_data JSONB,
  ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER,
  ADD COLUMN IF NOT EXISTS storage_requirements TEXT,
  ADD COLUMN IF NOT EXISTS handling_instructions TEXT,
  ADD COLUMN IF NOT EXISTS is_base_product BOOLEAN DEFAULT FALSE;

-- Enable RLS on all new tables
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_qa_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;

-- Create policies for product_categories (viewable by all authenticated users)
CREATE POLICY "Authenticated users can view product categories"
  ON public.product_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage product categories"
  ON public.product_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for product_sizes
CREATE POLICY "Authenticated users can view product sizes"
  ON public.product_sizes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage product sizes"
  ON public.product_sizes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for product_qa_requirements
CREATE POLICY "Authenticated users can view product QA requirements"
  ON public.product_qa_requirements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage product QA requirements"
  ON public.product_qa_requirements FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for product_attributes
CREATE POLICY "Authenticated users can view product attributes"
  ON public.product_attributes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage product attributes"
  ON public.product_attributes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_product_sizes_product_id ON public.product_sizes(product_id);
CREATE INDEX idx_product_qa_requirements_product_id ON public.product_qa_requirements(product_id);
CREATE INDEX idx_product_attributes_product_id ON public.product_attributes(product_id);
CREATE INDEX idx_products_product_category_id ON public.products(product_category_id);
CREATE INDEX idx_products_flavor_family_id ON public.products(flavor_family_id);

-- Create updated_at triggers
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_sizes_updated_at
  BEFORE UPDATE ON public.product_sizes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_qa_requirements_updated_at
  BEFORE UPDATE ON public.product_qa_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default product categories
INSERT INTO public.product_categories (name, code, description, qa_parameters, sort_order) VALUES
  ('Ice Cream', 'ICE_CREAM', 'Traditional ice cream products', '[{"name": "Overrun", "uom": "%", "required_at": "freezing"}, {"name": "Temperature", "uom": "°F", "required_at": "freezing"}]'::jsonb, 1),
  ('Gelato', 'GELATO', 'Italian-style gelato products', '[{"name": "Overrun", "uom": "%", "required_at": "freezing"}, {"name": "Temperature", "uom": "°F", "required_at": "freezing"}]'::jsonb, 2),
  ('Sorbet', 'SORBET', 'Fruit-based frozen desserts', '[{"name": "Brix", "uom": "°Bx", "required_at": "flavoring"}, {"name": "pH", "uom": "", "required_at": "flavoring"}, {"name": "Temperature", "uom": "°F", "required_at": "freezing"}]'::jsonb, 3),
  ('Sherbet', 'SHERBET', 'Low-fat frozen dessert with dairy', '[{"name": "Brix", "uom": "°Bx", "required_at": "flavoring"}, {"name": "Temperature", "uom": "°F", "required_at": "freezing"}]'::jsonb, 4),
  ('Frozen Yogurt', 'FROZEN_YOGURT', 'Frozen yogurt products', '[{"name": "pH", "uom": "", "required_at": "flavoring"}, {"name": "Temperature", "uom": "°F", "required_at": "freezing"}]'::jsonb, 5),
  ('Base', 'BASE', 'Base products for further processing', '[{"name": "Temperature", "uom": "°F", "required_at": "base"}]'::jsonb, 0)
ON CONFLICT (code) DO NOTHING;