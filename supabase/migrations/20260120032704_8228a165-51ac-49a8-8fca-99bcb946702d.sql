-- Add open container fields to receiving_lots (if not exists)
ALTER TABLE public.receiving_lots ADD COLUMN IF NOT EXISTS parent_lot_id UUID REFERENCES public.receiving_lots(id);
ALTER TABLE public.receiving_lots ADD COLUMN IF NOT EXISTS opened_date DATE;
ALTER TABLE public.receiving_lots ADD COLUMN IF NOT EXISTS open_expiry_date DATE;
ALTER TABLE public.receiving_lots ADD COLUMN IF NOT EXISTS is_open_portion BOOLEAN DEFAULT false;

-- Add open shelf life to materials
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS open_shelf_life_days INTEGER;

-- Inventory Conversion Log (tracks disassembly/reassembly)
CREATE TABLE IF NOT EXISTS public.inventory_conversion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_lot_id UUID NOT NULL REFERENCES public.receiving_lots(id),
  source_quantity NUMERIC NOT NULL,
  source_unit_id UUID REFERENCES public.units_of_measure(id),
  target_lot_id UUID REFERENCES public.receiving_lots(id),
  target_quantity NUMERIC NOT NULL,
  target_unit_id UUID REFERENCES public.units_of_measure(id),
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('disassembly', 'reassembly')),
  reason_code TEXT NOT NULL CHECK (reason_code IN (
    'ISSUE_TO_PROD', 'DATA_CORRECTION', 'UNUSED_RETURN', 
    'UNIT_CHANGE', 'SCALE_ERROR', 'INVENTORY_COUNT', 'OTHER'
  )),
  reason_notes TEXT,
  calculated_open_expiry DATE,
  performed_by UUID REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversion_log_source ON public.inventory_conversion_log(source_lot_id);
CREATE INDEX IF NOT EXISTS idx_conversion_log_target ON public.inventory_conversion_log(target_lot_id);
CREATE INDEX IF NOT EXISTS idx_receiving_lots_parent ON public.receiving_lots(parent_lot_id);
CREATE INDEX IF NOT EXISTS idx_receiving_lots_container_status ON public.receiving_lots(container_status);

-- Enable RLS
ALTER TABLE public.inventory_conversion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view conversion log" ON public.inventory_conversion_log FOR SELECT USING (true);
CREATE POLICY "Users can create conversions" ON public.inventory_conversion_log FOR INSERT WITH CHECK (true);

-- Function to increment lot quantity (for reassembly)
CREATE OR REPLACE FUNCTION public.increment_lot_quantity(lot_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.receiving_lots
  SET 
    quantity_received = quantity_received + amount,
    container_status = CASE 
      WHEN quantity_received + amount > 0 THEN 'sealed' 
      ELSE container_status 
    END
  WHERE id = lot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;