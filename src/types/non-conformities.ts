export type NCType = 
  | 'receiving' 
  | 'production' 
  | 'packaging' 
  | 'storage'
  | 'sanitation' 
  | 'equipment' 
  | 'documentation' 
  | 'pest_control'
  | 'allergen_control' 
  | 'metal_detection' 
  | 'temperature' 
  | 'other';

export type ImpactLevel = 
  | 'food_safety' 
  | 'quality' 
  | 'regulatory' 
  | 'customer' 
  | 'operational';

export type NCSeverity = 'minor' | 'major' | 'critical';

export type NCDisposition = 
  | 'pending' 
  | 'use_as_is' 
  | 'rework' 
  | 'scrap' 
  | 'return_supplier'
  | 'hold' 
  | 'downgrade' 
  | 'sort_segregate';

export type NCStatus = 
  | 'open' 
  | 'under_review' 
  | 'disposition_approved' 
  | 'actions_complete' 
  | 'closed';

export type NCEntityType = 
  | 'receiving_lot' 
  | 'production_lot' 
  | 'finished_product'
  | 'equipment' 
  | 'process' 
  | 'facility';

export type NCActivityAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'disposition_changed'
  | 'attachment_added'
  | 'attachment_removed'
  | 'closed'
  | 'reopened'
  | 'capa_linked'
  | 'comment_added'
  | 'cost_updated';

export interface NonConformity {
  id: string;
  nc_number: string;
  
  // Discovery
  discovered_date: string;
  discovered_by: string | null;
  discovery_location_id: string | null;
  shift: string | null;
  
  // Classification
  nc_type: NCType;
  impact_level: ImpactLevel;
  severity: NCSeverity;
  
  // Entity linkage
  entity_type: NCEntityType | null;
  entity_id: string | null;
  material_id: string | null;
  product_id: string | null;
  supplier_id: string | null;
  receiving_lot_id: string | null;
  production_lot_id: string | null;
  equipment_id: string | null;
  
  // Problem description
  title: string;
  description: string;
  specification_reference: string | null;
  quantity_affected: number | null;
  quantity_affected_unit: string | null;
  
  // Disposition
  disposition: NCDisposition;
  disposition_justification: string | null;
  disposition_approved_by: string | null;
  disposition_approved_at: string | null;
  
  // Financial
  estimated_cost: number | null;
  actual_cost: number | null;
  
  // Follow-up
  requires_capa: boolean;
  capa_id: string | null;
  requires_customer_notification: boolean;
  customer_notified_at: string | null;
  
  // Status
  status: NCStatus;
  
  // SQF flags
  root_cause_identified: boolean;
  corrective_action_implemented: boolean;
  preventive_action_implemented: boolean;
  
  // Closure
  closed_by: string | null;
  closed_at: string | null;
  closure_notes: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Relations (populated via joins)
  discovered_by_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  location?: {
    id: string;
    name: string;
  };
  material?: {
    id: string;
    name: string;
    code: string;
  };
  product?: {
    id: string;
    name: string;
    sku: string | null;
  };
  supplier?: {
    id: string;
    name: string;
    code: string | null;
  };
  receiving_lot?: {
    id: string;
    internal_lot_number: string;
  };
  production_lot?: {
    id: string;
    lot_number: string;
  };
  equipment?: {
    id: string;
    name: string;
    machine_number: string;
  };
  capa?: {
    id: string;
    capa_number: string;
    status: string;
  };
  attachments?: NCAttachment[];
  activity_log?: NCActivityLog[];
}

export interface NCAttachment {
  id: string;
  nc_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  attachment_type: 'photo' | 'document' | 'video' | 'other';
  uploaded_by: string | null;
  uploaded_at: string;
  
