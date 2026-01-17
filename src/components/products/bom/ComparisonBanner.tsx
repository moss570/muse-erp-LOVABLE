import { useState, useEffect } from "react";
import { compareBOMToPrimary, BOMComparison } from "@/lib/bomAggregation";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface ComparisonBannerProps {
  subRecipeId: string;
  primaryRecipeId: string;
}

export function ComparisonBanner({ subRecipeId, primaryRecipeId }: ComparisonBannerProps) {
  const [comparison, setComparison] = useState<BOMComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadComparison() {
      setIsLoading(true);
      try {
        const result = await compareBOMToPrimary(subRecipeId, primaryRecipeId);
        if (!cancelled) {
          setComparison(result);
        }
      } catch (error) {
        console.error("Error comparing BOMs:", error);
        if (!cancelled) {
          setComparison(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadComparison();

    return () => {
      cancelled = true;
    };
  }, [subRecipeId, primaryRecipeId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Comparing to Primary BOM...
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  if (comparison.isExactMatch) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200">
        <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
        <span className="font-medium">This Sub BOM matches the Primary BOM exactly</span>
      </div>
    );
  }

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-medium">Differences from Primary BOM:</span>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            {comparison.differences.map((diff, index) => (
              <li key={index}>{diff.description}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}