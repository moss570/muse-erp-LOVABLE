/**
 * SQF (Safe Quality Food) Code Management Types
 *
 * Types for SQF code editions, requirements, mappings, and compliance tracking
 */

import type { UserProfile } from './policies';

// ============================================================================
// ENUMS & STATUS TYPES
// ============================================================================

export type SQFParsingStatus = 'Pending' | 'Parsing' | 'Completed' | 'Failed';
export type SQFEditionStatus = 'Draft' | 'Active' | 'Archived' | 'Deprecated';

export type SQFMappingType = 'Addresses' | 'Partially_Addresses' | 'References' | 'Related';
export type SQFCoverageLevel = 'Full' | 'Partial' | 'Minimal';
export type SQFEvidenceStrength = 'Strong' | 'Moderate' | 'Weak';
export type SQFGapSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type SQFComplianceStatus = 'Compliant' | 'Partial' | 'Non_Compliant' | 'Not_Applicable';

export type SQFAuditType = 'Internal' | 'Pre-Assessment' | 'Certification' | 'Surveillance' | 'Recertification';
export type SQFOverallRating = 'Excellent' | 'Good' | 'Satisfactory' | 'Non_Compliant';
export type SQFCertificationStatus = 'Certified' | 'Conditional' | 'Not_Certified';
export type SQFAuditStatus = 'Scheduled' | 'In_Progress' | 'Completed' | 'Cancelled';

export type SQFFindingType = 'Critical' | 'Major' | 'Minor' | 'Observation';
export type SQFRootCauseCategory = 'Process' | 'People' | 'Equipment' | 'Material' | 'Method';
export type SQFFindingStatus = 'Open' | 'In_Progress' | 'Pending_Verification' | 'Closed';

export type SQFOverallComplianceStatus = 'Not_Addressed' | 'Fully_Compliant' | 'Partially_Compliant' | 'Non_Compliant';

// ============================================================================
// SQF EDITION TYPES
// ============================================================================

export interface SQFEdition {
  id: string;

  // Edition identification
  edition_name: string;
  edition_number: number | null;
  release_date: string;
  effective_date: string | null;

  // Document source
  source_document_url: string | null;
  source_document_filename: string | null;
  source_file_size_bytes: number | null;

  // Parsing status
  parsing_status: SQFParsingStatus;
  parsing_started_at: string | null;
  parsing_completed_at: string | null;
  parsing_error: string | null;

  // Extraction results
  total_codes_extracted: number;
  total_sections: number;

  // Edition status
  is_active: boolean;
  status: SQFEditionStatus;

  // Metadata
  description: string | null;
  change_summary: string | null;
  applicable_to: string[] | null;

  // Audit fields
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;

  // Populated relations
  creator?: UserProfile;
  updater?: UserProfile;
  codes?: SQFCode[];

  // Computed fields
  policies_mapped_count?: number;
  compliance_percentage?: number;
}

export interface SQFEditionFormData {
  edition_name: string;
  edition_number: number | null;
  release_date: string;
  effective_date: string | null;
  description: string | null;
  change_summary: string | null;
  applicable_to: string[] | null;
}

// ============================================================================
// SQF CODE TYPES
// ============================================================================

export interface SQFCode {
  id: string;
  sqf_edition_id: string;

  // Code identification
  code_number: string;
  full_code_reference: string | null;

  // Code details
  title: string;
  description: string | null;
  requirement_text: string;

  // Code classification
  section: string | null;
  sub_section: string | null;
  category: string | null;
  module: string | null;

  // Compliance attributes
  is_fundamental: boolean;
  is_mandatory: boolean;
  applies_to: string[] | null;

  // Implementation guidance
  guidance_notes: string | null;
  examples: string | null;
  common_pitfalls: string | null;

  // Verification requirements
  verification_methods: string[] | null;
  evidence_required: string[] | null;
  documentation_needed: string[] | null;

  // Related codes
  related_code_ids: string[] | null;
  supersedes_code_id: string | null;

  // Audit fields
  created_at: string;
  updated_at: string;

  // Populated relations
  edition?: SQFEdition;
  supersedes?: SQFCode;
  related_codes?: SQFCode[];
  mappings?: PolicySQFMapping[];

  // Computed fields
  policies_mapped_count?: number;
  compliance_status?: SQFComplianceStatus;
  has_gaps?: boolean;
}

