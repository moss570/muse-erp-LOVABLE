-- =============================================
-- NON-CONFORMITIES PHASE 4 - ANALYTICS
-- =============================================

-- Materialized view for NC analytics (refreshed periodically)
CREATE MATERIALIZED VIEW public.nc_analytics_summary AS
SELECT
  -- Time dimensions
  DATE_TRUNC('month', discovered_date) as month,
  DATE_TRUNC('week', discovered_date) as week,
  DATE_TRUNC('year', discovered_date) as year,
  
  -- Categorical dimensions
  nc_type,
  severity,
  impact_level,
  disposition,
  status,
  
  -- Metrics
  COUNT(*) as nc_count,
  COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
  COUNT(CASE WHEN requires_capa THEN 1 END) as capa_required_count,
  COUNT(CASE WHEN capa_id IS NOT NULL THEN 1 END) as capa_created_count,
  
  -- Financial metrics
  SUM(COALESCE(estimated_cost, 0)) as total_estimated_cost,
  SUM(COALESCE(actual_cost, 0)) as total_actual_cost,
  AVG(COALESCE(estimated_cost, 0)) as avg_estimated_cost,
  
  -- Timing metrics
  AVG(
    CASE 
      WHEN closed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (closed_at - discovered_date)) / 86400 
    END
  ) as avg_days_to_close,
  
  -- Entity references
  material_id,
  supplier_id,
  product_id,
  equipment_id,
  discovery_location_id
  
FROM public.non_conformities
GROUP BY 
  DATE_TRUNC('month', discovered_date),
  DATE_TRUNC('week', discovered_date),
  DATE_TRUNC('year', discovered_date),
  nc_type,
  severity,
  impact_level,
  disposition,
  status,
  material_id,
  supplier_id,
  product_id,
  equipment_id,
  discovery_location_id;

-- Index for performance
CREATE INDEX idx_nc_analytics_month ON public.nc_analytics_summary(month);
CREATE INDEX idx_nc_analytics_nc_type ON public.nc_analytics_summary(nc_type);
CREATE INDEX idx_nc_analytics_severity ON public.nc_analytics_summary(severity);

-- Refresh function
CREATE OR REPLACE FUNCTION public.refresh_nc_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.nc_analytics_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- COST OF QUALITY TRACKING
-- =============================================

CREATE TABLE public.nc_cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  description TEXT,
  cost_type TEXT NOT NULL CHECK (cost_type IN (
    'prevention', 'appraisal', 'internal_failure', 'external_failure'
  )),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default cost categories
INSERT INTO public.nc_cost_categories (category_name, description, cost_type, sort_order) VALUES
  -- Internal Failure Costs
  ('Material Scrap', 'Cost of scrapped raw materials', 'internal_failure', 1),
  ('Product Scrap', 'Cost of scrapped finished goods', 'internal_failure', 2),
  ('Rework Labor', 'Labor cost for rework operations', 'internal_failure', 3),
  ('Downtime', 'Production downtime due to quality issues', 'internal_failure', 4),
  ('Re-inspection', 'Additional inspection costs', 'internal_failure', 5),
  
  -- External Failure Costs
  ('Customer Returns', 'Cost of returned products', 'external_failure', 6),
  ('Warranty Claims', 'Warranty and replacement costs', 'external_failure', 7),
  ('Customer Credits', 'Credits issued to customers', 'external_failure', 8),
  
  -- Appraisal Costs
  ('Testing', 'Quality testing and analysis costs', 'appraisal', 9),
  ('Inspection Labor', 'QA inspection labor', 'appraisal', 10),
  
  -- Prevention Costs
  ('Training', 'Quality training programs', 'prevention', 11),
  ('Process Improvement', 'CAPA implementation costs', 'prevention', 12);

