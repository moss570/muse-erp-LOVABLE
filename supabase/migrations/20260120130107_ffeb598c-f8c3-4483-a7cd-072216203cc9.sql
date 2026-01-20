-- =============================================
-- NON-CONFORMITIES MODULE - PHASE 1
-- SQF Quality Event Logging System
-- =============================================

-- Main Non-Conformities Table
CREATE TABLE public.non_conformities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_number TEXT NOT NULL UNIQUE,
  
  -- Discovery Information
  discovered_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  discovered_by UUID REFERENCES public.profiles(id),
  discovery_location_id UUID REFERENCES public.locations(id),
  shift TEXT,
  
  -- Classification (SQF-aligned)
  nc_type TEXT NOT NULL CHECK (nc_type IN (
    'receiving', 'production', 'packaging', 'storage', 
    'sanitation', 'equipment', 'documentation', 'pest_control',
    'allergen_control', 'metal_detection', 'temperature', 'other'
  )),
  
  -- Severity for prioritization
  impact_level TEXT NOT NULL CHECK (impact_level IN (
    'food_safety', 'quality', 'regulatory', 'customer', 'operational'
  )),
  
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  
  -- What's affected?
  entity_type TEXT CHECK (entity_type IN (
    'receiving_lot', 'production_lot', 'finished_product', 
    'equipment', 'process', 'facility'
  )),
  entity_id UUID,
  
  -- Specific references (nullable for flexibility)
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  receiving_lot_id UUID REFERENCES public.receiving_lots(id) ON DELETE SET NULL,
  production_lot_id UUID REFERENCES public.production_lots(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  
  -- The Problem
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  specification_reference TEXT,
  quantity_affected NUMERIC,
  quantity_affected_unit TEXT,
  
  -- Immediate Disposition
  disposition TEXT NOT NULL DEFAULT 'pending' CHECK (disposition IN (
    'pending', 'use_as_is', 'rework', 'scrap', 'return_supplier', 
    'hold', 'downgrade', 'sort_segregate'
  )),
  disposition_justification TEXT,
  disposition_approved_by UUID REFERENCES public.profiles(id),
  disposition_approved_at TIMESTAMPTZ,
  
  -- Financial Impact
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  
  -- Follow-up Actions
  requires_capa BOOLEAN DEFAULT false,
  capa_id UUID REFERENCES public.corrective_actions(id) ON DELETE SET NULL,
  requires_customer_notification BOOLEAN DEFAULT false,
  customer_notified_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'under_review', 'disposition_approved', 'actions_complete', 'closed'
  )),
  
  -- SQF Documentation Flags
  root_cause_identified BOOLEAN DEFAULT false,
  corrective_action_implemented BOOLEAN DEFAULT false,
  preventive_action_implemented BOOLEAN DEFAULT false,
  
  -- Closure
  closed_by UUID REFERENCES public.profiles(id),
  closed_at TIMESTAMPTZ,
  closure_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_nc_number ON public.non_conformities(nc_number);
CREATE INDEX idx_nc_status ON public.non_conformities(status);
CREATE INDEX idx_nc_type ON public.non_conformities(nc_type);
CREATE INDEX idx_nc_severity ON public.non_conformities(severity);
CREATE INDEX idx_nc_discovered_date ON public.non_conformities(discovered_date DESC);
CREATE INDEX idx_nc_disposition ON public.non_conformities(disposition);
CREATE INDEX idx_nc_receiving_lot ON public.non_conformities(receiving_lot_id);
CREATE INDEX idx_nc_production_lot ON public.non_conformities(production_lot_id);
CREATE INDEX idx_nc_material ON public.non_conformities(material_id);
CREATE INDEX idx_nc_supplier ON public.non_conformities(supplier_id);
CREATE INDEX idx_nc_capa ON public.non_conformities(capa_id);

COMMENT ON TABLE public.non_conformities IS 'SQF Non-Conformity tracking - captures any deviation from standards in real-time';

