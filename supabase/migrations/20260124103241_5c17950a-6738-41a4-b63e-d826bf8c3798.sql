-- Add customer PO number field to sales orders
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS customer_po_number TEXT;