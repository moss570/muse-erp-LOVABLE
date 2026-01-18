// QA Check Types for the Approval System

export type QACheckTier = 'critical' | 'important' | 'recommended';

export type QAEntityType = 'material' | 'supplier' | 'product' | 'production_lot';

export interface QACheckDefinition {
  id: string;
  check_key: string;
  check_name: string;
  check_description: string | null;
  tier: QACheckTier;
  entity_type: QAEntityType;
  applicable_categories: string[] | null;
  target_tab: string | null;
  target_field: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface QACheckResult {
  definition: QACheckDefinition;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface QACheckSummary {
  results: QACheckResult[];
  criticalFailures: QACheckResult[];
  importantFailures: QACheckResult[];
  recommendedFailures: QACheckResult[];
  passedChecks: QACheckResult[];
  canFullApprove: boolean;
  canConditionalApprove: boolean;
  isBlocked: boolean;
  totalIssues: number;
  criticalCount: number;
  importantCount: number;
  recommendedCount: number;
}

export interface QAApprovalSetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, any> | string | number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConditionalDurationMaterials {
  Ingredients: number;
  Packaging: number;
  Boxes: number;
  Chemical: number;
  Supplies: number;
  Maintenance: number;
  'Direct Sale': number;
  [key: string]: number;
}

export interface ConditionalDurationEntities {
  suppliers: number;
  products: number;
  production_lots: number;
}

// Context passed to QA check evaluation
export interface MaterialCheckContext {
  material: {
    id: string;
    category?: string | null;
    gl_account_id?: string | null;
    coa_required?: boolean | null;
    country_of_origin?: string | null;
    fraud_vulnerability_score?: string | null;
    haccp_kill_step_applied?: boolean | null;
    haccp_rte_or_kill_step?: string | null;
    haccp_new_allergen?: boolean | null;
    storage_temperature_min?: number | null;
    storage_temperature_max?: number | null;
    approval_status?: string | null;
    [key: string]: any;
  };
  suppliers: Array<{
    id?: string;
    supplier_id: string;
    is_manufacturer?: boolean;
    is_primary?: boolean;
    cost_per_unit?: number | null;
    is_active?: boolean;
    supplier?: {
      id: string;
      name: string;
      approval_status?: string | null;
      [key: string]: any;
    } | null;
    [key: string]: any;
  }>;
  documents: Array<{
    id?: string;
    document_name: string;
    requirement_id?: string | null;
    expiry_date?: string | null;
    is_archived?: boolean;
    [key: string]: any;
  }>;
  documentRequirements: Array<{
    id: string;
    document_name: string;
    is_required?: boolean;
    areas: string[];
    [key: string]: any;
  }>;
  coaLimits: Array<{
    id: string;
    parameter_name: string;
    min_value?: number | null;
    max_value?: number | null;
    [key: string]: any;
  }>;
  purchaseUnits: Array<{
    id: string;
    [key: string]: any;
  }>;
  warningDays?: number;
}
