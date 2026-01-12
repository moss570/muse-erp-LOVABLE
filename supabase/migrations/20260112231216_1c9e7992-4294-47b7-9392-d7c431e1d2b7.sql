-- Add adjustment reason codes dropdown options
INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order, is_active)
VALUES 
  ('adjustment_reason', 'found_physical', 'Found Physical Count', 1, true),
  ('adjustment_reason', 'scale_error', 'Scale/Weighing Error', 2, true),
  ('adjustment_reason', 'spillage', 'Spillage/Waste', 3, true),
  ('adjustment_reason', 'damage', 'Damaged Product', 4, true),
  ('adjustment_reason', 'quality_issue', 'Quality Issue - Rejected', 5, true),
  ('adjustment_reason', 'cycle_count', 'Cycle Count Adjustment', 6, true),
  ('adjustment_reason', 'data_entry_error', 'Data Entry Correction', 7, true),
  ('adjustment_reason', 'theft_loss', 'Theft/Unexplained Loss', 8, true),
  ('adjustment_reason', 'sample_usage', 'Sample/Testing Usage', 9, true),
  ('adjustment_reason', 'other', 'Other (Specify)', 10, true)
ON CONFLICT DO NOTHING;