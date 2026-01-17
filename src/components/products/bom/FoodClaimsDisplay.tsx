import { useState, useEffect } from "react";
import { aggregateFoodClaimsForRecipe } from "@/lib/bomAggregation";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";

interface FoodClaimsDisplayProps {
  recipeId: string;
}

export function FoodClaimsDisplay({ recipeId }: FoodClaimsDisplayProps) {
  const [claims, setClaims] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadClaims() {
      setIsLoading(true);
      try {
        const result = await aggregateFoodClaimsForRecipe(recipeId);
        if (!cancelled) {
          setClaims(result);
        }
      } catch (error) {
        console.error("Error loading food claims:", error);
        if (!cancelled) {
          setClaims([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadClaims();

    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Food Claims
        </Label>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-base font-semibold flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        Food Claims
      </Label>

      {claims.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {claims.map((claim) => (
            <Badge
              key={claim}
              variant="outline"
              className="bg-green-50 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200 dark:border-green-700"
            >
              {claim}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No food claims identified in materials
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Food claims are aggregated from all materials in this BOM
      </p>
    </div>
  );
}