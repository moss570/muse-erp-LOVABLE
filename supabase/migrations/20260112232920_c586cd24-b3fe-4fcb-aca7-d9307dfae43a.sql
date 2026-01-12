-- Phase 5: Quality + Compliance

-- Quality complaints table
CREATE TABLE public.quality_complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_number TEXT NOT NULL UNIQUE,
  complaint_date DATE NOT NULL DEFAULT CURRENT_DATE,
  complaint_type TEXT NOT NULL, -- customer, internal, supplier
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  status TEXT NOT NULL DEFAULT 'open', -- open, investigating, resolved, closed
  
  -- Source info
  customer_id UUID REFERENCES public.customers(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  material_id UUID REFERENCES public.materials(id),
  product_id UUID REFERENCES public.products(id),
  production_lot_id UUID REFERENCES public.production_lots(id),
  receiving_lot_id UUID REFERENCES public.receiving_lots(id),
  
  -- Complaint details
  title TEXT NOT NULL,
  description TEXT,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  
  -- Financials
  credit_issued NUMERIC(12,2),
  replacement_cost NUMERIC(12,2),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quality complaint attachments
CREATE TABLE public.complaint_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES public.quality_complaints(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  file_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quality metrics snapshots for trend analysis
CREATE TABLE public.quality_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- rejection_rate, complaint_count, supplier_score
  entity_type TEXT, -- supplier, material, product
  entity_id UUID,
  metric_value NUMERIC(12,4),
  metric_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User training progress
CREATE TABLE public.user_training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  module_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  last_step_viewed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_key)
);

-- Enable RLS
ALTER TABLE public.quality_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for quality_complaints
CREATE POLICY "Authenticated users can view complaints" ON public.quality_complaints
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create complaints" ON public.quality_complaints
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update complaints" ON public.quality_complaints
  FOR UPDATE TO authenticated USING (true);

-- RLS policies for complaint_attachments
CREATE POLICY "Authenticated users can view attachments" ON public.complaint_attachments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create attachments" ON public.complaint_attachments
  FOR INSERT TO authenticated WITH CHECK (true);

-- RLS policies for quality_metrics
CREATE POLICY "Authenticated users can view metrics" ON public.quality_metrics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create metrics" ON public.quality_metrics
  FOR INSERT TO authenticated WITH CHECK (true);

-- RLS policies for user_training_progress
CREATE POLICY "Users can view own training progress" ON public.user_training_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own training progress" ON public.user_training_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Function to generate complaint number
CREATE OR REPLACE FUNCTION public.generate_complaint_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(complaint_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.quality_complaints
  WHERE complaint_number LIKE year_prefix || '-%';
  
  RETURN year_prefix || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Indexes
CREATE INDEX idx_quality_complaints_status ON public.quality_complaints(status);
CREATE INDEX idx_quality_complaints_type ON public.quality_complaints(complaint_type);
CREATE INDEX idx_quality_complaints_date ON public.quality_complaints(complaint_date);
CREATE INDEX idx_quality_complaints_supplier ON public.quality_complaints(supplier_id);
CREATE INDEX idx_quality_complaints_material ON public.quality_complaints(material_id);
CREATE INDEX idx_quality_metrics_date ON public.quality_metrics(metric_date);
CREATE INDEX idx_quality_metrics_entity ON public.quality_metrics(entity_type, entity_id);

-- Dropdown options for complaint types
INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order) VALUES
('complaint_type', 'customer', 'Customer Complaint', 1),
('complaint_type', 'internal', 'Internal Quality Issue', 2),
('complaint_type', 'supplier', 'Supplier Non-Conformance', 3);

INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order) VALUES
('complaint_severity', 'low', 'Low', 1),
('complaint_severity', 'medium', 'Medium', 2),
('complaint_severity', 'high', 'High', 3),
('complaint_severity', 'critical', 'Critical', 4);

INSERT INTO public.dropdown_options (dropdown_type, value, label, sort_order) VALUES
('complaint_status', 'open', 'Open', 1),
('complaint_status', 'investigating', 'Investigating', 2),
('complaint_status', 'resolved', 'Resolved', 3),
('complaint_status', 'closed', 'Closed', 4);