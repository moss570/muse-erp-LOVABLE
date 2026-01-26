// =============================================
// POLICY & SOP MANAGEMENT SYSTEM - TypeScript Types
// =============================================

import { Json } from "@/integrations/supabase/types";

// =============================================
// CORE TYPES
// =============================================

export interface PolicyCategory {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PolicyType {
  id: string;
  name: string;
  abbreviation?: string;
  description?: string;
  requires_acknowledgement: boolean;
  default_review_frequency_months: number;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyTag {
  id: string;
  name: string;
  color?: string;
  created_at: string;
}

export interface Policy {
  id: string;
  policy_number: string;
  title: string;

  // Classification
  category_id?: string;
  category?: PolicyCategory;
  policy_type_id?: string;
  policy_type?: PolicyType;
  department?: string;

  // Version Control
  version_number: number;
  version_status: 'draft' | 'current' | 'archived' | 'superseded';

  // Status
  status: 'Draft' | 'Under_Review' | 'Pending_Approval' | 'Approved' | 'Archived';

  // Dates
  created_at: string;
  updated_at: string;
  approved_at?: string;
  effective_date?: string;
  review_date?: string;
  review_frequency_months: number;
  last_reviewed_at?: string;
  expires_at?: string;

  // Content
  content_type: 'native' | 'word' | 'excel' | 'pdf';
  content_json?: Json;  // Tiptap content
  content_html?: string;
  content_summary?: string;

  // Original files
  original_file_url?: string;
  original_file_name?: string;
  original_file_path?: string;

  // Ownership
  created_by?: string;
  created_by_profile?: { id: string; first_name: string; last_name: string };
  owned_by?: string;
  owned_by_profile?: { id: string; first_name: string; last_name: string };
  approved_by?: string;
  approved_by_profile?: { id: string; first_name: string; last_name: string };

  // Settings
  require_acknowledgement: boolean;
  acknowledgement_frequency_months?: number;
  is_active: boolean;
  is_published: boolean;

  // Search & Discovery
  keywords?: string[];
  related_policy_ids?: string[];

  // Metadata
  notes?: string;

  // Aggregated data
  acknowledgement_count?: number;
  open_comments_count?: number;
  sqf_codes_mapped_count?: number;
}

export interface PolicyVersion {
  id: string;
  policy_id: string;
  version_number: number;

  // Snapshot
  snapshot: Json;
  content_snapshot?: Json;

  // Change tracking
  changes_summary?: string;
  change_type?: 'major' | 'minor' | 'typo_fix';
  changed_by?: string;
  changed_by_profile?: { id: string; first_name: string; last_name: string };
  changed_at: string;

  // Approval
  approved_by?: string;
  approved_at?: string;

  // Archival
  is_archived: boolean;
  archived_at?: string;
  replaced_by_version?: number;
}

export interface PolicyReview {
  id: string;
  policy_id: string;
  policy?: Policy;

  review_date: string;
  reviewed_by?: string;
  reviewed_by_profile?: { id: string; first_name: string; last_name: string };
  review_type: 'Scheduled' | 'Ad_Hoc' | 'Audit_Triggered' | 'Regulatory_Update' | 'Incident_Triggered';

  // Findings
  outcome?: 'No_Change' | 'Minor_Update' | 'Major_Revision' | 'Obsolete';
  findings?: string;
  actions_required?: string;

  // Follow-up
  completed_at?: string;
  next_review_date?: string;

  created_at: string;
}

export interface PolicyAcknowledgement {
  id: string;
  policy_id: string;
  policy?: Policy;
  policy_version_number: number;
  employee_id: string;
  employee?: { id: string; first_name: string; last_name: string; email: string };

  acknowledged_at: string;
  acknowledgement_method: 'Electronic_Signature' | 'Training_Session' | 'Quiz_Passed' | 'Digital_Accept';

  // Quiz
  quiz_taken: boolean;
  quiz_score?: number;
  quiz_attempts: number;

  // Expiration
  expires_at?: string;
  is_current: boolean;

  // Signature
  signature_data?: string;
  ip_address?: string;
  user_agent?: string;

  notes?: string;
  created_at: string;
}

export interface PolicyAttachment {
  id: string;
  policy_id: string;

  file_name: string;
  file_type?: string;
  file_url: string;
  file_path?: string;
  file_size_bytes?: number;