-- RLS Policies
ALTER TABLE public.non_conformities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view NCs" 
  ON public.non_conformities FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create NCs" 
  ON public.non_conformities FOR INSERT 
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update NCs" 
  ON public.non_conformities FOR UPDATE 
  TO authenticated USING (true);

CREATE POLICY "Only admins can delete NCs" 
  ON public.non_conformities FOR DELETE 
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- NC ATTACHMENTS (Photos/Documents)
-- =============================================

CREATE TABLE public.nc_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id UUID NOT NULL REFERENCES public.non_conformities(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  attachment_type TEXT DEFAULT 'photo' CHECK (attachment_type IN ('photo', 'document', 'video', 'other')),
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nc_attachments_nc ON public.nc_attachments(nc_id);
CREATE INDEX idx_nc_attachments_type ON public.nc_attachments(attachment_type);

ALTER TABLE public.nc_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view NC attachments" 
  ON public.nc_attachments FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can upload NC attachments" 
  ON public.nc_attachments FOR INSERT 
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own attachments or admins can delete any" 
  ON public.nc_attachments FOR DELETE 
  TO authenticated 
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =============================================
-- NC ACTIVITY LOG
-- =============================================

CREATE TABLE public.nc_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id UUID NOT NULL REFERENCES public.non_conformities(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'status_changed', 'disposition_changed',
    'attachment_added', 'attachment_removed', 'closed', 'reopened',
    'capa_linked', 'comment_added', 'cost_updated'
  )),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  comment TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nc_activity_nc ON public.nc_activity_log(nc_id);
CREATE INDEX idx_nc_activity_timestamp ON public.nc_activity_log(performed_at DESC);
CREATE INDEX idx_nc_activity_action ON public.nc_activity_log(action);

ALTER TABLE public.nc_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view NC activity" 
  ON public.nc_activity_log FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can log NC activity" 
  ON public.nc_activity_log FOR INSERT 
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- NC NUMBER GENERATION
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_nc_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(nc_number FROM 9) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.non_conformities
  WHERE nc_number LIKE 'NC-' || year_prefix || '-%';
  
  RETURN 'NC-' || year_prefix || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- TRIGGER FOR ACTIVITY LOGGING
-- =============================================

CREATE OR REPLACE FUNCTION public.log_nc_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.nc_activity_log (nc_id, action, performed_by, comment)
    VALUES (NEW.id, 'created', NEW.discovered_by, 'Non-conformity created');
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.nc_activity_log (nc_id, action, field_changed, old_value, new_value, performed_by)
      VALUES (NEW.id, 'status_changed', 'status', OLD.status, NEW.status, auth.uid());
    END IF;
    
    -- Log disposition changes
    IF OLD.disposition IS DISTINCT FROM NEW.disposition THEN
      INSERT INTO public.nc_activity_log (nc_id, action, field_changed, old_value, new_value, performed_by)
      VALUES (NEW.id, 'disposition_changed', 'disposition', OLD.disposition, NEW.disposition, auth.uid());
    END IF;
    
    -- Log closure
    IF OLD.status != 'closed' AND NEW.status = 'closed' THEN
      INSERT INTO public.nc_activity_log (nc_id, action, performed_by, comment)
      VALUES (NEW.id, 'closed', NEW.closed_by, NEW.closure_notes);
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER nc_activity_trigger
  AFTER INSERT OR UPDATE ON public.non_conformities
  FOR EACH ROW
  EXECUTE FUNCTION public.log_nc_activity();

-- =============================================
-- UPDATE TIMESTAMP TRIGGER
-- =============================================

CREATE TRIGGER update_nc_timestamp
  BEFORE UPDATE ON public.non_conformities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STORAGE BUCKET FOR NC ATTACHMENTS
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('nc-attachments', 'nc-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can view NC attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'nc-attachments');

CREATE POLICY "Authenticated users can upload NC attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'nc-attachments');

CREATE POLICY "Users can delete their own NC attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'nc-attachments');