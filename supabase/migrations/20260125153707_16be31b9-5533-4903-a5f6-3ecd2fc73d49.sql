-- Create storage bucket for production evidence photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('production-evidence', 'production-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload production evidence
CREATE POLICY "Authenticated users can upload production evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'production-evidence');

-- Allow authenticated users to view production evidence
CREATE POLICY "Authenticated users can view production evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'production-evidence');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete production evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'production-evidence');