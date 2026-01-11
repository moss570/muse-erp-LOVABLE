-- Add COA critical limits JSONB column to materials table
-- This stores an array of parameter specifications entered from manufacturer COA data
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS coa_critical_limits JSONB DEFAULT '[]'::jsonb;

-- Add a comment to document the structure
COMMENT ON COLUMN public.materials.coa_critical_limits IS 'Array of COA critical limit specifications: [{parameter, target_spec, min, max, uom, method}]';