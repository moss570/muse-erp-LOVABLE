-- Create company_settings table (singleton pattern)
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Company Name',
  phone TEXT,
  fax TEXT,
  email TEXT,
  website TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'USA',
  logo_path TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default company data for Muse Gelato
INSERT INTO public.company_settings (
  company_name, phone, website, address_line1, city, state, zip
) VALUES (
  'Muse Gelato, Inc.',
  '407-363-1443',
  'www.musegelato.com',
  '7362 Futures Drive Suite 20',
  'Orlando',
  'FL',
  '32819'
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read company settings
CREATE POLICY "Authenticated users can view company settings"
ON public.company_settings FOR SELECT
TO authenticated USING (true);

-- Allow authenticated users to update company settings
CREATE POLICY "Authenticated users can update company settings"
ON public.company_settings FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

-- Add address fields to locations table
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA',
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add label_format enum type
DO $$ BEGIN
  CREATE TYPE label_format AS ENUM ('3x2', '3x5', '4x6', '2x1', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create label_templates table
CREATE TABLE public.label_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  label_type TEXT NOT NULL, -- 'receiving', 'production', 'shipping', 'inventory', 'custom'
  label_format TEXT NOT NULL DEFAULT '3x2', -- '3x2', '3x5', '4x6', '2x1', 'custom'
  width_inches DECIMAL(5,2) NOT NULL DEFAULT 3.0,
  height_inches DECIMAL(5,2) NOT NULL DEFAULT 2.0,
  description TEXT,
  template_html TEXT,
  barcode_type TEXT DEFAULT '128', -- 'CODE128', 'QR', 'EAN13', 'UPC-A'
  include_barcode BOOLEAN DEFAULT true,
  barcode_field TEXT DEFAULT 'lot_number', -- which field to encode
  fields_config JSONB DEFAULT '[]'::jsonb, -- [{field_key, label, position, font_size, bold}]
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for label_templates
ALTER TABLE public.label_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view label templates"
ON public.label_templates FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage label templates"
ON public.label_templates FOR ALL
TO authenticated USING (true) WITH CHECK (true);

-- Add trigger for updated_at on label_templates
CREATE TRIGGER update_label_templates_updated_at
BEFORE UPDATE ON public.label_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on company_settings
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default label templates
INSERT INTO public.label_templates (name, label_type, label_format, width_inches, height_inches, description, barcode_type, barcode_field, is_default) VALUES
('Receiving Label (3x2)', 'receiving', '3x2', 3.0, 2.0, 'Standard receiving label for incoming materials', 'CODE128', 'internal_lot_number', true),
('Production Label (3x5)', 'production', '3x5', 3.0, 5.0, 'Production lot label with full details', 'CODE128', 'lot_number', true),
('Production Label (4x6)', 'production', '4x6', 4.0, 6.0, 'Large production label for cases', 'CODE128', 'lot_number', false),
('Shipping Label (4x6)', 'shipping', '4x6', 4.0, 6.0, 'Shipping/BOL label', 'CODE128', 'bol_number', true),
('Inventory Tag (2x1)', 'inventory', '2x1', 2.0, 1.0, 'Small inventory location tag', 'CODE128', 'location_code', true);

-- Add company merge fields to template_merge_fields
INSERT INTO public.template_merge_fields (category, field_key, field_label, description, sample_value, sort_order) VALUES
('purchase', 'COMPANY_NAME', 'Company Name', 'Your company name', 'Muse Gelato, Inc.', 50),
('purchase', 'COMPANY_ADDRESS', 'Company Address', 'Full company address', '7362 Futures Drive Suite 20, Orlando, FL 32819', 51),
('purchase', 'COMPANY_PHONE', 'Company Phone', 'Company phone number', '407-363-1443', 52),
('purchase', 'COMPANY_WEBSITE', 'Company Website', 'Company website URL', 'www.musegelato.com', 53),
('purchase', 'SHIP_TO_ADDRESS', 'Ship To Address', 'Delivery location address', '7362 Futures Drive Suite 20, Orlando, FL 32819', 30),
('purchase', 'SHIP_TO_LOCATION', 'Ship To Location Name', 'Delivery location name', 'Main Warehouse', 31),
('sale', 'COMPANY_NAME', 'Company Name', 'Your company name', 'Muse Gelato, Inc.', 50),
('sale', 'COMPANY_ADDRESS', 'Company Address', 'Full company address', '7362 Futures Drive Suite 20, Orlando, FL 32819', 51),
('sale', 'COMPANY_PHONE', 'Company Phone', 'Company phone number', '407-363-1443', 52),
('sale', 'COMPANY_WEBSITE', 'Company Website', 'Company website URL', 'www.musegelato.com', 53),
('inventory', 'COMPANY_NAME', 'Company Name', 'Your company name', 'Muse Gelato, Inc.', 50),
('inventory', 'COMPANY_ADDRESS', 'Company Address', 'Full company address', '7362 Futures Drive Suite 20, Orlando, FL 32819', 51),
('production', 'COMPANY_NAME', 'Company Name', 'Your company name', 'Muse Gelato, Inc.', 50),
('production', 'COMPANY_ADDRESS', 'Company Address', 'Full company address', '7362 Futures Drive Suite 20, Orlando, FL 32819', 51)
ON CONFLICT DO NOTHING;