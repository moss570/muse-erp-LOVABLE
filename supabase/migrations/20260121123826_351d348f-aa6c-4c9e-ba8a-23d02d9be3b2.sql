-- Create product_size_par_levels table for location-based par level tracking
CREATE TABLE public.product_size_par_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_size_id UUID NOT NULL REFERENCES public.product_sizes(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  inventory_type TEXT NOT NULL CHECK (inventory_type IN ('CASE', 'PALLET')),
  par_level INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER,
  max_stock INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique constraint: one par level per size/location/type combo
  UNIQUE (product_size_id, location_id, inventory_type)
);

-- Enable RLS
ALTER TABLE public.product_size_par_levels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view par levels"
ON public.product_size_par_levels
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert par levels"
ON public.product_size_par_levels
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update par levels"
ON public.product_size_par_levels
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete par levels"
ON public.product_size_par_levels
FOR DELETE
TO authenticated
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_product_size_par_levels_updated_at
BEFORE UPDATE ON public.product_size_par_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_product_size_par_levels_size_id ON public.product_size_par_levels(product_size_id);
CREATE INDEX idx_product_size_par_levels_location_id ON public.product_size_par_levels(location_id);