import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  useCheckDispositionApproval, 
  useApplyDisposition,
  useNCDispositionActions,
} from '@/hooks/useNCDispositions';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CheckCircle, 
  Clock,
  Shield,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { DISPOSITION_CONFIG, NCDisposition } from '@/types/non-conformities';

interface DispositionApprovalPanelProps {
  ncId: string;
  disposition: string;
  severity: string;
  estimatedCost: number | null;
  currentJustification: string | null;
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  onDispositionApplied?: () => void;
}

export function DispositionApprovalPanel({
  ncId,
  disposition,
  severity,
  estimatedCost,
  currentJustification,
  isApproved,
  approvedBy,
  approvedAt,
  onDispositionApplied,
}: DispositionApprovalPanelProps) {
  const { user } = useAuth();
  const [justification, setJustification] = useState(currentJustification || '');

  const { data: approvalCheck } = useCheckDispositionApproval(
    disposition,
    severity,
    estimatedCost
  );
  const { data: dispositionActions = [] } = useNCDispositionActions(ncId);
  const applyDisposition = useApplyDisposition();

  const handleApply = async (withApproval: boolean = false) => {
    await applyDisposition.mutateAsync({
      ncId,
      disposition,
      justification,
      approvedBy: withApproval ? user?.id : undefined,
    });
    onDispositionApplied?.();
  };

  if (!approvalCheck) return null;

  const requiresApproval = approvalCheck.requires_approval;
  const requiresJustification = approvalCheck.requires_justification;
  const dispositionConfig = DISPOSITION_CONFIG[disposition as NCDisposition];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          Disposition Workflow
        </CardTitle>
        <CardDescription>
          {dispositionConfig?.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Approval Requirements */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Approval Required</p>
            <Badge variant={requiresApproval ? 'destructive' : 'secondary'}>
              {requiresApproval ? 'Yes' : 'No'}
            </Badge>
          </div>

          {requiresApproval && (
            <div>
              <p className="text-muted-foreground">Approver Role</p>
              <Badge variant="outline" className="capitalize">
                {approvalCheck.approver_role}
              </Badge>
            </div>
          )}

          {approvalCheck.approval_threshold_amount && (
            <div>
              <p className="text-muted-foreground">Cost Threshold</p>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {approvalCheck.approval_threshold_amount.toFixed(2)}
              </span>
            </div>
          )}

          <div>
            <p className="text-muted-foreground">Justification Required</p>
            <Badge variant={requiresJustification ? 'default' : 'secondary'}>
              {requiresJustification ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Justification Input */}
        {requiresJustification && !isApproved && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Justification *</label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why this disposition is appropriate..."
              rows={3}
            />
          </div>
        )}

        {/* Current Justification (View Mode) */}
        {currentJustification && isApproved && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Justification</label>
            <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
              {currentJustification}
            </div>
          </div>
        )}

        {/* Approval Status */}
        {isApproved ? (
          <Alert className="border-primary/30 bg-primary/5">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertDescription>
              <div className="font-medium text-primary">Disposition Approved</div>
              <div className="text-sm text-muted-foreground mt-1">
                Approved {approvedAt && format(new Date(approvedAt), 'PPp')}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Pending Execution</div>
              <div className="text-sm mt-1">
                {requiresApproval
                  ? `Requires ${approvalCheck.approver_role} approval`
                  : 'Ready to apply'}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {!isApproved && (
          <div className="space-y-2">
            {requiresApproval ? (
              <Button
                className="w-full"
                onClick={() => handleApply(true)}
                disabled={
                  applyDisposition.isPending ||
                  (requiresJustification && !justification.trim())
                }
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Apply Disposition
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => handleApply(false)}
                disabled={
                  applyDisposition.isPending ||
                  (requiresJustification && !justification.trim())
                }
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply Disposition
              </Button>
            )}

            {requiresJustification && !justification.trim() && (
              <p className="text-xs text-muted-foreground text-center">
                Justification is required before applying
              </p>
            )}
          </div>
        )}

        {/* Disposition Actions History */}
        {dispositionActions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Actions Executed</h4>
              {dispositionActions.map((action: any) => (
                <div
                  key={action.id}
                  className="flex items-start gap-2 text-sm p-2 bg-muted rounded"
                >
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {action.action_type.replace(/_/g, ' ')}
                    </div>
                    {action.notes && (
                      <div className="text-muted-foreground text-xs">{action.notes}</div>
                    )}
                    {action.quantity_affected && (
                      <div className="text-xs">
                        Quantity: {action.quantity_affected} {action.unit}
                      </div>
                    )}
                    {action.cost && (
                      <div className="text-xs">Cost: ${action.cost.toFixed(2)}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(action.executed_at), 'PPp')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
