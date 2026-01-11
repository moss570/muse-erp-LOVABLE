-- Fix SECURITY DEFINER views by recreating them with SECURITY INVOKER
-- This ensures views respect the querying user's RLS policies

-- Drop and recreate qa_pending_items view with SECURITY INVOKER
DROP VIEW IF EXISTS public.qa_pending_items;
CREATE VIEW public.qa_pending_items 
WITH (security_invoker = true) AS
SELECT 
  id,
  'materials' as table_name,
  name as item_name,
  code as item_code,
  approval_status,
  created_at,
  updated_at,
  NULL::UUID as qa_verified_by
FROM public.materials WHERE approval_status = 'Pending_QA'
UNION ALL
SELECT 
  id,
  'suppliers' as table_name,
  name as item_name,
  code as item_code,
  approval_status,
  created_at,
  updated_at,
  qa_verified_by
FROM public.suppliers WHERE approval_status = 'Pending_QA'
UNION ALL
SELECT 
  id,
  'products' as table_name,
  name as item_name,
  sku as item_code,
  approval_status,
  created_at,
  updated_at,
  qa_verified_by
FROM public.products WHERE approval_status = 'Pending_QA'
UNION ALL
SELECT 
  id,
  'production_lots' as table_name,
  lot_number as item_name,
  lot_number as item_code,
  approval_status,
  created_at,
  updated_at,
  qa_verified_by
FROM public.production_lots WHERE approval_status = 'Pending_QA';

-- Drop and recreate stale_draft_items view with SECURITY INVOKER
DROP VIEW IF EXISTS public.stale_draft_items;
CREATE VIEW public.stale_draft_items 
WITH (security_invoker = true) AS
SELECT 
  id,
  'materials' as table_name,
  name as item_name,
  code as item_code,
  approval_status,
  created_at,
  updated_at,
  EXTRACT(DAY FROM now() - created_at)::INT as days_stale
FROM public.materials 
WHERE approval_status = 'Draft' AND created_at < now() - interval '7 days'
UNION ALL
SELECT 
  id,
  'suppliers' as table_name,
  name as item_name,
  code as item_code,
  approval_status,
  created_at,
  updated_at,
  EXTRACT(DAY FROM now() - created_at)::INT as days_stale
FROM public.suppliers 
WHERE approval_status = 'Draft' AND created_at < now() - interval '7 days'
UNION ALL
SELECT 
  id,
  'products' as table_name,
  name as item_name,
  sku as item_code,
  approval_status,
  created_at,
  updated_at,
  EXTRACT(DAY FROM now() - created_at)::INT as days_stale
FROM public.products 
WHERE approval_status = 'Draft' AND created_at < now() - interval '7 days';

-- Drop and recreate document_expiration_watchlist view with SECURITY INVOKER
DROP VIEW IF EXISTS public.document_expiration_watchlist;
CREATE VIEW public.document_expiration_watchlist 
WITH (security_invoker = true) AS
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
    WHEN cd.expiration_date < CURRENT_DATE THEN 'expired'
    WHEN cd.expiration_date < CURRENT_DATE + interval '45 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as expiration_status,
  CASE 
    WHEN s.id IS NOT NULL THEN s.name
    WHEN m.id IS NOT NULL THEN m.name
    WHEN p.id IS NOT NULL THEN p.name
    ELSE 'Unknown'
  END as entity_name
FROM public.compliance_documents cd
LEFT JOIN public.suppliers s ON cd.related_entity_id = s.id AND cd.related_entity_type = 'supplier'
LEFT JOIN public.materials m ON cd.related_entity_id = m.id AND cd.related_entity_type = 'material'
LEFT JOIN public.products p ON cd.related_entity_id = p.id AND cd.related_entity_type = 'product'
WHERE cd.is_current = true
  AND cd.expiration_date IS NOT NULL
ORDER BY cd.expiration_date ASC;