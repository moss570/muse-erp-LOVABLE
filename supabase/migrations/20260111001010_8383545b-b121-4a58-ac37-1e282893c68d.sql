-- Add invoice_type to distinguish material vs freight invoices
ALTER TABLE public.purchase_order_invoices 
ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'material' CHECK (invoice_type IN ('material', 'freight'));

-- Add approval workflow columns
ALTER TABLE public.purchase_order_invoices 
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);

-- Add freight amount field for direct freight entry on material invoices
ALTER TABLE public.purchase_order_invoices 
ADD COLUMN IF NOT EXISTS freight_amount NUMERIC DEFAULT 0;

-- Create linking table for freight invoices to material invoices
CREATE TABLE IF NOT EXISTS public.invoice_freight_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_invoice_id UUID NOT NULL REFERENCES public.purchase_order_invoices(id) ON DELETE CASCADE,
  freight_invoice_id UUID NOT NULL REFERENCES public.purchase_order_invoices(id) ON DELETE CASCADE,
  allocation_amount NUMERIC, -- Optional: specific amount to allocate from this freight invoice
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(material_invoice_id, freight_invoice_id)
);

-- Enable RLS on the new table
ALTER TABLE public.invoice_freight_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_freight_links (authenticated users can manage)
CREATE POLICY "Authenticated users can view invoice freight links" 
ON public.invoice_freight_links 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create invoice freight links" 
ON public.invoice_freight_links 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoice freight links" 
ON public.invoice_freight_links 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete invoice freight links" 
ON public.invoice_freight_links 
FOR DELETE 
TO authenticated
USING (true);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_freight_links_material ON public.invoice_freight_links(material_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_freight_links_freight ON public.invoice_freight_links(freight_invoice_id);

-- Store Xero tokens (encrypted storage for OAuth tokens)
CREATE TABLE IF NOT EXISTS public.xero_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL, -- Xero organization/tenant ID
  tenant_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.xero_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view own xero connections" 
ON public.xero_connections 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own xero connections" 
ON public.xero_connections 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own xero connections" 
ON public.xero_connections 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own xero connections" 
ON public.xero_connections 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_xero_connections_updated_at
BEFORE UPDATE ON public.xero_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();