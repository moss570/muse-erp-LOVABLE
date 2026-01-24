-- ============================================
-- DATABASE RESET SCRIPT FOR GO-LIVE
-- ============================================
-- WARNING: This script will DELETE ALL DATA from your database!
-- Only run this when you're ready to clear test data before going live.
-- 
-- HOW TO USE:
-- 1. Copy this entire script
-- 2. Go to your Lovable project
-- 3. Ask Lovable to run this migration when you're ready
-- ============================================

-- Disable triggers temporarily for faster deletion
SET session_replication_role = 'replica';

-- ============================================
-- TRANSACTIONAL DATA (Delete first - child tables)
-- ============================================

-- Chat & Communication
TRUNCATE TABLE chat_message_reactions CASCADE;
TRUNCATE TABLE chat_messages CASCADE;
TRUNCATE TABLE chat_read_receipts CASCADE;
TRUNCATE TABLE chat_channel_members CASCADE;
TRUNCATE TABLE chat_channels CASCADE;

-- Notifications
TRUNCATE TABLE notifications CASCADE;

-- Approval & Activity Logs
TRUNCATE TABLE approval_logs CASCADE;
TRUNCATE TABLE capa_activity_log CASCADE;

-- CAPA (Corrective Actions)
TRUNCATE TABLE capa_attachments CASCADE;
TRUNCATE TABLE capa_tasks CASCADE;
TRUNCATE TABLE capa_approvals CASCADE;
TRUNCATE TABLE capa_root_cause_analysis CASCADE;

-- Quality Complaints
TRUNCATE TABLE complaint_attachments CASCADE;

-- Audit Findings
TRUNCATE TABLE audit_findings CASCADE;
TRUNCATE TABLE audits CASCADE;

-- Non-Conformities
TRUNCATE TABLE nc_attachments CASCADE;
TRUNCATE TABLE nc_activity_log CASCADE;

-- QA & Quality
TRUNCATE TABLE qa_check_results CASCADE;
TRUNCATE TABLE qa_override_requests CASCADE;
TRUNCATE TABLE batch_qa_tests CASCADE;
TRUNCATE TABLE lot_qa_tests CASCADE;

-- Production & Manufacturing
TRUNCATE TABLE work_order_stage_progress CASCADE;
TRUNCATE TABLE work_order_materials CASCADE;
TRUNCATE TABLE work_orders CASCADE;
TRUNCATE TABLE production_lot_inputs CASCADE;
TRUNCATE TABLE production_lots CASCADE;
TRUNCATE TABLE manufacturing_lots CASCADE;

-- Inventory & Warehouse
TRUNCATE TABLE inventory_holds CASCADE;
TRUNCATE TABLE inventory_adjustments CASCADE;
TRUNCATE TABLE inventory_transactions CASCADE;
TRUNCATE TABLE pallet_cases CASCADE;
TRUNCATE TABLE pallets CASCADE;
TRUNCATE TABLE bol_pallets CASCADE;
TRUNCATE TABLE bills_of_lading CASCADE;
TRUNCATE TABLE cycle_count_items CASCADE;
TRUNCATE TABLE cycle_counts CASCADE;
TRUNCATE TABLE open_containers CASCADE;
TRUNCATE TABLE disposal_log CASCADE;
TRUNCATE TABLE issue_request_items CASCADE;
TRUNCATE TABLE issue_requests CASCADE;
TRUNCATE TABLE putaway_tasks CASCADE;

-- Receiving & Purchasing
TRUNCATE TABLE receiving_lot_materials CASCADE;
TRUNCATE TABLE receiving_session_items CASCADE;
TRUNCATE TABLE receiving_sessions CASCADE;
TRUNCATE TABLE receiving_lots CASCADE;
TRUNCATE TABLE po_line_items CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;
TRUNCATE TABLE invoice_line_items CASCADE;
TRUNCATE TABLE freight_invoices CASCADE;
TRUNCATE TABLE invoices CASCADE;

-- HR & Scheduling
TRUNCATE TABLE time_clock_entries CASCADE;
TRUNCATE TABLE schedule_shifts CASCADE;
TRUNCATE TABLE schedule_templates CASCADE;
TRUNCATE TABLE pto_requests CASCADE;
TRUNCATE TABLE employee_documents CASCADE;
TRUNCATE TABLE training_records CASCADE;
TRUNCATE TABLE allergen_acknowledgments CASCADE;

-- Tasks
TRUNCATE TABLE task_checklist_items CASCADE;
TRUNCATE TABLE tasks CASCADE;

-- Compliance Documents
TRUNCATE TABLE compliance_documents CASCADE;

-- Corrective Actions (parent table after children)
TRUNCATE TABLE corrective_actions CASCADE;

-- Quality Complaints (parent)
TRUNCATE TABLE quality_complaints CASCADE;
TRUNCATE TABLE customer_complaints CASCADE;

-- Non-Conformities (parent)
TRUNCATE TABLE non_conformities CASCADE;

-- Active Editors (session data)
TRUNCATE TABLE active_editors CASCADE;

-- Accounting Periods
TRUNCATE TABLE accounting_periods CASCADE;

-- ============================================
-- MASTER DATA (Optional - uncomment if you want to reset)
-- WARNING: This removes products, materials, suppliers, etc.
-- ============================================

-- Uncomment the following lines if you want to also reset master data:

-- -- Products & Recipes
-- TRUNCATE TABLE product_size_par_levels CASCADE;
-- TRUNCATE TABLE product_sizes CASCADE;
-- TRUNCATE TABLE product_qa_requirements CASCADE;
-- TRUNCATE TABLE recipe_ingredients CASCADE;
-- TRUNCATE TABLE recipes CASCADE;
-- TRUNCATE TABLE products CASCADE;
-- TRUNCATE TABLE product_categories CASCADE;
-- TRUNCATE TABLE sub_categories CASCADE;

-- -- Materials
-- TRUNCATE TABLE material_supplier_links CASCADE;
-- TRUNCATE TABLE material_nutrition CASCADE;
-- TRUNCATE TABLE materials CASCADE;

-- -- Suppliers
-- TRUNCATE TABLE supplier_scoring_events CASCADE;
-- TRUNCATE TABLE supplier_scores CASCADE;
-- TRUNCATE TABLE suppliers CASCADE;

-- -- Customers
-- TRUNCATE TABLE customers CASCADE;

-- -- Employees (keep profiles for auth)
-- TRUNCATE TABLE employees CASCADE;

-- -- Locations & Settings (usually keep these)
-- TRUNCATE TABLE locations CASCADE;
-- TRUNCATE TABLE departments CASCADE;
-- TRUNCATE TABLE machines CASCADE;
-- TRUNCATE TABLE production_lines CASCADE;

-- ============================================
-- RE-ENABLE TRIGGERS
-- ============================================
SET session_replication_role = 'origin';

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this query after to verify data was cleared:
-- SELECT 
--   schemaname,
--   relname as table_name,
--   n_live_tup as row_count
-- FROM pg_stat_user_tables
-- WHERE schemaname = 'public'
-- ORDER BY n_live_tup DESC;
