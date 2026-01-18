import { useMemo } from 'react';
import { useQACheckDefinitions, useDocumentExpiryWarningDays } from './useQASettings';
import type { 
  QACheckDefinition, 
  QACheckResult, 
  QACheckSummary, 
  MaterialCheckContext 
} from '@/types/qa-checks';
import { differenceInDays, parseISO, isValid } from 'date-fns';

// Evaluate a single check against the material context
function evaluateCheck(
  definition: QACheckDefinition, 
  context: MaterialCheckContext
): QACheckResult {
  const { material, suppliers, documents, documentRequirements, coaLimits, purchaseUnits } = context;
  const warningDays = context.warningDays || 30;
  const today = new Date();

  let passed = true;
  let message = '';
  let details: Record<string, any> = {};

  switch (definition.check_key) {
    case 'material_no_approved_supplier': {
      const hasApprovedSupplier = suppliers.some(
        s => s.supplier?.approval_status === 'Approved'
      );
      passed = hasApprovedSupplier;
      message = passed 
        ? 'At least one approved supplier exists' 
        : 'No supplier with Approved status found';
      break;
    }

    case 'material_manufacturer_rejected': {
      const manufacturer = suppliers.find(s => s.is_manufacturer);
      if (manufacturer) {
        passed = manufacturer.supplier?.approval_status !== 'Rejected';
        message = passed 
          ? 'Manufacturer is not rejected' 
          : `Manufacturer "${manufacturer.supplier?.name}" has been rejected`;
        details = { manufacturerName: manufacturer.supplier?.name };
      } else {
        passed = true;
        message = 'No manufacturer designated';
      }
      break;
    }

    case 'material_manufacturer_probation': {
      const manufacturer = suppliers.find(s => s.is_manufacturer);
      if (manufacturer) {
        passed = manufacturer.supplier?.approval_status !== 'Probation';
        message = passed 
          ? 'Manufacturer is not on probation' 
          : `Manufacturer "${manufacturer.supplier?.name}" is on Probation`;
        details = { manufacturerName: manufacturer.supplier?.name };
      } else {
        passed = true;
        message = 'No manufacturer designated';
      }
      break;
    }

    case 'material_required_docs_missing': {
      // Get required docs for this material's category
      const materialCategory = material.category || '';
      const requiredDocs = documentRequirements.filter(
        req => req.is_required && req.areas.includes(materialCategory)
      );
      
      const uploadedDocNames = documents
        .filter(d => !d.is_archived)
        .map(d => d.requirement_id || d.document_name);
      
      const missingDocs = requiredDocs.filter(
        req => !uploadedDocNames.includes(req.id) && !uploadedDocNames.includes(req.document_name)
      );
      
      passed = missingDocs.length === 0;
      message = passed 
        ? 'All required documents uploaded' 
        : `Missing: ${missingDocs.map(d => d.document_name).join(', ')}`;
      details = { missingDocuments: missingDocs.map(d => d.document_name) };
      break;
    }

    case 'material_safety_docs_expired': {
      // Check COA and allergen documents for expiry
      const safetyDocTypes = ['coa', 'allergen_statement', 'spec_sheet'];
      const expiredDocs = documents.filter(doc => {
        if (doc.is_archived) return false;
        if (!doc.expiry_date) return false;
        const docName = doc.document_name.toLowerCase();
        const isSafetyDoc = safetyDocTypes.some(type => docName.includes(type));
        if (!isSafetyDoc) return false;
        
        const expiryDate = parseISO(doc.expiry_date);
        return isValid(expiryDate) && expiryDate < today;
      });
      
      passed = expiredDocs.length === 0;
      message = passed 
        ? 'No expired safety documents' 
        : `Expired: ${expiredDocs.map(d => d.document_name).join(', ')}`;
      details = { expiredDocuments: expiredDocs.map(d => d.document_name) };
      break;
    }

    case 'material_no_gl_account': {
      passed = !!material.gl_account_id;
      message = passed 
        ? 'GL account assigned' 
        : 'No GL account assigned for financial tracking';
      break;
    }

    case 'material_docs_expiring_soon': {
      const expiringDocs = documents.filter(doc => {
        if (doc.is_archived) return false;
        if (!doc.expiry_date) return false;
        
        const expiryDate = parseISO(doc.expiry_date);
        if (!isValid(expiryDate)) return false;
        
        const daysUntilExpiry = differenceInDays(expiryDate, today);
        return daysUntilExpiry > 0 && daysUntilExpiry <= warningDays;
      });
      
      passed = expiringDocs.length === 0;
      if (!passed) {
        const nearest = expiringDocs.reduce((min, doc) => {
          const days = differenceInDays(parseISO(doc.expiry_date!), today);
          return days < min.days ? { name: doc.document_name, days } : min;
        }, { name: '', days: Infinity });
        message = `${expiringDocs.length} document(s) expiring soon - ${nearest.name} in ${nearest.days} days`;
        details = { expiringDocuments: expiringDocs.map(d => d.document_name), nearestExpiry: nearest };
      } else {
        message = 'No documents expiring within warning period';
      }
      break;
    }

    case 'material_coa_limits_missing': {
      if (!material.coa_required) {
        passed = true;
        message = 'COA not required for this material';
      } else {
        const hasLimits = coaLimits.length > 0 && coaLimits.some(
          limit => limit.min_value !== null || limit.max_value !== null
        );
        passed = hasLimits;
        message = passed 
          ? 'COA limits defined' 
          : 'COA required but no limits specified';
      }
      break;
    }

    case 'material_no_purchase_units': {
      passed = purchaseUnits.length > 0;
      message = passed 
        ? `${purchaseUnits.length} purchase unit(s) configured` 
        : 'No purchase units defined';
      break;
    }

    case 'material_no_cost_defined': {
      const hasCost = suppliers.some(s => s.cost_per_unit && s.cost_per_unit > 0);
      passed = hasCost;
      message = passed 
        ? 'Cost per unit defined' 
        : 'No supplier has cost per unit specified';
      break;
    }

    case 'material_country_origin_missing': {
      passed = !!material.country_of_origin;
      message = passed 
        ? `Country of origin: ${material.country_of_origin}` 
        : 'Country of origin not specified (VACCP compliance)';
      break;
    }

    case 'material_fraud_score_missing': {
      passed = !!material.fraud_vulnerability_score;
      message = passed 
        ? `Fraud vulnerability: ${material.fraud_vulnerability_score}` 
        : 'Food fraud vulnerability not assessed';
      break;
    }

    case 'material_haccp_incomplete': {
      const haccpComplete = 
        material.haccp_kill_step_applied !== null &&
        material.haccp_rte_or_kill_step !== null &&
        material.haccp_new_allergen !== null;
      passed = haccpComplete;
      message = passed 
        ? 'HACCP assessment complete' 
        : 'HACCP hazard questions not fully answered';
      break;
    }

    case 'material_storage_temps_missing': {
      const hasTemps = 
        material.storage_temperature_min !== null || 
        material.storage_temperature_max !== null;
      passed = hasTemps;
      message = passed 
        ? 'Storage temperatures specified' 
        : 'Storage temperature range not set';
      break;
    }

    default:
      passed = true;
      message = 'Check not implemented';
  }

  return {
    definition,
    passed,
    message,
    details,
  };
}

