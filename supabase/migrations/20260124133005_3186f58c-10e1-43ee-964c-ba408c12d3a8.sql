-- Create employee_account_invitations table for tracking invitation history
CREATE TABLE public.employee_account_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invitation_type TEXT NOT NULL DEFAULT 'initial' CHECK (invitation_type IN ('initial', 'resend')),
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_employee_account_invitations_employee_id ON public.employee_account_invitations(employee_id);
CREATE INDEX idx_employee_account_invitations_user_id ON public.employee_account_invitations(user_id);
CREATE INDEX idx_employee_account_invitations_invited_at ON public.employee_account_invitations(invited_at DESC);

-- Enable RLS
ALTER TABLE public.employee_account_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only admin/manager/hr can view and manage invitations
CREATE POLICY "Users can view invitations if they have admin/manager/hr role"
  ON public.employee_account_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager', 'hr')
    )
  );

CREATE POLICY "Users can create invitations if they have admin/manager/hr role"
  ON public.employee_account_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager', 'hr')
    )
  );

CREATE POLICY "Users can update invitations if they have admin/manager/hr role"
  ON public.employee_account_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager', 'hr')
    )
  );

-- Add comment for documentation
COMMENT ON TABLE public.employee_account_invitations IS 'Tracks employee account invitation history for audit and resend functionality';