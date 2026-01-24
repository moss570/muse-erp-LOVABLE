-- Add RLS DELETE Policy on work_orders table
CREATE POLICY "Managers can delete work orders" 
ON public.work_orders
FOR DELETE 
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

-- Create a safe delete function with all business logic checks and audit logging
CREATE OR REPLACE FUNCTION public.delete_work_order_safe(
  p_work_order_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wo_number TEXT;
  v_wo_data JSONB;
  v_is_scheduled BOOLEAN;
  v_has_labor BOOLEAN;
  v_user_id UUID := auth.uid();
BEGIN
  -- Check manager permission
  IF NOT public.is_admin_or_manager(v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied. Only managers can delete work orders.');
  END IF;
  
  -- Get work order data for audit log
  SELECT wo_number, to_jsonb(work_orders.*) INTO v_wo_number, v_wo_data 
  FROM work_orders WHERE id = p_work_order_id;
  
  IF v_wo_number IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Work order not found.');
  END IF;
  
  -- Check if scheduled (has active production_schedule records)
  SELECT EXISTS (
    SELECT 1 FROM production_schedule 
    WHERE work_order_id = p_work_order_id 
    AND schedule_status != 'Cancelled'
  ) INTO v_is_scheduled;
  
  IF v_is_scheduled THEN
    RETURN json_build_object('success', false, 'error', 'Cannot delete: Work order has been scheduled. Remove from Production Scheduler first.');
  END IF;
  
  -- Check if labor hours have been logged
  SELECT EXISTS (
    SELECT 1 FROM work_order_labor 
    WHERE work_order_id = p_work_order_id 
    AND hours_worked > 0
  ) INTO v_has_labor;
  
  IF v_has_labor THEN
    RETURN json_build_object('success', false, 'error', 'Cannot delete: Labor hours have been logged against this work order.');
  END IF;
  
  -- Log deletion to audit table
  INSERT INTO manufacturing_audit_log (
    table_name, record_id, action, old_value, changed_by, notes
  ) VALUES (
    'work_orders', p_work_order_id, 'DELETE', v_wo_number, v_user_id, 
    'Work order deleted. Full data: ' || v_wo_data::text
  );
  
  -- Delete the work order
  DELETE FROM work_orders WHERE id = p_work_order_id;
  
  RETURN json_build_object('success', true, 'message', 'Work order ' || v_wo_number || ' deleted successfully.');
END;
$$;