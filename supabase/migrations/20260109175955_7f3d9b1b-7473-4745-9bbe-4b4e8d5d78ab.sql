-- Add manufacturer item number and cost per unit columns to material_purchase_units
ALTER TABLE public.material_purchase_units
ADD COLUMN item_number text,
ADD COLUMN cost_per_unit numeric;