import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, addDays, isBefore, isAfter } from 'date-fns';
import { useQASetting } from './useQASettings';

export type WorkQueueItemType = 
  | 'material_issue_critical'
  | 'material_issue_important'
  | 'supplier_issue'
  | 'document_expiry'
  | 'missing_required_doc'
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
  docsMissing: number;
  reviewsDue: number;
  total: number;
}

function calculatePriority(
  type: WorkQueueItemType,
  daysUntilDue: number | undefined,
  category?: string,
  approvalStatus?: string
): { score: number; level: WorkQueuePriority } {
  let score = 0;

  // Base score by type
  const baseScores: Record<WorkQueueItemType, number> = {
    material_issue_critical: 100,
    material_issue_important: 50,
    supplier_issue: 80,
    document_expiry: 75,
    missing_required_doc: 70,
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

  // For missing docs, boost priority if entity is Approved (already in use)
  if (type === 'missing_required_doc' && approvalStatus === 'Approved') {
    score += 20;
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

      // 3. Fetch expiring MATERIAL documents
      const { data: expiringMaterialDocs } = await supabase
        .from('material_documents')
        .select(`
          id, 
          document_name, 
          expiry_date, 
          material_id,
          materials!inner(id, name, code, category, approval_status)
        `)
        .or('is_archived.eq.false,is_archived.is.null')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', lookaheadDate.toISOString().split('T')[0]);

      expiringMaterialDocs?.forEach((doc: any) => {
        const expiryDate = new Date(doc.expiry_date!);
        const daysUntilDue = differenceInDays(expiryDate, today);
        const isOverdue = daysUntilDue < 0;
        const { score, level } = calculatePriority('document_expiry', daysUntilDue, doc.materials?.category);
        items.push({
          id: `mat-doc-${doc.id}`,
          type: 'document_expiry',
          priority: level,
          priorityScore: score,
          entityType: 'materials',
          entityId: doc.material_id,
          entityName: doc.materials?.name || 'Unknown Material',
          entityCode: doc.materials?.code,
          issueDescription: isOverdue 
            ? `EXPIRED: ${doc.document_name}` 
            : `Expiring: ${doc.document_name}`,
          dueDate: expiryDate,
          daysUntilDue,
          isOverdue,
          category: doc.materials?.category,
        });
      });

      // 4. Fetch expiring SUPPLIER documents
      const { data: expiringSupplierDocs } = await supabase
        .from('supplier_documents')
        .select(`
          id, 
          document_name, 
          expiry_date, 
          supplier_id,
          suppliers!inner(id, name, code, approval_status)
        `)
        .or('is_archived.eq.false,is_archived.is.null')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', lookaheadDate.toISOString().split('T')[0]);

      expiringSupplierDocs?.forEach((doc: any) => {
        const expiryDate = new Date(doc.expiry_date!);
        const daysUntilDue = differenceInDays(expiryDate, today);
        const isOverdue = daysUntilDue < 0;
        const { score, level } = calculatePriority('document_expiry', daysUntilDue);
        items.push({
          id: `sup-doc-${doc.id}`,
          type: 'document_expiry',
          priority: level,
          priorityScore: score,
          entityType: 'suppliers',
          entityId: doc.supplier_id,
          entityName: doc.suppliers?.name || 'Unknown Supplier',
          entityCode: doc.suppliers?.code,
          issueDescription: isOverdue 
            ? `EXPIRED: ${doc.document_name}` 
            : `Expiring: ${doc.document_name}`,
          dueDate: expiryDate,
          daysUntilDue,
          isOverdue,
        });
      });

      // 5. Fetch document requirements and check for missing required documents
      const { data: documentRequirements } = await supabase
        .from('document_requirements')
        .select('id, document_name, areas, is_required')
        .eq('is_active', true)
        .eq('is_required', true);

      if (documentRequirements?.length) {
        // Get material requirements (where areas includes 'materials')
        const materialRequirements = documentRequirements.filter(
          (req) => req.areas && req.areas.includes('materials')
        );

        // Get supplier requirements (where areas includes 'suppliers')
        const supplierRequirements = documentRequirements.filter(
          (req) => req.areas && req.areas.includes('suppliers')
        );

        // Fetch all materials with approval status to check
        if (materialRequirements.length > 0) {
          const { data: materials } = await supabase
            .from('materials')
            .select('id, name, code, category, approval_status')
            .in('approval_status', ['Approved', 'Draft', 'Conditional']);

          // Fetch all material documents
          const { data: allMaterialDocs } = await supabase
            .from('material_documents')
            .select('id, material_id, requirement_id')
            .or('is_archived.eq.false,is_archived.is.null');

          // Create a map of material -> uploaded requirement_ids
          const materialDocsMap = new Map<string, Set<string>>();
          allMaterialDocs?.forEach((doc) => {
            if (doc.requirement_id) {
              if (!materialDocsMap.has(doc.material_id)) {
                materialDocsMap.set(doc.material_id, new Set());
              }
              materialDocsMap.get(doc.material_id)!.add(doc.requirement_id);
            }
          });

          // Check each material for missing required documents
          materials?.forEach((mat) => {
            const uploadedReqIds = materialDocsMap.get(mat.id) || new Set();
            
            materialRequirements.forEach((req) => {
              if (!uploadedReqIds.has(req.id)) {
                // This required document is missing
                const { score, level } = calculatePriority(
                  'missing_required_doc', 
                  undefined, 
                  mat.category || undefined,
                  mat.approval_status || undefined
                );
                items.push({
                  id: `missing-mat-${mat.id}-${req.id}`,
                  type: 'missing_required_doc',
                  priority: level,
                  priorityScore: score,
                  entityType: 'materials',
                  entityId: mat.id,
                  entityName: mat.name,
                  entityCode: mat.code,
                  issueDescription: `Missing: ${req.document_name}`,
                  isOverdue: false,
                  category: mat.category || undefined,
                });
              }
            });
          });
        }

        // Fetch all suppliers with approval status to check
        if (supplierRequirements.length > 0) {
          const { data: suppliers } = await supabase
            .from('suppliers')
            .select('id, name, code, approval_status')
            .in('approval_status', ['Approved', 'Draft', 'Conditional']);

          // Fetch all supplier documents
          const { data: allSupplierDocs } = await supabase
            .from('supplier_documents')
            .select('id, supplier_id, requirement_id')
            .or('is_archived.eq.false,is_archived.is.null');

          // Create a map of supplier -> uploaded requirement_ids
          const supplierDocsMap = new Map<string, Set<string>>();
          allSupplierDocs?.forEach((doc) => {
            if (doc.requirement_id) {
              if (!supplierDocsMap.has(doc.supplier_id)) {
                supplierDocsMap.set(doc.supplier_id, new Set());
              }
              supplierDocsMap.get(doc.supplier_id)!.add(doc.requirement_id);
            }
          });

          // Check each supplier for missing required documents
          suppliers?.forEach((sup) => {
            const uploadedReqIds = supplierDocsMap.get(sup.id) || new Set();
            
            supplierRequirements.forEach((req) => {
              if (!uploadedReqIds.has(req.id)) {
                // This required document is missing
                const { score, level } = calculatePriority(
                  'missing_required_doc', 
                  undefined, 
                  undefined,
                  sup.approval_status || undefined
                );
                items.push({
                  id: `missing-sup-${sup.id}-${req.id}`,
                  type: 'missing_required_doc',
                  priority: level,
                  priorityScore: score,
                  entityType: 'suppliers',
                  entityId: sup.id,
                  entityName: sup.name,
                  entityCode: sup.code || undefined,
                  issueDescription: `Missing: ${req.document_name}`,
                  isOverdue: false,
                });
              }
            });
          });
        }
      }

      // 6. Fetch conditional approvals expiring
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

      // 7. Fetch stale drafts (materials with draft status not updated recently)
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

      // 8. Fetch suppliers with reviews due
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
    docsMissing: 0,
    reviewsDue: 0,
    total: items?.length || 0,
  };

  if (items) {
    items.forEach((item) => {
      if (item.isOverdue) summary.overdue++;
      if (item.daysUntilDue !== undefined && item.daysUntilDue >= 0 && item.daysUntilDue <= 7) summary.critical++;
      if (item.daysUntilDue !== undefined && item.daysUntilDue > 7 && item.daysUntilDue <= 45) summary.soon++;
      if (item.type === 'document_expiry') summary.docsExpiring++;
      if (item.type === 'missing_required_doc') summary.docsMissing++;
      if (item.type === 'supplier_review') summary.reviewsDue++;
    });
  }

  return summary;
};
