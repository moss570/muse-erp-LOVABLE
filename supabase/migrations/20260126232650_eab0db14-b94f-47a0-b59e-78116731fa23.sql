-- Add columns for multi-pass tracking
ALTER TABLE public.sqf_editions 
ADD COLUMN IF NOT EXISTS current_pass integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS pass_results jsonb DEFAULT '[]'::jsonb;