-- Add product_size_id column to sales_order_items to reference specific sellable SKUs
ALTER TABLE public.sales_order_items 
ADD COLUMN product_size_id UUID REFERENCES public.product_sizes(id);

-- Create index for better query performance
CREATE INDEX idx_sales_order_items_product_size_id ON public.sales_order_items(product_size_id);