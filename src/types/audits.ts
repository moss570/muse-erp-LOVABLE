export type AuditType = 'internal' | 'regulatory' | 'customer' | 'third_party' | 'certification' | 'supplier';
export type AuditStatus = 'scheduled' | 'in_progress' | 'completed' | 'findings_review' | 'closed';

export type FindingType = 'non_conformance' | 'observation' | 'opportunity' | 'strength';
export type FindingSeverity = 'critical' | 'major' | 'minor';
export type FindingStatus = 'open' | 'response_pending' | 'response_submitted' | 'verified' | 'closed';
export type FindingCategory = 
  | 'documentation' | 'process' | 'training' | 'equipment' | 'facility'
  | 'sanitation' | 'pest_control' | 'allergen' | 'traceability' | 'supplier'
  | 'labeling' | 'storage' | 'temperature' | 'haccp' | 'gmp' | 'other';

export interface Audit {
  id: string;
  audit_number: string;
  title: string;
  audit_type: AuditType;
  audit_scope?: string;
  description?: string;
  status: AuditStatus;
  audit_date: string;
  audit_end_date?: string;
  auditor_type?: 'internal' | 'external';
  auditor_name?: string;
  auditor_organization?: string;
  lead_auditor_id?: string;
  lead_auditor?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  total_findings: number;
  critical_findings: number;
  major_findings: number;
  minor_findings: number;
  observations: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditFinding {
  id: string;
  audit_id: string;
  finding_number: string;
  finding_type: FindingType;
  severity?: FindingSeverity;
  category: FindingCategory;
  title: string;
  description: string;
  evidence?: string;
  requirement?: string;
  location?: string;
  status: FindingStatus;
  assigned_to?: string;
  response?: string;
  response_date?: string;
  response_due_date?: string;
  verification_notes?: string;
  verified_date?: string;
  verified_by?: string;
  capa_id?: string;
  capa_required?: boolean;
  capa?: {
    id: string;
    capa_number: string;
    status: string;
  };
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const AUDIT_TYPE_CONFIG: Record<AuditType, { label: string; description: string }> = {
  internal: { label: 'Internal Audit', description: 'Self-assessment audit' },
  regulatory: { label: 'Regulatory Audit', description: 'FDA, USDA, or other regulatory body' },
  customer: { label: 'Customer Audit', description: 'Customer-initiated audit' },
  third_party: { label: 'Third-Party Audit', description: 'External third-party certification audit' },
  certification: { label: 'Certification Audit', description: 'SQF, BRC, or similar certification' },
  supplier: { label: 'Supplier Audit', description: 'Audit of supplier operations' },
};

export const FINDING_TYPE_CONFIG: Record<FindingType, { label: string; color: string; bgColor: string; requiresSeverity: boolean }> = {
  non_conformance: { label: 'Non-Conformance', color: 'text-red-700', bgColor: 'bg-red-100', requiresSeverity: true },
  observation: { label: 'Observation', color: 'text-amber-700', bgColor: 'bg-amber-100', requiresSeverity: false },
  opportunity: { label: 'Opportunity for Improvement', color: 'text-blue-700', bgColor: 'bg-blue-100', requiresSeverity: false },
  strength: { label: 'Strength', color: 'text-green-700', bgColor: 'bg-green-100', requiresSeverity: false },
};

export const FINDING_CATEGORY_CONFIG: Record<FindingCategory, { label: string }> = {
  documentation: { label: 'Documentation' },
  process: { label: 'Process/Procedure' },
  training: { label: 'Training' },
  equipment: { label: 'Equipment' },
  facility: { label: 'Facility' },
  sanitation: { label: 'Sanitation' },
  pest_control: { label: 'Pest Control' },
  allergen: { label: 'Allergen Management' },
  traceability: { label: 'Traceability' },
  supplier: { label: 'Supplier Management' },
  labeling: { label: 'Labeling' },
  storage: { label: 'Storage' },
  temperature: { label: 'Temperature Control' },
  haccp: { label: 'HACCP' },
  gmp: { label: 'GMP' },
  other: { label: 'Other' },
};

export const FINDING_STATUS_CONFIG: Record<FindingStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Open', color: 'text-red-700', bgColor: 'bg-red-100' },
  response_pending: { label: 'Response Pending', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  response_submitted: { label: 'Response Submitted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  verified: { label: 'Verified', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  closed: { label: 'Closed', color: 'text-green-700', bgColor: 'bg-green-100' },
};
