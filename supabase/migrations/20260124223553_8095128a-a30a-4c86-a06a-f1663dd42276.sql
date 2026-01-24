-- =====================================================
-- UNFULFILLED SALES ORDER ACKNOWLEDGMENTS
-- Tracks when production managers acknowledge shortages
-- before creating work orders
-- =====================================================

-- 1. Create unfulfilled_so_acknowledgments table
CREATE TABLE public.unfulfilled_so_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unfulfilled_items_snapshot JSONB NOT NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unfulfilled_so_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can read all, insert their own
CREATE POLICY "Authenticated users can view acknowledgments"
  ON public.unfulfilled_so_acknowledgments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can create their own acknowledgments"
  ON public.unfulfilled_so_acknowledgments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_unfulfilled_ack_user_id ON public.unfulfilled_so_acknowledgments(user_id);
CREATE INDEX idx_unfulfilled_ack_work_order_id ON public.unfulfilled_so_acknowledgments(work_order_id);
CREATE INDEX idx_unfulfilled_ack_acknowledged_at ON public.unfulfilled_so_acknowledgments(acknowledged_at DESC);

-- 2. Add acknowledged_unfulfilled_items field to work_orders
ALTER TABLE public.work_orders 
ADD COLUMN acknowledged_unfulfilled_items BOOLEAN DEFAULT false;

-- 3. Create view for calculating unfulfilled sales order items
-- This aggregates shortage data across all open sales orders
CREATE OR REPLACE VIEW public.vw_unfulfilled_sales_order_items AS
WITH open_so_items AS (
  -- Get all items from non-completed/cancelled sales orders
  SELECT 
    soi.id as item_id,
    soi.sales_order_id,
    so.order_number,
    so.customer_id,
    c.name as customer_name,
    so.requested_delivery_date,
    soi.product_size_id,
    ps.sku as product_code,
    ps.size_name,
    p.name as product_name,
    p.id as product_id,
    soi.quantity_ordered,
    COALESCE(soi.quantity_shipped, 0) as quantity_shipped,
    (soi.quantity_ordered - COALESCE(soi.quantity_shipped, 0)) as quantity_remaining
  FROM public.sales_order_items soi
  JOIN public.sales_orders so ON soi.sales_order_id = so.id
  JOIN public.customers c ON so.customer_id = c.id
  LEFT JOIN public.product_sizes ps ON soi.product_size_id = ps.id
  LEFT JOIN public.products p ON ps.product_id = p.id
  WHERE so.status NOT IN ('shipped', 'cancelled', 'invoiced')
    AND (soi.quantity_ordered - COALESCE(soi.quantity_shipped, 0)) > 0
),
available_inventory AS (
  -- Calculate available finished goods inventory from pallets
  -- Cases that are on available pallets (not shipped, not held)
  SELECT 
    pc.product_id,
    ps.id as product_size_id,
    SUM(pc.quantity) as total_available_cases
  FROM public.pallet_cases pc
  JOIN public.pallets p ON pc.pallet_id = p.id
  JOIN public.production_lots pl ON pc.production_lot_id = pl.id
  LEFT JOIN public.product_sizes ps ON ps.product_id = pc.product_id
  WHERE pc.removed_at IS NULL
    AND p.status IN ('available', 'staged', 'storage')
    AND pl.approval_status = 'Approved'
  GROUP BY pc.product_id, ps.id
),
aggregated_demand AS (
  -- Aggregate demand by product_size
  SELECT 
    product_size_id,
    product_code,
    product_name,
    size_name,
    product_id,
    SUM(quantity_remaining) as total_quantity_needed,
    MIN(requested_delivery_date) as earliest_due_date,
    COUNT(DISTINCT sales_order_id) as number_of_sales_orders,
    ARRAY_AGG(DISTINCT order_number ORDER BY order_number) as sales_order_numbers
  FROM open_so_items
  GROUP BY product_size_id, product_code, product_name, size_name, product_id
)
SELECT 
  ad.product_size_id,
  ad.product_code,
  COALESCE(ad.product_name, 'Unknown Product') || ' - ' || COALESCE(ad.size_name, '') as product_description,
  ad.product_id,
  ad.total_quantity_needed,
  COALESCE(ai.total_available_cases, 0) as total_available_stock,
  GREATEST(ad.total_quantity_needed - COALESCE(ai.total_available_cases, 0), 0) as shortage_quantity,
  ad.earliest_due_date,
  ad.number_of_sales_orders,
  ad.sales_order_numbers,
  -- Priority calculation
  CASE 
    WHEN ad.earliest_due_date IS NULL THEN 10
    WHEN ad.earliest_due_date < CURRENT_DATE THEN 100  -- Overdue
    WHEN ad.earliest_due_date <= CURRENT_DATE + INTERVAL '2 days' THEN 75
    WHEN ad.earliest_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 50
    WHEN ad.earliest_due_date <= CURRENT_DATE + INTERVAL '14 days' THEN 25
    ELSE 10
  END as due_date_factor
FROM aggregated_demand ad
LEFT JOIN available_inventory ai ON ad.product_size_id = ai.product_size_id
WHERE (ad.total_quantity_needed - COALESCE(ai.total_available_cases, 0)) > 0
ORDER BY due_date_factor DESC, shortage_quantity DESC;