  attachment_type?: 'form' | 'checklist' | 'image' | 'video' | 'reference_doc';
  description?: string;

  display_order: number;
  is_visible: boolean;

  uploaded_by?: string;
  uploaded_at: string;
  created_at: string;
}

export interface PolicyComment {
  id: string;
  policy_id: string;

  comment_text: string;
  comment_type: 'general' | 'review_feedback' | 'question' | 'suggestion' | 'approval';

  parent_comment_id?: string;
  section_reference?: string;

  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;

  created_by?: string;
  created_by_profile?: { id: string; first_name: string; last_name: string; avatar_url?: string };
  created_at: string;
  updated_at: string;

  // Nested replies
  replies?: PolicyComment[];
}

// =============================================
// SQF COMPLIANCE TYPES
// =============================================

export interface SQFEdition {
  id: string;
  edition_name: string;
  release_year: number;
  release_date?: string;

  status: 'Draft' | 'Under_Review' | 'Active' | 'Archived';
  is_active: boolean;

  uploaded_by?: string;
  uploaded_at: string;

  original_file_url?: string;
  original_file_name?: string;
  original_file_path?: string;

  parsing_status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Manual';
  parsing_started_at?: string;
  parsing_completed_at?: string;
  parsing_error?: string;
  total_codes_extracted: number;
  ai_model_used?: string;

  allow_manual_entry: boolean;

  notes?: string;
  created_at: string;
  updated_at: string;

  // Aggregated
  policies_mapped_count?: number;
  compliance_percentage?: number;
}

export interface SQFCode {
  id: string;
  edition_id: string;
  edition?: SQFEdition;

  code_number: string;
  parent_code_id?: string;

  title: string;
  requirement_text: string;
  guidance_text?: string;
  intent?: string;

  category?: string;
  module?: string;
  section_number?: number;

  is_fundamental: boolean;
  applies_to?: string[];

  extraction_confidence?: number;
  extracted_via?: 'AI' | 'Manual';
  verified_by?: string;
  verified_at?: string;

  created_at: string;
  updated_at: string;

  // Aggregated
  policies_mapped_count?: number;
  compliance_status?: 'Compliant' | 'Partial' | 'Gap_Identified' | 'Not_Assessed';
}

export interface PolicySQFMapping {
  id: string;
  policy_id: string;
  policy?: Policy;
  sqf_code_id: string;
  sqf_code?: SQFCode;
  edition_id?: string;

  confidence_score?: number;
  mapping_type: 'Full_Coverage' | 'Partial' | 'Referenced' | 'AI_Suggested';

  policy_section_ids?: string[];
  highlighted_text?: string;

  evidence_notes?: string;
  evidence_links?: Json;
  gap_identified: boolean;
  gap_description?: string;

  is_current: boolean;
  review_status: 'Pending' | 'Reviewed' | 'Needs_Update';

  mapped_by?: string;
  mapped_at: string;
  verified_by?: string;
  verified_at?: string;

  created_at: string;
  updated_at: string;
}

export interface SQFComplianceCard {
  id: string;
  sqf_code_id: string;
  sqf_code?: SQFCode;

  compliance_status: 'Compliant' | 'Partial' | 'Gap_Identified' | 'Not_Assessed';
  last_assessed_date?: string;
  assessed_by?: string;

  evidence_summary?: string;
  evidence_documents?: Json;

  gaps_identified?: string[];
  remediation_plan?: string;
  target_completion_date?: string;

  audit_notes?: string;
  last_audit_date?: string;
  last_audit_finding?: 'Conformance' | 'Minor_NC' | 'Major_NC' | 'Critical';

  updated_at: string;
  created_at: string;
}

// =============================================
// HACCP TYPES
// =============================================

export interface HACCPPlan {
  id: string;
  policy_id: string;
  policy?: Policy;

  haccp_plan_number: string;
  product_scope?: string[];
  process_scope?: string[];

  haccp_team_leader?: string;
  team_leader_profile?: { id: string; first_name: string; last_name: string };
  team_members?: string[];

  regulatory_basis?: string[];
  allergens_present?: string[];

  verification_frequency_days: number;
  last_verification_date?: string;
  next_verification_due?: string;

  has_process_flow: boolean;
  process_flow_diagram_url?: string;

  created_at: string;
  updated_at: string;

  // Aggregated
  total_ccps?: number;
  total_hazards?: number;
  open_deviations?: number;
}

export interface HACCPProcessStep {
  id: string;
  haccp_plan_id: string;

