-- Drop the unique constraint that prevents multiple supplier entries per material
-- This allows having separate supplier entries for each purchase unit variant
ALTER TABLE public.material_suppliers 
DROP CONSTRAINT IF EXISTS material_suppliers_material_id_supplier_id_key;

-- Add a new unique constraint that includes purchase_unit_id
-- This allows multiple entries per supplier but only one per material-supplier-purchase_unit combination
ALTER TABLE public.material_suppliers
ADD CONSTRAINT material_suppliers_material_supplier_unit_unique 
UNIQUE (material_id, supplier_id, purchase_unit_id);