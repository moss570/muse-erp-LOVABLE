-- Cycle Count Settings
CREATE TABLE IF NOT EXISTS public.cycle_count_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  frequency_days INTEGER NOT NULL DEFAULT 15,
  variance_auto_approve_percent NUMERIC DEFAULT 2.0,
  variance_supervisor_review_percent NUMERIC DEFAULT 5.0,
  variance_manager_approval_percent NUMERIC DEFAULT 10.0,
  value_manager_approval_threshold NUMERIC DEFAULT 300.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default settings
INSERT INTO public.cycle_count_settings (category, frequency_days) VALUES
  (NULL, 15),
  ('Dairy', 7),
  ('Allergens', 7)
ON CONFLICT DO NOTHING;

-- Cycle Counts (Header)
CREATE TABLE IF NOT EXISTS public.cycle_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_number TEXT NOT NULL UNIQUE,
  scheduled_date DATE NOT NULL,
  count_type TEXT NOT NULL CHECK (count_type IN 
    ('scheduled', 'spot', 'full_physical', 'open_containers', 'category')),
  location_ids UUID[],
  material_ids UUID[],
  category_filter TEXT,
  include_open_containers BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'scheduled' CHECK (status IN 
    ('scheduled', 'in_progress', 'pending_review', 'approved', 'cancelled')),
  assigned_to UUID REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  total_items INTEGER DEFAULT 0,
  items_counted INTEGER DEFAULT 0,
  items_with_variance INTEGER DEFAULT 0,
  total_variance_value NUMERIC DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cycle Count Items (Line Items)
CREATE TABLE IF NOT EXISTS public.cycle_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_count_id UUID NOT NULL REFERENCES public.cycle_counts(id) ON DELETE CASCADE,
  receiving_lot_id UUID REFERENCES public.receiving_lots(id),
  material_id UUID NOT NULL REFERENCES public.materials(id),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  system_quantity NUMERIC NOT NULL,
  system_unit_id UUID REFERENCES public.units_of_measure(id),
  system_value NUMERIC,
  physical_quantity NUMERIC,
  physical_unit_id UUID REFERENCES public.units_of_measure(id),
  counted_at TIMESTAMPTZ,
  counted_by UUID REFERENCES public.profiles(id),
  variance_quantity NUMERIC GENERATED ALWAYS AS (
    COALESCE(physical_quantity, 0) - system_quantity
  ) STORED,
  variance_percentage NUMERIC,
  variance_value NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN 
    ('pending', 'counted', 'recounting', 'approved', 'adjusted')),
  requires_review BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  adjustment_id UUID REFERENCES public.inventory_adjustments(id),
  count_notes TEXT,
  item_not_found BOOLEAN DEFAULT false,
  found_different_location_id UUID REFERENCES public.locations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Generate count number sequence
CREATE SEQUENCE IF NOT EXISTS cycle_count_seq START 1;

-- Generate count number function
CREATE OR REPLACE FUNCTION generate_cycle_count_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.count_number IS NULL THEN
    NEW.count_number := 'CC-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
      LPAD(nextval('cycle_count_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for count number
DROP TRIGGER IF EXISTS trigger_generate_cycle_count_number ON public.cycle_counts;
CREATE TRIGGER trigger_generate_cycle_count_number
  BEFORE INSERT ON public.cycle_counts
  FOR EACH ROW
  EXECUTE FUNCTION generate_cycle_count_number();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cycle_counts_status ON public.cycle_counts(status);
CREATE INDEX IF NOT EXISTS idx_cycle_counts_date ON public.cycle_counts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_cycle_count_items_count ON public.cycle_count_items(cycle_count_id);
CREATE INDEX IF NOT EXISTS idx_cycle_count_items_status ON public.cycle_count_items(status);

-- Enable RLS
ALTER TABLE public.cycle_count_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_count_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view cycle count settings" ON public.cycle_count_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage cycle count settings" ON public.cycle_count_settings FOR ALL USING (true);

CREATE POLICY "Users can view cycle counts" ON public.cycle_counts FOR SELECT USING (true);
CREATE POLICY "Users can manage cycle counts" ON public.cycle_counts FOR ALL USING (true);

CREATE POLICY "Users can view cycle count items" ON public.cycle_count_items FOR SELECT USING (true);
CREATE POLICY "Users can manage cycle count items" ON public.cycle_count_items FOR ALL USING (true);