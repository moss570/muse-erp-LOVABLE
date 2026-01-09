-- Create customers table for sales/distribution
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  fax TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'USA',
  website TEXT,
  payment_terms TEXT,
  credit_limit NUMERIC,
  tax_exempt BOOLEAN DEFAULT false,
  tax_id TEXT,
  customer_type TEXT DEFAULT 'retail',
  categories TEXT[] DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS policies for customers
CREATE POLICY "Customers viewable by authenticated" ON public.customers
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can insert customers" ON public.customers
  FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update customers" ON public.customers
  FOR UPDATE USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Only admins can delete customers" ON public.customers
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Create updated_at trigger for customers
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create permission resources table for defining what can be controlled
CREATE TABLE public.permission_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('page', 'feature', 'field', 'report')),
  resource_key TEXT NOT NULL UNIQUE,
  resource_name TEXT NOT NULL,
  parent_key TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create role permissions table
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  resource_key TEXT NOT NULL REFERENCES public.permission_resources(resource_key) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('full', 'read', 'none')) DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (role, resource_key)
);

-- Enable RLS on permission tables
ALTER TABLE public.permission_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for permission_resources
CREATE POLICY "Permission resources viewable by authenticated" ON public.permission_resources
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage permission resources" ON public.permission_resources
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for role_permissions
CREATE POLICY "Role permissions viewable by authenticated" ON public.role_permissions
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create updated_at trigger for role_permissions
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default permission resources (pages, features, fields, reports)
INSERT INTO public.permission_resources (resource_type, resource_key, resource_name, parent_key, description, sort_order) VALUES
-- Pages
('page', 'dashboard', 'Dashboard', NULL, 'Main dashboard page', 10),
('page', 'materials', 'Materials', NULL, 'Materials inventory page', 20),
('page', 'products', 'Products', NULL, 'Products inventory page', 30),
('page', 'suppliers', 'Suppliers', NULL, 'Suppliers management page', 40),
('page', 'customers', 'Customers', NULL, 'Customers management page', 50),
('page', 'settings', 'Settings', NULL, 'System settings area', 100),

-- Features - Materials
('feature', 'materials.create', 'Create Materials', 'materials', 'Create new materials', 21),
('feature', 'materials.edit', 'Edit Materials', 'materials', 'Edit existing materials', 22),
('feature', 'materials.delete', 'Delete Materials', 'materials', 'Delete materials', 23),
('feature', 'materials.import', 'Import Materials', 'materials', 'Import materials from file', 24),
('feature', 'materials.export', 'Export Materials', 'materials', 'Export materials to file', 25),

-- Features - Products
('feature', 'products.create', 'Create Products', 'products', 'Create new products', 31),
('feature', 'products.edit', 'Edit Products', 'products', 'Edit existing products', 32),
('feature', 'products.delete', 'Delete Products', 'products', 'Delete products', 33),
('feature', 'products.import', 'Import Products', 'products', 'Import products from file', 34),
('feature', 'products.export', 'Export Products', 'products', 'Export products to file', 35),

-- Features - Suppliers
('feature', 'suppliers.create', 'Create Suppliers', 'suppliers', 'Create new suppliers', 41),
('feature', 'suppliers.edit', 'Edit Suppliers', 'suppliers', 'Edit existing suppliers', 42),
('feature', 'suppliers.delete', 'Delete Suppliers', 'suppliers', 'Delete suppliers', 43),
('feature', 'suppliers.import', 'Import Suppliers', 'suppliers', 'Import suppliers from file', 44),
('feature', 'suppliers.export', 'Export Suppliers', 'suppliers', 'Export suppliers to file', 45),

-- Features - Customers
('feature', 'customers.create', 'Create Customers', 'customers', 'Create new customers', 51),
('feature', 'customers.edit', 'Edit Customers', 'customers', 'Edit existing customers', 52),
('feature', 'customers.delete', 'Delete Customers', 'customers', 'Delete customers', 53),
('feature', 'customers.import', 'Import Customers', 'customers', 'Import customers from file', 54),
('feature', 'customers.export', 'Export Customers', 'customers', 'Export customers to file', 55),

-- Features - Settings
('feature', 'settings.users', 'User Management', 'settings', 'Manage user accounts and roles', 101),
('feature', 'settings.permissions', 'Permission Management', 'settings', 'Manage role permissions', 102),
('feature', 'settings.import_export', 'Import/Export', 'settings', 'Access import/export features', 103),

-- Reports (placeholders for future)
('report', 'reports.inventory', 'Inventory Reports', NULL, 'Access inventory reports', 200),
('report', 'reports.purchasing', 'Purchasing Reports', NULL, 'Access purchasing reports', 201),
('report', 'reports.sales', 'Sales Reports', NULL, 'Access sales reports', 202);

-- Set default permissions for admin role (full access to everything)
INSERT INTO public.role_permissions (role, resource_key, access_level)
SELECT 'admin', resource_key, 'full'
FROM public.permission_resources;

-- Set default permissions for manager role
INSERT INTO public.role_permissions (role, resource_key, access_level)
SELECT 'manager', resource_key, 
  CASE 
    WHEN resource_key IN ('settings.users', 'settings.permissions') THEN 'read'
    ELSE 'full'
  END
FROM public.permission_resources;

-- Set default permissions for supervisor role
INSERT INTO public.role_permissions (role, resource_key, access_level)
SELECT 'supervisor', resource_key,
  CASE 
    WHEN resource_key LIKE '%.delete' THEN 'none'
    WHEN resource_key LIKE '%.import' THEN 'none'
    WHEN resource_key LIKE 'settings.%' THEN 'none'
    ELSE 'full'
  END
FROM public.permission_resources;

-- Set default permissions for employee role (mostly read-only)
INSERT INTO public.role_permissions (role, resource_key, access_level)
SELECT 'employee', resource_key,
  CASE 
    WHEN resource_type = 'page' AND resource_key NOT IN ('settings') THEN 'read'
    WHEN resource_key LIKE '%.export' THEN 'read'
    ELSE 'none'
  END
FROM public.permission_resources;

-- Create function to check permission
CREATE OR REPLACE FUNCTION public.check_permission(_user_id UUID, _resource_key TEXT, _required_level TEXT DEFAULT 'read')
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_access_level TEXT;
BEGIN
  -- Get user's role
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'supervisor' THEN 3 
      WHEN 'employee' THEN 4 
    END
  LIMIT 1;
  
  -- Admin always has full access
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Get permission level
  SELECT access_level INTO v_access_level
  FROM public.role_permissions
  WHERE role = v_role AND resource_key = _resource_key;
  
  -- Check access
  IF v_access_level IS NULL OR v_access_level = 'none' THEN
    RETURN FALSE;
  END IF;
  
  IF _required_level = 'full' THEN
    RETURN v_access_level = 'full';
  END IF;
  
  -- For 'read' requirement, both 'read' and 'full' work
  RETURN v_access_level IN ('read', 'full');
END;
$$;