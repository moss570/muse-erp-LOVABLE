
-- Hold Reason Codes (configurable in Settings)
CREATE TABLE IF NOT EXISTS hold_reason_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  auto_trigger BOOLEAN DEFAULT false,
  requires_capa BOOLEAN DEFAULT false,
  supplier_points INTEGER DEFAULT 0,
  default_priority TEXT DEFAULT 'medium' CHECK (default_priority IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed data for hold reasons
INSERT INTO hold_reason_codes (code, name, auto_trigger, supplier_points, description, sort_order) VALUES
('PENDING_COA', 'Pending COA', true, 0, 'Certificate of Analysis not yet received', 1),
('COA_MISMATCH', 'COA Does Not Match Specs', true, 5, 'COA values outside specification limits', 2),
('COA_LOT_MISMATCH', 'COA Lot Number Mismatch', true, 5, 'Lot number on COA does not match receiving', 3),
('DAMAGED_PACKAGING', 'Damaged Packaging', false, 3, 'Packaging shows signs of damage', 4),
('TEMP_OUT_OF_RANGE', 'Temperature Out of Range', true, 5, 'Received temperature outside acceptable range', 5),
('QUANTITY_DISCREPANCY', 'Quantity Discrepancy', false, 2, 'Received quantity does not match PO', 6),
('QUALITY_CONCERN', 'Visual Quality Concern', false, 3, 'Visual inspection reveals quality issues', 7),
('PEST_EVIDENCE', 'Evidence of Pest Activity', false, 10, 'Signs of pest contamination', 8),
('ALLERGEN_CONCERN', 'Allergen Cross-Contact Concern', false, 8, 'Potential allergen cross-contamination', 9),
('LABEL_ISSUE', 'Labeling Discrepancy', false, 2, 'Labels missing or incorrect', 10),
('EXPIRED', 'Product Expired or Near Expiry', true, 5, 'Product at or past expiration date', 11),
('OTHER', 'Other - See Notes', false, 0, 'Other reason requiring notes', 99)
ON CONFLICT (code) DO NOTHING;

-- Create new hold entries table (separate from the action log)
CREATE TABLE IF NOT EXISTS inventory_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_lot_id UUID NOT NULL REFERENCES receiving_lots(id) ON DELETE CASCADE,
  
  hold_reason_code_id UUID NOT NULL REFERENCES hold_reason_codes(id),
  hold_reason_description TEXT,
  hold_placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hold_placed_by UUID REFERENCES profiles(id),
  auto_hold BOOLEAN DEFAULT false,
  
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'under_review', 'released', 'rejected', 'disposed', 'returned')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  resolution_type TEXT CHECK (resolution_type IN ('release', 'dispose', 'return_to_supplier', 'partial')),
  
  supplier_point_assessed BOOLEAN DEFAULT false,
  supplier_point_reason TEXT,
  
  capa_id UUID REFERENCES corrective_actions(id),
  qa_inspection_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add hold-related fields to receiving_lots if not present
ALTER TABLE receiving_lots ADD COLUMN IF NOT EXISTS hold_status TEXT DEFAULT 'none';
ALTER TABLE receiving_lots ADD COLUMN IF NOT EXISTS active_hold_id UUID;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_holds_status ON inventory_holds(status);
CREATE INDEX IF NOT EXISTS idx_inventory_holds_lot ON inventory_holds(receiving_lot_id);
CREATE INDEX IF NOT EXISTS idx_inventory_holds_placed_at ON inventory_holds(hold_placed_at);
CREATE INDEX IF NOT EXISTS idx_receiving_lots_hold_status ON receiving_lots(hold_status);

-- Enable RLS
ALTER TABLE hold_reason_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_holds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hold_reason_codes
DROP POLICY IF EXISTS "Users can view hold reason codes" ON hold_reason_codes;
CREATE POLICY "Users can view hold reason codes" ON hold_reason_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage hold reason codes" ON hold_reason_codes;
CREATE POLICY "Authenticated users can manage hold reason codes" ON hold_reason_codes FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for inventory_holds
DROP POLICY IF EXISTS "Users can view inventory holds" ON inventory_holds;
CREATE POLICY "Users can view inventory holds" ON inventory_holds FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create inventory holds" ON inventory_holds;
CREATE POLICY "Users can create inventory holds" ON inventory_holds FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update inventory holds" ON inventory_holds;
CREATE POLICY "Users can update inventory holds" ON inventory_holds FOR UPDATE USING (auth.uid() IS NOT NULL);