// Check if a definition applies to the material's category
function checkAppliesTo(definition: QACheckDefinition, materialCategory: string | null): boolean {
  // If no applicable_categories specified, applies to all
  if (!definition.applicable_categories || definition.applicable_categories.length === 0) {
    return true;
  }
  
  // Check if material's category is in the list
  return materialCategory 
    ? definition.applicable_categories.includes(materialCategory) 
    : false;
}

// Main hook for evaluating QA checks
export function useQAChecks(context: MaterialCheckContext | null) {
  const { data: checkDefinitions = [], isLoading } = useQACheckDefinitions({ 
    entityType: 'material',
    activeOnly: true 
  });
  const warningDays = useDocumentExpiryWarningDays();

  const summary = useMemo<QACheckSummary>(() => {
    if (!context || checkDefinitions.length === 0) {
      return {
        results: [],
        criticalFailures: [],
        importantFailures: [],
        recommendedFailures: [],
        passedChecks: [],
        canFullApprove: true,
        canConditionalApprove: true,
        isBlocked: false,
        totalIssues: 0,
        criticalCount: 0,
        importantCount: 0,
        recommendedCount: 0,
      };
    }

    const contextWithWarning = { ...context, warningDays };
    const materialCategory = context.material.category || null;

    // Filter definitions that apply to this material's category
    const applicableDefinitions = checkDefinitions.filter(
      def => checkAppliesTo(def, materialCategory)
    );

    // Evaluate all applicable checks
    const results = applicableDefinitions.map(def => evaluateCheck(def, contextWithWarning));

    // Categorize results
    const criticalFailures = results.filter(r => !r.passed && r.definition.tier === 'critical');
    const importantFailures = results.filter(r => !r.passed && r.definition.tier === 'important');
    const recommendedFailures = results.filter(r => !r.passed && r.definition.tier === 'recommended');
    const passedChecks = results.filter(r => r.passed);

    // Determine approval eligibility
    const isBlocked = criticalFailures.length > 0;
    const canConditionalApprove = !isBlocked; // Critical failures block even conditional
    const canFullApprove = canConditionalApprove && importantFailures.length === 0;

    return {
      results,
      criticalFailures,
      importantFailures,
      recommendedFailures,
      passedChecks,
      canFullApprove,
      canConditionalApprove,
      isBlocked,
      totalIssues: criticalFailures.length + importantFailures.length + recommendedFailures.length,
      criticalCount: criticalFailures.length,
      importantCount: importantFailures.length,
      recommendedCount: recommendedFailures.length,
    };
  }, [context, checkDefinitions, warningDays]);

  return {
    summary,
    isLoading,
    checkDefinitions,
  };
}
