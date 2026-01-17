-- 1. Material nutrition data table (per 100g base)
CREATE TABLE public.material_nutrition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE UNIQUE,
  
  -- Serving Information (stored per 100g base)
  serving_size_g NUMERIC(10,2) DEFAULT 100,
  serving_size_description TEXT,
  servings_per_container NUMERIC(10,2),
  
  -- Macronutrients (per 100g)
  calories NUMERIC(10,2),
  total_fat_g NUMERIC(10,3),
  saturated_fat_g NUMERIC(10,3),
  trans_fat_g NUMERIC(10,3),
  polyunsaturated_fat_g NUMERIC(10,3),
  monounsaturated_fat_g NUMERIC(10,3),
  cholesterol_mg NUMERIC(10,3),
  sodium_mg NUMERIC(10,3),
  total_carbohydrate_g NUMERIC(10,3),
  dietary_fiber_g NUMERIC(10,3),
  total_sugars_g NUMERIC(10,3),
  added_sugars_g NUMERIC(10,3),
  sugar_alcohol_g NUMERIC(10,3),
  protein_g NUMERIC(10,3),
  
  -- Mandatory Micronutrients (FDA 2020+)
  vitamin_d_mcg NUMERIC(10,3),
  calcium_mg NUMERIC(10,3),
  iron_mg NUMERIC(10,3),
  potassium_mg NUMERIC(10,3),
  
  -- Optional Micronutrients
  vitamin_a_mcg NUMERIC(10,3),
  vitamin_c_mg NUMERIC(10,3),
  vitamin_e_mg NUMERIC(10,3),
  thiamin_mg NUMERIC(10,3),
  riboflavin_mg NUMERIC(10,3),
  niacin_mg NUMERIC(10,3),
  vitamin_b6_mg NUMERIC(10,3),
  folate_mcg_dfe NUMERIC(10,3),
  vitamin_b12_mcg NUMERIC(10,3),
  phosphorus_mg NUMERIC(10,3),
  magnesium_mg NUMERIC(10,3),
  zinc_mg NUMERIC(10,3),
  selenium_mcg NUMERIC(10,3),
  
  -- Data Source & Audit
  data_source TEXT CHECK (data_source IN ('manual', 'pdf_extracted', 'excel_import', 'usda_fdc', 'lab_analysis')),
  source_document_id UUID,
  usda_fdc_id TEXT,
  extraction_confidence NUMERIC(5,2),
  last_verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. FDA Daily Values reference table (2020 standards)
CREATE TABLE public.nutrition_daily_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrient_code TEXT UNIQUE NOT NULL,
  nutrient_name TEXT NOT NULL,
  daily_value NUMERIC(10,3) NOT NULL,
  unit TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT false,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Insert FDA 2020 Daily Values
INSERT INTO public.nutrition_daily_values (nutrient_code, nutrient_name, daily_value, unit, is_mandatory, display_order) VALUES
  ('total_fat', 'Total Fat', 78, 'g', true, 1),
  ('saturated_fat', 'Saturated Fat', 20, 'g', true, 2),
  ('trans_fat', 'Trans Fat', 0, 'g', true, 3),
  ('cholesterol', 'Cholesterol', 300, 'mg', true, 4),
  ('sodium', 'Sodium', 2300, 'mg', true, 5),
  ('total_carbohydrate', 'Total Carbohydrate', 275, 'g', true, 6),
  ('dietary_fiber', 'Dietary Fiber', 28, 'g', true, 7),
  ('total_sugars', 'Total Sugars', 0, 'g', true, 8),
  ('added_sugars', 'Added Sugars', 50, 'g', true, 9),
  ('protein', 'Protein', 50, 'g', true, 10),
  ('vitamin_d', 'Vitamin D', 20, 'mcg', true, 11),
  ('calcium', 'Calcium', 1300, 'mg', true, 12),
  ('iron', 'Iron', 18, 'mg', true, 13),
  ('potassium', 'Potassium', 4700, 'mg', true, 14),
  ('vitamin_a', 'Vitamin A', 900, 'mcg', false, 15),
  ('vitamin_c', 'Vitamin C', 90, 'mg', false, 16),
  ('vitamin_e', 'Vitamin E', 15, 'mg', false, 17),
  ('thiamin', 'Thiamin', 1.2, 'mg', false, 18),
  ('riboflavin', 'Riboflavin', 1.3, 'mg', false, 19),
  ('niacin', 'Niacin', 16, 'mg', false, 20),
  ('vitamin_b6', 'Vitamin B6', 1.7, 'mg', false, 21),
  ('folate', 'Folate', 400, 'mcg DFE', false, 22),
  ('vitamin_b12', 'Vitamin B12', 2.4, 'mcg', false, 23),
  ('phosphorus', 'Phosphorus', 1250, 'mg', false, 24),
  ('magnesium', 'Magnesium', 420, 'mg', false, 25),
  ('zinc', 'Zinc', 11, 'mg', false, 26),
  ('selenium', 'Selenium', 55, 'mcg', false, 27);

