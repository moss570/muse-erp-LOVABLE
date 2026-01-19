export interface SupplierPerformanceMetrics {
  id: string;
  supplier_id: string;
  period_start: string;
  period_end: string;
  rolling_months: number;
  
  // Receiving
  total_lots_received: number;
  lots_accepted: number;
  lots_rejected: number;
  lots_on_hold: number;
  rejection_rate: number;
  
  // Quality
  temperature_failures: number;
  spec_failures: number;
  documentation_failures: number;
  
  // CAPA
  total_capas: number;
  open_capas: number;
  closed_capas: number;
  critical_capas: number;
  major_capas: number;
  minor_capas: number;
  avg_capa_closure_days: number | null;
  
  // Documents
  total_required_documents: number;
  valid_documents: number;
  expired_documents: number;
  expiring_soon_documents: number;
  missing_documents: number;
  document_compliance_rate: number;
  
  // Delivery
  total_deliveries: number;
  on_time_deliveries: number;
  late_deliveries: number;
  on_time_rate: number;
  
  // Score
  base_score: number;
  total_deductions: number;
  final_score: number;
  score_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  
  // Triggers
  probation_triggered: boolean;
  review_required: boolean;
  trigger_reasons: TriggerReason[];
  
  calculated_at: string;
  calculated_by: string;
  notes: string | null;
}

export interface TriggerReason {
  rule_code: string;
  rule_name: string;
  action_type: 'probation' | 'review' | 'alert' | 'block';
  metric_value: number;
  threshold_value: number;
  message: string;
}

export interface SupplierScoringRule {
  id: string;
  rule_name: string;
  rule_code: string;
  description: string | null;
  rule_type: 'deduction' | 'threshold' | 'bonus';
  metric_key: string;
  deduction_per_unit: number | null;
  max_deduction: number | null;
  threshold_value: number | null;
  threshold_operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | null;
  action_type: 'probation' | 'review' | 'alert' | 'block' | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierStatusHistory {
  id: string;
  supplier_id: string;
  previous_status: string | null;
  new_status: string;
  change_reason: string;
  triggered_by: 'system' | 'user';
  triggered_by_user_id: string | null;
  performance_score_at_change: number | null;
  metrics_snapshot_id: string | null;
  trigger_details: TriggerReason[] | null;
  effective_date: string;
  created_at: string;
  notes: string | null;
}

export interface SupplierScorecard {
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  current_status: string;
  metrics: SupplierPerformanceMetrics | null;
  deductions: ScoreDeduction[];
  recommended_status: string | null;
  triggered_rules: TriggerReason[];
  should_change_status: boolean;
  score_history: ScoreHistoryPoint[];
  status_history: SupplierStatusHistory[];
}

export interface ScoreDeduction {
  rule_code: string;
  rule_name: string;
  metric_value: number;
  deduction_amount: number;
  capped: boolean;
  reason: string;
}

export interface ScoreHistoryPoint {
  date: string;
  score: number;
  grade: string;
}

export type SupplierGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export const GRADE_CONFIG: Record<SupplierGrade, { color: string; bgColor: string; label: string; description: string }> = {
  A: { color: 'text-green-700', bgColor: 'bg-green-100', label: 'Excellent', description: 'Top-tier supplier, preferred status' },
  B: { color: 'text-blue-700', bgColor: 'bg-blue-100', label: 'Good', description: 'Reliable supplier, approved status' },
  C: { color: 'text-amber-700', bgColor: 'bg-amber-100', label: 'Fair', description: 'Acceptable, requires monitoring' },
  D: { color: 'text-orange-700', bgColor: 'bg-orange-100', label: 'Poor', description: 'Improvement required' },
  F: { color: 'text-red-700', bgColor: 'bg-red-100', label: 'Critical', description: 'Probation or removal' },
};
