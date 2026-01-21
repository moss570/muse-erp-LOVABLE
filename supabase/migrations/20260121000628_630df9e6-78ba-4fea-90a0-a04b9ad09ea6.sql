-- Switch work_orders.product_id FK from materials to products

-- 1) Drop the existing FK constraint pointing to materials
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_product_id_fkey;

-- 2) Temporarily allow NULL so we can update existing rows if any
ALTER TABLE public.work_orders ALTER COLUMN product_id DROP NOT NULL;

-- 3) Re-add the FK pointing to products
ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products(id)
  ON DELETE SET NULL;