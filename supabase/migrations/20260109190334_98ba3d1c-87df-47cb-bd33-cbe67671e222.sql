-- Add approval and classification fields to suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS supplier_type text DEFAULT 'ingredient',
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_date date,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS next_review_date date,
  ADD COLUMN IF NOT EXISTS conditional_notes text,
  ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS gfsi_certified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS food_safety_certification text,
  ADD COLUMN IF NOT EXISTS certification_expiry_date date,
  ADD COLUMN IF NOT EXISTS last_audit_date date,
  ADD COLUMN IF NOT EXISTS audit_score numeric,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS credit_limit numeric,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS fax text;

-- Create supplier_documents table for document management
CREATE TABLE IF NOT EXISTS public.supplier_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.document_requirements(id),
  document_name text NOT NULL,
  file_path text,
  file_url text,
  date_published date,
  date_reviewed date,
  expiry_date date,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on supplier_documents
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for supplier_documents
CREATE POLICY "Anyone can view supplier documents"
  ON public.supplier_documents FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage supplier documents"
  ON public.supplier_documents FOR ALL
  USING (is_admin_or_manager(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_supplier_documents_updated_at
  BEFORE UPDATE ON public.supplier_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for supplier documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-documents', 'supplier-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for supplier documents
CREATE POLICY "Authenticated users can view supplier documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'supplier-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can upload supplier documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supplier-documents' AND is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update supplier documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'supplier-documents' AND is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can delete supplier documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'supplier-documents' AND is_admin_or_manager(auth.uid()));