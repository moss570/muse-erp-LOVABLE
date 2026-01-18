import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertCircle, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight,
  Shield,
  ShieldAlert
} from 'lucide-react';
import { useQAChecks } from '@/hooks/useQAChecks';
import { QACheckItem } from './QACheckItem';
import { OverrideRequestDialog } from './OverrideRequestDialog';
import { DirectOverrideDialog } from './DirectOverrideDialog';
import { ApprovalStatusBadge, ApprovalActionsDropdown, ApprovalHistoryPanel, DocumentComplianceSummary } from '@/components/approval';
import { useConditionalDurationMaterials } from '@/hooks/useQASettings';
import { useCanRequestOverride, useCanDirectOverride, usePendingOverrideForRecord } from '@/hooks/useOverrideRequests';
import type { MaterialCheckContext } from '@/types/qa-checks';

interface QAScorecardProps {
  material: MaterialCheckContext['material'];
  suppliers: MaterialCheckContext['suppliers'];
  documents: MaterialCheckContext['documents'];
  documentRequirements: MaterialCheckContext['documentRequirements'];
  coaLimits: MaterialCheckContext['coaLimits'];
  purchaseUnits: MaterialCheckContext['purchaseUnits'];
  onNavigateToTab: (tabId: string, fieldName?: string) => void;
  onStatusChange?: (newStatus: string) => void;
  isFieldsDisabled?: boolean;
}

