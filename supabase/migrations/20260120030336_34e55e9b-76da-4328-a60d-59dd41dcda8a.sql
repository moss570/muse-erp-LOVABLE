-- Putaway Tasks
CREATE TABLE putaway_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_lot_id UUID NOT NULL REFERENCES receiving_lots(id),
  receiving_session_id UUID REFERENCES po_receiving_sessions(id),
  
  -- Quantities
  total_quantity NUMERIC NOT NULL,
  putaway_quantity NUMERIC DEFAULT 0,
  unit_id UUID REFERENCES units_of_measure(id),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  -- Assignment
  assigned_to UUID REFERENCES profiles(id),
  
  -- Timing
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Putaway Transactions (each scan/location entry)
CREATE TABLE putaway_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  putaway_task_id UUID NOT NULL REFERENCES putaway_tasks(id),
  receiving_lot_id UUID NOT NULL REFERENCES receiving_lots(id),
  
  -- Quantity placed
  quantity NUMERIC NOT NULL,
  unit_id UUID REFERENCES units_of_measure(id),
  
  -- Location
  location_id UUID NOT NULL REFERENCES locations(id),
  location_barcode_scanned TEXT,
  
  -- Lot barcode scanned
  lot_barcode_scanned TEXT,
  
  -- Audit
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add barcode to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_barcode TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS requires_scan_confirmation BOOLEAN DEFAULT true;

-- Add putaway fields to receiving_lots
ALTER TABLE receiving_lots ADD COLUMN IF NOT EXISTS putaway_task_id UUID REFERENCES putaway_tasks(id);
ALTER TABLE receiving_lots ADD COLUMN IF NOT EXISTS putaway_complete BOOLEAN DEFAULT false;
ALTER TABLE receiving_lots ADD COLUMN IF NOT EXISTS putaway_completed_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX idx_putaway_tasks_status ON putaway_tasks(status);
CREATE INDEX idx_putaway_tasks_deadline ON putaway_tasks(deadline);
CREATE INDEX idx_putaway_transactions_task ON putaway_transactions(putaway_task_id);

-- Enable RLS
ALTER TABLE putaway_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE putaway_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view putaway tasks" ON putaway_tasks FOR SELECT USING (true);
CREATE POLICY "Users can manage putaway tasks" ON putaway_tasks FOR ALL USING (true);

CREATE POLICY "Users can view putaway transactions" ON putaway_transactions FOR SELECT USING (true);
CREATE POLICY "Users can create putaway transactions" ON putaway_transactions FOR INSERT WITH CHECK (true);