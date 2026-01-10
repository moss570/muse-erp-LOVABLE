-- Add new truck inspection fields to po_receiving_sessions
ALTER TABLE public.po_receiving_sessions
ADD COLUMN IF NOT EXISTS truck_temperature_setting numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS truck_temperature_type text DEFAULT 'refrigerated',
ADD COLUMN IF NOT EXISTS inspection_pest_free boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS inspection_debris_free boolean DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.po_receiving_sessions.truck_temperature_setting IS 'Temperature setting of the truck in Fahrenheit';
COMMENT ON COLUMN public.po_receiving_sessions.truck_temperature_type IS 'Type: refrigerated or ambient';
COMMENT ON COLUMN public.po_receiving_sessions.inspection_pest_free IS 'Truck inspection - free of pests/insects/rodents';
COMMENT ON COLUMN public.po_receiving_sessions.inspection_debris_free IS 'Truck inspection - free of spilled ingredients or trash';

-- Create receiving_hold_log table for QA workflow
CREATE TABLE public.receiving_hold_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receiving_lot_id uuid NOT NULL REFERENCES public.receiving_lots(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'placed_on_hold', 'released', 'rejected', 'qa_approved'
  reason text,
  performed_by uuid REFERENCES public.profiles(id),
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  previous_status text,
  new_status text
);

-- Enable RLS
ALTER TABLE public.receiving_hold_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Hold log viewable by authenticated" ON public.receiving_hold_log
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert hold log" ON public.receiving_hold_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Add index for quick lookup
CREATE INDEX idx_receiving_hold_log_lot ON public.receiving_hold_log(receiving_lot_id);
CREATE INDEX idx_receiving_hold_log_action ON public.receiving_hold_log(action);

-- Update receiving_lots to add qa_status field
ALTER TABLE public.receiving_lots
ADD COLUMN IF NOT EXISTS qa_status text DEFAULT 'pending_qa',
ADD COLUMN IF NOT EXISTS qa_approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS qa_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS qa_notes text;

COMMENT ON COLUMN public.receiving_lots.qa_status IS 'QA status: pending_qa, approved, rejected, hold';