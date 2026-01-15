-- Remove flavor_family_id column from products table (redundant with base_product_id)
ALTER TABLE public.products DROP COLUMN IF EXISTS flavor_family_id;