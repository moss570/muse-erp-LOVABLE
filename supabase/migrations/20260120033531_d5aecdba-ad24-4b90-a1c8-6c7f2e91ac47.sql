-- Recall Contacts
CREATE TABLE IF NOT EXISTS recall_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_type TEXT NOT NULL CHECK (contact_type IN ('internal', 'external', 'regulatory')),
  role_title TEXT NOT NULL,
  contact_name TEXT,
  organization TEXT,
  phone TEXT,
  phone_secondary TEXT,
  email TEXT,
  notify_class_1 BOOLEAN DEFAULT true,
  notify_class_2 BOOLEAN DEFAULT true,
  notify_class_3 BOOLEAN DEFAULT false,
  notify_mock_drill BOOLEAN DEFAULT true,
  notify_by_phone BOOLEAN DEFAULT true,
  notify_by_email BOOLEAN DEFAULT true,
  notify_by_sms BOOLEAN DEFAULT false,
  notification_order INTEGER DEFAULT 99,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default contacts
INSERT INTO recall_contacts (contact_type, role_title, notification_order) VALUES
  ('internal', 'QA Manager', 1),
  ('internal', 'Plant Manager', 2),
  ('internal', 'Production Manager', 3),
  ('internal', 'Warehouse Manager', 4),
  ('internal', 'Owner/CEO', 5),
  ('external', 'FDA Contact', 10),
  ('external', 'State Health Department', 11),
  ('external', 'SQF Certification Body', 12),
  ('external', 'Insurance Provider', 15),
  ('external', 'Legal Counsel', 16),
  ('external', 'PR/Communications', 17);

-- Mock Recall Drills
CREATE TABLE IF NOT EXISTS mock_recall_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_number TEXT NOT NULL UNIQUE,
  drill_date DATE NOT NULL,
  drill_type TEXT NOT NULL CHECK (drill_type IN ('full', 'tabletop', 'partial')),
  scenario_description TEXT NOT NULL,
  affected_lot_number TEXT,
  affected_material_id UUID REFERENCES materials(id),
  affected_product_id UUID REFERENCES products(id),
  simulated_recall_class TEXT CHECK (simulated_recall_class IN ('I', 'II', 'III')),
  drill_start_time TIMESTAMPTZ,
  drill_end_time TIMESTAMPTZ,
  time_to_identify_lots_minutes INTEGER,
  time_to_identify_customers_minutes INTEGER,
  time_to_notify_contacts_minutes INTEGER,
  total_drill_time_minutes INTEGER,
  lots_traced_count INTEGER,
  customers_identified_count INTEGER,
  product_recovered_percentage NUMERIC,
  pass_fail TEXT CHECK (pass_fail IN ('pass', 'fail', 'needs_improvement')),
  findings TEXT,
  corrective_actions TEXT,
  lead_by UUID REFERENCES profiles(id),
  participants JSONB,
  documentation_path TEXT,
  signed_off_by UUID REFERENCES profiles(id),
  signed_off_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generate drill number
CREATE SEQUENCE IF NOT EXISTS mock_drill_seq START 1;

CREATE OR REPLACE FUNCTION generate_drill_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.drill_number := 'MRD-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
    LPAD(nextval('mock_drill_seq')::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_generate_drill_number ON mock_recall_drills;
CREATE TRIGGER trigger_generate_drill_number
  BEFORE INSERT ON mock_recall_drills
  FOR EACH ROW
  WHEN (NEW.drill_number IS NULL)
  EXECUTE FUNCTION generate_drill_number();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recall_contacts_type ON recall_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_mock_drills_date ON mock_recall_drills(drill_date);
CREATE INDEX IF NOT EXISTS idx_mock_drills_status ON mock_recall_drills(status);

-- Enable RLS
ALTER TABLE recall_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_recall_drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recall contacts" ON recall_contacts FOR SELECT USING (true);
CREATE POLICY "Users can manage recall contacts" ON recall_contacts FOR ALL USING (true);

CREATE POLICY "Users can view mock drills" ON mock_recall_drills FOR SELECT USING (true);
CREATE POLICY "Users can manage mock drills" ON mock_recall_drills FOR ALL USING (true);