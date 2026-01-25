-- Create email_templates table for customizable email content
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  heading TEXT,
  body_text TEXT NOT NULL,
  button_text TEXT,
  footer_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default templates
INSERT INTO public.email_templates (email_type, template_name, subject, heading, body_text, button_text, footer_text) VALUES
('employee_welcome', 'Employee Welcome', 'Welcome to {{COMPANY_NAME}} - Set Up Your Account', 'Welcome to the Team!', 'Your account has been created for {{COMPANY_NAME}}''s management system. To get started, please set your password using the button below.', 'Set My Password', 'This link will expire in 24 hours for security reasons.'),
('password_reset', 'Password Reset', 'Password Reset Request', 'Password Reset Request', 'You requested to reset your password. Click the button below to set a new password.', 'Reset Password', 'If you didn''t request this, you can safely ignore this email.'),
('admin_password_reset', 'Admin Password Reset', 'Password Reset Request', 'Password Reset Request', 'A password reset has been requested for your account. Click the button below to set a new password.', 'Reset Password', 'If you didn''t request this password reset, you can safely ignore this email.');

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing templates (admin, manager, hr)
CREATE POLICY "Admin, manager, and HR can view email templates"
  ON public.email_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'hr')
    )
  );

-- Create policy for managing templates (admin, manager, hr)
CREATE POLICY "Admin, manager, and HR can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'hr')
    )
  );

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();