-- 3. Product nutrition (calculated cache)
CREATE TABLE public.product_nutrition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.product_recipes(id) ON DELETE SET NULL,
  
  -- Serving for ice cream (FDA: 2/3 cup = ~95g)
  serving_size_g NUMERIC(10,2) DEFAULT 95,
  serving_size_description TEXT DEFAULT '2/3 cup (95g)',
  servings_per_container NUMERIC(10,2),
  
  -- Macronutrients
  calories NUMERIC(10,2),
  total_fat_g NUMERIC(10,3),
  saturated_fat_g NUMERIC(10,3),
  trans_fat_g NUMERIC(10,3),
  polyunsaturated_fat_g NUMERIC(10,3),
  monounsaturated_fat_g NUMERIC(10,3),
  cholesterol_mg NUMERIC(10,3),
  sodium_mg NUMERIC(10,3),
  total_carbohydrate_g NUMERIC(10,3),
  dietary_fiber_g NUMERIC(10,3),
  total_sugars_g NUMERIC(10,3),
  added_sugars_g NUMERIC(10,3),
  protein_g NUMERIC(10,3),
  
  -- Mandatory Micronutrients
  vitamin_d_mcg NUMERIC(10,3),
  calcium_mg NUMERIC(10,3),
  iron_mg NUMERIC(10,3),
  potassium_mg NUMERIC(10,3),
  
  -- Optional Micronutrients
  vitamin_a_mcg NUMERIC(10,3),
  vitamin_c_mg NUMERIC(10,3),
  
  -- Ice cream calculation factors
  yield_loss_percent NUMERIC(5,2) DEFAULT 5,
  overrun_percent NUMERIC(5,2) DEFAULT 50,
  calculation_date TIMESTAMPTZ DEFAULT now(),
  calculated_by UUID REFERENCES public.profiles(id),
  is_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Label format configurations
CREATE TABLE public.nutrition_label_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  format_type TEXT CHECK (format_type IN ('standard_vertical', 'tabular', 'linear', 'dual_column', 'small_package')),
  width_inches NUMERIC(6,2),
  height_inches NUMERIC(6,2),
  min_area_sq_inches NUMERIC(6,2),
  font_config JSONB DEFAULT '{
    "title": {"size": 16, "weight": "bold"},
    "serving_info": {"size": 10, "weight": "bold"},
    "calories": {"size": 22, "weight": "bold"},
    "nutrients": {"size": 8, "weight": "normal"},
    "daily_value": {"size": 8, "weight": "normal"},
    "footnote": {"size": 6, "weight": "normal"}
  }',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Insert standard FDA label formats
INSERT INTO public.nutrition_label_formats (name, description, format_type, width_inches, height_inches, min_area_sq_inches, is_default) VALUES
  ('Standard Vertical', 'Full-size vertical Nutrition Facts panel (>40 sq in packages)', 'standard_vertical', 2.5, 5.0, 40, true),
  ('Tabular', 'Horizontal layout for packages with limited vertical space', 'tabular', 5.0, 2.0, 40, false),
  ('Small Package Vertical', 'Condensed vertical for packages 12-40 sq in', 'small_package', 1.5, 3.0, 12, false),
  ('Linear', 'Single-line format for very small packages (<12 sq in)', 'linear', 4.0, 0.75, 0, false),
  ('Dual Column', 'Per serving and per container for pints (2-3 servings)', 'dual_column', 3.0, 5.5, 40, false);

-- 5. RLS Policies
ALTER TABLE public.material_nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_daily_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_label_formats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view material nutrition" ON public.material_nutrition FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage material nutrition" ON public.material_nutrition FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Anyone can view daily values" ON public.nutrition_daily_values FOR SELECT USING (true);
CREATE POLICY "Admins can manage daily values" ON public.nutrition_daily_values FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Anyone can view product nutrition" ON public.product_nutrition FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage product nutrition" ON public.product_nutrition FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Anyone can view label formats" ON public.nutrition_label_formats FOR SELECT USING (true);
CREATE POLICY "Admins can manage label formats" ON public.nutrition_label_formats FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- 6. Triggers for updated_at
CREATE TRIGGER update_material_nutrition_updated_at BEFORE UPDATE ON public.material_nutrition
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_product_nutrition_updated_at BEFORE UPDATE ON public.product_nutrition
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();