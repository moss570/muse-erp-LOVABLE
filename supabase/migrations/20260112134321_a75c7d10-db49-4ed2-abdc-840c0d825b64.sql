-- Create junction table for many-to-many relationship
CREATE TABLE public.material_listed_material_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  listed_material_id UUID NOT NULL REFERENCES public.listed_material_names(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(material_id, listed_material_id)
);

-- Migrate existing links from materials.listed_material_id to the new junction table
INSERT INTO public.material_listed_material_links (material_id, listed_material_id)
SELECT id, listed_material_id 
FROM public.materials 
WHERE listed_material_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.material_listed_material_links ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow authenticated users to manage links
CREATE POLICY "Authenticated users can view material links"
  ON public.material_listed_material_links
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create material links"
  ON public.material_listed_material_links
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete material links"
  ON public.material_listed_material_links
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_material_links_material_id ON public.material_listed_material_links(material_id);
CREATE INDEX idx_material_links_listed_material_id ON public.material_listed_material_links(listed_material_id);

-- Add comment explaining the relationship
COMMENT ON TABLE public.material_listed_material_links IS 'Junction table enabling many-to-many relationships between materials and listed material names';