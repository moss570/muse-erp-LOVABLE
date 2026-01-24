-- Add missing columns to customers table for parent company hierarchy
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES public.customers(id),
ADD COLUMN IF NOT EXISTS is_master_company BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Add index for parent company lookups
CREATE INDEX IF NOT EXISTS idx_customers_parent_company ON public.customers(parent_company_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_master ON public.customers(is_master_company) WHERE is_master_company = true;