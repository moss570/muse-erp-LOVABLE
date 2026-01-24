-- Add email tracking columns to pick_requests table
-- Track when 3PL release emails are sent

ALTER TABLE public.pick_requests
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_sent_to TEXT;

COMMENT ON COLUMN public.pick_requests.email_sent_at IS 'Timestamp when 3PL release email was sent';
COMMENT ON COLUMN public.pick_requests.email_sent_to IS 'Email address where the pick release was sent';

-- Create index for querying sent emails
CREATE INDEX IF NOT EXISTS idx_pick_requests_email_sent
ON public.pick_requests(email_sent_at)
WHERE email_sent_at IS NOT NULL;
