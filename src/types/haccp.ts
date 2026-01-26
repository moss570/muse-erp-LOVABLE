/**
 * HACCP (Hazard Analysis and Critical Control Points) Types
 *
 * Types for HACCP plan management, hazard analysis, CCPs, and verification
 */

import type { UserProfile } from './policies';

// ============================================================================
// ENUMS & STATUS TYPES
// ============================================================================

export type HazardType = 'Biological' | 'Chemical' | 'Physical' | 'Allergen' | 'Radiological';
export type HazardSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type HazardLikelihood = 'Rare' | 'Unlikely' | 'Possible' | 'Likely' | 'Almost_Certain';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Extreme';

export type CCPType = 'CCP' | 'CP' | 'PCP';
export type ProductDisposition = 'Released' | 'Rework' | 'Reject' | 'Hold';
export type DeviationStatus = 'Open' | 'Under_Investigation' | 'Resolved' | 'Closed';
export type RootCauseCategory = 'Equipment_Failure' | 'Human_Error' | 'Raw_Material' | 'Process' | 'Method';

export type ValidationType = 'Initial' | 'Annual' | 'Revalidation' | 'Change-Triggered';
export type ValidationStatus = 'Passed' | 'Failed' | 'Passed_With_Observations';

// ============================================================================
// HACCP PLAN TYPES
// ============================================================================

export interface HACCPPlan {
  id: string;
  policy_id: string;

  // Plan identification
  haccp_plan_number: string;
  product_scope: string[] | null;
  process_scope: string[] | null;

  // Plan metadata
  haccp_team_leader: string | null;
  team_members: string[] | null;

  // Regulatory info
  regulatory_basis: string[] | null;
  allergens_present: string[] | null;

  // Verification schedule
  verification_frequency_days: number;
  last_verification_date: string | null;
  next_verification_due: string | null;

  // Process flow
  has_process_flow: boolean;
  process_flow_diagram_url: string | null;

  created_at: string;
  updated_at: string;

  // Populated relations
  policy?: {
    id: string;
    policy_number: string;
    title: string;
    status: string;
  };
  team_leader?: UserProfile;
  process_steps?: HACCPProcessStep[];
  hazards?: HACCPHazard[];
  ccps?: HACCPCCP[];

  // Computed fields
  total_ccps?: number;
  total_hazards?: number;
  total_steps?: number;
}

export interface HACCPPlanFormData {
  policy_id: string;
  haccp_plan_number: string;
  product_scope: string[] | null;
  process_scope: string[] | null;
  haccp_team_leader: string | null;
  team_members: string[] | null;
  regulatory_basis: string[] | null;
  allergens_present: string[] | null;
  verification_frequency_days: number;
  has_process_flow: boolean;
}

// ============================================================================
// PROCESS STEP TYPES
// ============================================================================

export interface HACCPProcessStep {
  id: string;
  haccp_plan_id: string;

  step_number: number;
  step_name: string;
  step_description: string | null;
  step_type: string | null;

  // Visual positioning
  position_x: number | null;
  position_y: number | null;

  // Connections
  previous_step_ids: string[] | null;
  next_step_ids: string[] | null;

  // Associated data
  equipment_used: string[] | null;
  typical_duration_minutes: number | null;
  temperature_range: string | null;

  created_at: string;

  // Populated relations
  hazards?: HACCPHazard[];
  ccps?: HACCPCCP[];
}

export interface HACCPProcessStepFormData {
  haccp_plan_id: string;
  step_number: number;
  step_name: string;
  step_description: string | null;
  step_type: string | null;
  equipment_used: string[] | null;
  typical_duration_minutes: number | null;
  temperature_range: string | null;
}

// ============================================================================
// HAZARD TYPES
// ============================================================================

export interface HACCPHazard {
  id: string;
  haccp_plan_id: string;
  process_step_id: string;

  // Hazard identification
  hazard_type: HazardType;
  hazard_description: string;
  hazard_source: string | null;

  // Risk assessment
  severity: HazardSeverity | null;
  likelihood: HazardLikelihood | null;
  risk_level: RiskLevel | null;

  // Significance
  is_significant: boolean;
  justification: string | null;

  // Control measures
  control_measures: string[] | null;

  created_at: string;
  updated_at: string;

  // Populated relations
  process_step?: HACCPProcessStep;
  ccps?: HACCPCCP[];
}

