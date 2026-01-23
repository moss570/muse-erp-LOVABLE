-- Migration: Standardize employee-related tables to use profiles.id for user-facing features
-- This migration adds profile_id to key employee tables to support the "My Portal" employee dashboard

-- =====================================================
-- STEP 1: Add profile_id column to employee_shifts
-- =====================================================

-- Add profile_id column (nullable initially for migration)
ALTER TABLE public.employee_shifts
ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Populate profile_id from employees.profile_id for existing records
UPDATE public.employee_shifts es
SET profile_id = e.profile_id
FROM public.employees e
WHERE es.employee_id = e.id
AND e.profile_id IS NOT NULL;

-- Add index for performance
CREATE INDEX idx_employee_shifts_profile_id ON public.employee_shifts(profile_id);

-- Add comment explaining the dual reference approach
COMMENT ON COLUMN public.employee_shifts.profile_id IS 'Link to user profile for app-based queries. Use this for My Portal and employee-facing features.';
COMMENT ON COLUMN public.employee_shifts.employee_id IS 'Link to HR employee record. Use this for manager/HR-based queries and scheduling.';

-- =====================================================
-- STEP 2: Add profile_id column to employee_time_entries
-- =====================================================

-- Add profile_id column (nullable initially for migration)
ALTER TABLE public.employee_time_entries
ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Populate profile_id from employees.profile_id for existing records
UPDATE public.employee_time_entries ete
SET profile_id = e.profile_id
FROM public.employees e
WHERE ete.employee_id = e.id
AND e.profile_id IS NOT NULL;

-- Add index for performance
CREATE INDEX idx_employee_time_entries_profile_id ON public.employee_time_entries(profile_id);

-- Add comment
COMMENT ON COLUMN public.employee_time_entries.profile_id IS 'Link to user profile for app-based queries. Use this for My Portal time clock features.';
COMMENT ON COLUMN public.employee_time_entries.employee_id IS 'Link to HR employee record. Use this for payroll and HR reporting.';

-- =====================================================
-- STEP 3: Create a trigger to auto-populate profile_id
-- =====================================================

-- Trigger function to auto-populate profile_id when shifts are created
CREATE OR REPLACE FUNCTION public.auto_populate_shift_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile_id is not provided, try to get it from the employee record
  IF NEW.profile_id IS NULL AND NEW.employee_id IS NOT NULL THEN
    SELECT profile_id INTO NEW.profile_id
    FROM public.employees
    WHERE id = NEW.employee_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to employee_shifts
CREATE TRIGGER trigger_auto_populate_shift_profile_id
  BEFORE INSERT OR UPDATE ON public.employee_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_shift_profile_id();

-- Trigger function to auto-populate profile_id for time entries
CREATE OR REPLACE FUNCTION public.auto_populate_time_entry_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile_id is not provided, try to get it from the employee record
  IF NEW.profile_id IS NULL AND NEW.employee_id IS NOT NULL THEN
    SELECT profile_id INTO NEW.profile_id
    FROM public.employees
    WHERE id = NEW.employee_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to employee_time_entries
CREATE TRIGGER trigger_auto_populate_time_entry_profile_id
  BEFORE INSERT OR UPDATE ON public.employee_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_time_entry_profile_id();

-- =====================================================
-- STEP 4: Update RLS policies for profile-based access
-- =====================================================

-- Drop existing employee_shifts RLS policies if they exist
DROP POLICY IF EXISTS "Employees can view their own shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Managers can view all shifts" ON public.employee_shifts;

-- Create new RLS policy: employees can view their own shifts via profile_id
CREATE POLICY "Employees can view their own shifts via profile"
  ON public.employee_shifts
  FOR SELECT
  USING (
    profile_id = auth.uid()
    OR
    public.is_admin_or_manager(auth.uid())
  );

-- Create new RLS policy: managers can view and manage all shifts
CREATE POLICY "Managers can manage all shifts"
  ON public.employee_shifts
  FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- Drop existing employee_time_entries RLS policies if they exist
DROP POLICY IF EXISTS "Employees can view their own time entries" ON public.employee_time_entries;
DROP POLICY IF EXISTS "Managers can view all time entries" ON public.employee_time_entries;

-- Create new RLS policy: employees can view their own time entries via profile_id
CREATE POLICY "Employees can view their own time entries via profile"
  ON public.employee_time_entries
  FOR SELECT
  USING (
    profile_id = auth.uid()
    OR
    public.is_admin_or_manager(auth.uid())
  );

-- Create new RLS policy: employees can insert their own time entries
CREATE POLICY "Employees can clock in/out via profile"
  ON public.employee_time_entries
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Create new RLS policy: managers can manage all time entries
CREATE POLICY "Managers can manage all time entries"
  ON public.employee_time_entries
  FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

-- =====================================================
-- STEP 5: Create helpful view for employee portal queries
-- =====================================================

-- Create or replace view for easy employee portal queries
CREATE OR REPLACE VIEW public.my_employee_data AS
SELECT
  p.id as profile_id,
  p.email,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.department_id,
  p.hire_date,
  p.status as account_status,
  e.id as employee_id,
  e.employee_number,
  e.job_position_id,
  e.employment_status,
  e.employment_type,
  jp.name as job_position_name,
  d.name as department_name
FROM public.profiles p
LEFT JOIN public.employees e ON e.profile_id = p.id
LEFT JOIN public.job_positions jp ON jp.id = e.job_position_id
LEFT JOIN public.departments d ON d.id = p.department_id;

-- Grant access to authenticated users
GRANT SELECT ON public.my_employee_data TO authenticated;

-- Add RLS policy to view
ALTER VIEW public.my_employee_data SET (security_barrier = true);

-- =====================================================
-- STEP 6: Add function to sync profile when employee is linked
-- =====================================================

-- Function to sync employee data to profile when linking
CREATE OR REPLACE FUNCTION public.sync_employee_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- When an employee is linked to a profile, sync basic info
  IF NEW.profile_id IS NOT NULL AND (OLD.profile_id IS NULL OR OLD.profile_id != NEW.profile_id) THEN
    UPDATE public.profiles
    SET
      first_name = COALESCE(profiles.first_name, NEW.first_name),
      last_name = COALESCE(profiles.last_name, NEW.last_name),
      department_id = COALESCE(profiles.department_id, NEW.department_id),
      hire_date = COALESCE(profiles.hire_date, NEW.hire_date)
    WHERE id = NEW.profile_id;

    -- Also update all existing shifts and time entries with the profile_id
    UPDATE public.employee_shifts
    SET profile_id = NEW.profile_id
    WHERE employee_id = NEW.id AND profile_id IS NULL;

    UPDATE public.employee_time_entries
    SET profile_id = NEW.profile_id
    WHERE employee_id = NEW.id AND profile_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to employees table
DROP TRIGGER IF EXISTS trigger_sync_employee_to_profile ON public.employees;
CREATE TRIGGER trigger_sync_employee_to_profile
  AFTER INSERT OR UPDATE OF profile_id ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_employee_to_profile();

-- =====================================================
-- VERIFICATION QUERIES (commented out - for reference)
-- =====================================================

-- To verify the migration worked:
-- SELECT
--   es.id,
--   es.employee_id,
--   es.profile_id,
--   e.employee_number,
--   p.email
-- FROM employee_shifts es
-- LEFT JOIN employees e ON e.id = es.employee_id
-- LEFT JOIN profiles p ON p.id = es.profile_id
-- LIMIT 10;
