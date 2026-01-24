-- ================================================
-- Admin Override System: Audit Log Table
-- ================================================

-- Create admin_audit_log table for tracking all admin override actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL, -- 'password_set', 'force_delete_wo', 'force_close_day', etc.
  action_details JSONB DEFAULT '{}',
  justification TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.admin_audit_log IS 'Tracks all administrative override actions for compliance and security auditing';
COMMENT ON COLUMN public.admin_audit_log.action_type IS 'Type of admin action: password_set, force_delete_wo, force_close_day, employee_reinstate, po_status_override';
COMMENT ON COLUMN public.admin_audit_log.justification IS 'Required explanation for override actions';

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the audit log
CREATE POLICY "Only admins can view admin audit log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Only the system (via SECURITY DEFINER functions) can insert
CREATE POLICY "System can insert admin audit log"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (admin_user_id = auth.uid());

-- Create index for efficient querying
CREATE INDEX idx_admin_audit_log_admin_user ON public.admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_action_type ON public.admin_audit_log(action_type);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- ================================================
-- Update delete_work_order_safe with Admin Override
-- ================================================

CREATE OR REPLACE FUNCTION public.delete_work_order_safe(
  p_work_order_id UUID,
  p_admin_override BOOLEAN DEFAULT false,
  p_override_reason TEXT DEFAULT NULL
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
  v_is_admin BOOLEAN;
BEGIN
  -- Check manager permission
  IF NOT public.is_admin_or_manager(v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied. Only managers can delete work orders.');
  END IF;
  
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;
  
  -- If admin override requested, validate
  IF p_admin_override THEN
    IF NOT v_is_admin THEN
      RETURN json_build_object('success', false, 'error', 'Admin override requires administrator privileges.');
    END IF;
    
    IF p_override_reason IS NULL OR trim(p_override_reason) = '' THEN
      RETURN json_build_object('success', false, 'error', 'Admin override requires a justification reason.');
    END IF;
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
  
  -- Check if labor hours have been logged
  SELECT EXISTS (
    SELECT 1 FROM work_order_labor 
    WHERE work_order_id = p_work_order_id 
    AND hours_worked > 0
  ) INTO v_has_labor;
  
  -- Block deletion unless admin override
  IF NOT p_admin_override THEN
    IF v_is_scheduled THEN
      RETURN json_build_object('success', false, 'error', 'Cannot delete: Work order has been scheduled. Remove from Production Scheduler first.');
    END IF;
    
    IF v_has_labor THEN
      RETURN json_build_object('success', false, 'error', 'Cannot delete: Labor hours have been logged against this work order.');
    END IF;
  END IF;
  
  -- Log to admin audit if override was used
  IF p_admin_override THEN
    INSERT INTO admin_audit_log (
      admin_user_id, action_type, action_details, justification
    ) VALUES (
      v_user_id, 
      'force_delete_wo',
      jsonb_build_object(
        'work_order_id', p_work_order_id,
        'wo_number', v_wo_number,
        'was_scheduled', v_is_scheduled,
        'had_labor', v_has_labor,
        'wo_data', v_wo_data
      ),
      p_override_reason
    );
  END IF;
  
  -- Log deletion to manufacturing audit table
  INSERT INTO manufacturing_audit_log (
    table_name, record_id, action, old_value, changed_by, notes
  ) VALUES (
    'work_orders', p_work_order_id, 'DELETE', v_wo_number, v_user_id, 
    CASE 
      WHEN p_admin_override THEN 'ADMIN OVERRIDE: ' || p_override_reason || '. Full data: ' || v_wo_data::text
      ELSE 'Work order deleted. Full data: ' || v_wo_data::text
    END
  );
  
  -- Delete the work order
  DELETE FROM work_orders WHERE id = p_work_order_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Work order ' || v_wo_number || ' deleted successfully.' || 
      CASE WHEN p_admin_override THEN ' (Admin Override)' ELSE '' END,
    'admin_override', p_admin_override
  );
END;
$$;