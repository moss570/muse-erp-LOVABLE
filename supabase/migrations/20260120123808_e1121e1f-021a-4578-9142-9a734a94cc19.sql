-- Create hr-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-documents', 'hr-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for hr-documents bucket
CREATE POLICY "Employees can view their own HR documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'hr-documents' 
  AND (
    -- Personal documents folder access
    (storage.foldername(name))[1] = 'personal' 
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  OR (
    -- Template documents access for all authenticated users
    (storage.foldername(name))[1] = 'templates'
  )
);

CREATE POLICY "Admins can upload HR documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'hr-documents'
  AND public.is_admin_or_manager(auth.uid())
);

CREATE POLICY "Admins can delete HR documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hr-documents'
  AND public.is_admin_or_manager(auth.uid())
);