-- =============================================
-- SALES MODULE - PHASE 1: FOUNDATION
-- Pricing System, GL Mappings, Email Configuration
-- =============================================

-- =============================================
-- 1. EXTEND GL ACCOUNTS FOR SALES
-- =============================================

-- Drop existing constraint and recreate with sales mappings
ALTER TABLE public.gl_accounts
DROP CONSTRAINT IF EXISTS gl_accounts_mapping_purpose_check;

ALTER TABLE public.gl_accounts
ADD CONSTRAINT gl_accounts_mapping_purpose_check
CHECK (mapping_purpose IN (
  'inventory', 'cogs', 'variance', 'clearing', 'expense',
  'revenue', 'ap', 'ar', 'freight', 'duty', 'labor', 'overhead',
  -- NEW for sales module:
  'sales_revenue', 'sales_returns', 'sales_discounts',
  'freight_income', 'accounts_receivable'
));

-- Insert default sales GL accounts (user can edit these)
INSERT INTO public.gl_accounts (account_code, account_name, account_type, mapping_purpose, is_active)
VALUES
  ('1100', 'Accounts Receivable', 'asset', 'accounts_receivable', true),
  ('4000', 'Sales Revenue', 'revenue', 'sales_revenue', true),
  ('4100', 'Freight Income', 'revenue', 'freight_income', true),
  ('4200', 'Sales Returns & Allowances', 'revenue', 'sales_returns', true),
  ('4300', 'Sales Discounts', 'expense', 'sales_discounts', true)
ON CONFLICT (account_code) DO NOTHING;

-- =============================================
-- 2. ENHANCE COMPANY SETTINGS FOR EMAIL & TAX
-- =============================================

ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS remittance_email TEXT,
ADD COLUMN IF NOT EXISTS sales_notification_email TEXT,
ADD COLUMN IF NOT EXISTS threeppl_release_email TEXT,
ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(5,4) DEFAULT 0.07;

-- Update existing company settings with defaults
UPDATE public.company_settings
SET
  sales_notification_email = COALESCE(sales_notification_email, email),
  default_tax_rate = COALESCE(default_tax_rate, 0.07)
WHERE id IS NOT NULL;

-- =============================================
-- 3. ENHANCE CUSTOMERS TABLE
-- =============================================

-- Add pricing and payment fields
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS allow_backorders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS price_tier TEXT DEFAULT 'direct' CHECK (price_tier IN ('distributor', 'direct', 'customer_specific')),
ADD COLUMN IF NOT EXISTS price_sheet_id UUID,
ADD COLUMN IF NOT EXISTS early_pay_discount_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS early_pay_days INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS current_balance NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS xero_contact_id TEXT;

-- Add index for price_sheet_id (FK will be added after price_sheets table is created)
CREATE INDEX IF NOT EXISTS idx_customers_price_sheet ON public.customers(price_sheet_id);

-- Add index for xero_contact_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_xero_contact ON public.customers(xero_contact_id);

-- Add comment explaining tax_exempt (already exists)
COMMENT ON COLUMN public.customers.tax_exempt IS 'false = customer is taxable (charge tax), true = customer is tax exempt (no tax)';

-- =============================================
-- 4. PRICE SHEETS (WITH APPROVAL WORKFLOW)
-- =============================================

CREATE TABLE public.price_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price_tier TEXT NOT NULL CHECK (price_tier IN ('distributor', 'direct')),

  -- Approval workflow
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  submitted_for_approval_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,

  -- Validity dates
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT false,  -- Only active after approval

  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for price_sheets
CREATE INDEX idx_price_sheets_status ON public.price_sheets(status);
CREATE INDEX idx_price_sheets_tier ON public.price_sheets(price_tier);
CREATE INDEX idx_price_sheets_active ON public.price_sheets(is_active) WHERE is_active = true;

-- =============================================
-- 5. PRICE SHEET ITEMS (LINE ITEMS)
-- =============================================

