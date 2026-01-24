-- Create a security definer function to check if user is admin or HR
CREATE OR REPLACE FUNCTION public.is_admin_or_hr(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'hr')
  )
$$;

-- Drop existing policies on employee_wage_history
DROP POLICY IF EXISTS "Employees can view own wage history" ON public.employee_wage_history;
DROP POLICY IF EXISTS "Managers can manage wage history" ON public.employee_wage_history;

-- Create new restrictive policies - only admins and HR can view all wage history
CREATE POLICY "Admins and HR can view all wage history"
ON public.employee_wage_history
FOR SELECT
TO authenticated
USING (public.is_admin_or_hr(auth.uid()));

-- Admins and HR can insert wage history records
CREATE POLICY "Admins and HR can insert wage history"
ON public.employee_wage_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_hr(auth.uid()));

-- Admins and HR can update wage history records
CREATE POLICY "Admins and HR can update wage history"
ON public.employee_wage_history
FOR UPDATE
TO authenticated
USING (public.is_admin_or_hr(auth.uid()))
WITH CHECK (public.is_admin_or_hr(auth.uid()));

-- Admins and HR can delete wage history records
CREATE POLICY "Admins and HR can delete wage history"
ON public.employee_wage_history
FOR DELETE
TO authenticated
USING (public.is_admin_or_hr(auth.uid()));