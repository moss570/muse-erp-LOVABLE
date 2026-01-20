
-- COA Document Storage
CREATE TABLE IF NOT EXISTS receiving_coa_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_lot_id UUID NOT NULL REFERENCES receiving_lots(id) ON DELETE CASCADE,
  
  -- Document Storage
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  page_count INTEGER DEFAULT 1,
  mime_type TEXT DEFAULT 'application/pdf',
  
  -- AI Processing
  ai_processed BOOLEAN DEFAULT false,
  ai_processed_at TIMESTAMPTZ,
  ai_extracted_data JSONB,
  ai_validation_result JSONB,
  ai_confidence_score NUMERIC,
  
  -- Validation Status
  validation_status TEXT DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'processing', 'passed', 'failed', 'manual_review')),
  lot_number_match BOOLEAN,
  specs_match BOOLEAN,
  validation_notes TEXT,
  
  -- Manual Review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_override BOOLEAN DEFAULT false,
  review_notes TEXT,
  
  -- Audit
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_coa_documents_lot ON receiving_coa_documents(receiving_lot_id);
CREATE INDEX IF NOT EXISTS idx_coa_documents_status ON receiving_coa_documents(validation_status);

-- Enable RLS
ALTER TABLE receiving_coa_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view COA documents" ON receiving_coa_documents;
CREATE POLICY "Users can view COA documents" ON receiving_coa_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can upload COA documents" ON receiving_coa_documents;
CREATE POLICY "Users can upload COA documents" ON receiving_coa_documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update COA documents" ON receiving_coa_documents;
CREATE POLICY "Users can update COA documents" ON receiving_coa_documents FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Add COA requirement flag to materials if not exists
ALTER TABLE materials ADD COLUMN IF NOT EXISTS requires_coa BOOLEAN DEFAULT false;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS coa_spec_template JSONB;

-- Create storage bucket for COA documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('coa-documents', 'coa-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for COA documents
DROP POLICY IF EXISTS "Authenticated users can upload COA documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload COA documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'coa-documents' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view COA documents" ON storage.objects;
CREATE POLICY "Authenticated users can view COA documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'coa-documents' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update COA documents" ON storage.objects;
CREATE POLICY "Authenticated users can update COA documents" ON storage.objects
  FOR UPDATE USING (bucket_id = 'coa-documents' AND auth.uid() IS NOT NULL);
