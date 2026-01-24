-- Fix remaining views without security_invoker

-- 1. Recreate pending_deliveries view with security_invoker
DROP VIEW IF EXISTS public.pending_deliveries;
CREATE VIEW public.pending_deliveries
WITH (security_invoker = on)
AS
SELECT s.id AS shipment_id,
    s.shipment_number,
    so.order_number,
    c.name AS customer_name,
    c.code AS customer_code,
    so.ship_to_address,
    so.ship_to_city,
    so.ship_to_state,
    so.ship_to_zip,
    s.total_cases,
    s.tracking_number,
    s.status,
    s.ship_date,
    b.bol_number,
    so.notes
FROM sales_shipments s
    JOIN sales_orders so ON so.id = s.sales_order_id
    JOIN customers c ON c.id = so.customer_id
    LEFT JOIN bills_of_lading b ON b.id = (( SELECT bol.id
        FROM bills_of_lading bol
            JOIN bol_pallets bp ON bp.bol_id = bol.id
        LIMIT 1))
WHERE s.status = ANY (ARRAY['pending'::text, 'in_transit'::text]);

-- 2. Recreate qa_pending_items view with security_invoker
DROP VIEW IF EXISTS public.qa_pending_items;
CREATE VIEW public.qa_pending_items
WITH (security_invoker = on)
AS
SELECT materials.id,
    'materials'::text AS table_name,
    materials.name AS item_name,
    materials.code AS item_code,
    materials.approval_status,
    materials.created_at,
    materials.updated_at,
    NULL::uuid AS qa_verified_by
FROM materials
WHERE materials.approval_status = 'Pending_QA'::text
UNION ALL
SELECT suppliers.id,
    'suppliers'::text AS table_name,
    suppliers.name AS item_name,
    suppliers.code AS item_code,
    suppliers.approval_status,
    suppliers.created_at,
    suppliers.updated_at,
    suppliers.qa_verified_by
FROM suppliers
WHERE suppliers.approval_status = 'Pending_QA'::text
UNION ALL
SELECT products.id,
    'products'::text AS table_name,
    products.name AS item_name,
    products.sku AS item_code,
    products.approval_status,
    products.created_at,
    products.updated_at,
    products.qa_verified_by
FROM products
WHERE products.approval_status = 'Pending_QA'::text
UNION ALL
SELECT production_lots.id,
    'production_lots'::text AS table_name,
    production_lots.lot_number AS item_name,
    production_lots.lot_number AS item_code,
    production_lots.approval_status,
    production_lots.created_at,
    production_lots.updated_at,
    production_lots.qa_verified_by
FROM production_lots
WHERE production_lots.approval_status = 'Pending_QA'::text
UNION ALL
SELECT rl.id,
    'receiving_lots'::text AS table_name,
    COALESCE(m.name || ' - '::text, ''::text) || rl.internal_lot_number AS item_name,
    rl.internal_lot_number AS item_code,
    CASE rl.qa_status
        WHEN 'pending_qa'::text THEN 'Pending_QA'::text
        WHEN 'approved'::text THEN 'Approved'::text
        WHEN 'rejected'::text THEN 'Rejected'::text
        ELSE rl.qa_status
    END AS approval_status,
    rl.created_at,
    rl.updated_at,
    rl.qa_approved_by AS qa_verified_by
FROM receiving_lots rl
    LEFT JOIN materials m ON rl.material_id = m.id
WHERE rl.qa_status = 'pending_qa'::text;

-- 3. Recreate stale_draft_items view with security_invoker
DROP VIEW IF EXISTS public.stale_draft_items;
CREATE VIEW public.stale_draft_items
WITH (security_invoker = on)
AS
SELECT materials.id,
    'materials'::text AS table_name,
    materials.name AS item_name,
    materials.code AS item_code,
    materials.approval_status,
    materials.created_at,
    materials.updated_at,
    EXTRACT(day FROM now() - materials.created_at)::integer AS days_stale
FROM materials
WHERE materials.approval_status = 'Draft'::text AND materials.created_at < (now() - '7 days'::interval)
UNION ALL
SELECT suppliers.id,
    'suppliers'::text AS table_name,
    suppliers.name AS item_name,
    suppliers.code AS item_code,
    suppliers.approval_status,
    suppliers.created_at,
    suppliers.updated_at,
    EXTRACT(day FROM now() - suppliers.created_at)::integer AS days_stale
FROM suppliers
WHERE suppliers.approval_status = 'Draft'::text AND suppliers.created_at < (now() - '7 days'::interval)
UNION ALL
SELECT products.id,
    'products'::text AS table_name,
    products.name AS item_name,
    products.sku AS item_code,
    products.approval_status,
    products.created_at,
    products.updated_at,
    EXTRACT(day FROM now() - products.created_at)::integer AS days_stale
FROM products
WHERE products.approval_status = 'Draft'::text AND products.created_at < (now() - '7 days'::interval);