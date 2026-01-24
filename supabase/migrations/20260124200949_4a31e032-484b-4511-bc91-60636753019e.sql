-- Create pending_purchase_orders table for queuing incoming POs
CREATE TABLE public.pending_purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_from TEXT,
  email_subject TEXT,
  email_message_id TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pdf_storage_path TEXT,
  pdf_filename TEXT,
  raw_extracted_data JSONB,
  extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extraction_error TEXT,
  matched_customer_id UUID REFERENCES public.customers(id),
  customer_confidence NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'error')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_sales_order_id UUID REFERENCES public.sales_orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_purchase_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow authenticated users to view and manage pending orders
CREATE POLICY "Authenticated users can view pending orders"
  ON public.pending_purchase_orders
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert pending orders"
  ON public.pending_purchase_orders
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pending orders"
  ON public.pending_purchase_orders
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER update_pending_purchase_orders_updated_at
  BEFORE UPDATE ON public.pending_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for incoming PO PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incoming-purchase-orders',
  'incoming-purchase-orders',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']::text[]
);

-- Storage policies for incoming-purchase-orders bucket
CREATE POLICY "Authenticated users can read incoming POs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'incoming-purchase-orders' AND auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert incoming POs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'incoming-purchase-orders');

CREATE POLICY "Authenticated users can delete incoming POs"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'incoming-purchase-orders' AND auth.uid() IS NOT NULL);

-- Add inbound_orders email type to email_settings if not exists
INSERT INTO public.email_settings (email_type, from_name, from_email, description, is_active)
VALUES (
  'inbound_orders',
  'Incoming Orders',
  'orders@musescoop.com',
  'Email address for receiving customer purchase orders',
  true
)
ON CONFLICT (email_type) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX idx_pending_purchase_orders_status ON public.pending_purchase_orders(status);
CREATE INDEX idx_pending_purchase_orders_received_at ON public.pending_purchase_orders(received_at DESC);