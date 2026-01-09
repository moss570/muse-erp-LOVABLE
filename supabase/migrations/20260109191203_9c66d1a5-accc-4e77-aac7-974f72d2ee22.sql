-- Create supplier_contacts table for multiple contacts per supplier
CREATE TABLE IF NOT EXISTS public.supplier_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  send_po_to boolean DEFAULT false,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on supplier_contacts
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for supplier_contacts
CREATE POLICY "Anyone can view supplier contacts"
  ON public.supplier_contacts FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage supplier contacts"
  ON public.supplier_contacts FOR ALL
  USING (is_admin_or_manager(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_supplier_contacts_updated_at
  BEFORE UPDATE ON public.supplier_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();