-- Link costs to NCs
CREATE TABLE public.nc_cost_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id UUID NOT NULL REFERENCES public.non_conformities(id) ON DELETE CASCADE,
  cost_category_id UUID REFERENCES public.nc_cost_categories(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nc_cost_breakdown_nc ON public.nc_cost_breakdown(nc_id);
CREATE INDEX idx_nc_cost_breakdown_category ON public.nc_cost_breakdown(cost_category_id);

ALTER TABLE public.nc_cost_breakdown ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view NC costs" 
  ON public.nc_cost_breakdown FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage NC costs" 
  ON public.nc_cost_breakdown FOR ALL 
  TO authenticated 
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- FUNCTION: Get NC Metrics for Date Range
-- =============================================

CREATE OR REPLACE FUNCTION public.get_nc_metrics(
  p_start_date DATE,
  p_end_date DATE,
  p_nc_type TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL,
  p_location_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH nc_data AS (
    SELECT *
    FROM public.non_conformities
    WHERE discovered_date::DATE BETWEEN p_start_date AND p_end_date
      AND (p_nc_type IS NULL OR nc_type = p_nc_type)
      AND (p_severity IS NULL OR severity = p_severity)
      AND (p_location_id IS NULL OR discovery_location_id = p_location_id)
  ),
  metrics AS (
    SELECT
      COUNT(*) as total_ncs,
      COUNT(CASE WHEN status = 'open' THEN 1 END) as open_ncs,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_ncs,
      COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_ncs,
      COUNT(CASE WHEN impact_level = 'food_safety' THEN 1 END) as food_safety_ncs,
      COUNT(CASE WHEN requires_capa THEN 1 END) as capa_required_ncs,
      COUNT(CASE WHEN capa_id IS NOT NULL THEN 1 END) as capa_created_ncs,
      SUM(COALESCE(estimated_cost, 0)) as total_estimated_cost,
      SUM(COALESCE(actual_cost, 0)) as total_actual_cost,
      AVG(CASE 
        WHEN closed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (closed_at - discovered_date)) / 86400 
      END) as avg_days_to_close
    FROM nc_data
  ),
  by_type AS (
    SELECT
      nc_type,
      COUNT(*) as count,
      SUM(COALESCE(estimated_cost, 0)) as cost
    FROM nc_data
    GROUP BY nc_type
    ORDER BY count DESC
  ),
  by_disposition AS (
    SELECT
      disposition,
      COUNT(*) as count
    FROM nc_data
    GROUP BY disposition
  ),
  by_month AS (
    SELECT
      TO_CHAR(discovered_date, 'YYYY-MM') as month,
      COUNT(*) as count
    FROM nc_data
    GROUP BY TO_CHAR(discovered_date, 'YYYY-MM')
    ORDER BY month
  )
  SELECT jsonb_build_object(
    'metrics', (SELECT row_to_json(metrics.*) FROM metrics),
    'by_type', (SELECT COALESCE(jsonb_agg(row_to_json(by_type.*)), '[]'::jsonb) FROM by_type),
    'by_disposition', (SELECT COALESCE(jsonb_agg(row_to_json(by_disposition.*)), '[]'::jsonb) FROM by_disposition),
    'by_month', (SELECT COALESCE(jsonb_agg(row_to_json(by_month.*)), '[]'::jsonb) FROM by_month)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- FUNCTION: Get Top Issues (Pareto Analysis)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_nc_pareto_analysis(
  p_start_date DATE,
  p_end_date DATE,
  p_group_by TEXT DEFAULT 'nc_type'
)
RETURNS TABLE (
  category TEXT,
  nc_count BIGINT,
  total_cost NUMERIC,
  percentage NUMERIC,
  cumulative_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH grouped_data AS (
    SELECT
      CASE 
        WHEN p_group_by = 'nc_type' THEN nc.nc_type
        WHEN p_group_by = 'material_id' THEN COALESCE(m.name, 'Unknown Material')
        WHEN p_group_by = 'supplier_id' THEN COALESCE(s.name, 'Unknown Supplier')
        WHEN p_group_by = 'equipment_id' THEN COALESCE(e.machine_name, 'Unknown Equipment')
        ELSE 'Unknown'
      END as cat,
      COUNT(*) as cnt,
      SUM(COALESCE(nc.estimated_cost, 0)) as cost
    FROM public.non_conformities nc
    LEFT JOIN public.materials m ON nc.material_id = m.id
    LEFT JOIN public.suppliers s ON nc.supplier_id = s.id
    LEFT JOIN public.machines e ON nc.equipment_id = e.id
    WHERE nc.discovered_date::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY cat
  ),
  totals AS (
    SELECT SUM(cnt) as total_count FROM grouped_data
  ),
  with_percentages AS (
    SELECT
      gd.cat,
      gd.cnt,
      gd.cost,
      ROUND((gd.cnt::NUMERIC / NULLIF(t.total_count, 0) * 100), 2) as pct
    FROM grouped_data gd
    CROSS JOIN totals t
    ORDER BY gd.cnt DESC
  )
  SELECT
    wp.cat,
    wp.cnt,
    wp.cost,
    wp.pct,
    SUM(wp.pct) OVER (ORDER BY wp.cnt DESC ROWS UNBOUNDED PRECEDING)
  FROM with_percentages wp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- FUNCTION: Generate SQF Audit Report
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_sqf_nc_report(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH report_data AS (
    SELECT
      nc.nc_number,
      nc.discovered_date,
      nc.nc_type,
      nc.severity,
      nc.impact_level,
      nc.title,
      nc.description,
      nc.specification_reference,
      nc.disposition,
      nc.status,
      nc.root_cause_identified,
      nc.corrective_action_implemented,
      nc.preventive_action_implemented,
      nc.closed_at,
      nc.estimated_cost,
      nc.actual_cost,
      COALESCE(m.name, 'N/A') as material_name,
      COALESCE(s.name, 'N/A') as supplier_name,
      COALESCE(p.name, 'N/A') as product_name,
      COALESCE(l.name, 'N/A') as location_name,
      COALESCE(prof.full_name, 'N/A') as discovered_by_name,
      c.capa_number,
      (
        SELECT COUNT(*) 
        FROM public.nc_attachments a 
        WHERE a.nc_id = nc.id AND a.attachment_type = 'photo'
      ) as photo_count
    FROM public.non_conformities nc
    LEFT JOIN public.materials m ON nc.material_id = m.id
    LEFT JOIN public.suppliers s ON nc.supplier_id = s.id
    LEFT JOIN public.products p ON nc.product_id = p.id
    LEFT JOIN public.locations l ON nc.discovery_location_id = l.id
    LEFT JOIN public.profiles prof ON nc.discovered_by = prof.id
    LEFT JOIN public.corrective_actions c ON nc.capa_id = c.id
    WHERE nc.discovered_date::DATE BETWEEN p_start_date AND p_end_date
    ORDER BY nc.discovered_date DESC
  )
  SELECT jsonb_build_object(
    'report_period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'summary', jsonb_build_object(
      'total_ncs', (SELECT COUNT(*) FROM report_data),
      'critical_ncs', (SELECT COUNT(*) FROM report_data WHERE severity = 'critical'),
      'food_safety_ncs', (SELECT COUNT(*) FROM report_data WHERE impact_level = 'food_safety'),
      'open_ncs', (SELECT COUNT(*) FROM report_data WHERE status != 'closed'),
      'total_cost', (SELECT COALESCE(SUM(estimated_cost), 0) FROM report_data),
      'with_capa', (SELECT COUNT(*) FROM report_data WHERE capa_number IS NOT NULL),
      'with_photos', (SELECT COUNT(*) FROM report_data WHERE photo_count > 0)
    ),
    'non_conformities', (SELECT COALESCE(jsonb_agg(row_to_json(report_data.*)), '[]'::jsonb) FROM report_data)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;