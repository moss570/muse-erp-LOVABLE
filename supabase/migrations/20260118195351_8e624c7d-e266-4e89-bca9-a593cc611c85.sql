-- Create audits table
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  audit_type TEXT NOT NULL CHECK (audit_type IN ('internal', 'regulatory', 'customer', 'third_party', 'certification', 'supplier')),
  audit_scope TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'findings_review', 'closed')),
  audit_date DATE NOT NULL,
  audit_end_date DATE,
  auditor_type TEXT CHECK (auditor_type IN ('internal', 'external')),
  auditor_name TEXT,
  auditor_organization TEXT,
  lead_auditor_id UUID REFERENCES public.profiles(id),
  total_findings INTEGER DEFAULT 0,
  critical_findings INTEGER DEFAULT 0,
  major_findings INTEGER DEFAULT 0,
  minor_findings INTEGER DEFAULT 0,
  observations INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_findings table
CREATE TABLE public.audit_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  finding_number TEXT NOT NULL,
  finding_type TEXT NOT NULL CHECK (finding_type IN ('non_conformance', 'observation', 'opportunity', 'strength')),
  severity TEXT CHECK (severity IN ('critical', 'major', 'minor')),
  category TEXT NOT NULL CHECK (category IN (
    'documentation', 'process', 'training', 'equipment', 'facility',
    'sanitation', 'pest_control', 'allergen', 'traceability', 'supplier',
    'labeling', 'storage', 'temperature', 'haccp', 'gmp', 'other'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT,
  requirement TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'response_pending', 'response_submitted', 'verified', 'closed')),
  assigned_to UUID REFERENCES public.profiles(id),
  response TEXT,
  response_date DATE,
  response_due_date DATE,
  verification_notes TEXT,
  verified_date DATE,
  verified_by UUID REFERENCES public.profiles(id),
  capa_id UUID REFERENCES public.corrective_actions(id),
  capa_required BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;

-- Create policies for audits
CREATE POLICY "Audits are viewable by authenticated users"
  ON public.audits FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Audits can be created by authenticated users"
  ON public.audits FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Audits can be updated by authenticated users"
  ON public.audits FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create policies for audit_findings
CREATE POLICY "Findings are viewable by authenticated users"
  ON public.audit_findings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Findings can be created by authenticated users"
  ON public.audit_findings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Findings can be updated by authenticated users"
  ON public.audit_findings FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_audits_status ON public.audits(status);
CREATE INDEX idx_audits_audit_date ON public.audits(audit_date);
CREATE INDEX idx_audits_audit_type ON public.audits(audit_type);
CREATE INDEX idx_audit_findings_audit_id ON public.audit_findings(audit_id);
CREATE INDEX idx_audit_findings_status ON public.audit_findings(status);
CREATE INDEX idx_audit_findings_capa_id ON public.audit_findings(capa_id);

-- Create triggers for updated_at
CREATE TRIGGER update_audits_updated_at
  BEFORE UPDATE ON public.audits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audit_findings_updated_at
  BEFORE UPDATE ON public.audit_findings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();