CREATE TABLE public.price_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_sheet_id UUID NOT NULL REFERENCES public.price_sheets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),

  -- Pricing with volume breaks
  unit_price NUMERIC(12,4) NOT NULL CHECK (unit_price >= 0),
  min_quantity INTEGER DEFAULT 1 CHECK (min_quantity > 0),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(price_sheet_id, product_id, min_quantity)
);

-- Indexes for price_sheet_items
CREATE INDEX idx_price_sheet_items_sheet ON public.price_sheet_items(price_sheet_id);
CREATE INDEX idx_price_sheet_items_product ON public.price_sheet_items(product_id);

-- =============================================
-- 6. CUSTOMER-SPECIFIC PRICING (HIGHEST PRIORITY)
-- =============================================

CREATE TABLE public.customer_product_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),

  -- Pricing
  unit_price NUMERIC(12,4) NOT NULL CHECK (unit_price >= 0),
  min_quantity INTEGER DEFAULT 1 CHECK (min_quantity > 0),

  -- Validity
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Audit
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(customer_id, product_id, effective_date, min_quantity)
);

-- Indexes for customer_product_pricing
CREATE INDEX idx_customer_pricing_customer ON public.customer_product_pricing(customer_id);
CREATE INDEX idx_customer_pricing_product ON public.customer_product_pricing(product_id);
CREATE INDEX idx_customer_pricing_active ON public.customer_product_pricing(is_active) WHERE is_active = true;

-- Now add FK constraint from customers to price_sheets
ALTER TABLE public.customers
ADD CONSTRAINT fk_customers_price_sheet
FOREIGN KEY (price_sheet_id) REFERENCES public.price_sheets(id);

-- =============================================
-- 7. PRICING LOOKUP FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.get_customer_price(
  p_customer_id UUID,
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_order_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price NUMERIC(12,4);
  v_price_sheet_id UUID;
  v_price_tier TEXT;
BEGIN
  -- Priority 1: Customer-specific pricing
  SELECT unit_price INTO v_price
  FROM public.customer_product_pricing
  WHERE customer_id = p_customer_id
    AND product_id = p_product_id
    AND p_order_date >= effective_date
    AND (expiry_date IS NULL OR p_order_date <= expiry_date)
    AND is_active = true
    AND min_quantity <= p_quantity
  ORDER BY min_quantity DESC, effective_date DESC
  LIMIT 1;

  IF v_price IS NOT NULL THEN
    RETURN v_price;
  END IF;

  -- Priority 2: Customer's assigned price sheet
  SELECT c.price_sheet_id, c.price_tier
  INTO v_price_sheet_id, v_price_tier
  FROM public.customers c
  WHERE c.id = p_customer_id;

  IF v_price_sheet_id IS NOT NULL THEN
    SELECT psi.unit_price INTO v_price
    FROM public.price_sheet_items psi
    JOIN public.price_sheets ps ON ps.id = psi.price_sheet_id
    WHERE psi.price_sheet_id = v_price_sheet_id
      AND psi.product_id = p_product_id
      AND psi.min_quantity <= p_quantity
      AND ps.is_active = true
      AND ps.status = 'approved'
      AND p_order_date >= ps.effective_date
      AND (ps.expiry_date IS NULL OR p_order_date <= ps.expiry_date)
    ORDER BY psi.min_quantity DESC
    LIMIT 1;

    IF v_price IS NOT NULL THEN
      RETURN v_price;
    END IF;
  END IF;

  -- Priority 3: Default price tier (distributor/direct) - find most recent approved sheet
  IF v_price_tier IS NOT NULL AND v_price_tier IN ('distributor', 'direct') THEN
    SELECT psi.unit_price INTO v_price
    FROM public.price_sheets ps
    JOIN public.price_sheet_items psi ON psi.price_sheet_id = ps.id
    WHERE ps.price_tier = v_price_tier
      AND ps.is_active = true
      AND ps.status = 'approved'
      AND p_order_date >= ps.effective_date
      AND (ps.expiry_date IS NULL OR p_order_date <= ps.expiry_date)
      AND psi.product_id = p_product_id
      AND psi.min_quantity <= p_quantity
    ORDER BY ps.effective_date DESC, psi.min_quantity DESC
    LIMIT 1;

    IF v_price IS NOT NULL THEN
      RETURN v_price;
    END IF;
  END IF;

  -- Fallback: Return NULL (will require manual price entry)
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_customer_price IS 'Lookup customer price with priority: 1) Customer-specific, 2) Assigned price sheet, 3) Price tier default';

-- =============================================
-- 8. ROW LEVEL SECURITY
-- =============================================

-- Price Sheets
ALTER TABLE public.price_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price sheets viewable by authenticated"
  ON public.price_sheets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can create draft price sheets"
  ON public.price_sheets FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'draft'
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own draft price sheets"
  ON public.price_sheets FOR UPDATE
  USING (created_by = auth.uid() AND status = 'draft');

CREATE POLICY "Managers can approve/reject price sheets"
  ON public.price_sheets FOR UPDATE
  USING (
    public.is_admin_or_manager(auth.uid())
    AND status IN ('pending_approval', 'approved', 'rejected')
  );

CREATE POLICY "Only admins can delete price sheets"
  ON public.price_sheets FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Price Sheet Items
ALTER TABLE public.price_sheet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price sheet items viewable by authenticated"
  ON public.price_sheet_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can manage items on draft sheets"
  ON public.price_sheet_items FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.price_sheets ps
      WHERE ps.id = price_sheet_items.price_sheet_id
      AND ps.status = 'draft'
      AND ps.created_by = auth.uid()
    )
  );

