import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { subMonths, format } from 'date-fns';
import type {
  SupplierPerformanceMetrics,
  SupplierScoringRule,
  SupplierStatusHistory,
  SupplierScorecard,
  ScoreDeduction,
  TriggerReason,
} from '@/types/supplier-scoring';

// ============================================
// SCORING RULES
// ============================================

export function useSupplierScoringRules(activeOnly: boolean = true) {
  return useQuery({
    queryKey: ['supplier-scoring-rules', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('supplier_scoring_rules')
        .select('*')
        .order('priority', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierScoringRule[];
    },
  });
}

export function useUpdateScoringRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupplierScoringRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('supplier_scoring_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-scoring-rules'] });
      toast.success('Scoring rule updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update rule', { description: error.message });
    },
  });
}

// ============================================
// SCORING SETTINGS
// ============================================

export function useSupplierScoringSettings() {
  return useQuery({
    queryKey: ['supplier-scoring-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capa_settings')
        .select('*')
        .in('setting_key', [
          'approved_rolling_months',
          'probation_rolling_months',
          'auto_probation_enabled',
          'probation_po_warning',
          'probation_po_block',
        ]);

      if (error) throw error;

      const settings: Record<string, unknown> = {
        approved_rolling_months: 12,
        probation_rolling_months: 3,
        auto_probation_enabled: true,
        probation_po_warning: true,
        probation_po_block: false,
      };

      data?.forEach(row => {
        let value: unknown = row.setting_value;
        if (row.setting_type === 'number') value = parseFloat(row.setting_value);
        else if (row.setting_type === 'boolean') value = row.setting_value === 'true';
        else if (row.setting_type === 'json') value = JSON.parse(row.setting_value);
        settings[row.setting_key] = value;
      });

      return settings;
    },
  });
}

// ============================================
// PERFORMANCE METRICS CALCULATION
// ============================================

interface CalculateMetricsParams {
  supplierId: string;
  rollingMonths?: number;
  forceRecalculate?: boolean;
}

