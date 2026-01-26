-- Add source location tracking to putaway_transactions
ALTER TABLE public.putaway_transactions 
ADD COLUMN IF NOT EXISTS source_location_id UUID REFERENCES public.locations(id),
ADD COLUMN IF NOT EXISTS source_location_barcode_scanned TEXT;

-- Populate location barcodes for all locations that don't have one
UPDATE public.locations
SET location_barcode = 'LOC-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE location_barcode IS NULL;

-- Add index on location_barcode for fast lookups
CREATE INDEX IF NOT EXISTS idx_locations_barcode ON public.locations(location_barcode);

-- Add index on internal_lot_number for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_receiving_lots_internal_lot ON public.receiving_lots(internal_lot_number);