export function QAScorecard({
  material,
  suppliers,
  documents,
  documentRequirements,
  coaLimits,
  purchaseUnits,
  onNavigateToTab,
  onStatusChange,
  isFieldsDisabled = false,
}: QAScorecardProps) {
  const [blockersOpen, setBlockersOpen] = useState(true);
  const [warningsOpen, setWarningsOpen] = useState(true);
  const [recommendationsOpen, setRecommendationsOpen] = useState(false);
  const [passedOpen, setPassedOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  
  const conditionalDurations = useConditionalDurationMaterials();
  const canRequestOverride = useCanRequestOverride();
  const canDirectOverride = useCanDirectOverride();
  const { data: pendingOverride } = usePendingOverrideForRecord(
    material.id, 
    'materials', 
    !!(material.id && canRequestOverride)
  );

  const context: MaterialCheckContext = {
    material,
    suppliers,
    documents,
    documentRequirements,
    coaLimits,
    purchaseUnits,
  };

  const { summary, isLoading } = useQAChecks(context);

  const handleNavigate = (tabId: string | null, fieldName: string | null) => {
    if (tabId) {
      onNavigateToTab(tabId, fieldName || undefined);
    }
  };

  // Get conditional approval duration for this material's category
  const conditionalDays = material.category 
    ? conditionalDurations[material.category] || 30 
    : 30;

  // Get blocked checks for override
  const blockedChecks = [...summary.criticalFailures, ...summary.importantFailures];
  const showOverrideButton = canRequestOverride && blockedChecks.length > 0 && !pendingOverride;

  // Determine eligibility text
  const getEligibilityContent = () => {
    if (summary.isBlocked) {
      return (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">Blocked</span>
          <span className="text-muted-foreground text-sm">- resolve critical issues first</span>
        </div>
      );
    }
    
    if (!summary.canFullApprove) {
      return (
        <div className="flex items-center gap-2 text-orange-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">Conditional Only</span>
          <span className="text-muted-foreground text-sm">({conditionalDays} day limit)</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span className="font-medium">Full Approval Eligible</span>
      </div>
    );
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const SectionHeader = ({ 
    icon: Icon, 
    iconColor, 
    title, 
    count, 
    isOpen, 
    onToggle,
    badgeVariant = 'secondary'
  }: { 
    icon: React.ElementType; 
    iconColor: string; 
    title: string; 
    count: number; 
    isOpen: boolean; 
    onToggle: () => void;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  }) => (
    <CollapsibleTrigger 
      onClick={onToggle}
      className="flex items-center justify-between w-full py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="font-medium text-sm">{title}</span>
        <Badge variant={badgeVariant} className="text-xs">
          {count}
        </Badge>
      </div>
      {isOpen ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </CollapsibleTrigger>
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">QA Readiness Scorecard</CardTitle>
            </div>
            {!isFieldsDisabled && (
              <ApprovalActionsDropdown
                currentStatus={material.approval_status || 'Draft'}
                tableName="materials"
                recordId={material.id}
                onActionComplete={onStatusChange ? () => onStatusChange(material.approval_status || 'Draft') : undefined}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current Status:</span>
              <ApprovalStatusBadge status={material.approval_status || 'Draft'} />
            </div>
          </div>
          
          {/* Eligibility */}
          <div className="p-3 border rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Approval Eligibility</div>
            {getEligibilityContent()}
          </div>
          
          {/* Override Button */}
          {showOverrideButton && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setOverrideDialogOpen(true)}
              className="gap-2"
            >
              <ShieldAlert className="h-4 w-4" />
              {canDirectOverride ? 'Override (Admin)' : 'Request Override'}
            </Button>
          )}
          {pendingOverride && (
            <Badge variant="outline" className="text-orange-600">
              Override Pending Approval
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Check Results Sections */}
      <div className="space-y-2">
        {/* Critical Blockers */}
        {summary.criticalCount > 0 && (
          <Card className="border-destructive/50">
            <Collapsible open={blockersOpen} onOpenChange={setBlockersOpen}>
              <SectionHeader
                icon={AlertCircle}
                iconColor="text-destructive"
                title="BLOCKERS"
                count={summary.criticalCount}
                isOpen={blockersOpen}
                onToggle={() => setBlockersOpen(!blockersOpen)}
                badgeVariant="destructive"
              />
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-1 border-t pt-2">
                    {summary.criticalFailures.map((result, idx) => (
                      <QACheckItem
                        key={`critical-${idx}`}
                        result={result}
                        onNavigate={() => handleNavigate(result.definition.target_tab, result.definition.target_field)}
                      />
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Important Warnings */}
        {summary.importantCount > 0 && (
          <Card className="border-orange-500/50">
            <Collapsible open={warningsOpen} onOpenChange={setWarningsOpen}>
              <SectionHeader
                icon={AlertTriangle}
                iconColor="text-orange-500"
                title="WARNINGS"
                count={summary.importantCount}
                isOpen={warningsOpen}
                onToggle={() => setWarningsOpen(!warningsOpen)}
              />
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-1 border-t pt-2">
                    {summary.importantFailures.map((result, idx) => (
                      <QACheckItem
                        key={`important-${idx}`}
                        result={result}
                        onNavigate={() => handleNavigate(result.definition.target_tab, result.definition.target_field)}
                      />
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Recommendations */}
        {summary.recommendedCount > 0 && (
          <Card className="border-yellow-500/30">
            <Collapsible open={recommendationsOpen} onOpenChange={setRecommendationsOpen}>
              <SectionHeader
                icon={Lightbulb}
                iconColor="text-yellow-500"
                title="RECOMMENDATIONS"
                count={summary.recommendedCount}
                isOpen={recommendationsOpen}
                onToggle={() => setRecommendationsOpen(!recommendationsOpen)}
              />
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-1 border-t pt-2">
                    {summary.recommendedFailures.map((result, idx) => (
                      <QACheckItem
                        key={`recommended-${idx}`}
                        result={result}
                        onNavigate={() => handleNavigate(result.definition.target_tab, result.definition.target_field)}
                      />
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Passed Checks */}
        {summary.passedChecks.length > 0 && (
          <Card className="border-green-500/30">
            <Collapsible open={passedOpen} onOpenChange={setPassedOpen}>
              <SectionHeader
                icon={CheckCircle2}
                iconColor="text-green-600"
                title="PASSED"
                count={summary.passedChecks.length}
                isOpen={passedOpen}
                onToggle={() => setPassedOpen(!passedOpen)}
              />
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-1 border-t pt-2">
                    {summary.passedChecks.map((result, idx) => (
                      <QACheckItem
                        key={`passed-${idx}`}
                        result={result}
                        showNavigate={false}
                      />
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}
      </div>

      {/* Document Compliance Summary */}
      <DocumentComplianceSummary
        entityType="material"
        documents={documents.map(d => ({
          id: d.id || '',
          document_name: d.document_name,
          requirement_id: d.requirement_id || undefined,
          expiry_date: d.expiry_date || undefined,
          file_path: undefined,
          file_url: undefined,
          is_archived: d.is_archived,
        }))}
        requirements={documentRequirements.map(r => ({
          id: r.id,
          document_name: r.document_name,
          is_required: r.is_required,
        }))}
      />

      {/* Approval History */}
      <ApprovalHistoryPanel
        tableName="materials"
        recordId={material.id}
      />

      {/* Override Dialogs */}
      {canDirectOverride ? (
        <DirectOverrideDialog
          open={overrideDialogOpen}
          onOpenChange={setOverrideDialogOpen}
          recordId={material.id}
          tableName="materials"
          recordName={`${material.name} (${material.code})`}
          blockedChecks={blockedChecks}
          category={material.category || undefined}
          onSuccess={() => onStatusChange?.(material.approval_status || 'Draft')}
        />
      ) : (
        <OverrideRequestDialog
          open={overrideDialogOpen}
          onOpenChange={setOverrideDialogOpen}
          recordId={material.id}
          tableName="materials"
          recordName={`${material.name} (${material.code})`}
          blockedChecks={blockedChecks}
          category={material.category || undefined}
          onSuccess={() => onStatusChange?.(material.approval_status || 'Draft')}
        />
      )}
    </div>
  );
}
