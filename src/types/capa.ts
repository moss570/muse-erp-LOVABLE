export type CapaType = 
  | 'supplier' 
  | 'equipment' 
  | 'material' 
  | 'product' 
  | 'facility' 
  | 'process' 
  | 'employee' 
  | 'sanitation' 
  | 'sop_non_compliance' 
  | 'labeling' 
  | 'other';

export type CapaSeverity = 'minor' | 'major' | 'critical';

export type CapaStatus = 
  | 'open' 
  | 'containment' 
  | 'investigating' 
  | 'action_required' 
  | 'verification' 
  | 'effectiveness_review' 
  | 'closed' 
  | 'cancelled';

export type RootCauseMethod = '5_why' | 'fishbone' | 'pareto' | 'fmea' | 'other';

export type VerificationResult = 'effective' | 'partially_effective' | 'ineffective';

export type EffectivenessResult = 'effective' | 'requires_followup' | 'ineffective';

export type CapaSourceType = 'receiving' | 'production' | 'audit' | 'complaint' | 'inspection' | 'manual';

export type AttachmentFileType = 'photo' | 'document' | 'report' | 'other';

export type AttachmentCategory = 'evidence' | 'root_cause' | 'corrective_action' | 'verification' | 'other';

export type ActivityAction = 
  | 'created' 
  | 'updated' 
  | 'status_changed' 
  | 'assigned' 
  | 'commented' 
  | 'attachment_added' 
  | 'attachment_removed' 
  | 'due_date_changed' 
  | 'escalated';

export interface CorrectiveAction {
  id: string;
  capa_number: string;
  
  // Classification
  capa_type: CapaType;
  severity: CapaSeverity;
  status: CapaStatus;
  
  // Source
  source_type: CapaSourceType | null;
  source_id: string | null;
  
  // Entity references
  supplier_id: string | null;
  material_id: string | null;
  product_id: string | null;
  production_lot_id: string | null;
  receiving_lot_id: string | null;
  equipment_id: string | null;
  employee_id: string | null;
  location_id: string | null;
  
  // Problem
  title: string;
  description: string;
  occurrence_date: string;
  discovery_date: string;
  
  // Due dates
  containment_due_date: string | null;
  root_cause_due_date: string | null;
  corrective_action_due_date: string | null;
  preventive_action_due_date: string | null;
  verification_due_date: string | null;
  effectiveness_review_due_date: string | null;
  
  // Immediate Action (Containment)
  immediate_action: string | null;
  immediate_action_date: string | null;
  immediate_action_by: string | null;
  
  // Root Cause Analysis
  root_cause: string | null;
  root_cause_method: RootCauseMethod | null;
  root_cause_completed_at: string | null;
  root_cause_completed_by: string | null;
  
  // Corrective Action
  corrective_action: string | null;
  corrective_action_completed_at: string | null;
  corrective_action_completed_by: string | null;
  
  // Preventive Action
  preventive_action: string | null;
  preventive_action_completed_at: string | null;
  preventive_action_completed_by: string | null;
  
  // Verification
  verification_method: string | null;
  verification_result: VerificationResult | null;
  verification_date: string | null;
  verified_by: string | null;
  
  // Effectiveness Review
  effectiveness_review_result: EffectivenessResult | null;
  effectiveness_review_completed_at: string | null;
  effectiveness_review_notes: string | null;
  effectiveness_reviewed_by: string | null;
  
  // Financial Impact
  estimated_cost: number | null;
  actual_cost: number | null;
  cost_recovery_amount: number | null;
  cost_recovery_source: string | null;
  
  // Closure
  closed_at: string | null;
  closed_by: string | null;
  closure_notes: string | null;
  
  // Assignment & Ownership
  assigned_to: string | null;
  department_id: string | null;
  
  // Recurrence tracking
  is_recurring: boolean;
  related_capa_id: string | null;
  
