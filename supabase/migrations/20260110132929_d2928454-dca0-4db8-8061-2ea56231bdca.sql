-- Add manufacturer item number and photo fields to material_purchase_units table
ALTER TABLE public.material_purchase_units 
ADD COLUMN IF NOT EXISTS item_number TEXT,
ADD COLUMN IF NOT EXISTS photo_path TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS photo_added_at TIMESTAMP WITH TIME ZONE;

-- Add purchase_unit_id to material_suppliers to link supplier to specific unit variant
ALTER TABLE public.material_suppliers 
ADD COLUMN IF NOT EXISTS purchase_unit_id UUID REFERENCES public.material_purchase_units(id) ON DELETE SET NULL;

-- Create storage bucket for unit variant photos (public for easy display)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('material-photos', 'material-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for material photos
CREATE POLICY "Material photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'material-photos');

CREATE POLICY "Authenticated users can upload material photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'material-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update material photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'material-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete material photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'material-photos' AND auth.role() = 'authenticated');