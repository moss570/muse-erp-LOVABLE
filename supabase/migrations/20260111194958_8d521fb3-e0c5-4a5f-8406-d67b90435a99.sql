-- Migrate authentication_method from text to text array
-- First, add a new column for the array
ALTER TABLE public.materials ADD COLUMN authentication_methods text[];

-- Copy existing values to the new array column (if not null, wrap in array)
UPDATE public.materials 
SET authentication_methods = CASE 
  WHEN authentication_method IS NOT NULL AND authentication_method != '' 
  THEN ARRAY[authentication_method]
  ELSE NULL 
END;

-- Drop the old column
ALTER TABLE public.materials DROP COLUMN authentication_method;

-- Rename the new column to the original name
ALTER TABLE public.materials RENAME COLUMN authentication_methods TO authentication_method;