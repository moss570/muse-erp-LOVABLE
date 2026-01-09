-- Change area column from text to text array
ALTER TABLE public.document_requirements 
  ALTER COLUMN area TYPE text[] USING ARRAY[area];

-- Rename column to be more descriptive
ALTER TABLE public.document_requirements 
  RENAME COLUMN area TO areas;