-- Create storage bucket for policy attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-attachments', 'policy-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload policy attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'policy-attachments');

-- Allow authenticated users to view policy attachments
CREATE POLICY "Authenticated users can view policy attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'policy-attachments');

-- Allow managers to delete policy attachments
CREATE POLICY "Managers can delete policy attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'policy-attachments' AND public.is_admin_or_manager(auth.uid()));