  step_number: number;
  step_name: string;
  step_description?: string;
  step_type?: string;

  position_x?: number;
  position_y?: number;

  previous_step_ids?: string[];
  next_step_ids?: string[];

  equipment_used?: string[];
  typical_duration_minutes?: number;
  temperature_range?: string;

  created_at: string;
  updated_at: string;
}

export interface HACCPHazard {
  id: string;
  haccp_plan_id: string;
  process_step_id?: string;
  process_step?: HACCPProcessStep;

  hazard_type: 'Biological' | 'Chemical' | 'Physical' | 'Allergen' | 'Radiological';
  hazard_description: string;
  hazard_source?: string;

  severity?: 'Low' | 'Medium' | 'High' | 'Critical';
  likelihood?: 'Rare' | 'Unlikely' | 'Possible' | 'Likely' | 'Almost_Certain';
  risk_level?: string;

  is_significant: boolean;
  justification?: string;

  control_measures?: string[];

  created_at: string;
  updated_at: string;
}

export interface HACCPCCP {
  id: string;
  haccp_plan_id: string;
  process_step_id?: string;
  process_step?: HACCPProcessStep;
  hazard_id?: string;
  hazard?: HACCPHazard;

  ccp_number: string;
  ccp_type: 'CCP' | 'CP' | 'PCP';
  ccp_name: string;
  description?: string;

  critical_limit_parameter?: string;
  critical_limit_value?: string;
  critical_limit_min?: number;
  critical_limit_max?: number;
  unit_of_measure?: string;

  monitoring_procedure: string;
  monitoring_frequency?: string;
  monitoring_method?: string;

  responsible_position?: string;
  responsible_employee_id?: string;

  corrective_action_procedure: string;
  corrective_action_examples?: string[];

  verification_procedure?: string;
  verification_frequency?: string;
  verification_responsible?: string;

  record_form_id?: string;
  record_retention_months: number;

  requires_manufacturing_verification: boolean;
  linked_production_step?: string;

  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Aggregated
  total_verifications?: number;
  deviation_count?: number;
  last_verification_date?: string;
}

export interface HACCPCCPVerification {
  id: string;
  ccp_id: string;
  ccp?: HACCPCCP;
  haccp_plan_id?: string;

  production_lot_id?: string;
  production_run_id?: string;
  work_order_id?: string;

  verified_at: string;
  verified_by?: string;
  verified_by_profile?: { id: string; first_name: string; last_name: string };

  parameter_measured?: string;
  measured_value?: number;
  unit_of_measure?: string;

  is_within_limits?: boolean;
  deviation_detected: boolean;

  corrective_action_taken?: string;
  corrective_action_by?: string;
  corrective_action_at?: string;

  notes?: string;
  photo_urls?: string[];

  location_id?: string;
  gps_coordinates?: string;

  created_at: string;
}

export interface HACCPCCPDeviation {
  id: string;
  ccp_id?: string;
  ccp?: HACCPCCP;
  verification_record_id?: string;
  haccp_plan_id?: string;

  deviation_date: string;
  detected_by?: string;
  detected_by_profile?: { id: string; first_name: string; last_name: string };

  deviation_description: string;
  affected_product_quantity?: number;
  affected_product_unit?: string;
  affected_lot_numbers?: string[];

  root_cause?: string;
  root_cause_category?: string;

  immediate_action: string;
  corrective_action: string;
  preventive_action?: string;

  action_taken_by?: string;
  action_completed_at?: string;

  product_disposition?: 'Released' | 'Rework' | 'Reject' | 'Hold';
  disposition_justification?: string;
  disposition_approved_by?: string;

  requires_haccp_plan_revision: boolean;
  requires_training: boolean;

  status: 'Open' | 'Under_Investigation' | 'Resolved' | 'Closed';
  closed_at?: string;
  closed_by?: string;

  created_at: string;
  updated_at: string;
}

// =============================================
// TRAINING TYPES
// =============================================

export interface PolicyTrainingRequirement {
  id: string;
  policy_id: string;
  policy?: Policy;

  training_required: boolean;
  training_name?: string;
  training_description?: string;

  required_for_job_positions?: string[];
  required_for_departments?: string[];
  required_for_all_employees: boolean;