export interface SQFCodeFormData {
  sqf_edition_id: string;
  code_number: string;
  title: string;
  description: string | null;
  requirement_text: string;
  section: string | null;
  sub_section: string | null;
  category: string | null;
  module: string | null;
  is_fundamental: boolean;
  is_mandatory: boolean;
  applies_to: string[] | null;
  guidance_notes: string | null;
  examples: string | null;
  common_pitfalls: string | null;
  verification_methods: string[] | null;
  evidence_required: string[] | null;
  documentation_needed: string[] | null;
}

// ============================================================================
// POLICY-SQF MAPPING TYPES
// ============================================================================

export interface PolicySQFMapping {
  id: string;

  // Links
  policy_id: string;
  sqf_code_id: string;

  // Mapping details
  mapping_type: SQFMappingType;
  coverage_level: SQFCoverageLevel | null;

  // Evidence
  evidence_location: string | null;
  evidence_description: string | null;
  evidence_strength: SQFEvidenceStrength | null;

  // Gap analysis
  has_gaps: boolean;
  gap_description: string | null;
  gap_severity: SQFGapSeverity | null;
  gap_action_required: string | null;
  gap_remediation_plan: string | null;
  gap_target_date: string | null;
  gap_resolved: boolean;
  gap_resolved_date: string | null;
  gap_resolved_by: string | null;

  // Compliance status
  compliance_status: SQFComplianceStatus;
  last_verified_date: string | null;
  next_verification_due: string | null;
  verified_by: string | null;
  verification_notes: string | null;

  // Audit trail
  mapped_by: string | null;
  mapped_at: string;
  updated_at: string;

  // Populated relations
  policy?: {
    id: string;
    policy_number: string;
    title: string;
    status: string;
  };
  sqf_code?: SQFCode;
  mapper?: UserProfile;
  verifier?: UserProfile;
  gap_resolver?: UserProfile;
}

export interface PolicySQFMappingFormData {
  policy_id: string;
  sqf_code_id: string;
  mapping_type: SQFMappingType;
  coverage_level: SQFCoverageLevel | null;
  evidence_location: string | null;
  evidence_description: string | null;
  evidence_strength: SQFEvidenceStrength | null;
  has_gaps: boolean;
  gap_description: string | null;
  gap_severity: SQFGapSeverity | null;
  gap_action_required: string | null;
  gap_remediation_plan: string | null;
  gap_target_date: string | null;
  compliance_status: SQFComplianceStatus;
  verification_notes: string | null;
}

// ============================================================================
// SQF AUDIT TYPES
// ============================================================================

export interface SQFComplianceAudit {
  id: string;

  // Audit identification
  audit_name: string;
  audit_number: string | null;
  audit_type: SQFAuditType | null;
  sqf_edition_id: string | null;

  // Audit dates
  audit_date: string;
  audit_start_date: string | null;
  audit_end_date: string | null;

  // Auditor information
  auditor_name: string | null;
  auditor_organization: string | null;
  auditor_certification_number: string | null;

  // Audit scope
  audit_scope: string | null;
  areas_audited: string[] | null;
  sqf_codes_audited: string[] | null;

  // Overall results
  overall_rating: SQFOverallRating | null;
  overall_score: number | null;
  certification_status: SQFCertificationStatus | null;
  certification_date: string | null;
  certification_expiry_date: string | null;

  // Summary
  total_findings: number;
  critical_findings: number;
  major_findings: number;
  minor_findings: number;
  observations: number;

  // Documents
  audit_report_url: string | null;
  certificate_url: string | null;

  // Status
  status: SQFAuditStatus;

  // Audit fields
  created_at: string;
  created_by: string | null;
  updated_at: string;

  // Populated relations
  edition?: SQFEdition;
  creator?: UserProfile;
  findings?: SQFAuditFinding[];
}

export interface SQFComplianceAuditFormData {
  audit_name: string;
  audit_number: string | null;
  audit_type: SQFAuditType | null;
  sqf_edition_id: string | null;
  audit_date: string;
  audit_start_date: string | null;
  audit_end_date: string | null;
  auditor_name: string | null;
  auditor_organization: string | null;
  auditor_certification_number: string | null;
  audit_scope: string | null;
  areas_audited: string[] | null;
  overall_rating: SQFOverallRating | null;
  overall_score: number | null;
  certification_status: SQFCertificationStatus | null;
  certification_date: string | null;
}