export interface HACCPHazardFormData {
  haccp_plan_id: string;
  process_step_id: string;
  hazard_type: HazardType;
  hazard_description: string;
  hazard_source: string | null;
  severity: HazardSeverity | null;
  likelihood: HazardLikelihood | null;
  is_significant: boolean;
  justification: string | null;
  control_measures: string[] | null;
}

// ============================================================================
// CCP TYPES
// ============================================================================

export interface HACCPCCP {
  id: string;
  haccp_plan_id: string;
  process_step_id: string | null;
  hazard_id: string | null;

  // CCP identification
  ccp_number: string;
  ccp_type: CCPType;
  ccp_name: string;
  description: string | null;

  // Critical limits
  critical_limit_parameter: string | null;
  critical_limit_value: string | null;
  critical_limit_min: number | null;
  critical_limit_max: number | null;
  unit_of_measure: string | null;

  // Monitoring
  monitoring_procedure: string;
  monitoring_frequency: string | null;
  monitoring_method: string | null;

  // Responsible party
  responsible_position: string | null;
  responsible_employee_id: string | null;

  // Corrective actions
  corrective_action_procedure: string;
  corrective_action_examples: string[] | null;

  // Verification
  verification_procedure: string | null;
  verification_frequency: string | null;
  verification_responsible: string | null;

  // Record keeping
  record_form_id: string | null;
  record_retention_months: number;

  // Manufacturing integration
  requires_manufacturing_verification: boolean;
  linked_production_step: string | null;

  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Populated relations
  process_step?: HACCPProcessStep;
  hazard?: HACCPHazard;
  responsible_employee?: UserProfile;
  verification_records?: HACCPCCPVerificationRecord[];

  // Computed fields
  total_verifications_today?: number;
  last_verification?: string;
}

export interface HACCPCCPFormData {
  haccp_plan_id: string;
  process_step_id: string | null;
  hazard_id: string | null;
  ccp_number: string;
  ccp_type: CCPType;
  ccp_name: string;
  description: string | null;
  critical_limit_parameter: string | null;
  critical_limit_value: string | null;
  critical_limit_min: number | null;
  critical_limit_max: number | null;
  unit_of_measure: string | null;
  monitoring_procedure: string;
  monitoring_frequency: string | null;
  monitoring_method: string | null;
  responsible_position: string | null;
  corrective_action_procedure: string;
  requires_manufacturing_verification: boolean;
}

// ============================================================================
// CCP VERIFICATION RECORD TYPES
// ============================================================================

export interface HACCPCCPVerificationRecord {
  id: string;
  ccp_id: string;
  haccp_plan_id: string;

  // Link to production
  production_lot_id: string | null;
  production_run_id: string | null;
  work_order_id: string | null;

  // Verification details
  verified_at: string;
  verified_by: string;

  // Measurement
  parameter_measured: string | null;
  measured_value: number | null;
  unit_of_measure: string | null;

  // Status
  is_within_limits: boolean | null;
  deviation_detected: boolean;

  // Corrective action
  corrective_action_taken: string | null;
  corrective_action_by: string | null;
  corrective_action_at: string | null;

  // Documentation
  notes: string | null;
  photo_urls: string[] | null;

  created_at: string;

  // Populated relations
  ccp?: HACCPCCP;
  verifier?: UserProfile;
  corrective_action_user?: UserProfile;
}

export interface HACCPCCPVerificationFormData {
  ccp_id: string;
  production_lot_id: string | null;
  parameter_measured: string | null;
  measured_value: number | null;
  unit_of_measure: string | null;
  notes: string | null;
}

// ============================================================================
// CCP DEVIATION TYPES
// ============================================================================

export interface HACCPCCPDeviation {
  id: string;
  ccp_id: string | null;
  verification_record_id: string | null;
  haccp_plan_id: string;

  // Deviation details
  deviation_date: string;
  detected_by: string | null;

  // What happened
  deviation_description: string;
  affected_product_quantity: number | null;
  affected_product_unit: string | null;
  affected_lot_numbers: string[] | null;

  // Root cause
  root_cause: string | null;
  root_cause_category: RootCauseCategory | null;

  // Corrective action
  immediate_action: string;
  corrective_action: string;
  preventive_action: string | null;

  action_taken_by: string | null;
  action_completed_at: string | null;

