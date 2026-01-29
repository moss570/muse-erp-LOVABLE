-- Drop the existing foreign key constraint on owner_id that references profiles
ALTER TABLE public.policies DROP CONSTRAINT IF EXISTS policies_owner_id_fkey;

-- Add new foreign key constraint to reference job_positions instead
ALTER TABLE public.policies 
ADD CONSTRAINT policies_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.job_positions(id) ON DELETE SET NULL;

-- Also drop the reviewer_id constraint since we removed that field from the form
-- (keeping the column for backwards compatibility but removing the constraint is optional)
-- The column can stay but won't be used by the form anymore