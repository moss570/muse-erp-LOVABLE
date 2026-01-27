-- Add evidence_excerpts column to store text snippets that prove compliance
ALTER TABLE public.policy_sqf_mappings 
ADD COLUMN IF NOT EXISTS evidence_excerpts text[];