  // Metadata
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CapaAttachment {
  id: string;
  capa_id: string;
  file_name: string;
  file_path: string | null;
  file_url: string | null;
  file_size: number | null;
  file_type: AttachmentFileType | null;
  description: string | null;
  attachment_category: AttachmentCategory | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface CapaActivityLog {
  id: string;
  capa_id: string;
  action: ActivityAction;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
  performed_by: string | null;
  performed_at: string;
}

export interface CapaSeveritySettings {
  id: string;
  severity: CapaSeverity;
  containment_hours: number;
  root_cause_hours: number;
  corrective_action_days: number;
  preventive_action_days: number;
  verification_days: number;
  effectiveness_review_days: number;
  color_code: string | null;
  created_at: string;
  updated_at: string;
}

// For the work queue / list view with joined data
export interface CapaListItem extends CorrectiveAction {
  supplier?: { id: string; name: string; code: string } | null;
  material?: { id: string; name: string; code: string } | null;
  product?: { id: string; name: string; sku: string } | null;
  equipment?: { id: string; name: string; machine_number: string } | null;
  employee?: { id: string; first_name: string; last_name: string; employee_number: string } | null;
  location?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  assigned_to_profile?: { id: string; first_name: string | null; last_name: string | null } | null;
  created_by_profile?: { id: string; first_name: string | null; last_name: string | null } | null;
  // Computed fields
  days_open?: number;
  is_overdue?: boolean;
  next_due_date?: string | null;
  next_due_action?: string | null;
}

// For creating a new CAPA
export interface CreateCapaInput {
  capa_type: CapaType;
  severity: CapaSeverity;
  title: string;
  description: string;
  occurrence_date: string;
  discovery_date?: string;
  source_type?: CapaSourceType;
  source_id?: string;
  supplier_id?: string;
  material_id?: string;
  product_id?: string;
  production_lot_id?: string;
  receiving_lot_id?: string;
  equipment_id?: string;
  employee_id?: string;
  location_id?: string;
  assigned_to?: string;
  department_id?: string;
  immediate_action?: string;
}

// For updating a CAPA
export interface UpdateCapaInput extends Partial<Omit<CorrectiveAction, 'id' | 'capa_number' | 'created_at' | 'updated_at' | 'created_by'>> {}

// CAPA type metadata for UI
export const CAPA_TYPE_CONFIG: Record<CapaType, { label: string; icon: string; color: string }> = {
  supplier: { label: 'Supplier Issue', icon: 'Truck', color: 'blue' },
  equipment: { label: 'Equipment Issue', icon: 'Wrench', color: 'gray' },
  material: { label: 'Material Issue', icon: 'Package', color: 'amber' },
  product: { label: 'Product Issue', icon: 'IceCream', color: 'pink' },
  facility: { label: 'Facility Issue', icon: 'Building', color: 'slate' },
  process: { label: 'Process Deviation', icon: 'GitBranch', color: 'purple' },
  employee: { label: 'Employee Issue', icon: 'User', color: 'green' },
  sanitation: { label: 'Sanitation Issue', icon: 'Sparkles', color: 'cyan' },
  sop_non_compliance: { label: 'SOP Non-Compliance', icon: 'FileX', color: 'red' },
  labeling: { label: 'Labeling Issue', icon: 'Tag', color: 'orange' },
  other: { label: 'Other', icon: 'MoreHorizontal', color: 'gray' },
};

export const CAPA_SEVERITY_CONFIG: Record<CapaSeverity, { label: string; color: string; bgColor: string; borderColor: string }> = {
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-300' },
  major: { label: 'Major', color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-300' },
  minor: { label: 'Minor', color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' },
};

export const CAPA_STATUS_CONFIG: Record<CapaStatus, { label: string; color: string; bgColor: string; borderColor: string; step: number }> = {
  open: { label: 'Open', color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', step: 1 },
  containment: { label: 'Containment', color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-300', step: 2 },
  investigating: { label: 'Investigating', color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', step: 3 },
  action_required: { label: 'Action Required', color: 'text-orange-700', bgColor: 'bg-orange-100', borderColor: 'border-orange-300', step: 4 },
  verification: { label: 'Verification', color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-300', step: 5 },
  effectiveness_review: { label: 'Effectiveness Review', color: 'text-purple-700', bgColor: 'bg-purple-100', borderColor: 'border-purple-300', step: 6 },
  closed: { label: 'Closed', color: 'text-green-700', bgColor: 'bg-green-100', borderColor: 'border-green-300', step: 7 },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', step: 0 },
};

export const ROOT_CAUSE_METHOD_CONFIG: Record<RootCauseMethod, { label: string; description: string }> = {
  '5_why': { label: '5 Whys', description: 'Ask "why" repeatedly to identify root cause' },
  fishbone: { label: 'Fishbone (Ishikawa)', description: 'Diagram showing cause-and-effect relationships' },
  pareto: { label: 'Pareto Analysis', description: 'Identify the vital few causes from the trivial many' },
  fmea: { label: 'FMEA', description: 'Failure Mode and Effects Analysis' },
  other: { label: 'Other', description: 'Alternative root cause analysis method' },
};

export const CAPA_SOURCE_CONFIG: Record<CapaSourceType, { label: string; icon: string }> = {
  receiving: { label: 'Receiving Rejection', icon: 'Package' },
  production: { label: 'Production Issue', icon: 'Factory' },
  audit: { label: 'Audit Finding', icon: 'ClipboardCheck' },
  complaint: { label: 'Customer Complaint', icon: 'MessageSquareWarning' },
  inspection: { label: 'Inspection', icon: 'Search' },
  manual: { label: 'Manual Entry', icon: 'PenTool' },
};

// Utility type for analytics
export interface CapaMetrics {
  total: number;
  open: number;
  overdue: number;
  closedThisMonth: number;
  avgDaysToClose: number;
  byType: Record<CapaType, number>;
  bySeverity: Record<CapaSeverity, number>;
  byStatus: Record<CapaStatus, number>;
}

// For filtering CAPAs
export interface CapaFilters {
  status?: CapaStatus[];
  severity?: CapaSeverity[];
  capa_type?: CapaType[];
  assigned_to?: string;
  supplier_id?: string;
  material_id?: string;
  product_id?: string;
  department_id?: string;
  is_overdue?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}
