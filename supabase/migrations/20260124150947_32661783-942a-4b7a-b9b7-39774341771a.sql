-- =====================================================
-- SECURITY FIX MIGRATION
-- Addresses: RLS disabled tables, overly permissive policies, views without security_invoker
-- =====================================================

-- 1. Enable RLS on nc_cost_categories table
ALTER TABLE public.nc_cost_categories ENABLE ROW LEVEL SECURITY;

-- Create policy allowing authenticated users to view categories (reference data)
CREATE POLICY "Authenticated users can view cost categories"
ON public.nc_cost_categories
FOR SELECT
TO authenticated
USING (true);

-- Only managers/admins can modify cost categories
CREATE POLICY "Managers can manage cost categories"
ON public.nc_cost_categories
FOR ALL
TO authenticated
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- 2. Fix profiles table - Remove overly permissive SELECT policy
-- Keep role-based visibility: users see own profile, managers see all
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- 3. Recreate views with security_invoker = on
-- This ensures RLS policies of underlying tables are respected

-- 3a. Recreate document_expiration_watchlist view
DROP VIEW IF EXISTS public.document_expiration_watchlist;
CREATE VIEW public.document_expiration_watchlist
WITH (security_invoker = on)
AS
SELECT cd.id,
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
        WHEN cd.expiration_date <= (CURRENT_DATE + '45 days'::interval) THEN 'expiring_soon'::text
        ELSE 'valid'::text
    END AS expiration_status,
    COALESCE(s.name, m.name, p.name, 'Unknown'::text) AS entity_name
FROM compliance_documents cd
    LEFT JOIN suppliers s ON cd.related_entity_type = 'supplier'::text AND cd.related_entity_id = s.id
    LEFT JOIN materials m ON cd.related_entity_type = 'material'::text AND cd.related_entity_id = m.id
    LEFT JOIN products p ON cd.related_entity_type = 'product'::text AND cd.related_entity_id = p.id
WHERE cd.expiration_date IS NOT NULL AND cd.is_current = true AND cd.expiration_date <= (CURRENT_DATE + '45 days'::interval)
UNION ALL
SELECT md.id,
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
        WHEN md.expiry_date <= (CURRENT_DATE + '45 days'::interval) THEN 'expiring_soon'::text
        ELSE 'valid'::text
    END AS expiration_status,
    mat.name AS entity_name
FROM material_documents md
    JOIN materials mat ON md.material_id = mat.id
WHERE md.expiry_date IS NOT NULL AND (md.is_archived IS NULL OR md.is_archived = false) AND md.expiry_date <= (CURRENT_DATE + '45 days'::interval)
UNION ALL
SELECT sd.id,
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
        WHEN sd.expiry_date <= (CURRENT_DATE + '45 days'::interval) THEN 'expiring_soon'::text
        ELSE 'valid'::text
    END AS expiration_status,
    sup.name AS entity_name
FROM supplier_documents sd
    JOIN suppliers sup ON sd.supplier_id = sup.id
WHERE sd.expiry_date IS NOT NULL AND (sd.is_archived IS NULL OR sd.is_archived = false) AND sd.expiry_date <= (CURRENT_DATE + '45 days'::interval)
ORDER BY 7;

-- 3b. Recreate inventory_by_lot_location view
DROP VIEW IF EXISTS public.inventory_by_lot_location;
CREATE VIEW public.inventory_by_lot_location
WITH (security_invoker = on)
AS
SELECT rl.id AS receiving_lot_id,
    rl.internal_lot_number,
    rl.supplier_lot_number,
    rl.material_id,
    m.name AS material_name,
    m.code AS material_code,
    rl.expiry_date,
    COALESCE(rl.current_location_id, rl.location_id) AS location_id,
    l.name AS location_name,
    COALESCE(rl.current_quantity, rl.quantity_received) AS current_quantity,
    rl.container_status,
    rl.quantity_received AS original_quantity,
    u.code AS unit_code,
    u.name AS unit_name,
    CASE
        WHEN rl.expiry_date IS NULL THEN 'no_expiry'::text
        WHEN rl.expiry_date < CURRENT_DATE THEN 'expired'::text
        WHEN rl.expiry_date < (CURRENT_DATE + '30 days'::interval) THEN 'expiring_soon'::text
        ELSE 'good'::text
    END AS expiry_status
FROM receiving_lots rl
    LEFT JOIN materials m ON rl.material_id = m.id
    LEFT JOIN locations l ON COALESCE(rl.current_location_id, rl.location_id) = l.id
    LEFT JOIN units_of_measure u ON m.base_unit_id = u.id
WHERE COALESCE(rl.current_quantity, rl.quantity_received) > 0::numeric;

-- 4. Tighten non_conformities policies - restrict to quality/production roles
-- Drop overly permissive policies
DROP POLICY IF EXISTS "All authenticated users can view NCs" ON public.non_conformities;
DROP POLICY IF EXISTS "Authenticated users can update NCs" ON public.non_conformities;

-- Create more restrictive policies for NC access
-- View: quality, production supervisors, managers, admins, or users who discovered the NC
CREATE POLICY "Authorized roles can view NCs"
ON public.non_conformities
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'supervisor') OR
    public.has_role(auth.uid(), 'hr') OR
    discovered_by = auth.uid()
);

-- Update: quality, managers, admins, or person who discovered the NC
CREATE POLICY "Authorized roles can update NCs"
ON public.non_conformities
FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'supervisor')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'supervisor')
);