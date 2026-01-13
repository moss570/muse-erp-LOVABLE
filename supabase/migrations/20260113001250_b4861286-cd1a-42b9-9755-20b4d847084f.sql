-- Add listed_material_id column to product_recipe_items for BOM design
-- BOMs should reference Listed Materials (abstract names), not specific vendor Materials

ALTER TABLE public.product_recipe_items 
ADD COLUMN listed_material_id UUID REFERENCES public.listed_material_names(id);

-- Create index for performance
CREATE INDEX idx_product_recipe_items_listed_material_id 
ON public.product_recipe_items(listed_material_id);

-- Add comment explaining the design
COMMENT ON COLUMN public.product_recipe_items.listed_material_id IS 
'References the abstract Listed Material for BOM. During manufacturing, operators select a specific linked Material from material_listed_material_links table.';

-- The material_id column is kept for backward compatibility but will become optional
-- It can be used to store the preferred/default material for the listed material
COMMENT ON COLUMN public.product_recipe_items.material_id IS 
'Optional: preferred/default material for the listed material. During manufacturing, operators can select any linked material.';