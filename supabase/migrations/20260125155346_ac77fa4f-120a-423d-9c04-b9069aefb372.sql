-- Add size_type to the unfulfilled sales order items view
DROP VIEW IF EXISTS public.vw_unfulfilled_sales_order_items;

CREATE OR REPLACE VIEW public.vw_unfulfilled_sales_order_items AS
WITH open_so_items AS (
  SELECT soi.id AS item_id,
    soi.sales_order_id,
    so.order_number,
    so.customer_id,
    c.name AS customer_name,
    so.requested_delivery_date,
    soi.product_size_id,
    ps.sku AS product_code,
    ps.size_name,
    ps.size_type,
    p.name AS product_name,
    p.id AS product_id,
    soi.quantity_ordered,
    COALESCE(soi.quantity_shipped, 0) AS quantity_shipped,
    soi.quantity_ordered - COALESCE(soi.quantity_shipped, 0) AS quantity_remaining
  FROM sales_order_items soi
    JOIN sales_orders so ON soi.sales_order_id = so.id
    JOIN customers c ON so.customer_id = c.id
    LEFT JOIN product_sizes ps ON soi.product_size_id = ps.id
    LEFT JOIN products p ON ps.product_id = p.id
  WHERE so.status NOT IN ('shipped', 'cancelled', 'invoiced') 
    AND (soi.quantity_ordered - COALESCE(soi.quantity_shipped, 0)) > 0
), available_inventory AS (
  SELECT pc.product_id,
    ps.id AS product_size_id,
    sum(pc.quantity) AS total_available_cases
  FROM pallet_cases pc
    JOIN pallets p ON pc.pallet_id = p.id
    JOIN production_lots pl ON pc.production_lot_id = pl.id
    LEFT JOIN product_sizes ps ON ps.product_id = pc.product_id
  WHERE pc.removed_at IS NULL 
    AND p.status IN ('available', 'staged', 'storage')
    AND pl.approval_status = 'Approved'
  GROUP BY pc.product_id, ps.id
), aggregated_demand AS (
  SELECT 
    open_so_items.product_size_id,
    open_so_items.product_code,
    open_so_items.product_name,
    open_so_items.size_name,
    open_so_items.size_type,
    open_so_items.product_id,
    sum(open_so_items.quantity_remaining) AS total_quantity_needed,
    min(open_so_items.requested_delivery_date) AS earliest_due_date,
    count(DISTINCT open_so_items.sales_order_id) AS number_of_sales_orders,
    array_agg(DISTINCT open_so_items.order_number ORDER BY open_so_items.order_number) AS sales_order_numbers
  FROM open_so_items
  GROUP BY open_so_items.product_size_id, open_so_items.product_code, open_so_items.product_name, open_so_items.size_name, open_so_items.size_type, open_so_items.product_id
)
SELECT 
  ad.product_size_id,
  ad.product_code,
  (COALESCE(ad.product_name, 'Unknown Product') || ' - ' || COALESCE(ad.size_name, '')) AS product_description,
  ad.product_id,
  ad.size_type,
  ad.total_quantity_needed,
  COALESCE(ai.total_available_cases, 0) AS total_available_stock,
  GREATEST(ad.total_quantity_needed - COALESCE(ai.total_available_cases, 0), 0) AS shortage_quantity,
  ad.earliest_due_date,
  ad.number_of_sales_orders,
  ad.sales_order_numbers,
  CASE
    WHEN ad.earliest_due_date IS NULL THEN 10
    WHEN ad.earliest_due_date < CURRENT_DATE THEN 100
    WHEN ad.earliest_due_date <= CURRENT_DATE + INTERVAL '2 days' THEN 75
    WHEN ad.earliest_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 50
    WHEN ad.earliest_due_date <= CURRENT_DATE + INTERVAL '14 days' THEN 25
    ELSE 10
  END AS due_date_factor
FROM aggregated_demand ad
LEFT JOIN available_inventory ai ON ad.product_size_id = ai.product_size_id
WHERE (ad.total_quantity_needed - COALESCE(ai.total_available_cases, 0)) > 0
ORDER BY due_date_factor DESC, shortage_quantity DESC;