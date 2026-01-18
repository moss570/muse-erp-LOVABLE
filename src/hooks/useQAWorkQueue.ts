import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, addDays, isBefore, isAfter } from 'date-fns';
import { useQASetting } from './useQASettings';

export type WorkQueueItemType = 
  | 'material_issue_critical'
  | 'material_issue_important'
  | 'supplier_issue'
  | 'document_expiry'
  | 'conditional_expiry'
  | 'override_request'
  | 'override_followup'
  | 'stale_draft'
  | 'supplier_review';

export type WorkQueuePriority = 'high' | 'medium' | 'low';

export interface WorkQueueItem {
  id: string;
  type: WorkQueueItemType;
  priority: WorkQueuePriority;
  priorityScore: number;
  entityType: string;
  entityId: string;
  entityName: string;
  entityCode?: string;
  issueDescription: string;
  dueDate?: Date;
  daysUntilDue?: number;
  isOverdue: boolean;
  category?: string;
}

export interface WorkQueueFilters {
  types?: string[];
  priorities?: string[];
  categories?: string[];
  search?: string;
}

export interface WorkQueueSummary {
  overdue: number;
  critical: number;
  soon: number;
  docsExpiring: number;
  reviewsDue: number;
  total: number;
}

function calculatePriority(
  type: WorkQueueItemType,
  daysUntilDue: number | undefined,
  category?: string
): { score: number; level: WorkQueuePriority } {
  let score = 0;

  // Base score by type
  const baseScores: Record<WorkQueueItemType, number> = {
    material_issue_critical: 100,
    material_issue_important: 50,
    supplier_issue: 80,
    document_expiry: 75,
    conditional_expiry: 60,
    override_request: 80,
    override_followup: 70,
    stale_draft: 25,
    supplier_review: 40,
  };
  score += baseScores[type] || 30;

  // Time urgency
  if (daysUntilDue !== undefined) {
    if (daysUntilDue < 0) score += 50;      // Overdue
    else if (daysUntilDue <= 7) score += 30; // Within 7 days
    else if (daysUntilDue <= 14) score += 15; // Within 14 days
  }

  // Food category multiplier
  if (category && ['Ingredients', 'Direct Sale'].includes(category)) {
    score = Math.round(score * 1.2);
  }

  const level: WorkQueuePriority = score >= 100 ? 'high' : score >= 50 ? 'medium' : 'low';
  return { score, level };
}