  training_type?: 'Initial' | 'Refresher' | 'Annual' | 'Change-Triggered';
  training_method?: string[];
  training_duration_minutes?: number;

  initial_training_required: boolean;
  refresher_frequency_months?: number;

  requires_quiz: boolean;
  minimum_passing_score?: number;
  quiz_questions?: Json;
  max_quiz_attempts: number;

  must_be_trained_by?: string;
  can_be_self_administered: boolean;

  training_materials_urls?: string[];
  training_video_url?: string;
  training_presentation_url?: string;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeePolicyTraining {
  id: string;
  employee_id: string;
  employee?: { id: string; first_name: string; last_name: string; email: string };
  policy_id: string;
  policy?: Policy;
  training_requirement_id?: string;

  training_date: string;
  training_type?: 'Initial' | 'Refresher' | 'Annual' | 'Change-Triggered';

  training_method?: string;
  trainer_id?: string;
  trainer?: { id: string; first_name: string; last_name: string };
  training_duration_minutes?: number;

  quiz_taken: boolean;
  quiz_score?: number;
  quiz_passed?: boolean;
  quiz_attempts: number;
  quiz_responses?: Json;

  completed: boolean;
  completion_date?: string;

  certificate_issued: boolean;
  certificate_url?: string;
  acknowledgement_signature?: string;
  acknowledgement_timestamp?: string;

  expires_at?: string;
  is_current: boolean;

  notes?: string;
  training_location?: string;

  created_at: string;
  updated_at: string;
}

export interface TrainingComplianceStatus {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_position?: string;
  department_id?: string;

  policy_id: string;
  policy_number: string;
  policy_title: string;
  training_name?: string;
  refresher_frequency_months?: number;

  training_date?: string;
  expires_at?: string;
  is_current: boolean;

  compliance_status: 'Not_Trained' | 'Expired' | 'Expiring_Soon' | 'Current' | 'Unknown';
  compliance_priority: number;
}

export interface TrainingReminder {
  id: string;
  employee_id: string;
  policy_id?: string;
  training_requirement_id?: string;

  reminder_type: 'Initial_Training' | 'Refresher_Due' | 'Expiring_Soon' | 'Overdue';

  due_date?: string;
  reminder_sent_at?: string;
  reminder_count: number;

  acknowledged: boolean;
  acknowledged_at?: string;

  completed: boolean;

  created_at: string;
  updated_at: string;
}

// =============================================
// FORM & INPUT TYPES
// =============================================

export interface PolicyFormData {
  policy_number?: string;
  title: string;
  category_id?: string;
  policy_type_id?: string;
  department?: string;

  status?: 'Draft' | 'Under_Review' | 'Pending_Approval' | 'Approved' | 'Archived';

  effective_date?: string;
  review_frequency_months?: number;

  content_type?: 'native' | 'word' | 'excel' | 'pdf';
  content_json?: Json;
  content_summary?: string;

  owned_by?: string;

  require_acknowledgement?: boolean;
  acknowledgement_frequency_months?: number;

  keywords?: string[];
  related_policy_ids?: string[];

  notes?: string;
}

export interface SQFUploadFormData {
  edition_name: string;
  release_year: number;
  release_date?: string;
  notes?: string;
  auto_parse: boolean;
  allow_manual_entry: boolean;
}

export interface CCPVerificationFormData {
  ccp_id: string;
  production_lot_id?: string;
  measured_value?: number;
  unit_of_measure?: string;
  is_within_limits?: boolean;
  notes?: string;
  photo_urls?: string[];
}

// =============================================
// FILTER & SEARCH TYPES
// =============================================

export interface PolicyFilters {
  search?: string;
  category_id?: string;
  policy_type_id?: string;
  status?: string[];
  owned_by?: string;
  is_active?: boolean;
  review_due_soon?: boolean;
  tags?: string[];
}

export interface SQFCodeFilters {
  search?: string;
  edition_id?: string;
  category?: string;
  is_fundamental?: boolean;
  compliance_status?: string;
}

// =============================================
// UTILITY TYPES
// =============================================

export type PolicyStatus = 'Draft' | 'Under_Review' | 'Pending_Approval' | 'Approved' | 'Archived';
export type ComplianceStatus = 'Compliant' | 'Partial' | 'Gap_Identified' | 'Not_Assessed';
export type TrainingComplianceStatus = 'Not_Trained' | 'Expired' | 'Expiring_Soon' | 'Current' | 'Unknown';
