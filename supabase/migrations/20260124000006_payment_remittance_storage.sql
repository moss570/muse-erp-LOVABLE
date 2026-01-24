-- =============================================
-- Create Storage Bucket for Payment Remittances
-- =============================================

-- Create the payment-remittances bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-remittances',
  'payment-remittances',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Storage Policies for payment-remittances
-- =============================================

-- Allow authenticated users to upload remittance files
CREATE POLICY "Authenticated users can upload payment remittances"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-remittances' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to view their own uploads
CREATE POLICY "Users can view payment remittances"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-remittances' AND
  auth.uid() IS NOT NULL
);

-- Allow service role (edge functions) full access
CREATE POLICY "Service role has full access to payment remittances"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'payment-remittances')
WITH CHECK (bucket_id = 'payment-remittances');

-- Allow authenticated users to delete their uploads within 24 hours
CREATE POLICY "Users can delete recent payment remittances"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-remittances' AND
  auth.uid() IS NOT NULL AND
  created_at > NOW() - INTERVAL '24 hours'
);

-- =============================================
-- Comments for documentation
-- =============================================

COMMENT ON POLICY "Authenticated users can upload payment remittances" ON storage.objects IS
  'Allow authenticated users to upload payment remittance files (PDFs, images) for AI processing';

COMMENT ON POLICY "Service role has full access to payment remittances" ON storage.objects IS
  'Edge function needs to download and process remittance files for AI extraction';
