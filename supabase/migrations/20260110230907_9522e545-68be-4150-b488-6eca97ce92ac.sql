-- Drop the existing check constraint
ALTER TABLE public.receiving_lots DROP CONSTRAINT receiving_lots_status_check;

-- Add updated check constraint that includes 'hold' and 'on_hold' status values
ALTER TABLE public.receiving_lots ADD CONSTRAINT receiving_lots_status_check 
CHECK (status = ANY (ARRAY['available'::text, 'on_hold'::text, 'hold'::text, 'quarantine'::text, 'consumed'::text, 'expired'::text]));