-- Customer Product Pricing
ALTER TABLE public.customer_product_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer pricing viewable by authenticated"
  ON public.customer_product_pricing FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage customer pricing"
  ON public.customer_product_pricing FOR ALL
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- =============================================
-- 9. TRIGGERS FOR updated_at
-- =============================================

CREATE TRIGGER update_price_sheets_updated_at
  BEFORE UPDATE ON public.price_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_price_sheet_items_updated_at
  BEFORE UPDATE ON public.price_sheet_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_customer_product_pricing_updated_at
  BEFORE UPDATE ON public.customer_product_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 10. HELPER FUNCTIONS
-- =============================================

-- Function to submit price sheet for approval
CREATE OR REPLACE FUNCTION public.submit_price_sheet_for_approval(p_price_sheet_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.price_sheets
  SET
    status = 'pending_approval',
    submitted_for_approval_at = NOW(),
    submitted_by = auth.uid()
  WHERE id = p_price_sheet_id
    AND status = 'draft'
    AND created_by = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Price sheet not found or not in draft status';
  END IF;
END;
$$;

-- Function to approve price sheet
CREATE OR REPLACE FUNCTION public.approve_price_sheet(p_price_sheet_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is manager/admin
  IF NOT public.is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only managers can approve price sheets';
  END IF;

  UPDATE public.price_sheets
  SET
    status = 'approved',
    is_active = true,
    approved_at = NOW(),
    approved_by = auth.uid(),
    rejection_reason = NULL
  WHERE id = p_price_sheet_id
    AND status = 'pending_approval';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Price sheet not found or not pending approval';
  END IF;
END;
$$;

-- Function to reject price sheet
CREATE OR REPLACE FUNCTION public.reject_price_sheet(
  p_price_sheet_id UUID,
  p_rejection_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is manager/admin
  IF NOT public.is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only managers can reject price sheets';
  END IF;

  UPDATE public.price_sheets
  SET
    status = 'rejected',
    rejection_reason = p_rejection_reason,
    approved_by = auth.uid(),
    approved_at = NOW()
  WHERE id = p_price_sheet_id
    AND status = 'pending_approval';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Price sheet not found or not pending approval';
  END IF;
END;
$$;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

COMMENT ON TABLE public.price_sheets IS 'Price sheets for distributor and direct pricing tiers with approval workflow';
COMMENT ON TABLE public.price_sheet_items IS 'Line items for price sheets with volume break support';
COMMENT ON TABLE public.customer_product_pricing IS 'Customer-specific pricing overrides (highest priority)';
