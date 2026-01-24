
-- Phase 1: Create Mint Flavor material (if not exists)
INSERT INTO materials (id, code, name, category, is_active, listed_material_id, base_unit_id, approval_status)
SELECT 
  gen_random_uuid(),
  'ING000007',
  'Mint Flavor - Weber',
  'Ingredients',
  true,
  '86e7f9f6-3cbc-4288-9a6a-6db6a617bac1',
  'cfe7df94-63af-4ed2-b206-922634710f07',
  'Approved'
WHERE NOT EXISTS (
  SELECT 1 FROM materials WHERE listed_material_id = '86e7f9f6-3cbc-4288-9a6a-6db6a617bac1'
);

-- Phase 2: Link materials to The Milk Company with pricing

-- 2.1 Link Sugar to The Milk Company
INSERT INTO material_suppliers (id, material_id, supplier_id, supplier_item_number, cost_per_unit, is_primary, lead_time_days, unit_id, is_active)
SELECT 
  gen_random_uuid(),
  'ebb86a74-eaeb-4e4e-ab42-2e7111bda422',
  'ed4784ee-a6f0-439a-9ad1-981116aa2edb',
  'TMC-SUGAR-001',
  0.45,
  false,
  3,
  'cfe7df94-63af-4ed2-b206-922634710f07',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM material_suppliers 
  WHERE material_id = 'ebb86a74-eaeb-4e4e-ab42-2e7111bda422' 
  AND supplier_id = 'ed4784ee-a6f0-439a-9ad1-981116aa2edb'
);

-- 2.2 Link Mint Flavor to The Milk Company
INSERT INTO material_suppliers (id, material_id, supplier_id, supplier_item_number, cost_per_unit, is_primary, lead_time_days, unit_id, is_active)
SELECT 
  gen_random_uuid(),
  m.id,
  'ed4784ee-a6f0-439a-9ad1-981116aa2edb',
  'TMC-MINT-001',
  45.00,
  true,
  5,
  'cfe7df94-63af-4ed2-b206-922634710f07',
  true
FROM materials m
WHERE m.listed_material_id = '86e7f9f6-3cbc-4288-9a6a-6db6a617bac1'
AND NOT EXISTS (
  SELECT 1 FROM material_suppliers ms 
  WHERE ms.material_id = m.id 
  AND ms.supplier_id = 'ed4784ee-a6f0-439a-9ad1-981116aa2edb'
);

-- 2.3 Link Test Box to The Milk Company
INSERT INTO material_suppliers (id, material_id, supplier_id, supplier_item_number, cost_per_unit, is_primary, lead_time_days, unit_id, is_active)
SELECT 
  gen_random_uuid(),
  '577f08a7-1afb-405a-bcb2-39374d6df837',
  'ed4784ee-a6f0-439a-9ad1-981116aa2edb',
  'TMC-BOX-001',
  1.50,
  true,
  7,
  '17828dc5-a619-405f-b557-ff10b43cbdf2',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM material_suppliers 
  WHERE material_id = '577f08a7-1afb-405a-bcb2-39374d6df837' 
  AND supplier_id = 'ed4784ee-a6f0-439a-9ad1-981116aa2edb'
);

-- 2.4 Link Half Gallon Tub and Lid to The Milk Company
INSERT INTO material_suppliers (id, material_id, supplier_id, supplier_item_number, cost_per_unit, is_primary, lead_time_days, unit_id, is_active)
SELECT 
  gen_random_uuid(),
  '1f2945f5-e5dd-47db-bc29-e44baf67401f',
  'ed4784ee-a6f0-439a-9ad1-981116aa2edb',
  'TMC-TUB-HG-001',
  0.85,
  false,
  7,
  '17828dc5-a619-405f-b557-ff10b43cbdf2',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM material_suppliers 
  WHERE material_id = '1f2945f5-e5dd-47db-bc29-e44baf67401f' 
  AND supplier_id = 'ed4784ee-a6f0-439a-9ad1-981116aa2edb'
);

-- 2.5 Update Milk pricing for The Milk Company
UPDATE material_suppliers 
SET cost_per_unit = 0.55
WHERE id = '45f975d8-39e3-4b2c-84f5-25f1be2be5a0';

-- 2.6 Update Stabilizer pricing for The Milk Company
UPDATE material_suppliers 
SET cost_per_unit = 12.00
WHERE id = 'bdb0ddd3-48a8-4a7e-a523-a8c7485dd304';

