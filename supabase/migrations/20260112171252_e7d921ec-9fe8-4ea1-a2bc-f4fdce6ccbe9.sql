-- Update check constraint to include receiving_lots
ALTER TABLE approval_logs DROP CONSTRAINT approval_logs_related_table_name_check;

ALTER TABLE approval_logs ADD CONSTRAINT approval_logs_related_table_name_check 
CHECK (related_table_name = ANY (ARRAY['materials'::text, 'products'::text, 'production_lots'::text, 'po_receiving_sessions'::text, 'suppliers'::text, 'compliance_documents'::text, 'receiving_lots'::text]));