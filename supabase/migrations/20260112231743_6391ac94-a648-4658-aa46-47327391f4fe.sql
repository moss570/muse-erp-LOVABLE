-- Phase 3.1: Trial Mode Flag + Sandbox
-- Add trial batch fields to production_lots
ALTER TABLE public.production_lots 
ADD COLUMN IF NOT EXISTS is_trial_batch boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_notes jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_canvas_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cost_category text DEFAULT 'production';

-- Add comment for cost_category
COMMENT ON COLUMN public.production_lots.cost_category IS 'production or r_and_d';

-- Phase 3.2: Allergen acknowledgment tracking
CREATE TABLE IF NOT EXISTS public.allergen_acknowledgments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_lot_id uuid REFERENCES public.production_lots(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  allergens text[] NOT NULL,
  acknowledged_by uuid REFERENCES public.profiles(id),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Enable RLS
ALTER TABLE public.allergen_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS policies for allergen acknowledgments
CREATE POLICY "Authenticated users can view allergen acknowledgments"
ON public.allergen_acknowledgments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create allergen acknowledgments"
ON public.allergen_acknowledgments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = acknowledged_by);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_allergen_acks_production_lot 
ON public.allergen_acknowledgments(production_lot_id);

-- Add dropdown options for cost categories
INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order, is_active)
VALUES 
  ('cost_category', 'production', 'Production', 1, true),
  ('cost_category', 'r_and_d', 'R&D / Trial', 2, true)
ON CONFLICT DO NOTHING;