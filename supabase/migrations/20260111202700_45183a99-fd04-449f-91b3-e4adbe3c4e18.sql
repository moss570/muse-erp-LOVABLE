-- Add new packaging specification fields to materials table
ALTER TABLE public.materials
ADD COLUMN pkg_food_grade_suitable boolean DEFAULT false,
ADD COLUMN pkg_pcr_fda_approved boolean DEFAULT false,
ADD COLUMN pkg_heavy_metals_compliant boolean DEFAULT false;