import { Badge } from '@/components/ui/badge';
import type { QACheckSummary } from '@/types/qa-checks';

interface QATabBadgeProps {
  summary: QACheckSummary | null;
  showWhenZero?: boolean;
}

export function QATabBadge({ summary, showWhenZero = false }: QATabBadgeProps) {
  if (!summary) return null;
  
  const { totalIssues, criticalCount, importantCount } = summary;
  
  if (totalIssues === 0) {
    if (!showWhenZero) return null;
    return (
      <Badge variant="outline" className="ml-2 bg-green-100 text-green-700 border-green-200">
        ✓
      </Badge>
    );
  }
  
  // Critical issues - red badge
  if (criticalCount > 0) {
    return (
      <Badge variant="destructive" className="ml-2">
        {totalIssues}
      </Badge>
    );
  }
  
  // Important issues only - orange badge
  if (importantCount > 0) {
    return (
      <Badge className="ml-2 bg-orange-500 hover:bg-orange-600">
        {totalIssues}
      </Badge>
    );
  }
  
  // Recommendations only - yellow badge
  return (
    <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-700 border-yellow-200">
      {totalIssues}
    </Badge>
  );
}