  uploaded_by_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface NCActivityLog {
  id: string;
  nc_id: string;
  action: NCActivityAction;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
  performed_by: string | null;
  performed_at: string;
  
  performed_by_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

// Configuration objects for UI
export const NC_TYPE_CONFIG: Record<NCType, { 
  label: string; 
  color: string;
  description: string;
}> = {
  receiving: { 
    label: 'Receiving', 
    color: 'blue',
    description: 'Issue found during receiving inspection'
  },
  production: { 
    label: 'Production', 
    color: 'purple',
    description: 'Issue during manufacturing process'
  },
  packaging: { 
    label: 'Packaging', 
    color: 'green',
    description: 'Packaging defect or error'
  },
  storage: { 
    label: 'Storage', 
    color: 'amber',
    description: 'Storage condition or handling issue'
  },
  sanitation: { 
    label: 'Sanitation', 
    color: 'cyan',
    description: 'Cleaning or sanitation deviation'
  },
  equipment: { 
    label: 'Equipment', 
    color: 'slate',
    description: 'Equipment malfunction or calibration issue'
  },
  documentation: { 
    label: 'Documentation', 
    color: 'indigo',
    description: 'Missing or incorrect documentation'
  },
  pest_control: { 
    label: 'Pest Control', 
    color: 'red',
    description: 'Pest activity or control measure failure'
  },
  allergen_control: { 
    label: 'Allergen Control', 
    color: 'orange',
    description: 'Allergen cross-contact or control failure'
  },
  metal_detection: { 
    label: 'Metal Detection', 
    color: 'gray',
    description: 'Metal detector alert or failure'
  },
  temperature: { 
    label: 'Temperature', 
    color: 'rose',
    description: 'Temperature out of specification'
  },
  other: { 
    label: 'Other', 
    color: 'gray',
    description: 'Other non-conformance'
  },
};

export const IMPACT_LEVEL_CONFIG: Record<ImpactLevel, { 
  label: string; 
  color: string; 
  bgColor: string;
  priority: number;
}> = {
  food_safety: { 
    label: 'Food Safety', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100',
    priority: 1
  },
  quality: { 
    label: 'Quality', 
    color: 'text-amber-700', 
    bgColor: 'bg-amber-100',
    priority: 2
  },
  regulatory: { 
    label: 'Regulatory', 
    color: 'text-orange-700', 
    bgColor: 'bg-orange-100',
    priority: 3
  },
  customer: { 
    label: 'Customer', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    priority: 4
  },
  operational: { 
    label: 'Operational', 
    color: 'text-slate-700', 
    bgColor: 'bg-slate-100',
    priority: 5
  },
};

export const SEVERITY_CONFIG: Record<NCSeverity, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  critical: {
    label: 'Critical',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  major: {
    label: 'Major',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  minor: {
    label: 'Minor',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
};

export const DISPOSITION_CONFIG: Record<NCDisposition, {
  label: string;
  description: string;
  requiresJustification: boolean;
  requiresApproval: boolean;
}> = {
  pending: {
    label: 'Pending Decision',
    description: 'Awaiting disposition decision',
    requiresJustification: false,
    requiresApproval: false,
  },
  use_as_is: {
    label: 'Use As-Is',
    description: 'Acceptable despite non-conformance',
    requiresJustification: true,
    requiresApproval: true,
  },
  rework: {
    label: 'Rework',
    description: 'Can be corrected/fixed',
    requiresJustification: true,
    requiresApproval: false,
  },
  scrap: {
    label: 'Scrap/Destroy',
    description: 'Discard or destroy material',
    requiresJustification: true,
    requiresApproval: true,
  },
  return_supplier: {
    label: 'Return to Supplier',
    description: 'Send back to supplier',
    requiresJustification: true,
    requiresApproval: true,
  },
  hold: {
    label: 'Hold',
    description: 'Keep on hold pending further review',
    requiresJustification: false,
    requiresApproval: false,
  },
  downgrade: {
    label: 'Downgrade',
    description: 'Use for different/lower purpose',
    requiresJustification: true,
    requiresApproval: true,
  },
  sort_segregate: {
    label: 'Sort/Segregate',
    description: 'Separate conforming from non-conforming',
    requiresJustification: true,
    requiresApproval: false,
  },
};

export const STATUS_CONFIG: Record<NCStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  open: {
    label: 'Open',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  under_review: {
    label: 'Under Review',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  disposition_approved: {
    label: 'Disposition Approved',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  actions_complete: {
    label: 'Actions Complete',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  closed: {
    label: 'Closed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
};
