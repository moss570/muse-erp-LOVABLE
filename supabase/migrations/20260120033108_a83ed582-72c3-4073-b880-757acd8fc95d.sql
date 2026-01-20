-- Add par level fields to materials (if not exists)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS par_level NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS reorder_point NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS max_stock_level NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7;

-- Alert Settings
CREATE TABLE IF NOT EXISTS alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL UNIQUE CHECK (alert_type IN (
    'below_par', 'at_reorder', 'above_max', 
    'expiring_soon', 'expired', 
    'open_container_aging', 'open_container_expired',
    'putaway_overdue', 'cycle_count_overdue'
  )),
  is_enabled BOOLEAN DEFAULT true,
  days_before_expiry INTEGER DEFAULT 7,
  notification_channels TEXT[] DEFAULT ARRAY['in_app'],
  notify_roles TEXT[] DEFAULT ARRAY['inventory_manager', 'warehouse_manager'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default alert settings
INSERT INTO alert_settings (alert_type, is_enabled, days_before_expiry, notification_channels) VALUES
  ('below_par', true, NULL, ARRAY['in_app', 'email']),
  ('at_reorder', true, NULL, ARRAY['in_app', 'email']),
  ('above_max', true, NULL, ARRAY['in_app']),
  ('expiring_soon', true, 7, ARRAY['in_app', 'email']),
  ('expired', true, 0, ARRAY['in_app', 'email']),
  ('open_container_aging', true, 3, ARRAY['in_app']),
  ('open_container_expired', true, 0, ARRAY['in_app', 'email']),
  ('putaway_overdue', true, NULL, ARRAY['in_app', 'email']),
  ('cycle_count_overdue', true, NULL, ARRAY['in_app', 'email'])
ON CONFLICT (alert_type) DO NOTHING;

-- Inventory Alerts
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  material_id UUID REFERENCES materials(id),
  receiving_lot_id UUID REFERENCES receiving_lots(id),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  current_value NUMERIC,
  threshold_value NUMERIC,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_type ON inventory_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_status ON inventory_alerts(status);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_material ON inventory_alerts(material_id);

-- Enable RLS
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alert settings" ON alert_settings FOR SELECT USING (true);
CREATE POLICY "All users can manage alert settings" ON alert_settings FOR ALL USING (true);
CREATE POLICY "Users can view alerts" ON inventory_alerts FOR SELECT USING (true);
CREATE POLICY "Users can manage alerts" ON inventory_alerts FOR ALL USING (true);