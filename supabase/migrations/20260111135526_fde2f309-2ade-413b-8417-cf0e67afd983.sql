-- Fix overly permissive RLS policies for shift_templates, labor_budgets, and template_merge_fields
-- These tables currently allow any authenticated user to modify critical business data

-- 1. Fix shift_templates - restrict to managers only
DROP POLICY IF EXISTS "Shift templates are editable by authenticated users" ON shift_templates;
DROP POLICY IF EXISTS "Shift templates are updatable by authenticated users" ON shift_templates;
DROP POLICY IF EXISTS "Shift templates are deletable by authenticated users" ON shift_templates;

CREATE POLICY "Managers can insert shift templates"
ON shift_templates FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Managers can update shift templates"
ON shift_templates FOR UPDATE
TO authenticated
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Managers can delete shift templates"
ON shift_templates FOR DELETE
TO authenticated
USING (is_admin_or_manager(auth.uid()));

-- 2. Fix labor_budgets - restrict to managers only
DROP POLICY IF EXISTS "Labor budgets are editable by authenticated users" ON labor_budgets;
DROP POLICY IF EXISTS "Labor budgets are updatable by authenticated users" ON labor_budgets;
DROP POLICY IF EXISTS "Labor budgets are deletable by authenticated users" ON labor_budgets;

CREATE POLICY "Managers can insert labor budgets"
ON labor_budgets FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Managers can update labor budgets"
ON labor_budgets FOR UPDATE
TO authenticated
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Managers can delete labor budgets"
ON labor_budgets FOR DELETE
TO authenticated
USING (is_admin_or_manager(auth.uid()));

-- 3. Fix template_merge_fields - restrict to managers only
DROP POLICY IF EXISTS "Authenticated users can manage merge fields" ON template_merge_fields;

CREATE POLICY "Managers can view merge fields"
ON template_merge_fields FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can insert merge fields"
ON template_merge_fields FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Managers can update merge fields"
ON template_merge_fields FOR UPDATE
TO authenticated
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Managers can delete merge fields"
ON template_merge_fields FOR DELETE
TO authenticated
USING (is_admin_or_manager(auth.uid()));