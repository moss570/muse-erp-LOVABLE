-- Update qa_pending_items view to include receiving_lots with pending QA status
CREATE OR REPLACE VIEW qa_pending_items AS
SELECT 
    id,
    'materials'::text AS table_name,
    name AS item_name,
    code AS item_code,
    approval_status,
    created_at,
    updated_at,
    NULL::uuid AS qa_verified_by
FROM materials
WHERE approval_status = 'Pending_QA'

UNION ALL

SELECT 
    id,
    'suppliers'::text AS table_name,
    name AS item_name,
    code AS item_code,
    approval_status,
    created_at,
    updated_at,
    qa_verified_by
FROM suppliers
WHERE approval_status = 'Pending_QA'

UNION ALL

SELECT 
    id,
    'products'::text AS table_name,
    name AS item_name,
    sku AS item_code,
    approval_status,
    created_at,
    updated_at,
    qa_verified_by
FROM products
WHERE approval_status = 'Pending_QA'

UNION ALL

SELECT 
    id,
    'production_lots'::text AS table_name,
    lot_number AS item_name,
    lot_number AS item_code,
    approval_status,
    created_at,
    updated_at,
    qa_verified_by
FROM production_lots
WHERE approval_status = 'Pending_QA'

UNION ALL

SELECT 
    rl.id,
    'receiving_lots'::text AS table_name,
    COALESCE(m.name || ' - ', '') || rl.internal_lot_number AS item_name,
    rl.internal_lot_number AS item_code,
    CASE rl.qa_status 
        WHEN 'pending_qa' THEN 'Pending_QA'
        WHEN 'approved' THEN 'Approved'
        WHEN 'rejected' THEN 'Rejected'
        ELSE rl.qa_status
    END AS approval_status,
    rl.created_at,
    rl.updated_at,
    rl.qa_approved_by AS qa_verified_by
FROM receiving_lots rl
LEFT JOIN materials m ON rl.material_id = m.id
WHERE rl.qa_status = 'pending_qa';