// ============================================================================
// SQF AUDIT FINDING TYPES
// ============================================================================

export interface SQFAuditFinding {
  id: string;
  audit_id: string;

  // Finding identification
  finding_number: string | null;
  sqf_code_id: string | null;

  // Finding details
  finding_type: SQFFindingType;
  finding_title: string;
  finding_description: string;

  // Non-conformance details
  requirement_not_met: string | null;
  objective_evidence: string | null;

  // Root cause
  root_cause: string | null;
  root_cause_category: SQFRootCauseCategory | null;

  // Corrective action
  corrective_action_required: string | null;
  corrective_action_taken: string | null;
  corrective_action_responsible: string | null;
  corrective_action_due_date: string | null;
  corrective_action_completed_date: string | null;

  // Preventive action
  preventive_action: string | null;
  preventive_action_responsible: string | null;

  // Verification
  verification_required: boolean;
  verification_method: string | null;
  verified: boolean;
  verified_date: string | null;
  verified_by: string | null;
  verification_notes: string | null;

  // Related entities
  related_policy_ids: string[] | null;
  related_area: string | null;

  // Status tracking
  status: SQFFindingStatus;
  closed_date: string | null;
  closed_by: string | null;

  // Audit fields
  created_at: string;
  updated_at: string;

  // Populated relations
  audit?: SQFComplianceAudit;
  sqf_code?: SQFCode;
  ca_responsible?: UserProfile;
  pa_responsible?: UserProfile;
  verifier?: UserProfile;
  closer?: UserProfile;
}

export interface SQFAuditFindingFormData {
  audit_id: string;
  finding_number: string | null;
  sqf_code_id: string | null;
  finding_type: SQFFindingType;
  finding_title: string;
  finding_description: string;
  requirement_not_met: string | null;
  objective_evidence: string | null;
  root_cause: string | null;
  root_cause_category: SQFRootCauseCategory | null;
  corrective_action_required: string | null;
  corrective_action_responsible: string | null;
  corrective_action_due_date: string | null;
  related_area: string | null;
}

// ============================================================================
// COMPLIANCE SUMMARY TYPES
// ============================================================================

export interface SQFComplianceSummary {
  sqf_code_id: string;
  sqf_edition_id: string | null;
  code_number: string;
  code_title: string;
  category: string | null;
  is_fundamental: boolean;

  // Mapping counts
  total_policies_mapped: number;
  compliant_policies: number;
  policies_with_gaps: number;

  // Gap analysis
  has_any_gaps: boolean;
  highest_gap_severity: SQFGapSeverity | null;

  // Overall compliance
  overall_compliance_status: SQFOverallComplianceStatus;

  // Audit findings
  total_findings: number;
  critical_findings: number;
  major_findings: number;
  open_findings: number;
}

// ============================================================================
// AI PARSING TYPES
// ============================================================================

export interface SQFParseRequest {
  edition_id: string;
  file_url: string;
}

export interface SQFParseResponse {
  success: boolean;
  edition_id: string;
  codes_extracted: number;
  sections_found: number;
  error?: string;
}

export interface SQFExtractedData {
  edition_info: {
    edition_name: string;
    edition_number: number;
    release_date: string;
    total_sections: number;
  };
  codes: Array<{
    code_number: string;
    title: string;
    requirement_text: string;
    section: string;
    sub_section: string;
    category: string;
    module: string;
    is_fundamental: boolean;
    is_mandatory: boolean;
    guidance_notes?: string;
    verification_methods?: string[];
    evidence_required?: string[];
  }>;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface SQFCodeFilters {
  edition_id?: string;
  category?: string;
  section?: string;
  is_fundamental?: boolean;
  is_mandatory?: boolean;
  search?: string;
}

export interface SQFMappingFilters {
  policy_id?: string;
  sqf_code_id?: string;
  compliance_status?: SQFComplianceStatus;
  has_gaps?: boolean;
  gap_severity?: SQFGapSeverity;
}

export interface SQFAuditFilters {
  audit_type?: SQFAuditType;
  certification_status?: SQFCertificationStatus;
  status?: SQFAuditStatus;
  date_from?: string;
  date_to?: string;
}

export interface SQFFindingFilters {
  audit_id?: string;
  finding_type?: SQFFindingType;
  status?: SQFFindingStatus;
  sqf_code_id?: string;
  responsible_user_id?: string;
}
