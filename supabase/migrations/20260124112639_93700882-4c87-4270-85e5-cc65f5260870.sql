-- Add pricing columns to product_sizes table for default SKU-level pricing
ALTER TABLE public.product_sizes
ADD COLUMN IF NOT EXISTS distributor_price NUMERIC(12,4) CHECK (distributor_price >= 0),
ADD COLUMN IF NOT EXISTS direct_price NUMERIC(12,4) CHECK (direct_price >= 0);

-- Add index for pricing queries
CREATE INDEX IF NOT EXISTS idx_product_sizes_pricing ON public.product_sizes(product_id, distributor_price, direct_price)
WHERE is_active = true;

-- Create customer_product_pricing table for customer-specific pricing
CREATE TABLE IF NOT EXISTS public.customer_product_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    product_size_id UUID NOT NULL REFERENCES public.product_sizes(id) ON DELETE CASCADE,
    unit_price NUMERIC(12,4) NOT NULL CHECK (unit_price >= 0),
    customer_item_number TEXT,
    min_quantity INTEGER DEFAULT 1,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(customer_id, product_size_id, effective_date)
);

-- Add indexes for customer pricing
CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_customer ON public.customer_product_pricing(customer_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_product_size ON public.customer_product_pricing(product_size_id);

-- Enable RLS
ALTER TABLE public.customer_product_pricing ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_product_pricing
CREATE POLICY "Users can view all customer product pricing" ON public.customer_product_pricing
    FOR SELECT USING (true);

CREATE POLICY "Users can insert customer product pricing" ON public.customer_product_pricing
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update customer product pricing" ON public.customer_product_pricing
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete customer product pricing" ON public.customer_product_pricing
    FOR DELETE USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_customer_product_pricing_updated_at
    BEFORE UPDATE ON public.customer_product_pricing
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();