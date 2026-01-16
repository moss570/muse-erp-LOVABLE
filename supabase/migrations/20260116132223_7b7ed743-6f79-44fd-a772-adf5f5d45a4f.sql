-- Phase 1: Add is_primary to material_listed_material_links
ALTER TABLE public.material_listed_material_links
ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster lookups
CREATE INDEX idx_material_links_primary 
ON public.material_listed_material_links(listed_material_id, is_primary) 
WHERE is_primary = true;

-- Function to auto-set first linked material as primary
CREATE OR REPLACE FUNCTION public.set_default_primary_material()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_primary_count INTEGER;
BEGIN
  -- Check if there's already a primary material for this listed material
  SELECT COUNT(*) INTO v_existing_primary_count
  FROM public.material_listed_material_links
  WHERE listed_material_id = NEW.listed_material_id
    AND is_primary = true
    AND id != NEW.id;
  
  -- If no primary exists, make this one primary
  IF v_existing_primary_count = 0 THEN
    NEW.is_primary := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-set primary on insert
CREATE TRIGGER tr_set_default_primary_material
BEFORE INSERT ON public.material_listed_material_links
FOR EACH ROW
EXECUTE FUNCTION public.set_default_primary_material();

-- Function to ensure only one primary per listed material
CREATE OR REPLACE FUNCTION public.enforce_single_primary_material()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If setting this as primary, unset all others for this listed material
  IF NEW.is_primary = true THEN
    UPDATE public.material_listed_material_links
    SET is_primary = false
    WHERE listed_material_id = NEW.listed_material_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to enforce single primary
CREATE TRIGGER tr_enforce_single_primary_material
AFTER INSERT OR UPDATE OF is_primary ON public.material_listed_material_links
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION public.enforce_single_primary_material();

-- Set existing first-linked materials as primary (based on created_at)
WITH first_materials AS (
  SELECT DISTINCT ON (listed_material_id) id
  FROM public.material_listed_material_links
  ORDER BY listed_material_id, created_at ASC
)
UPDATE public.material_listed_material_links
SET is_primary = true
WHERE id IN (SELECT id FROM first_materials);

-- Phase 2: Add recipe_type and parent_recipe_id to product_recipes
ALTER TABLE public.product_recipes
ADD COLUMN recipe_type TEXT NOT NULL DEFAULT 'primary' CHECK (recipe_type IN ('primary', 'sub')),
ADD COLUMN parent_recipe_id UUID REFERENCES public.product_recipes(id) ON DELETE CASCADE,
ADD COLUMN sub_recipe_number INTEGER;

-- Add index for sub-recipe lookups
CREATE INDEX idx_product_recipes_parent ON public.product_recipes(parent_recipe_id);

-- Add comment explaining the design
COMMENT ON COLUMN public.product_recipes.recipe_type IS 'primary = main BOM, sub = backup/alternative BOM';
COMMENT ON COLUMN public.product_recipes.parent_recipe_id IS 'For sub recipes, references the parent primary recipe';
COMMENT ON COLUMN public.product_recipes.sub_recipe_number IS 'Sequential number for sub recipes (1, 2, 3...)';