export const useQAWorkQueue = (filters?: WorkQueueFilters) => {
  const { data: lookaheadDaysSetting } = useQASetting('work_queue_lookahead_days');
  const { data: documentWarningDaysSetting } = useQASetting('document_expiry_warning_days');
  const { data: staleDraftDaysSetting } = useQASetting('stale_draft_threshold_days');

  const lookaheadDays = parseInt(String(lookaheadDaysSetting?.setting_value || '45'), 10);
  const documentWarningDays = parseInt(String(documentWarningDaysSetting?.setting_value || '30'), 10);
  const staleDraftDays = parseInt(String(staleDraftDaysSetting?.setting_value || '30'), 10);

  return useQuery({
    queryKey: ['qa-work-queue', filters, lookaheadDays, documentWarningDays, staleDraftDays],
    queryFn: async () => {
      const items: WorkQueueItem[] = [];
      const today = new Date();
      const lookaheadDate = addDays(today, lookaheadDays);

      // 1. Fetch pending override requests
      const { data: overrideRequests } = await supabase
        .from('qa_override_requests')
        .select('id, related_record_id, related_table_name, requested_at, status')
        .eq('status', 'pending');

      overrideRequests?.forEach((req) => {
        const daysUntilDue = differenceInDays(today, new Date(req.requested_at));
        const { score, level } = calculatePriority('override_request', -daysUntilDue);
        items.push({
          id: `override-${req.id}`,
          type: 'override_request',
          priority: level,
          priorityScore: score,
          entityType: req.related_table_name,
          entityId: req.related_record_id,
          entityName: 'Override Request',
          issueDescription: 'Pending approval',
          daysUntilDue: 0,
          isOverdue: false,
        });
      });

      // 2. Fetch override follow-ups (approved but past follow_up_date)
      const { data: overrideFollowups } = await supabase
        .from('qa_override_requests')
        .select('id, related_record_id, related_table_name, follow_up_date')
        .eq('status', 'approved')
        .is('resolved_at', null)
        .lte('follow_up_date', today.toISOString().split('T')[0]);

      overrideFollowups?.forEach((req) => {
        const daysOverdue = differenceInDays(today, new Date(req.follow_up_date));
        const { score, level } = calculatePriority('override_followup', -daysOverdue);
        items.push({
          id: `followup-${req.id}`,
          type: 'override_followup',
          priority: level,
          priorityScore: score,
          entityType: req.related_table_name,
          entityId: req.related_record_id,
          entityName: 'Override Follow-up',
          issueDescription: 'Follow-up date passed',
          dueDate: new Date(req.follow_up_date),
          daysUntilDue: -daysOverdue,
          isOverdue: true,
        });
      });

      // 3. Fetch expiring documents
      const { data: expiringDocs } = await supabase
        .from('compliance_documents')
        .select('id, document_name, document_type, expiration_date, related_entity_id, related_entity_type')
        .eq('is_current', true)
        .not('expiration_date', 'is', null)
        .lte('expiration_date', lookaheadDate.toISOString().split('T')[0]);

      expiringDocs?.forEach((doc) => {
        const expiryDate = new Date(doc.expiration_date!);
        const daysUntilDue = differenceInDays(expiryDate, today);
        const isOverdue = daysUntilDue < 0;
        const { score, level } = calculatePriority('document_expiry', daysUntilDue);
        items.push({
          id: `doc-${doc.id}`,
          type: 'document_expiry',
          priority: level,
          priorityScore: score,
          entityType: doc.related_entity_type,
          entityId: doc.related_entity_id,
          entityName: doc.document_name,
          issueDescription: isOverdue ? 'EXPIRED' : 'Expiring soon',
          dueDate: expiryDate,
          daysUntilDue,
          isOverdue,
        });
      });

      // 4. Fetch conditional approvals expiring
      const { data: conditionalMaterials } = await supabase
        .from('materials')
        .select('id, name, code, category, conditional_approval_expires_at')
        .eq('approval_status', 'Conditional')
        .not('conditional_approval_expires_at', 'is', null)
        .lte('conditional_approval_expires_at', lookaheadDate.toISOString());

      conditionalMaterials?.forEach((mat) => {
        const expiryDate = new Date(mat.conditional_approval_expires_at!);
        const daysUntilDue = differenceInDays(expiryDate, today);
        const isOverdue = daysUntilDue < 0;
        const { score, level } = calculatePriority('conditional_expiry', daysUntilDue, mat.category || undefined);
        items.push({
          id: `cond-mat-${mat.id}`,
          type: 'conditional_expiry',
          priority: level,
          priorityScore: score,
          entityType: 'materials',
          entityId: mat.id,
          entityName: mat.name,
          entityCode: mat.code,
          issueDescription: isOverdue ? 'Conditional approval expired' : 'Expires soon',
          dueDate: expiryDate,
          daysUntilDue,
          isOverdue,
          category: mat.category || undefined,
        });
      });

      // 5. Fetch stale drafts (materials with draft status not updated recently)
      const staleDate = addDays(today, -staleDraftDays);
      const { data: staleDrafts } = await supabase
        .from('materials')
        .select('id, name, code, category, updated_at')
        .eq('approval_status', 'Draft')
        .lte('updated_at', staleDate.toISOString());

      staleDrafts?.forEach((mat) => {
        const daysInactive = differenceInDays(today, new Date(mat.updated_at));
        const { score, level } = calculatePriority('stale_draft', undefined, mat.category || undefined);
        items.push({
          id: `stale-${mat.id}`,
          type: 'stale_draft',
          priority: level,
          priorityScore: score,
          entityType: 'materials',
          entityId: mat.id,
          entityName: mat.name,
          entityCode: mat.code,
          issueDescription: `${daysInactive} days inactive`,
          isOverdue: false,
          category: mat.category || undefined,
        });
      });

      // 6. Fetch suppliers with reviews due
      const { data: supplierReviews } = await supabase
        .from('suppliers')
        .select('id, name, code, next_review_date')
        .not('next_review_date', 'is', null)
        .lte('next_review_date', lookaheadDate.toISOString().split('T')[0]);

      supplierReviews?.forEach((sup) => {
        const reviewDate = new Date(sup.next_review_date!);
        const daysUntilDue = differenceInDays(reviewDate, today);
        const isOverdue = daysUntilDue < 0;
        const { score, level } = calculatePriority('supplier_review', daysUntilDue);
        items.push({
          id: `supreview-${sup.id}`,
          type: 'supplier_review',
          priority: level,
          priorityScore: score,
          entityType: 'suppliers',
          entityId: sup.id,
          entityName: sup.name,
          entityCode: sup.code || undefined,
          issueDescription: isOverdue ? 'Review overdue' : 'Review due soon',
          dueDate: reviewDate,
          daysUntilDue,
          isOverdue,
        });
      });

      // Sort by priority score descending
      items.sort((a, b) => b.priorityScore - a.priorityScore);

      // Apply filters
      let filteredItems = items;

      if (filters?.types?.length) {
        filteredItems = filteredItems.filter((item) => filters.types!.includes(item.type));
      }

      if (filters?.priorities?.length) {
        filteredItems = filteredItems.filter((item) => filters.priorities!.includes(item.priority));
      }

      if (filters?.categories?.length) {
        filteredItems = filteredItems.filter((item) => 
          item.category && filters.categories!.includes(item.category)
        );
      }

      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filteredItems = filteredItems.filter((item) =>
          item.entityName.toLowerCase().includes(search) ||
          item.entityCode?.toLowerCase().includes(search) ||
          item.issueDescription.toLowerCase().includes(search)
        );
      }

      return filteredItems;
    },
  });
};

export const useQAWorkQueueSummary = () => {
  const { data: items } = useQAWorkQueue();

  const summary: WorkQueueSummary = {
    overdue: 0,
    critical: 0,
    soon: 0,
    docsExpiring: 0,
    reviewsDue: 0,
    total: items?.length || 0,
  };

  if (items) {
    items.forEach((item) => {
      if (item.isOverdue) summary.overdue++;
      if (item.daysUntilDue !== undefined && item.daysUntilDue >= 0 && item.daysUntilDue <= 7) summary.critical++;
      if (item.daysUntilDue !== undefined && item.daysUntilDue > 7 && item.daysUntilDue <= 45) summary.soon++;
      if (item.type === 'document_expiry') summary.docsExpiring++;
      if (item.type === 'supplier_review') summary.reviewsDue++;
    });
  }

  return summary;
};
