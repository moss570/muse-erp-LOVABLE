-- Add GL Account foreign key to materials table
ALTER TABLE public.materials 
ADD COLUMN gl_account_id UUID REFERENCES public.gl_accounts(id);

-- Create material category GL defaults table
CREATE TABLE public.material_category_gl_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  gl_account_id UUID REFERENCES public.gl_accounts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on material_category_gl_defaults
ALTER TABLE public.material_category_gl_defaults ENABLE ROW LEVEL SECURITY;

-- RLS policies for material_category_gl_defaults (allow authenticated users to read, admins to modify)
CREATE POLICY "Allow authenticated users to view category GL defaults"
ON public.material_category_gl_defaults FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to manage category GL defaults"
ON public.material_category_gl_defaults FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add invoice finalization fields to purchase_order_invoices
ALTER TABLE public.purchase_order_invoices
ADD COLUMN finalization_status TEXT DEFAULT 'incomplete' CHECK (finalization_status IN ('incomplete', 'ready_to_close', 'closed')),
ADD COLUMN receiving_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN freight_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN financials_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN closed_at TIMESTAMPTZ,
ADD COLUMN closed_by UUID REFERENCES public.profiles(id);

-- Add cost_finalized flag to receiving_lots to lock costs after invoice closure
ALTER TABLE public.receiving_lots
ADD COLUMN cost_finalized BOOLEAN DEFAULT FALSE;

-- Create trigger for updated_at on material_category_gl_defaults
CREATE TRIGGER update_material_category_gl_defaults_updated_at
BEFORE UPDATE ON public.material_category_gl_defaults
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();