-- Add wip_uom column to product_categories for WIP products
ALTER TABLE product_categories
ADD COLUMN wip_uom TEXT DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN product_categories.wip_uom IS 'Override UOM for WIP products in this category (e.g., KG for base mix products)';