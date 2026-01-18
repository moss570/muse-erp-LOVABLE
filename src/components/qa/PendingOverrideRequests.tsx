import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { RefreshCw, ExternalLink, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePendingOverrideRequests, useReviewOverrideRequest } from '@/hooks/useOverrideRequests';
import { useConditionalDurationMaterials } from '@/hooks/useQASettings';
import { addDays } from 'date-fns';

interface PendingOverrideRequestsProps {
  onViewRecord?: (recordId: string, tableName: string) => void;
}

export function PendingOverrideRequests({ onViewRecord }: PendingOverrideRequestsProps) {
  const { data: requests, isLoading, refetch } = usePendingOverrideRequests();
  const { data: materialDurations } = useConditionalDurationMaterials();
  const reviewMutation = useReviewOverrideRequest();

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleReview = async (requestId: string, approved: boolean) => {
    const request = requests?.find((r) => r.id === requestId);
    if (!request) return;

    // Require notes for denial
    if (!approved && (!reviewNotes[requestId] || reviewNotes[requestId].trim() === '')) {
      return;
    }

    setProcessingId(requestId);

    // Calculate expiry date
    let expiresAt: string | undefined;
    if (approved && request.override_type === 'conditional_approval') {
      const category = request.related_table_name === 'materials' 
        ? (request as any).category 
        : null;
      const days = category && materialDurations ? materialDurations[category] || 14 : 14;
      expiresAt = addDays(new Date(), days).toISOString();
    }

    try {
      await reviewMutation.mutateAsync({
        requestId,
        approved,
        notes: reviewNotes[requestId],
        expiresAt,
      });
      setReviewNotes((prev) => ({ ...prev, [requestId]: '' }));
    } finally {
      setProcessingId(null);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'critical':
        return '🔴';
      case 'important':
        return '🟠';
      default:
        return '🟡';
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      emergency_production: 'Emergency production need',
      supplier_documentation_pending: 'Supplier documentation pending',
      temporary_issue_being_resolved: 'Temporary issue being resolved',
      administrative_data_pending: 'Administrative data pending',
      other: 'Other',
    };
    return labels[reason] || reason;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔔 Pending Override Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🔔 Pending Override Requests (0)
            </span>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No pending override requests
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            🔔 Pending Override Requests ({requests.length})
          </span>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="border-l-4 border-l-orange-500">
            <CardContent className="pt-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium capitalize">
                    {request.related_table_name.replace('_', ' ')}: Record
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge variant="outline">
                  {request.override_type === 'full_approval' ? 'Full' : 'Conditional'}
                </Badge>
              </div>

              <Separator />

              {/* Request Details */}
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Requested by:</span>{' '}
                  <span className="font-medium">
                    {request.requester?.first_name && request.requester?.last_name 
                      ? `${request.requester.first_name} ${request.requester.last_name}`
                      : request.requester?.email || 'Unknown'}
                  </span>
                </p>

                <p>
                  <span className="text-muted-foreground">Blocks:</span>{' '}
                  {(request.blocked_checks as any[])?.map((check, idx) => (
                    <span key={idx} className="mr-2">
                      {getTierIcon(check.tier)} {check.check_name}
                      {idx < (request.blocked_checks as any[]).length - 1 ? ',' : ''}
                    </span>
                  ))}
                </p>

                <p>
                  <span className="text-muted-foreground">Reason:</span>{' '}
                  {getReasonLabel(request.override_reason)}
                </p>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-muted-foreground mb-1">Justification:</p>
                  <p className="italic">&ldquo;{request.justification}&rdquo;</p>
                </div>

                <p>
                  <span className="text-muted-foreground">Follow-up:</span>{' '}
                  {format(new Date(request.follow_up_date), 'PPP')}
                </p>
              </div>

              <Separator />

              {/* Response Notes */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Response notes (required for denial)..."
                  value={reviewNotes[request.id] || ''}
                  onChange={(e) =>
                    setReviewNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                  }
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {onViewRecord && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewRecord(request.related_record_id, request.related_table_name)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReview(request.id, false)}
                  disabled={
                    processingId === request.id ||
                    !reviewNotes[request.id]?.trim()
                  }
                >
                  {processingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Deny
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleReview(request.id, true)}
                  disabled={processingId === request.id}
                >
                  {processingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