  // Product disposition
  product_disposition: ProductDisposition | null;
  disposition_justification: string | null;
  disposition_approved_by: string | null;

  // Follow-up
  requires_haccp_plan_revision: boolean;
  requires_training: boolean;

  status: DeviationStatus;
  closed_at: string | null;
  closed_by: string | null;

  created_at: string;

  // Populated relations
  ccp?: HACCPCCP;
  verification_record?: HACCPCCPVerificationRecord;
  detector?: UserProfile;
  action_user?: UserProfile;
  disposition_approver?: UserProfile;
  closer?: UserProfile;
}

export interface HACCPCCPDeviationFormData {
  ccp_id: string | null;
  verification_record_id: string | null;
  haccp_plan_id: string;
  deviation_description: string;
  affected_product_quantity: number | null;
  affected_product_unit: string | null;
  affected_lot_numbers: string[] | null;
  immediate_action: string;
  corrective_action: string;
  product_disposition: ProductDisposition | null;
}

// ============================================================================
// PLAN VALIDATION TYPES
// ============================================================================

export interface HACCPPlanValidation {
  id: string;
  haccp_plan_id: string;

  validation_date: string;
  validation_type: ValidationType | null;

  // Validation team
  lead_validator: string | null;
  validation_team: string[] | null;

  // Validation scope
  scope_description: string | null;
  changes_since_last_validation: string | null;

  // Findings
  findings: string | null;
  ccps_validated: boolean;
  critical_limits_validated: boolean;
  monitoring_procedures_validated: boolean;
  corrective_actions_validated: boolean;
  verification_procedures_validated: boolean;

  // Overall result
  validation_status: ValidationStatus | null;
  observations: string[] | null;

  // Required actions
  action_items: string[] | null;
  action_items_completed: boolean;

  // Documentation
  validation_report_url: string | null;

  next_validation_due: string | null;

  created_at: string;

  // Populated relations
  validator?: UserProfile;
  haccp_plan?: HACCPPlan;
}

export interface HACCPPlanValidationFormData {
  haccp_plan_id: string;
  validation_date: string;
  validation_type: ValidationType | null;
  lead_validator: string | null;
  scope_description: string | null;
  findings: string | null;
  ccps_validated: boolean;
  critical_limits_validated: boolean;
  monitoring_procedures_validated: boolean;
  corrective_actions_validated: boolean;
  verification_procedures_validated: boolean;
  validation_status: ValidationStatus | null;
  observations: string[] | null;
  action_items: string[] | null;
}

// ============================================================================
// AI PARSING TYPES
// ============================================================================

export interface HACCPParseRequest {
  haccp_plan_id: string;
  file_url: string;
}

export interface HACCPParseResponse {
  success: boolean;
  haccp_plan_id: string;
  steps_extracted: number;
  hazards_extracted: number;
  ccps_extracted: number;
  error?: string;
}

export interface HACCPExtractedData {
  plan_info: {
    product_scope: string[];
    process_scope: string[];
    allergens_present: string[];
    regulatory_basis: string[];
  };
  process_steps: Array<{
    step_number: number;
    step_name: string;
    step_description: string;
    step_type: string;
    equipment_used: string[];
  }>;
  hazards: Array<{
    step_number: number;
    hazard_type: HazardType;
    hazard_description: string;
    severity: HazardSeverity;
    likelihood: HazardLikelihood;
    is_significant: boolean;
    control_measures: string[];
  }>;
  ccps: Array<{
    ccp_number: string;
    ccp_name: string;
    step_number: number;
    hazard_description: string;
    critical_limit: string;
    critical_limit_min: number | null;
    critical_limit_max: number | null;
    unit: string;
    monitoring_procedure: string;
    monitoring_frequency: string;
    corrective_actions: string;
  }>;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface HACCPPlanFilters {
  policy_id?: string;
  team_leader?: string;
  verification_overdue?: boolean;
}

export interface HACCPCCPFilters {
  haccp_plan_id?: string;
  ccp_type?: CCPType;
  is_active?: boolean;
  requires_verification?: boolean;
}

export interface HACCPDeviationFilters {
  haccp_plan_id?: string;
  ccp_id?: string;
  status?: DeviationStatus;
  disposition?: ProductDisposition;
  date_from?: string;
  date_to?: string;
}
