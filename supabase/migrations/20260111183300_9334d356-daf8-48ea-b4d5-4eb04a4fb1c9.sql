-- Drop the existing check constraint and add updated one with Probation
ALTER TABLE public.materials 
DROP CONSTRAINT IF EXISTS materials_approval_status_check;

ALTER TABLE public.materials
ADD CONSTRAINT materials_approval_status_check 
CHECK (approval_status = ANY (ARRAY['Draft'::text, 'Pending_QA'::text, 'Probation'::text, 'Approved'::text, 'Rejected'::text, 'Archived'::text]));