-- Phase 3: Add Sugar and Stabilizer to BAS-TEST recipe (ID: 298c3735-fbef-4e65-a1a6-ed63bd8ea6ef)

-- 3.1 Add Sugar (15 KG) to BAS-TEST
INSERT INTO product_recipe_items (id, recipe_id, listed_material_id, quantity_required, unit_id, wastage_percentage, notes, sort_order)
SELECT 
  gen_random_uuid(),
  '298c3735-fbef-4e65-a1a6-ed63bd8ea6ef',
  'a65d3de3-6e60-4232-8306-21d4499809e3',
  15.00,
  'cfe7df94-63af-4ed2-b206-922634710f07',
  1.0,
  'Sugar for test manufacturing',
  2
WHERE NOT EXISTS (
  SELECT 1 FROM product_recipe_items 
  WHERE recipe_id = '298c3735-fbef-4e65-a1a6-ed63bd8ea6ef'
  AND listed_material_id = 'a65d3de3-6e60-4232-8306-21d4499809e3'
);

-- 3.2 Add Stabilizer (0.5 KG) to BAS-TEST
INSERT INTO product_recipe_items (id, recipe_id, listed_material_id, quantity_required, unit_id, wastage_percentage, notes, sort_order)
SELECT 
  gen_random_uuid(),
  '298c3735-fbef-4e65-a1a6-ed63bd8ea6ef',
  '6e379b5a-d1ee-41eb-a18f-0eb7c6573424',
  0.50,
  'cfe7df94-63af-4ed2-b206-922634710f07',
  2.0,
  'Stabilizer for test manufacturing',
  3
WHERE NOT EXISTS (
  SELECT 1 FROM product_recipe_items 
  WHERE recipe_id = '298c3735-fbef-4e65-a1a6-ed63bd8ea6ef'
  AND listed_material_id = '6e379b5a-d1ee-41eb-a18f-0eb7c6573424'
);

-- Phase 4: Approve BAS-TEST recipe
UPDATE product_recipes 
SET approval_status = 'Approved', is_active = true
WHERE id = '298c3735-fbef-4e65-a1a6-ed63bd8ea6ef';

-- Phase 5: Fix G-MINT recipe (ID: 216014a2-6b23-42b3-b277-0509d217a8fd)
-- Update existing items to have proper listed_material_id values

-- 5.1 Update Milk item to have listed_material_id
UPDATE product_recipe_items 
SET listed_material_id = 'd905f93f-fa6b-4b9b-9957-376a420167ad'
WHERE id = '0331b3a6-b41d-47ef-856b-81d2d7749d8e';

-- 5.2 Update Heavy Cream item to have listed_material_id
UPDATE product_recipe_items 
SET listed_material_id = 'a6a61bd5-650a-4d09-acc7-b53b1ec40e8d'
WHERE id = '7e4e1a01-828f-400c-9b11-b1bcfadcbabe';

-- 5.3 Update Sugar item to have listed_material_id
UPDATE product_recipe_items 
SET listed_material_id = 'a65d3de3-6e60-4232-8306-21d4499809e3'
WHERE id = '3cfa2faf-ac17-4a28-94ba-9cd7d916fa74';

-- 5.4 Update Stabilizer item to have listed_material_id
UPDATE product_recipe_items 
SET listed_material_id = '6e379b5a-d1ee-41eb-a18f-0eb7c6573424'
WHERE id = 'eed7cf07-6e82-4688-89e7-302612452350';

-- 5.5 Add Mint Flavor (1.5 KG) to G-MINT
INSERT INTO product_recipe_items (id, recipe_id, listed_material_id, quantity_required, unit_id, wastage_percentage, notes, sort_order)
SELECT 
  gen_random_uuid(),
  '216014a2-6b23-42b3-b277-0509d217a8fd',
  '86e7f9f6-3cbc-4288-9a6a-6db6a617bac1',
  1.50,
  'cfe7df94-63af-4ed2-b206-922634710f07',
  1.0,
  'Mint flavoring',
  5
WHERE NOT EXISTS (
  SELECT 1 FROM product_recipe_items 
  WHERE recipe_id = '216014a2-6b23-42b3-b277-0509d217a8fd'
  AND listed_material_id = '86e7f9f6-3cbc-4288-9a6a-6db6a617bac1'
);
