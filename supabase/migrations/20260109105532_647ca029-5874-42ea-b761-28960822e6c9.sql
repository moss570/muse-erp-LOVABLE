-- =====================================================
-- MUSE ERP 2026 - Phase 1: Foundation Schema
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- User & Role Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'supervisor', 'employee');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'pending');

-- Department Types
CREATE TYPE public.department_type AS ENUM (
  'production', 
  'warehouse', 
  'quality_control', 
  'sales', 
  'purchasing', 
  'admin', 
  'maintenance',
  'hr'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Departments (organizational structure)
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_type public.department_type NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Locations/Facilities (physical locations in the facility)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_code TEXT UNIQUE NOT NULL,
  location_type TEXT NOT NULL, -- 'production_floor', 'cold_storage', 'warehouse', 'shipping_dock', etc.
  description TEXT,
  temperature_controlled BOOLEAN DEFAULT false,
  target_temperature_min DECIMAL(5,2),
  target_temperature_max DECIMAL(5,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Profiles (links to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  employee_id TEXT UNIQUE,
  badge_number TEXT UNIQUE,
  department_id UUID REFERENCES public.departments(id),
  hire_date DATE,
  status public.user_status NOT NULL DEFAULT 'active',
  pin_hash TEXT, -- For time clock kiosk authentication
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles (separate table for security - prevents privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- =====================================================
-- DROPDOWN OPTIONS (Configurable values for UI)
-- =====================================================

CREATE TABLE public.dropdown_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dropdown_type TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dropdown_type, value)
);

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (for RLS)
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'supervisor' THEN 3 
      WHEN 'employee' THEN 4 
    END
  LIMIT 1
$$;

-- =====================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Assign default 'employee' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- UPDATE TIMESTAMP TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_dropdown_options_updated_at
  BEFORE UPDATE ON public.dropdown_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropdown_options ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view all profiles, update their own
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- User Roles: Only admins can manage roles, everyone can view
CREATE POLICY "Roles viewable by authenticated users"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Departments: All authenticated users can view, admins/managers can modify
CREATE POLICY "Departments viewable by authenticated users"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert departments"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update departments"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Only admins can delete departments"
  ON public.departments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Locations: All authenticated users can view, admins/managers can modify
CREATE POLICY "Locations viewable by authenticated users"
  ON public.locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert locations"
  ON public.locations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update locations"
  ON public.locations FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Only admins can delete locations"
  ON public.locations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Dropdown Options: All authenticated users can view, admins can modify
CREATE POLICY "Dropdown options viewable by authenticated users"
  ON public.dropdown_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage dropdown options"
  ON public.dropdown_options FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- SEED DEFAULT DATA
-- =====================================================

-- Default departments
INSERT INTO public.departments (name, department_type, description) VALUES
  ('Production', 'production', 'Manufacturing and production operations'),
  ('Warehouse', 'warehouse', 'Storage and inventory management'),
  ('Quality Control', 'quality_control', 'Quality assurance and food safety'),
  ('Sales', 'sales', 'Sales and customer management'),
  ('Purchasing', 'purchasing', 'Procurement and supplier management'),
  ('Administration', 'admin', 'General administration and management'),
  ('Maintenance', 'maintenance', 'Equipment and facility maintenance'),
  ('Human Resources', 'hr', 'HR and employee management');

-- Default locations
INSERT INTO public.locations (name, location_code, location_type, temperature_controlled) VALUES
  ('Production Floor', 'PROD-01', 'production_floor', false),
  ('Cold Storage A', 'COLD-A', 'cold_storage', true),
  ('Cold Storage B', 'COLD-B', 'cold_storage', true),
  ('Dry Warehouse', 'WH-DRY', 'warehouse', false),
  ('Shipping Dock', 'SHIP-01', 'shipping_dock', false),
  ('Receiving Dock', 'RCV-01', 'receiving_dock', false);

-- Update cold storage with temperature ranges
UPDATE public.locations SET target_temperature_min = -23, target_temperature_max = -18 
  WHERE location_code IN ('COLD-A', 'COLD-B');

-- Default dropdown options
INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order) VALUES
  -- Product Types
  ('product_type', 'base', 'Base Mix', 1),
  ('product_type', 'flavor', 'Flavor', 2),
  ('product_type', 'made_in_house', 'Made In House', 3),
  ('product_type', 'finished_good', 'Finished Good', 4),
  -- Material Types
  ('material_type', 'ingredients', 'Ingredients', 1),
  ('material_type', 'packaging', 'Packaging', 2),
  ('material_type', 'boxes', 'Boxes', 3),
  ('material_type', 'chemicals', 'Chemicals', 4),
  ('material_type', 'supplies', 'Supplies', 5),
  ('material_type', 'maintenance', 'Maintenance', 6),
  -- Material Categories (for ingredients)
  ('material_category', 'dairy', 'Dairy', 1),
  ('material_category', 'flavoring', 'Flavoring', 2),
  ('material_category', 'sweetener', 'Sweetener', 3),
  ('material_category', 'stabilizer', 'Stabilizer', 4),
  ('material_category', 'inclusion', 'Inclusion', 5),
  ('material_category', 'fruit', 'Fruit', 6),
  -- Allergens
  ('allergen', 'dairy', 'Dairy', 1),
  ('allergen', 'eggs', 'Eggs', 2),
  ('allergen', 'tree_nuts', 'Tree Nuts', 3),
  ('allergen', 'peanuts', 'Peanuts', 4),
  ('allergen', 'wheat', 'Wheat', 5),
  ('allergen', 'gluten', 'Gluten', 6),
  ('allergen', 'soy', 'Soy', 7),
  ('allergen', 'sesame', 'Sesame', 8),
  ('allergen', 'fish', 'Fish', 9),
  ('allergen', 'shellfish', 'Shellfish', 10);