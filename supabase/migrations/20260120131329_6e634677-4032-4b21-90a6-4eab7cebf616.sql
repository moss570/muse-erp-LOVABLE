-- =============================================
-- NON-CONFORMITIES PHASE 2 - DISPOSITIONS
-- =============================================

-- Disposition approval matrix (configurable rules)
CREATE TABLE public.nc_disposition_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disposition TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  requires_approval BOOLEAN DEFAULT false,
  approver_role TEXT CHECK (approver_role IN ('supervisor', 'manager', 'admin')),
  approval_threshold_amount NUMERIC,
  requires_justification BOOLEAN DEFAULT false,
  auto_create_hold_log BOOLEAN DEFAULT false,
  auto_create_inventory_adjustment BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(disposition, severity)
);

-- Insert default disposition rules
INSERT INTO public.nc_disposition_rules (
  disposition, severity, requires_approval, approver_role, 
  requires_justification, auto_create_hold_log, auto_create_inventory_adjustment
) VALUES
  ('use_as_is', 'critical', true, 'admin', true, false, false),
  ('use_as_is', 'major', true, 'manager', true, false, false),
  ('use_as_is', 'minor', true, 'supervisor', true, false, false),
  ('scrap', 'critical', true, 'admin', true, false, true),
  ('scrap', 'major', true, 'manager', true, false, true),
  ('scrap', 'minor', false, null, true, false, true),
  ('return_supplier', 'critical', true, 'admin', true, false, false),
  ('return_supplier', 'major', true, 'manager', true, false, false),
  ('return_supplier', 'minor', true, 'supervisor', true, false, false),
  ('hold', 'critical', false, null, false, true, false),
  ('hold', 'major', false, null, false, true, false),
  ('hold', 'minor', false, null, false, true, false),
  ('rework', 'critical', true, 'manager', true, false, false),
  ('rework', 'major', false, null, true, false, false),
  ('rework', 'minor', false, null, false, false, false),
  ('downgrade', 'critical', true, 'admin', true, false, false),
  ('downgrade', 'major', true, 'manager', true, false, false),
  ('downgrade', 'minor', true, 'supervisor', true, false, false),
  ('sort_segregate', 'critical', true, 'manager', true, false, false),
  ('sort_segregate', 'major', false, null, true, false, false),
  ('sort_segregate', 'minor', false, null, false, false, false),
  ('pending', 'critical', false, null, false, false, false),
  ('pending', 'major', false, null, false, false, false),
  ('pending', 'minor', false, null, false, false, false);

-- RLS for disposition rules
ALTER TABLE public.nc_disposition_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view disposition rules" 
  ON public.nc_disposition_rules FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Only admins can manage disposition rules" 
  ON public.nc_disposition_rules FOR ALL 
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- NC DISPOSITION ACTIONS (Track execution)
-- =============================================

CREATE TABLE public.nc_disposition_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id UUID NOT NULL REFERENCES public.non_conformities(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'hold_log_created',
    'hold_released',
    'inventory_adjustment_created',
    'material_scrapped',
    'returned_to_supplier',
    'rework_initiated',
    'product_downgraded',
    'sorted_segregated'
  )),
  hold_log_id UUID REFERENCES public.receiving_hold_log(id) ON DELETE SET NULL,
  inventory_adjustment_id UUID,
  quantity_affected NUMERIC,
  unit TEXT,
  cost NUMERIC,
  notes TEXT,
  executed_by UUID REFERENCES public.profiles(id),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nc_disposition_actions_nc ON public.nc_disposition_actions(nc_id);
CREATE INDEX idx_nc_disposition_actions_type ON public.nc_disposition_actions(action_type);

ALTER TABLE public.nc_disposition_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view disposition actions" 
  ON public.nc_disposition_actions FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create disposition actions" 
  ON public.nc_disposition_actions FOR INSERT 
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- FUNCTION: Check Disposition Approval Required
-- =============================================

