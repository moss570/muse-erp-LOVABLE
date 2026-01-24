-- Create view for pending deliveries (for delivery driver app)
CREATE OR REPLACE VIEW public.pending_deliveries AS
SELECT
  ss.id AS shipment_id,
  ss.shipment_number,
  ss.ship_date,
  ss.tracking_number,
  ss.bol_number,
  ss.total_cases,
  ss.notes,
  ss.total_pallets,
  so.id AS order_id,
  so.order_number,
  c.id AS customer_id,
  c.code AS customer_code,
  c.name AS customer_name,
  so.ship_to_address,
  so.ship_to_city,
  so.ship_to_state,
  so.ship_to_zip
FROM public.sales_shipments ss
JOIN public.sales_orders so ON so.id = ss.sales_order_id
JOIN public.customers c ON c.id = so.customer_id
WHERE ss.status IN ('preparing', 'in_transit')
  AND ss.signature_data IS NULL -- Not yet delivered
ORDER BY ss.ship_date, ss.shipment_number;

COMMENT ON VIEW public.pending_deliveries IS 'View of shipments ready for delivery but not yet signed for';

-- Grant access to authenticated users
GRANT SELECT ON public.pending_deliveries TO authenticated;

-- Create function to record delivery signature
CREATE OR REPLACE FUNCTION public.record_delivery_signature(
  p_shipment_id UUID,
  p_signature_data TEXT,
  p_signature_name TEXT,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_delivery_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update shipment with signature and delivery info
  UPDATE public.sales_shipments
  SET
    signature_data = p_signature_data,
    signature_captured_at = NOW(),
    delivered_by_name = p_signature_name,
    delivery_latitude = p_latitude,
    delivery_longitude = p_longitude,
    delivery_notes = p_delivery_notes,
    status = 'delivered',
    delivered_at = NOW()
  WHERE id = p_shipment_id;

  -- Update sales order status if all shipments are delivered
  UPDATE public.sales_orders so
  SET status = 'delivered'
  WHERE id = (
    SELECT sales_order_id FROM public.sales_shipments WHERE id = p_shipment_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.sales_shipments
    WHERE sales_order_id = so.id
      AND status != 'delivered'
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.record_delivery_signature IS 'Records digital signature for delivery confirmation and updates shipment/order status';

-- Add GPS tracking columns if they don't exist
ALTER TABLE public.sales_shipments
ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

COMMENT ON COLUMN public.sales_shipments.delivery_latitude IS 'GPS latitude where delivery was signed for';
COMMENT ON COLUMN public.sales_shipments.delivery_longitude IS 'GPS longitude where delivery was signed for';
COMMENT ON COLUMN public.sales_shipments.delivery_notes IS 'Notes from driver about the delivery';
COMMENT ON COLUMN public.sales_shipments.delivered_at IS 'Timestamp when delivery was confirmed';

-- Create indexes for delivery tracking
CREATE INDEX IF NOT EXISTS idx_shipments_delivery_status
ON public.sales_shipments(status)
WHERE status IN ('preparing', 'in_transit', 'delivered');

CREATE INDEX IF NOT EXISTS idx_shipments_signature
ON public.sales_shipments(signature_captured_at)
WHERE signature_captured_at IS NOT NULL;

-- Create RLS policy for pending_deliveries view (if RLS is enabled)
-- Note: Since it's a view, RLS is applied based on underlying tables
