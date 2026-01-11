-- Recreate the document_expiration_watchlist view to include supplier_documents

CREATE OR REPLACE VIEW public.document_expiration_watchlist AS
-- Compliance documents (supplier, product, etc.)
SELECT 
  cd.id,
  cd.related_entity_id,
  cd.related_entity_type,
  cd.document_type,
  cd.document_name,
  cd.file_url,
  cd.expiration_date,
  cd.uploaded_by,
  cd.created_at,
  CASE 
    WHEN cd.expiration_date < CURRENT_DATE THEN 'expired'::text
    WHEN cd.expiration_date <= (CURRENT_DATE + INTERVAL '45 days') THEN 'expiring_soon'::text
    ELSE 'valid'::text
  END AS expiration_status,
  COALESCE(
    s.name,
    m.name,
    p.name,
    'Unknown'
  ) AS entity_name
FROM compliance_documents cd
LEFT JOIN suppliers s ON cd.related_entity_type = 'supplier' AND cd.related_entity_id = s.id
LEFT JOIN materials m ON cd.related_entity_type = 'material' AND cd.related_entity_id = m.id
LEFT JOIN products p ON cd.related_entity_type = 'product' AND cd.related_entity_id = p.id
WHERE cd.expiration_date IS NOT NULL
  AND cd.is_current = true
  AND cd.expiration_date <= (CURRENT_DATE + INTERVAL '45 days')

UNION ALL

-- Material documents (spec sheets, etc.)
SELECT 
  md.id,
  md.material_id AS related_entity_id,
  'material'::text AS related_entity_type,
  md.document_name AS document_type,
  md.document_name,
  md.file_url,
  md.expiry_date AS expiration_date,
  md.uploaded_by,
  md.created_at,
  CASE 
    WHEN md.expiry_date < CURRENT_DATE THEN 'expired'::text
    WHEN md.expiry_date <= (CURRENT_DATE + INTERVAL '45 days') THEN 'expiring_soon'::text
    ELSE 'valid'::text
  END AS expiration_status,
  mat.name AS entity_name
FROM material_documents md
JOIN materials mat ON md.material_id = mat.id
WHERE md.expiry_date IS NOT NULL
  AND (md.is_archived IS NULL OR md.is_archived = false)
  AND md.expiry_date <= (CURRENT_DATE + INTERVAL '45 days')

UNION ALL

-- Supplier documents
SELECT 
  sd.id,
  sd.supplier_id AS related_entity_id,
  'supplier'::text AS related_entity_type,
  sd.document_name AS document_type,
  sd.document_name,
  sd.file_url,
  sd.expiry_date AS expiration_date,
  sd.uploaded_by,
  sd.created_at,
  CASE 
    WHEN sd.expiry_date < CURRENT_DATE THEN 'expired'::text
    WHEN sd.expiry_date <= (CURRENT_DATE + INTERVAL '45 days') THEN 'expiring_soon'::text
    ELSE 'valid'::text
  END AS expiration_status,
  sup.name AS entity_name
FROM supplier_documents sd
JOIN suppliers sup ON sd.supplier_id = sup.id
WHERE sd.expiry_date IS NOT NULL
  AND (sd.is_archived IS NULL OR sd.is_archived = false)
  AND sd.expiry_date <= (CURRENT_DATE + INTERVAL '45 days')

ORDER BY expiration_date ASC;