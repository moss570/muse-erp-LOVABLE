-- Create email_settings table for centralized email configuration
CREATE TABLE public.email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL UNIQUE,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view email settings
CREATE POLICY "Authenticated users can view email settings"
  ON public.email_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admin/manager roles can update email settings
CREATE POLICY "Admin/Manager can update email settings"
  ON public.email_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Only admin/manager roles can insert email settings
CREATE POLICY "Admin/Manager can insert email settings"
  ON public.email_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default email settings for musescoop.com domain
INSERT INTO public.email_settings (email_type, from_name, from_email, reply_to, description, is_active) VALUES
  ('noreply', 'Muse Scoop', 'noreply@musescoop.com', NULL, 'System notifications and general automated emails', true),
  ('employee_welcome', 'Muse Scoop HR', 'noreply@musescoop.com', NULL, 'Employee account invitations and password reset emails', true),
  ('invoices', 'Muse Scoop Billing', 'invoices@musescoop.com', 'invoices@musescoop.com', 'Customer invoice emails', true),
  ('purchase_orders', 'Muse Scoop Purchasing', 'purchasing@musescoop.com', 'purchasing@musescoop.com', 'Purchase order emails sent to suppliers', true),
  ('3pl_releases', 'Muse Scoop Warehouse', 'warehouse@musescoop.com', 'warehouse@musescoop.com', '3PL pick release request emails', true),
  ('sales', 'Muse Scoop Sales', 'sales@musescoop.com', 'sales@musescoop.com', 'Sales order confirmations and notifications', true);