
-- Create listed_material_names table for generic ingredient names (e.g., "Sugar")
CREATE TABLE public.listed_material_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.listed_material_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view listed material names"
  ON public.listed_material_names FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage listed material names"
  ON public.listed_material_names FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_listed_material_names_updated_at
  BEFORE UPDATE ON public.listed_material_names
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add new columns to materials table (status for workflow)
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS material_status TEXT DEFAULT 'pending_setup' CHECK (material_status IN ('pending_setup', 'approved', 'not_approved')),
  ADD COLUMN IF NOT EXISTS listed_material_id UUID REFERENCES public.listed_material_names(id),
  ADD COLUMN IF NOT EXISTS manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS item_number TEXT,
  ADD COLUMN IF NOT EXISTS density NUMERIC,
  ADD COLUMN IF NOT EXISTS allergens TEXT[],
  ADD COLUMN IF NOT EXISTS coa_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS receiving_temperature_min NUMERIC,
  ADD COLUMN IF NOT EXISTS receiving_temperature_max NUMERIC,
  ADD COLUMN IF NOT EXISTS storage_temperature_min NUMERIC,
  ADD COLUMN IF NOT EXISTS storage_temperature_max NUMERIC,
  ADD COLUMN IF NOT EXISTS food_claims TEXT[],
  ADD COLUMN IF NOT EXISTS ca_prop65_prohibited BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_hazards TEXT,
  ADD COLUMN IF NOT EXISTS label_copy TEXT,
  ADD COLUMN IF NOT EXISTS country_of_origin TEXT,
  ADD COLUMN IF NOT EXISTS fraud_vulnerability_score TEXT,
  ADD COLUMN IF NOT EXISTS authentication_method TEXT,
  ADD COLUMN IF NOT EXISTS supply_chain_complexity TEXT;

-- Create document_requirements table
CREATE TABLE public.document_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area TEXT NOT NULL,
  document_name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(area, document_name)
);

ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view document requirements"
  ON public.document_requirements FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage document requirements"
  ON public.document_requirements FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_document_requirements_updated_at
  BEFORE UPDATE ON public.document_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create material_documents table
CREATE TABLE public.material_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.document_requirements(id),
  document_name TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  date_published DATE,
  date_reviewed DATE,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.material_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view material documents"
  ON public.material_documents FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage material documents"
  ON public.material_documents FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_material_documents_updated_at
  BEFORE UPDATE ON public.material_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create material_purchase_units table
CREATE TABLE public.material_purchase_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units_of_measure(id),
  conversion_to_base NUMERIC NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(material_id, unit_id)
);

ALTER TABLE public.material_purchase_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view material purchase units"
  ON public.material_purchase_units FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage material purchase units"
  ON public.material_purchase_units FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_material_purchase_units_updated_at
  BEFORE UPDATE ON public.material_purchase_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default dropdown options
INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order) VALUES
  ('food_claim', 'organic', 'Organic', 1),
  ('food_claim', 'non_gmo', 'Non-GMO', 2),
  ('food_claim', 'kosher', 'Kosher', 3),
  ('food_claim', 'halal', 'Halal', 4),
  ('food_claim', 'gluten_free', 'Gluten Free', 5),
  ('food_claim', 'vegan', 'Vegan', 6),
  ('fraud_vulnerability', 'low', 'Low', 1),
  ('fraud_vulnerability', 'medium', 'Medium', 2),
  ('fraud_vulnerability', 'high', 'High', 3),
  ('authentication_method', 'coa', 'Certificate of Analysis', 1),
  ('authentication_method', 'supplier_audit', 'Supplier Audit', 2),
  ('authentication_method', 'third_party_testing', 'Third Party Testing', 3),
  ('authentication_method', 'dna_testing', 'DNA Testing', 4),
  ('authentication_method', 'isotope_analysis', 'Isotope Analysis', 5),
  ('supply_chain_complexity', 'simple', 'Simple (Direct from manufacturer)', 1),
  ('supply_chain_complexity', 'moderate', 'Moderate (1-2 intermediaries)', 2),
  ('supply_chain_complexity', 'complex', 'Complex (3+ intermediaries)', 3);

-- Insert default document requirements for materials
INSERT INTO public.document_requirements (area, document_name, description, is_required, sort_order) VALUES
  ('materials', 'Specification Sheet', 'Product specification document from manufacturer', true, 1),
  ('materials', 'Nutritional Data', 'Nutritional information panel data', true, 2),
  ('materials', 'Certificate of Analysis', 'COA from manufacturer or supplier', false, 3),
  ('materials', 'Allergen Statement', 'Allergen declaration document', false, 4),
  ('materials', 'Kosher Certificate', 'Kosher certification if applicable', false, 5),
  ('materials', 'Halal Certificate', 'Halal certification if applicable', false, 6);
