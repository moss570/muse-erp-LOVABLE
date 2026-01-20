
-- Disposal Log table for tracking disposed inventory
CREATE TABLE IF NOT EXISTS disposal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was disposed
  receiving_lot_id UUID REFERENCES receiving_lots(id),
  production_lot_id UUID REFERENCES production_lots(id),
  material_id UUID REFERENCES materials(id),
  product_id UUID REFERENCES products(id),
  
  -- Quantity disposed
  quantity_disposed NUMERIC NOT NULL,
  unit_id UUID REFERENCES units_of_measure(id),
  
  -- Value / Expense
  unit_cost NUMERIC,
  total_value NUMERIC NOT NULL DEFAULT 0,
  gl_account_id UUID REFERENCES gl_accounts(id),
  journal_entry_id UUID,
  xero_synced_at TIMESTAMPTZ,
  
  -- Reason
  disposal_reason_code TEXT NOT NULL,
  disposal_reason_notes TEXT,
  
  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN 
    ('hold_rejection', 'expiry', 'damage', 'quality', 'recall', 'cycle_count', 'other')),
  source_reference_id UUID,
  
  -- Supplier impact
  supplier_id UUID REFERENCES suppliers(id),
  supplier_points_assessed INTEGER DEFAULT 0,
  
  -- Approval (for high-value disposals)
  requires_approval BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Audit
  disposed_by UUID REFERENCES profiles(id),
  disposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_disposal_log_date ON disposal_log(disposed_at);
CREATE INDEX IF NOT EXISTS idx_disposal_log_material ON disposal_log(material_id);
CREATE INDEX IF NOT EXISTS idx_disposal_log_supplier ON disposal_log(supplier_id);
CREATE INDEX IF NOT EXISTS idx_disposal_log_source ON disposal_log(source_type, source_reference_id);

-- Enable RLS
ALTER TABLE disposal_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view disposal log" ON disposal_log;
CREATE POLICY "Users can view disposal log" ON disposal_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create disposal entries" ON disposal_log;
CREATE POLICY "Users can create disposal entries" ON disposal_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update disposal entries" ON disposal_log;
CREATE POLICY "Users can update disposal entries" ON disposal_log FOR UPDATE USING (auth.uid() IS NOT NULL);
