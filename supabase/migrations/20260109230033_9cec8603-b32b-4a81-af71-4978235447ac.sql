-- Add categories array field to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN categories text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.suppliers.categories IS 'Array of supplier categories: ingredient, packaging, equipment, services, etc.';