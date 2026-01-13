-- Make material_id nullable since BOMs now primarily use listed_material_id
-- During production, the actual material is selected from linked materials

ALTER TABLE public.product_recipe_items 
ALTER COLUMN material_id DROP NOT NULL;