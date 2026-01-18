export type ComplaintType = 
  | 'quality' | 'foreign_material' | 'illness' | 'allergen' | 'packaging'
  | 'labeling' | 'taste' | 'texture' | 'appearance' | 'temperature'
  | 'delivery' | 'service' | 'other';

export type ComplaintStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'closed' | 'escalated';
export type ComplaintSeverity = 'minor' | 'major' | 'critical';
export type ResolutionType = 'replacement' | 'refund' | 'credit' | 'coupon' | 'apology' | 'no_action' | 'other';
export type ReceivedVia = 'phone' | 'email' | 'social_media' | 'letter' | 'in_person' | 'website' | 'retailer' | 'other';

export interface CustomerComplaint {
  id: string;
  complaint_number: string;
  customer_id?: string;
  customer_name: string;
  customer_contact?: string;
  customer_email?: string;
  customer_phone?: string;
  complaint_type: ComplaintType;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  product_id?: string;
  product_name?: string;
  product_sku?: string;
  production_lot_number?: string;
  best_by_date?: string;
  purchase_date?: string;
  purchase_location?: string;
  complaint_date: string;
  received_date: string;
  received_via?: ReceivedVia;
  description: string;
  sample_received?: boolean;
  sample_received_date?: string;
  sample_condition?: string;
  investigation_notes?: string;
  root_cause?: string;
  resolution_type?: ResolutionType;
  resolution_details?: string;
  resolution_date?: string;
  resolved_by?: string;
  customer_satisfied?: boolean;
  follow_up_required?: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  capa_id?: string;
  capa_required?: boolean;
  reportable_event?: boolean;
  regulatory_report_filed?: boolean;
  regulatory_report_date?: string;
  refund_amount?: number;
  replacement_cost?: number;
  assigned_to?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const COMPLAINT_TYPE_CONFIG: Record<ComplaintType, { 
  label: string; 
  description: string;
  defaultSeverity: ComplaintSeverity; 
  requiresCapa: boolean;
  reportable: boolean;
}> = {
  illness: { label: 'Reported Illness', description: 'Customer reports illness after consumption', defaultSeverity: 'critical', requiresCapa: true, reportable: true },
  foreign_material: { label: 'Foreign Material', description: 'Foreign object found in product', defaultSeverity: 'critical', requiresCapa: true, reportable: true },
  allergen: { label: 'Allergen Issue', description: 'Undeclared allergen or cross-contact', defaultSeverity: 'critical', requiresCapa: true, reportable: true },
  quality: { label: 'General Quality Issue', description: 'Product does not meet quality standards', defaultSeverity: 'major', requiresCapa: false, reportable: false },
  taste: { label: 'Taste/Flavor Issue', description: 'Off-flavor or taste complaint', defaultSeverity: 'major', requiresCapa: false, reportable: false },
  texture: { label: 'Texture Issue', description: 'Texture not as expected', defaultSeverity: 'major', requiresCapa: false, reportable: false },
  temperature: { label: 'Temperature Abuse', description: 'Product received at improper temperature', defaultSeverity: 'major', requiresCapa: false, reportable: false },
  appearance: { label: 'Appearance Issue', description: 'Visual defect or discoloration', defaultSeverity: 'minor', requiresCapa: false, reportable: false },
  packaging: { label: 'Packaging Problem', description: 'Damaged or defective packaging', defaultSeverity: 'minor', requiresCapa: false, reportable: false },
  labeling: { label: 'Labeling Error', description: 'Incorrect or missing label information', defaultSeverity: 'minor', requiresCapa: false, reportable: false },
  delivery: { label: 'Delivery Problem', description: 'Late, damaged, or missing delivery', defaultSeverity: 'minor', requiresCapa: false, reportable: false },
  service: { label: 'Service Issue', description: 'Customer service related complaint', defaultSeverity: 'minor', requiresCapa: false, reportable: false },
  other: { label: 'Other', description: 'Other complaint type', defaultSeverity: 'minor', requiresCapa: false, reportable: false },
};

export const COMPLAINT_STATUS_CONFIG: Record<ComplaintStatus, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800' },
  acknowledged: { label: 'Acknowledged', color: 'bg-yellow-100 text-yellow-800' },
  investigating: { label: 'Investigating', color: 'bg-purple-100 text-purple-800' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  escalated: { label: 'Escalated', color: 'bg-red-100 text-red-800' },
};
