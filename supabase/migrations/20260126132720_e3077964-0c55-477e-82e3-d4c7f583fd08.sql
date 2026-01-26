-- ================================================================
-- POLICY & SOP MANAGEMENT SYSTEM - PHASE 2: SQF COMPLIANCE TABLES
-- ================================================================

-- SQF Editions (versions of the SQF Code)
CREATE TABLE public.sqf_editions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    edition_date DATE,
    effective_date DATE,
    is_active BOOLEAN DEFAULT false,
    file_path TEXT,
    file_url TEXT,
    parsing_status TEXT DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'processing', 'completed', 'failed')),
    parsing_error TEXT,
    codes_extracted INTEGER DEFAULT 0,
    sections_found INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- SQF Codes (individual requirements from SQF Code)
CREATE TABLE public.sqf_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    edition_id UUID NOT NULL REFERENCES public.sqf_editions(id) ON DELETE CASCADE,
    code_number TEXT NOT NULL,
    title TEXT NOT NULL,
    requirement_text TEXT,
    category TEXT,
    module TEXT,
    section TEXT,
    subsection TEXT,
    is_fundamental BOOLEAN DEFAULT false,
    is_mandatory BOOLEAN DEFAULT true,
    verification_method TEXT,
    evidence_required TEXT,
    guidance_notes TEXT,
    common_nonconformances TEXT,
    implementation_tips TEXT,
    supersedes_code TEXT,
    related_codes TEXT[],
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(edition_id, code_number)
);

-- Policy SQF Mappings (link policies to SQF codes)
CREATE TABLE public.policy_sqf_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    sqf_code_id UUID NOT NULL REFERENCES public.sqf_codes(id) ON DELETE CASCADE,
    compliance_status TEXT DEFAULT 'partial' CHECK (compliance_status IN ('compliant', 'partial', 'gap', 'not_applicable')),
    gap_severity TEXT CHECK (gap_severity IN ('critical', 'major', 'minor')),
    gap_description TEXT,
    remediation_plan TEXT,
    remediation_due_date DATE,
    remediation_completed_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    UNIQUE(policy_id, sqf_code_id)
);

-- SQF Compliance Audits
CREATE TABLE public.sqf_compliance_audits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    audit_number TEXT NOT NULL UNIQUE,
    edition_id UUID REFERENCES public.sqf_editions(id),
    audit_type TEXT NOT NULL CHECK (audit_type IN ('internal', 'external', 'certification', 'surveillance', 'mock')),
    audit_date DATE NOT NULL,
    audit_end_date DATE,
    auditor_name TEXT,
    auditor_organization TEXT,
    lead_auditor_id UUID REFERENCES public.profiles(id),
    scope TEXT,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    overall_score NUMERIC(5,2),
    critical_findings INTEGER DEFAULT 0,
    major_findings INTEGER DEFAULT 0,
    minor_findings INTEGER DEFAULT 0,
    observations INTEGER DEFAULT 0,
    summary TEXT,
    report_file_path TEXT,
    report_file_url TEXT,
    next_audit_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- SQF Audit Findings
CREATE TABLE public.sqf_audit_findings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    audit_id UUID NOT NULL REFERENCES public.sqf_compliance_audits(id) ON DELETE CASCADE,
    sqf_code_id UUID REFERENCES public.sqf_codes(id),
    finding_number TEXT NOT NULL,
    finding_type TEXT NOT NULL CHECK (finding_type IN ('critical', 'major', 'minor', 'observation', 'opportunity')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence TEXT,
    location TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'corrective_action', 'verification', 'closed')),
    assigned_to UUID REFERENCES public.profiles(id),
    capa_id UUID REFERENCES public.corrective_actions(id),
    response TEXT,
    response_date DATE,
    response_due_date DATE,
    verification_notes TEXT,
    verified_by UUID REFERENCES public.profiles(id),
    verified_date DATE,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Indexes
CREATE INDEX idx_sqf_codes_edition ON public.sqf_codes(edition_id);
CREATE INDEX idx_sqf_codes_category ON public.sqf_codes(category);
CREATE INDEX idx_sqf_codes_fundamental ON public.sqf_codes(is_fundamental);
CREATE INDEX idx_policy_sqf_mappings_policy ON public.policy_sqf_mappings(policy_id);
CREATE INDEX idx_policy_sqf_mappings_code ON public.policy_sqf_mappings(sqf_code_id);
CREATE INDEX idx_policy_sqf_mappings_status ON public.policy_sqf_mappings(compliance_status);
CREATE INDEX idx_sqf_audit_findings_audit ON public.sqf_audit_findings(audit_id);

-- Enable RLS
ALTER TABLE public.sqf_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sqf_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_sqf_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sqf_compliance_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sqf_audit_findings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated can view sqf_editions" ON public.sqf_editions FOR SELECT USING (true);
CREATE POLICY "Managers can manage sqf_editions" ON public.sqf_editions FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view sqf_codes" ON public.sqf_codes FOR SELECT USING (true);
CREATE POLICY "Managers can manage sqf_codes" ON public.sqf_codes FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view policy_sqf_mappings" ON public.policy_sqf_mappings FOR SELECT USING (true);
CREATE POLICY "Managers can manage policy_sqf_mappings" ON public.policy_sqf_mappings FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view sqf_compliance_audits" ON public.sqf_compliance_audits FOR SELECT USING (true);
CREATE POLICY "Managers can manage sqf_compliance_audits" ON public.sqf_compliance_audits FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view sqf_audit_findings" ON public.sqf_audit_findings FOR SELECT USING (true);
CREATE POLICY "Managers can manage sqf_audit_findings" ON public.sqf_audit_findings FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Triggers
CREATE TRIGGER update_sqf_editions_updated_at BEFORE UPDATE ON public.sqf_editions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sqf_codes_updated_at BEFORE UPDATE ON public.sqf_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_policy_sqf_mappings_updated_at BEFORE UPDATE ON public.policy_sqf_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sqf_compliance_audits_updated_at BEFORE UPDATE ON public.sqf_compliance_audits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sqf_audit_findings_updated_at BEFORE UPDATE ON public.sqf_audit_findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- View for compliance summary
CREATE OR REPLACE VIEW public.sqf_compliance_summary AS
SELECT 
    sc.id AS sqf_code_id,
    sc.code_number,
    sc.title,
    sc.category,
    sc.is_fundamental,
    se.id AS edition_id,
    se.name AS edition_name,
    COUNT(psm.id) AS mapping_count,
    COUNT(CASE WHEN psm.compliance_status = 'compliant' THEN 1 END) AS compliant_count,
    COUNT(CASE WHEN psm.compliance_status = 'partial' THEN 1 END) AS partial_count,
    COUNT(CASE WHEN psm.compliance_status = 'gap' THEN 1 END) AS gap_count,
    CASE 
        WHEN COUNT(psm.id) = 0 THEN 'not_addressed'
        WHEN COUNT(CASE WHEN psm.compliance_status = 'gap' THEN 1 END) > 0 THEN 'gap'
        WHEN COUNT(CASE WHEN psm.compliance_status = 'partial' THEN 1 END) > 0 THEN 'partial'
        ELSE 'compliant'
    END AS overall_status
FROM public.sqf_codes sc
JOIN public.sqf_editions se ON sc.edition_id = se.id
LEFT JOIN public.policy_sqf_mappings psm ON sc.id = psm.sqf_code_id
GROUP BY sc.id, sc.code_number, sc.title, sc.category, sc.is_fundamental, se.id, se.name;