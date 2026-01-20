-- Remove legacy manufacturing system tables and update references

-- First, update production_issue_requests to reference the new work_orders table
-- Drop the old foreign key constraint
ALTER TABLE production_issue_requests 
  DROP CONSTRAINT IF EXISTS production_issue_requests_work_order_id_fkey;

-- Add new foreign key to work_orders table
ALTER TABLE production_issue_requests
  ADD CONSTRAINT production_issue_requests_work_order_id_fkey 
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL;

-- Drop the production_lots FK to production_work_orders if it exists
ALTER TABLE production_lots 
  DROP CONSTRAINT IF EXISTS production_lots_work_order_id_fkey;

-- Drop work_order_assignments table (depends on production_work_orders)
DROP TABLE IF EXISTS work_order_assignments CASCADE;

-- Drop the legacy production_work_orders table
DROP TABLE IF EXISTS production_work_orders CASCADE;

-- Drop the work order number generation function for legacy table
DROP FUNCTION IF EXISTS generate_work_order_number() CASCADE;