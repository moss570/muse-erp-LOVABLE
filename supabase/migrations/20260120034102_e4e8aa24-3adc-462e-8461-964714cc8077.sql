-- Create Inventory Preferences table
CREATE TABLE inventory_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_key TEXT NOT NULL UNIQUE,
  preference_value TEXT NOT NULL,
  preference_type TEXT DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default preferences
INSERT INTO inventory_preferences (preference_key, preference_value, preference_type, description) VALUES
  ('default_expiry_warning_days', '7', 'integer', 'Days before expiry to trigger warning'),
  ('open_shelf_life_default', '30', 'integer', 'Default open shelf life in days'),
  ('putaway_deadline_hours', '24', 'integer', 'Hours to complete putaway'),
  ('adjustment_approval_threshold', '300', 'decimal', 'Dollar threshold for adjustment approval'),
  ('require_second_count', 'true', 'boolean', 'Require second count for variances'),
  ('enable_barcode_scanning', 'true', 'boolean', 'Enable barcode scanning features'),
  ('temperature_unit', 'fahrenheit', 'string', 'Temperature display unit'),
  ('lot_number_format', 'YY-JJJ-MMBB', 'string', 'Lot number format pattern'),
  ('auto_hold_missing_coa', 'true', 'boolean', 'Auto-hold for missing COA'),
  ('auto_hold_temp_excursion', 'true', 'boolean', 'Auto-hold for temperature excursion');

-- Enable RLS
ALTER TABLE inventory_preferences ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies
CREATE POLICY "Users can view preferences" ON inventory_preferences FOR SELECT USING (true);
CREATE POLICY "Users can manage preferences" ON inventory_preferences FOR ALL USING (true);

-- Index
CREATE INDEX idx_inventory_preferences_key ON inventory_preferences(preference_key);