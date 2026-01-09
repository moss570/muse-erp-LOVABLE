-- Create material_sub_categories table to store sub-categories per category
CREATE TABLE public.material_sub_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(category, name)
);

-- Add sub_category field to materials table
ALTER TABLE public.materials 
ADD COLUMN sub_category text;

-- Enable RLS
ALTER TABLE public.material_sub_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Sub categories viewable by authenticated" 
ON public.material_sub_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and managers can manage sub categories" 
ON public.material_sub_categories 
FOR ALL 
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_material_sub_categories_updated_at
  BEFORE UPDATE ON public.material_sub_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert default sub-categories for Ingredients
INSERT INTO public.material_sub_categories (category, name, sort_order) VALUES
  ('Ingredients', 'Dairy', 1),
  ('Ingredients', 'Sweeteners', 2),
  ('Ingredients', 'Stabilizers', 3),
  ('Ingredients', 'Flavors', 4),
  ('Ingredients', 'Colors', 5),
  ('Ingredients', 'Fruit', 6),
  ('Ingredients', 'Juice', 7),
  ('Ingredients', 'Nuts', 8),
  ('Ingredients', 'Cookies', 9),
  ('Ingredients', 'Cakes', 10),
  ('Ingredients', 'Candy', 11),
  ('Ingredients', 'Other', 99);

-- Insert default sub-categories for Packaging
INSERT INTO public.material_sub_categories (category, name, sort_order) VALUES
  ('Packaging', 'Containers', 1),
  ('Packaging', 'Lids', 2),
  ('Packaging', 'Labels', 3),
  ('Packaging', 'Shrink Wrap', 4),
  ('Packaging', 'Other', 99);

-- Insert default sub-categories for Boxes
INSERT INTO public.material_sub_categories (category, name, sort_order) VALUES
  ('Boxes', 'Corrugated', 1),
  ('Boxes', 'Display', 2),
  ('Boxes', 'Shipping', 3),
  ('Boxes', 'Other', 99);

-- Insert default sub-categories for Chemical
INSERT INTO public.material_sub_categories (category, name, sort_order) VALUES
  ('Chemical', 'Cleaning', 1),
  ('Chemical', 'Sanitizing', 2),
  ('Chemical', 'Lubricants', 3),
  ('Chemical', 'Other', 99);

-- Insert default sub-categories for Supplies
INSERT INTO public.material_sub_categories (category, name, sort_order) VALUES
  ('Supplies', 'General', 1),
  ('Supplies', 'Other', 99);

-- Insert default sub-categories for Maintenance
INSERT INTO public.material_sub_categories (category, name, sort_order) VALUES
  ('Maintenance', 'Parts', 1),
  ('Maintenance', 'Tools', 2),
  ('Maintenance', 'Other', 99);

-- Insert default sub-categories for Direct Sale
INSERT INTO public.material_sub_categories (category, name, sort_order) VALUES
  ('Direct Sale', 'Finished Goods', 1),
  ('Direct Sale', 'Other', 99);