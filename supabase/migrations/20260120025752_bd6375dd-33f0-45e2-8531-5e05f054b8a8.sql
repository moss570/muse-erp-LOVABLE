-- QA Receiving Inspections
CREATE TABLE qa_receiving_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_session_id UUID NOT NULL REFERENCES po_receiving_sessions(id),
  
  -- Checklist Items (all required)
  lot_codes_verified BOOLEAN DEFAULT false,
  quantities_verified BOOLEAN DEFAULT false,
  packaging_intact_verified BOOLEAN DEFAULT false,
  temperatures_verified BOOLEAN DEFAULT false,
  
  -- Overall Result
  result TEXT NOT NULL CHECK (result IN ('approved', 'rejected', 'partial')),
  
  -- Inspector Signature
  inspector_id UUID NOT NULL REFERENCES profiles(id),
  inspector_initials TEXT NOT NULL,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Notes
  inspection_notes TEXT,
  rejection_reason TEXT,
  
  -- For partial approval
  approved_lot_ids UUID[],
  rejected_lot_ids UUID[],
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add QA inspection status to receiving sessions
ALTER TABLE po_receiving_sessions ADD COLUMN IF NOT EXISTS qa_inspection_status TEXT DEFAULT 'pending'
  CHECK (qa_inspection_status IN ('pending', 'approved', 'rejected', 'partial'));
ALTER TABLE po_receiving_sessions ADD COLUMN IF NOT EXISTS qa_inspection_id UUID REFERENCES qa_receiving_inspections(id);
ALTER TABLE po_receiving_sessions ADD COLUMN IF NOT EXISTS submitted_to_qa_at TIMESTAMPTZ;
ALTER TABLE po_receiving_sessions ADD COLUMN IF NOT EXISTS submitted_to_qa_by UUID REFERENCES profiles(id);

-- Add putaway status to receiving sessions
ALTER TABLE po_receiving_sessions ADD COLUMN IF NOT EXISTS putaway_status TEXT DEFAULT 'pending'
  CHECK (putaway_status IN ('pending', 'in_progress', 'completed'));

-- Index for performance
CREATE INDEX idx_qa_inspections_session ON qa_receiving_inspections(receiving_session_id);
CREATE INDEX idx_receiving_sessions_qa_status ON po_receiving_sessions(qa_inspection_status);

-- Enable RLS
ALTER TABLE qa_receiving_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view QA inspections" ON qa_receiving_inspections FOR SELECT USING (true);
CREATE POLICY "Users can create QA inspections" ON qa_receiving_inspections FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update QA inspections" ON qa_receiving_inspections FOR UPDATE USING (true);