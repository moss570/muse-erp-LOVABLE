-- Create listed_material_categories table
CREATE TABLE public.listed_material_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listed_material_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view active categories"
ON public.listed_material_categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and managers can manage categories"
ON public.listed_material_categories
FOR ALL
TO authenticated
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_listed_material_categories_updated_at
BEFORE UPDATE ON public.listed_material_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial categories
INSERT INTO public.listed_material_categories (code, name, sort_order) VALUES
('DAI', 'Dairy & Base', 1),
('SWE', 'Sweeteners', 2),
('STA', 'Stabilizers', 3),
('FLA', 'Flavors & Extracts', 4),
('CHO', 'Chocolate & Cocoa', 5),
('NUT', 'Nuts & Pastes', 6),
('FRU', 'Fruits', 7),
('JUI', 'Juices & Purees', 8),
('VAR', 'Variegates', 9),
('PAC', 'Packaging', 10),
('OTH', 'Other/Miscellaneous', 99);

-- Add category_id column to listed_material_names
ALTER TABLE public.listed_material_names 
ADD COLUMN category_id UUID REFERENCES public.listed_material_categories(id);

-- Create index for faster lookups
CREATE INDEX idx_listed_material_names_category_id ON public.listed_material_names(category_id);

-- Auto-categorize existing materials based on code prefix
UPDATE public.listed_material_names lm
SET category_id = lmc.id
FROM public.listed_material_categories lmc
WHERE SUBSTRING(lm.code FROM 1 FOR 3) = lmc.code;