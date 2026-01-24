-- Add email tracking columns to sales_invoices table
-- Track when invoices are emailed to customers

ALTER TABLE public.sales_invoices
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_sent_to TEXT;

COMMENT ON COLUMN public.sales_invoices.email_sent_at IS 'Timestamp when invoice email was sent to customer';
COMMENT ON COLUMN public.sales_invoices.email_sent_to IS 'Email address where the invoice was sent';

-- Create index for querying sent invoices
CREATE INDEX IF NOT EXISTS idx_sales_invoices_email_sent
ON public.sales_invoices(email_sent_at)
WHERE email_sent_at IS NOT NULL;
