-- Create storage bucket for material documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('material-documents', 'material-documents', false);

-- RLS policies for material documents bucket
CREATE POLICY "Authenticated users can view material documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'material-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can upload material documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'material-documents' AND is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update material documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'material-documents' AND is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can delete material documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'material-documents' AND is_admin_or_manager(auth.uid()));