CREATE OR REPLACE FUNCTION public.check_nc_disposition_approval_required(
  p_disposition TEXT,
  p_severity TEXT,
  p_estimated_cost NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_rule RECORD;
BEGIN
  SELECT * INTO v_rule
  FROM public.nc_disposition_rules
  WHERE disposition = p_disposition
    AND severity = p_severity;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'requires_approval', false,
      'requires_justification', false
    );
  END IF;
  
  IF v_rule.approval_threshold_amount IS NOT NULL 
     AND p_estimated_cost IS NOT NULL 
     AND p_estimated_cost < v_rule.approval_threshold_amount THEN
    RETURN jsonb_build_object(
      'requires_approval', false,
      'requires_justification', v_rule.requires_justification,
      'reason', 'Below cost threshold'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'requires_approval', v_rule.requires_approval,
    'requires_justification', v_rule.requires_justification,
    'approver_role', v_rule.approver_role,
    'approval_threshold_amount', v_rule.approval_threshold_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- FUNCTION: Apply NC Disposition
-- =============================================

CREATE OR REPLACE FUNCTION public.apply_nc_disposition(
  p_nc_id UUID,
  p_disposition TEXT,
  p_justification TEXT DEFAULT NULL,
  p_approved_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_nc RECORD;
  v_rule RECORD;
  v_hold_log_id UUID;
  v_actions JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_nc
  FROM public.non_conformities
  WHERE id = p_nc_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Non-conformity not found';
  END IF;
  
  SELECT * INTO v_rule
  FROM public.nc_disposition_rules
  WHERE disposition = p_disposition
    AND severity = v_nc.severity;
  
  IF v_rule.requires_approval AND p_approved_by IS NULL THEN
    RAISE EXCEPTION 'Approval required for this disposition';
  END IF;
  
  IF v_rule.requires_justification AND (p_justification IS NULL OR p_justification = '') THEN
    RAISE EXCEPTION 'Justification required for this disposition';
  END IF;
  
  UPDATE public.non_conformities
  SET 
    disposition = p_disposition,
    disposition_justification = p_justification,
    disposition_approved_by = p_approved_by,
    disposition_approved_at = CASE 
      WHEN p_approved_by IS NOT NULL THEN now() 
      ELSE NULL 
    END,
    status = CASE
      WHEN p_disposition = 'pending' THEN 'open'
      WHEN p_disposition IN ('hold') THEN 'under_review'
      ELSE 'disposition_approved'
    END
  WHERE id = p_nc_id;
  
  -- HOLD - Create hold log entry
  IF v_rule.auto_create_hold_log AND p_disposition = 'hold' THEN
    IF v_nc.receiving_lot_id IS NOT NULL THEN
      INSERT INTO public.receiving_hold_log (
        receiving_lot_id,
        action,
        reason,
        performed_by,
        notes,
        previous_status,
        new_status
      ) VALUES (
        v_nc.receiving_lot_id,
        'placed_on_hold',
        'Non-Conformity: ' || v_nc.nc_number,
        auth.uid(),
        p_justification,
        'available',
        'hold'
      ) RETURNING id INTO v_hold_log_id;
      
      UPDATE public.receiving_lots
      SET qa_status = 'hold', status = 'hold'
      WHERE id = v_nc.receiving_lot_id;
      
      INSERT INTO public.nc_disposition_actions (
        nc_id, action_type, hold_log_id, notes, executed_by
      ) VALUES (
        p_nc_id, 'hold_log_created', v_hold_log_id, 
        'Lot placed on hold', auth.uid()
      );
      
      v_actions := v_actions || jsonb_build_object(
        'action', 'hold_log_created',
        'hold_log_id', v_hold_log_id
      );
    END IF;
  END IF;
  
  -- RELEASE FROM HOLD
  IF p_disposition IN ('use_as_is', 'rework') AND v_nc.receiving_lot_id IS NOT NULL THEN
    INSERT INTO public.receiving_hold_log (
      receiving_lot_id,
      action,
      reason,
      performed_by,
      notes,
      previous_status,
      new_status
    ) VALUES (
      v_nc.receiving_lot_id,
      'released',
      'NC Disposition: ' || p_disposition,
      auth.uid(),
      p_justification,
      'hold',
      'available'
    ) RETURNING id INTO v_hold_log_id;
    
    UPDATE public.receiving_lots
    SET 
      qa_status = 'approved',
      status = 'available',
      qa_approved_by = p_approved_by,
      qa_approved_at = now()
    WHERE id = v_nc.receiving_lot_id;
    
    INSERT INTO public.nc_disposition_actions (
      nc_id, action_type, hold_log_id, notes, executed_by
    ) VALUES (
      p_nc_id, 'hold_released', v_hold_log_id, 
      'Lot released from hold', auth.uid()
    );
    
    v_actions := v_actions || jsonb_build_object(
      'action', 'hold_released',
      'hold_log_id', v_hold_log_id
    );
  END IF;
  
  -- SCRAP
  IF v_rule.auto_create_inventory_adjustment AND p_disposition = 'scrap' THEN
    INSERT INTO public.nc_disposition_actions (
      nc_id, action_type, quantity_affected, unit, cost, notes, executed_by
    ) VALUES (
      p_nc_id, 'material_scrapped', v_nc.quantity_affected,
      v_nc.quantity_affected_unit, v_nc.estimated_cost,
      'Inventory adjustment required for scrapped material', auth.uid()
    );
    
    v_actions := v_actions || jsonb_build_object(
      'action', 'material_scrapped',
      'quantity', v_nc.quantity_affected,
      'cost', v_nc.estimated_cost
    );
  END IF;
  
  -- RETURN TO SUPPLIER
  IF p_disposition = 'return_supplier' THEN
    INSERT INTO public.nc_disposition_actions (
      nc_id, action_type, notes, executed_by
    ) VALUES (
      p_nc_id, 'returned_to_supplier', 
      'Material flagged for return to supplier', auth.uid()
    );
    
    v_actions := v_actions || jsonb_build_object('action', 'returned_to_supplier');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'nc_id', p_nc_id,
    'disposition', p_disposition,
    'actions_executed', v_actions
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- PHASE 3 - CAPA INTEGRATION
-- =============================================

-- Evaluate if NC should trigger CAPA
CREATE OR REPLACE FUNCTION public.evaluate_nc_capa_trigger(
  p_nc_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_nc RECORD;
  v_similar_count INTEGER;
  v_should_create_capa BOOLEAN := false;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO v_nc
  FROM public.non_conformities
  WHERE id = p_nc_id;
  
  IF v_nc.severity = 'critical' AND v_nc.impact_level = 'food_safety' THEN
    v_should_create_capa := true;
    v_reasons := array_append(v_reasons, 'Critical food safety issue');
  END IF;
  
  IF v_nc.estimated_cost > 1000 THEN
    v_should_create_capa := true;
    v_reasons := array_append(v_reasons, 'High cost impact (>$1000)');
  END IF;
  
  SELECT COUNT(*) INTO v_similar_count
  FROM public.non_conformities
  WHERE nc_type = v_nc.nc_type
    AND material_id = v_nc.material_id
    AND discovered_date >= (v_nc.discovered_date - INTERVAL '30 days')
    AND discovered_date <= v_nc.discovered_date
    AND id != p_nc_id;
  
  IF v_similar_count >= 2 THEN
    v_should_create_capa := true;
    v_reasons := array_append(
      v_reasons, 
      'Recurring issue (' || (v_similar_count + 1)::TEXT || ' occurrences in 30 days)'
    );
  END IF;
  
  IF v_nc.requires_customer_notification THEN
    v_should_create_capa := true;
    v_reasons := array_append(v_reasons, 'Customer notification required');
  END IF;
  
  IF v_nc.requires_capa THEN
    v_should_create_capa := true;
    v_reasons := array_append(v_reasons, 'Manually flagged for CAPA');
  END IF;
  
  RETURN jsonb_build_object(
    'should_create_capa', v_should_create_capa,
    'reasons', v_reasons,
    'similar_nc_count', v_similar_count + 1,
    'auto_triggered', v_should_create_capa AND NOT v_nc.requires_capa
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create CAPA from NC
CREATE OR REPLACE FUNCTION public.create_capa_from_nc(
  p_nc_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_nc RECORD;
  v_capa_id UUID;
  v_capa_number TEXT;
  v_capa_type TEXT;
BEGIN
  SELECT * INTO v_nc
  FROM public.non_conformities
  WHERE id = p_nc_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Non-conformity not found';
  END IF;
  
  IF v_nc.capa_id IS NOT NULL THEN
    RAISE EXCEPTION 'CAPA already linked to this NC';
  END IF;
  
  SELECT public.generate_capa_number() INTO v_capa_number;
  
  v_capa_type := CASE v_nc.nc_type
    WHEN 'receiving' THEN 'material'
    WHEN 'production' THEN 'process'
    WHEN 'packaging' THEN 'process'
    WHEN 'equipment' THEN 'equipment'
    WHEN 'sanitation' THEN 'sanitation'
    WHEN 'allergen_control' THEN 'process'
    ELSE 'other'
  END;
  
  INSERT INTO public.corrective_actions (
    capa_number,
    capa_type,
    severity,
    status,
    source_type,
    source_id,
    supplier_id,
    material_id,
    product_id,
    production_lot_id,
    receiving_lot_id,
    equipment_id,
    title,
    description,
    occurrence_date,
    discovery_date,
    created_by
  ) VALUES (
    v_capa_number,
    v_capa_type,
    v_nc.severity,
    'open',
    'non_conformance',
    v_nc.id,
    v_nc.supplier_id,
    v_nc.material_id,
    v_nc.product_id,
    v_nc.production_lot_id,
    v_nc.receiving_lot_id,
    v_nc.equipment_id,
    'NC-' || v_nc.nc_number || ': ' || v_nc.title,
    v_nc.description || E'\n\n--- FROM NON-CONFORMITY ---\n' ||
    'NC Number: ' || v_nc.nc_number || E'\n' ||
    'NC Type: ' || v_nc.nc_type || E'\n' ||
    'Impact Level: ' || v_nc.impact_level || E'\n' ||
    'Disposition: ' || v_nc.disposition,
    v_nc.discovered_date::DATE,
    v_nc.discovered_date::DATE,
    v_nc.discovered_by
  ) RETURNING id INTO v_capa_id;
  
  UPDATE public.non_conformities
  SET 
    capa_id = v_capa_id,
    requires_capa = true
  WHERE id = p_nc_id;
  
  INSERT INTO public.nc_activity_log (
    nc_id, action, comment, performed_by
  ) VALUES (
    p_nc_id, 'capa_linked',
    'CAPA ' || v_capa_number || ' created from this NC',
    auth.uid()
  );
  
  RETURN v_capa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;