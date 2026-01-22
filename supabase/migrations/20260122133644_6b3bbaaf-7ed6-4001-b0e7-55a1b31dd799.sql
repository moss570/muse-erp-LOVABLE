-- Add parent_size_id column to create tub-to-case relationships
ALTER TABLE product_sizes 
ADD COLUMN parent_size_id UUID REFERENCES product_sizes(id);

-- Add comment for clarity
COMMENT ON COLUMN product_sizes.parent_size_id IS 
  'For case sizes, references the parent tub size. NULL for unit/tub sizes.';

-- Create index for efficient lookups
CREATE INDEX idx_product_sizes_parent_size_id ON product_sizes(parent_size_id);