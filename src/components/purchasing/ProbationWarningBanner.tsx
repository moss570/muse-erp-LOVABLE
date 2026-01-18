import { AlertTriangle, TrendingDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupplierScorecard } from '@/hooks/useSupplierScoring';
import { useSupplierCapaMetrics } from '@/hooks/useCapa';
import { cn } from '@/lib/utils';

interface ProbationWarningBannerProps {
  supplierId: string;
  supplierName?: string;
  approvalStatus?: string;
  onViewScorecard?: () => void;
  compact?: boolean;
}

// Grade configuration for display
const GRADE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  A: { label: 'Excellent', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  B: { label: 'Good', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  C: { label: 'Fair', color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  D: { label: 'Poor', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  F: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

export function ProbationWarningBanner({
  supplierId,
  supplierName,
  approvalStatus,
  onViewScorecard,
  compact = false,
}: ProbationWarningBannerProps) {
  const { data: scorecard, isLoading: scorecardLoading } = useSupplierScorecard(supplierId);
  const { data: capaMetrics, isLoading: capaLoading } = useSupplierCapaMetrics(supplierId, 12);

  const isLoading = scorecardLoading || capaLoading;

  if (isLoading) {
    return compact ? null : <Skeleton className="h-20 w-full" />;
  }

  if (!scorecard) return null;

  // Get score and grade from metrics
  const score = scorecard.metrics?.final_score ?? 0;
  const grade = scorecard.metrics?.score_grade ?? 'F';
  const rejectionRate = scorecard.metrics?.rejection_rate ?? 0;

  // Determine if we should show a warning
  const isProbation = approvalStatus?.toLowerCase() === 'probation' || scorecard.current_status?.toLowerCase() === 'probation';
  const isLowScore = score < 70;
  const hasOpenCapa = (capaMetrics?.open || 0) > 0;
  const hasCriticalCapa = (capaMetrics?.critical || 0) > 0;

  // Don't show if supplier is approved and score is good
  if (!isProbation && !isLowScore && !hasOpenCapa && !hasCriticalCapa) return null;

  const gradeConfig = GRADE_CONFIG[grade] || GRADE_CONFIG.F;
  const issues: string[] = [];

  if (isProbation) issues.push('Supplier is on probation');
  if (isLowScore) issues.push(`Low performance score (${score})`);
  if (rejectionRate > 5) {
    issues.push(`High rejection rate (${rejectionRate.toFixed(1)}%)`);
  }
  if (hasCriticalCapa) issues.push(`${capaMetrics?.critical} critical CAPA(s) open`);
  if (hasOpenCapa && !hasCriticalCapa) issues.push(`${capaMetrics?.open} open CAPA(s)`);

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
        isProbation ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200" 
          : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
      )}>
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <Badge variant="outline" className={cn("border-current", gradeConfig.color)}>
          {isProbation ? 'Probation' : 'At Risk'} - Score: {score} ({grade})
        </Badge>
        {onViewScorecard && (
          <Button variant="ghost" size="sm" onClick={onViewScorecard} className="h-6 px-2 ml-auto">
            View Details
          </Button>
        )}
      </div>
    );
  }

  return (
    <Alert variant="destructive" className={cn(
      "border-2",
      isProbation ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" 
        : "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
    )}>
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="flex items-center gap-2">
        {isProbation ? 'Supplier on Probation' : 'Supplier Performance Warning'}
        <Badge className={cn(gradeConfig.bgColor, gradeConfig.color, "border-0")}>
          Score: {score} ({grade})
        </Badge>
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          {supplierName && (
            <p className="font-medium">
              {supplierName}
            </p>
          )}
          
          {issues.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Issues detected:</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Performance summary */}
          <div className="flex flex-wrap gap-4 text-sm pt-2">
            <div>
              <span className="text-muted-foreground">Rejection Rate: </span>
              <span className="font-medium">{rejectionRate.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">CAPAs: </span>
              <span className="font-medium">{scorecard.metrics?.total_capas || 0}</span>
            </div>
            {capaMetrics && (
              <div>
                <span className="text-muted-foreground">Open CAPAs: </span>
                <span className="font-medium">{capaMetrics.open || 0}</span>
              </div>
            )}
          </div>

          {onViewScorecard && (
            <Button variant="outline" size="sm" onClick={onViewScorecard} className="mt-2">
              <TrendingDown className="h-4 w-4 mr-1" />
              View Full Scorecard
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
