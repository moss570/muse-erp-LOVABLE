-- Production Issue Requests (Header)
CREATE TABLE production_issue_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  
  -- Link to production
  work_order_id UUID REFERENCES production_work_orders(id),
  production_batch_id UUID REFERENCES production_lots(id),
  
  -- Request details
  requested_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  needed_by TIMESTAMPTZ NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Delivery location
  delivery_location_id UUID REFERENCES locations(id),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN 
    ('draft', 'pending', 'in_progress', 'completed', 'cancelled')),
  
  -- Fulfillment
  fulfilled_by UUID REFERENCES profiles(id),
  fulfilled_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Production Issue Request Items (Line Items)
CREATE TABLE production_issue_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_request_id UUID NOT NULL REFERENCES production_issue_requests(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id),
  
  -- Requested in USAGE UOM
  quantity_requested NUMERIC NOT NULL,
  usage_unit_id UUID NOT NULL REFERENCES units_of_measure(id),
  
  -- Calculated PURCHASE UOM breakdown
  quantity_purchase_uom NUMERIC,
  purchase_unit_id UUID REFERENCES units_of_measure(id),
  
  -- Disassembly details
  disassemble_required BOOLEAN DEFAULT false,
  disassemble_quantity NUMERIC,
  remaining_after_use NUMERIC,
  
  -- Selected lots (warehouse picks)
  selected_lots JSONB,
  
  -- Fulfillment
  quantity_fulfilled NUMERIC DEFAULT 0,
  fulfilled_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'partial', 'cancelled')),
  
  notes TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Generate request number sequence
CREATE SEQUENCE IF NOT EXISTS issue_request_seq START 1;

-- Generate request number function
CREATE OR REPLACE FUNCTION generate_issue_request_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_number := 'IR-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
    LPAD(nextval('issue_request_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_generate_issue_request_number
  BEFORE INSERT ON production_issue_requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL)
  EXECUTE FUNCTION generate_issue_request_number();

-- Indexes
CREATE INDEX idx_issue_requests_status ON production_issue_requests(status);
CREATE INDEX idx_issue_request_items_request ON production_issue_request_items(issue_request_id);

-- Enable RLS
ALTER TABLE production_issue_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_issue_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view issue requests" ON production_issue_requests FOR SELECT USING (true);
CREATE POLICY "Users can manage issue requests" ON production_issue_requests FOR ALL USING (true);
CREATE POLICY "Users can view issue items" ON production_issue_request_items FOR SELECT USING (true);
CREATE POLICY "Users can manage issue items" ON production_issue_request_items FOR ALL USING (true);