-- Phase 2: Fixed Costs
CREATE TABLE public.fixed_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cost_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('rent', 'insurance', 'utilities', 'depreciation', 'other')),
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  gl_account TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Overhead settings
CREATE TABLE public.overhead_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value NUMERIC,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Insert default overhead rate
INSERT INTO public.overhead_settings (setting_key, setting_value, description)
VALUES ('overhead_rate_per_hour', 0, 'Overhead rate applied per labor hour');

-- Phase 3: GL Accounts for Xero mapping
CREATE TABLE public.gl_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'cogs')),
  xero_account_id TEXT,
  mapping_purpose TEXT CHECK (mapping_purpose IN ('inventory', 'cogs', 'variance', 'clearing', 'expense', 'revenue', 'ap', 'ar', 'freight', 'duty', 'labor', 'overhead')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Phase 4: Period Close System
CREATE TABLE public.accounting_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'quarter', 'year')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(period_date, period_type)
);

-- Period close checklist items
CREATE TABLE public.period_close_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.accounting_periods(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('po', 'invoice', 'receiving', 'production', 'inventory_adjustment')),
  item_id UUID NOT NULL,
  item_reference TEXT,
  issue_description TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overhead_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_close_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies - authenticated users can read
CREATE POLICY "Authenticated users can view fixed costs" ON public.fixed_costs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/Manager can manage fixed costs" ON public.fixed_costs
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view overhead settings" ON public.overhead_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/Manager can manage overhead settings" ON public.overhead_settings
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view GL accounts" ON public.gl_accounts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/Manager can manage GL accounts" ON public.gl_accounts
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view accounting periods" ON public.accounting_periods
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/Manager can manage accounting periods" ON public.accounting_periods
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view period close items" ON public.period_close_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/Manager can manage period close items" ON public.period_close_items
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_fixed_costs_updated_at
  BEFORE UPDATE ON public.fixed_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_overhead_settings_updated_at
  BEFORE UPDATE ON public.overhead_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gl_accounts_updated_at
  BEFORE UPDATE ON public.gl_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounting_periods_updated_at
  BEFORE UPDATE ON public.accounting_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();