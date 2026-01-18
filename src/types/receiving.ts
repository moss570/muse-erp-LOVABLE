import type { CapaSeverity } from './capa';

export type RejectionCategory = 
  | 'temperature'
  | 'contamination'
  | 'quality'
  | 'specification'
  | 'documentation'
  | 'packaging'
  | 'quantity'
  | 'expiration'
  | 'other';

export interface ReceivingRejectionData {
  receiving_lot_id?: string;
  receiving_item_id?: string;
  lot_number: string;
  internal_lot_number?: string;
  rejection_category: RejectionCategory;
  rejection_reason: string;
  
  // Related entities
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  material_id: string;
  material_name: string;
  material_code: string;
  
  // Inspection details
  quantity_received?: number;
  quantity_rejected?: number;
  unit_of_measure?: string;
  temperature_reading?: number;
  temperature_required_min?: number;
  temperature_required_max?: number;
  
  // PO reference
  po_number?: string;
  po_id?: string;
}

export const REJECTION_CATEGORY_CONFIG: Record<RejectionCategory, {
  label: string;
  defaultSeverity: CapaSeverity;
  icon: string;
  description: string;
}> = {
  temperature: {
    label: 'Temperature Excursion',
    defaultSeverity: 'major',
    icon: 'Thermometer',
    description: 'Product received outside acceptable temperature range',
  },
  contamination: {
    label: 'Contamination/Foreign Material',
    defaultSeverity: 'critical',
    icon: 'AlertTriangle',
    description: 'Foreign material, pest evidence, or contamination detected',
  },
  quality: {
    label: 'Quality Defect',
    defaultSeverity: 'major',
    icon: 'XCircle',
    description: 'Product quality does not meet standards',
  },
  specification: {
    label: 'Out of Specification',
    defaultSeverity: 'major',
    icon: 'FileX',
    description: 'Product does not meet specification requirements',
  },
  documentation: {
    label: 'Documentation Issue',
    defaultSeverity: 'minor',
    icon: 'FileText',
    description: 'Missing or incorrect documentation (COA, lot records, etc.)',
  },
  packaging: {
    label: 'Packaging Damage',
    defaultSeverity: 'minor',
    icon: 'Package',
    description: 'Damaged packaging, compromised seal, or labeling issues',
  },
  quantity: {
    label: 'Quantity Discrepancy',
    defaultSeverity: 'minor',
    icon: 'Hash',
    description: 'Received quantity does not match PO or packing slip',
  },
  expiration: {
    label: 'Expiration/Dating Issue',
    defaultSeverity: 'major',
    icon: 'Calendar',
    description: 'Product expired, near expiration, or dating issues',
  },
  other: {
    label: 'Other',
    defaultSeverity: 'minor',
    icon: 'MoreHorizontal',
    description: 'Other issue not covered by standard categories',
  },
};