export function useCalculateSupplierMetrics() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: rules } = useSupplierScoringRules();
  const { data: settings } = useSupplierScoringSettings();

  return useMutation({
    mutationFn: async ({ supplierId, rollingMonths }: CalculateMetricsParams) => {
      // Get supplier to determine rolling period
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('id, name, code, approval_status')
        .eq('id', supplierId)
        .single();

      if (supplierError) throw supplierError;

      // Determine rolling period based on status
      const months = rollingMonths || (
        supplier.approval_status === 'Probation' 
          ? ((settings?.probation_rolling_months as number) || 3)
          : ((settings?.approved_rolling_months as number) || 12)
      );

      const periodEnd = new Date();
      const periodStart = subMonths(periodEnd, months);

      // Fetch receiving data
      const { data: receivingData, error: receivingError } = await supabase
        .from('receiving_lots')
        .select(`
          id,
          qa_status,
          material_id,
          materials!inner(
            supplier_id
          )
        `)
        .eq('materials.supplier_id', supplierId)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      if (receivingError) throw receivingError;

      // Fetch CAPA data
      const { data: capaData, error: capaError } = await supabase
        .from('corrective_actions')
        .select('id, severity, status, created_at, closed_at')
        .eq('supplier_id', supplierId)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      if (capaError) throw capaError;

      // Fetch document data
      const { data: docData, error: docError } = await supabase
        .from('compliance_documents')
        .select('id, expiration_date, is_current')
        .eq('related_entity_id', supplierId)
        .eq('related_entity_type', 'supplier');

      if (docError) throw docError;

      // Calculate receiving metrics
      const totalLots = receivingData?.length || 0;
      const lotsAccepted = receivingData?.filter(r => r.qa_status === 'Approved').length || 0;
      const lotsRejected = receivingData?.filter(r => r.qa_status === 'Rejected').length || 0;
      const lotsOnHold = receivingData?.filter(r => r.qa_status === 'Hold').length || 0;
      const rejectionRate = totalLots > 0 ? (lotsRejected / totalLots) * 100 : 0;

      // Calculate CAPA metrics
      const capas = capaData || [];
      const openCapas = capas.filter(c => !['closed', 'cancelled'].includes(c.status)).length;
      const closedCapas = capas.filter(c => c.status === 'closed').length;
      const criticalCapas = capas.filter(c => c.severity === 'critical').length;
      const majorCapas = capas.filter(c => c.severity === 'major').length;
      const minorCapas = capas.filter(c => c.severity === 'minor').length;

      // Calculate document metrics
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const docs = docData || [];
      const totalDocs = docs.length;
      const validDocs = docs.filter(d => d.is_current && (!d.expiration_date || new Date(d.expiration_date) > now)).length;
      const expiredDocs = docs.filter(d => d.expiration_date && new Date(d.expiration_date) < now).length;
      const expiringSoonDocs = docs.filter(d => {
        if (!d.expiration_date) return false;
        const expDate = new Date(d.expiration_date);
        return expDate > now && expDate <= thirtyDaysFromNow;
      }).length;
      const docComplianceRate = totalDocs > 0 ? (validDocs / totalDocs) * 100 : 100;

      // Calculate score using rules
      const baseScore = 100;
      let totalDeductions = 0;
      const deductions: ScoreDeduction[] = [];
      const triggeredRules: TriggerReason[] = [];

      const metricValues: Record<string, number> = {
        rejection_rate: rejectionRate,
        total_capas: capas.length,
        open_capas: openCapas,
        critical_capas: criticalCapas,
        major_capas: majorCapas,
        minor_capas: minorCapas,
        expired_documents: expiredDocs,
        document_compliance_rate: docComplianceRate,
        total_lots_received: totalLots,
      };

      // Apply deduction rules
      const deductionRules = (rules || []).filter(r => r.rule_type === 'deduction' && r.is_active);
      for (const rule of deductionRules) {
        const metricValue = metricValues[rule.metric_key] || 0;
        if (metricValue > 0 && rule.deduction_per_unit) {
          let deduction = metricValue * rule.deduction_per_unit;
          const capped = rule.max_deduction && deduction > rule.max_deduction;
          if (capped) deduction = rule.max_deduction!;
          
          totalDeductions += deduction;
          deductions.push({
            rule_code: rule.rule_code,
            rule_name: rule.rule_name,
            metric_value: metricValue,
            deduction_amount: deduction,
            capped: !!capped,
            reason: `${rule.rule_name}: ${metricValue} × ${rule.deduction_per_unit} = -${deduction} points${capped ? ' (capped)' : ''}`,
          });
        }
      }

      const finalScore = Math.max(0, baseScore - totalDeductions);

      // Add final_score to metrics for threshold checks
      metricValues.final_score = finalScore;

      // Apply threshold rules
      const thresholdRules = (rules || []).filter(r => r.rule_type === 'threshold' && r.is_active);
      let probationTriggered = false;
      let reviewRequired = false;

      for (const rule of thresholdRules) {
        const metricValue = metricValues[rule.metric_key];
        if (metricValue === undefined) continue;

        let triggered = false;
        switch (rule.threshold_operator) {
          case 'gt': triggered = metricValue > (rule.threshold_value || 0); break;
          case 'gte': triggered = metricValue >= (rule.threshold_value || 0); break;
          case 'lt': triggered = metricValue < (rule.threshold_value || 0); break;
          case 'lte': triggered = metricValue <= (rule.threshold_value || 0); break;
          case 'eq': triggered = metricValue === rule.threshold_value; break;
        }

        if (triggered && rule.action_type) {
          triggeredRules.push({
            rule_code: rule.rule_code,
            rule_name: rule.rule_name,
            action_type: rule.action_type,
            metric_value: metricValue,
            threshold_value: rule.threshold_value || 0,
            message: `${rule.rule_name}: ${rule.metric_key} is ${metricValue} (threshold: ${rule.threshold_operator} ${rule.threshold_value})`,
          });

          if (rule.action_type === 'probation') probationTriggered = true;
          if (rule.action_type === 'review') reviewRequired = true;
        }
      }

      // Calculate grade
      const grade = finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 70 ? 'C' : finalScore >= 60 ? 'D' : 'F';

      // Save metrics
      const metricsRecord = {
        supplier_id: supplierId,
        period_start: format(periodStart, 'yyyy-MM-dd'),
        period_end: format(periodEnd, 'yyyy-MM-dd'),
        rolling_months: months,
        
        total_lots_received: totalLots,
        lots_accepted: lotsAccepted,
        lots_rejected: lotsRejected,
        lots_on_hold: lotsOnHold,
        rejection_rate: Math.round(rejectionRate * 100) / 100,
        
        temperature_failures: 0,
        spec_failures: 0,
        documentation_failures: 0,
        
        total_capas: capas.length,
        open_capas: openCapas,
        closed_capas: closedCapas,
        critical_capas: criticalCapas,
        major_capas: majorCapas,
        minor_capas: minorCapas,
        
        total_required_documents: totalDocs,
        valid_documents: validDocs,
        expired_documents: expiredDocs,
        expiring_soon_documents: expiringSoonDocs,
        missing_documents: 0,
        document_compliance_rate: Math.round(docComplianceRate * 100) / 100,
        
        total_deliveries: 0,
        on_time_deliveries: 0,
        late_deliveries: 0,
        on_time_rate: 0,
        
        base_score: baseScore,
        total_deductions: Math.round(totalDeductions),
        final_score: Math.round(finalScore),
        score_grade: grade,
        
        probation_triggered: probationTriggered,
        review_required: reviewRequired,
        trigger_reasons: triggeredRules,
        
        calculated_by: user?.id || 'system',
      };

      // Upsert metrics
      const { data: savedMetrics, error: saveError } = await supabase
        .from('supplier_performance_metrics')
        .upsert(metricsRecord as never, {
          onConflict: 'supplier_id,period_start,period_end',
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Update supplier's current score
      await supabase
        .from('suppliers')
        .update({
          current_score: Math.round(finalScore),
          current_grade: grade,
          last_score_date: format(new Date(), 'yyyy-MM-dd'),
        })
        .eq('id', supplierId);

      return {
        metrics: savedMetrics as unknown as SupplierPerformanceMetrics,
        deductions,
        triggeredRules,
        shouldChangeToProbation: probationTriggered && supplier.approval_status !== 'Probation',
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-metrics', variables.supplierId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-scorecard', variables.supplierId] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Score calculated');
    },
    onError: (error: Error) => {
      toast.error('Failed to calculate metrics', { description: error.message });
    },
  });
}

// ============================================
// GET SUPPLIER SCORECARD
// ============================================

export function useSupplierScorecard(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-scorecard', supplierId],
    queryFn: async () => {
      if (!supplierId) return null;

      // Get supplier
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('id, name, code, approval_status, current_score, current_grade, last_score_date')
        .eq('id', supplierId)
        .single();

      if (supplierError) throw supplierError;

      // Get latest metrics
      const { data: latestMetrics } = await supabase
        .from('supplier_performance_metrics')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get score history (last 12 months)
      const { data: historyData } = await supabase
        .from('supplier_performance_metrics')
        .select('period_end, final_score, score_grade')
        .eq('supplier_id', supplierId)
        .order('period_end', { ascending: true })
        .limit(12);

      // Get status history
      const { data: statusHistory } = await supabase
        .from('supplier_status_history')
        .select(`
          *,
          triggered_by_profile:profiles!supplier_status_history_triggered_by_user_id_fkey(first_name, last_name)
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .limit(10);

      const scorecard: SupplierScorecard = {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_code: supplier.code,
        current_status: supplier.approval_status || 'Pending',
        metrics: latestMetrics as unknown as SupplierPerformanceMetrics | null,
        deductions: [],
        recommended_status: null,
        triggered_rules: (latestMetrics?.trigger_reasons as unknown as TriggerReason[]) || [],
        should_change_status: latestMetrics?.probation_triggered && supplier.approval_status !== 'Probation',
        score_history: (historyData || []).map(h => ({
          date: h.period_end,
          score: h.final_score,
          grade: h.score_grade,
        })),
        status_history: (statusHistory || []) as unknown as SupplierStatusHistory[],
      };

      if (latestMetrics?.probation_triggered && supplier.approval_status !== 'Probation') {
        scorecard.recommended_status = 'Probation';
      }

      return scorecard;
    },
    enabled: !!supplierId,
  });
}

// ============================================
// CHANGE SUPPLIER STATUS
// ============================================

export function useChangeSupplierStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      supplierId,
      newStatus,
      reason,
      isAutomatic,
      metricsId,
      triggerDetails,
    }: {
      supplierId: string;
      newStatus: string;
      reason: string;
      isAutomatic?: boolean;
      metricsId?: string;
      triggerDetails?: TriggerReason[];
    }) => {
      // Get current status
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('approval_status, current_score')
        .eq('id', supplierId)
        .single();

      if (supplierError) throw supplierError;

      // Update supplier status
      const updateData: Record<string, unknown> = {
        approval_status: newStatus,
      };

      if (newStatus === 'Probation') {
        updateData.probation_start_date = new Date().toISOString();
        updateData.probation_end_date = null;
      }

      const { error: updateError } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', supplierId);

      if (updateError) throw updateError;

      // Log status change
      const { data: historyRecord, error: historyError } = await supabase
        .from('supplier_status_history')
        .insert({
          supplier_id: supplierId,
          previous_status: supplier.approval_status,
          new_status: newStatus,
          change_reason: reason,
          triggered_by: isAutomatic ? 'system' : 'user',
          triggered_by_user_id: isAutomatic ? null : user?.id,
          performance_score_at_change: supplier.current_score,
          metrics_snapshot_id: metricsId || null,
          trigger_details: (triggerDetails || null) as never,
        })
        .select()
        .single();

      if (historyError) throw historyError;

      return historyRecord;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-scorecard', variables.supplierId] });
      toast.success('Supplier status updated', {
        description: `Status changed to ${variables.newStatus}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update status', { description: error.message });
    },
  });
}

// ============================================
// STATUS HISTORY
// ============================================

export function useSupplierStatusHistory(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-status-history', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];

      const { data, error } = await supabase
        .from('supplier_status_history')
        .select(`
          *,
          triggered_by_profile:profiles!supplier_status_history_triggered_by_user_id_fkey(first_name, last_name)
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as SupplierStatusHistory[];
    },
    enabled: !!supplierId,
  });
}

// ============================================
// SUPPLIERS AT RISK
// ============================================

export function useSuppliersAtRisk() {
  return useQuery({
    queryKey: ['suppliers-at-risk'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          id,
          name,
          code,
          approval_status,
          current_score,
          current_grade,
          last_score_date
        `)
        .in('approval_status', ['Approved', 'Conditional', 'Probation'])
        .or('current_score.lt.75,approval_status.eq.Probation')
        .order('current_score', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data;
    },
  });
}
