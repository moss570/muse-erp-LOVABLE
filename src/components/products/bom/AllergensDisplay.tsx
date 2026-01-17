import { useState, useEffect } from "react";
import { aggregateAllergensForRecipe } from "@/lib/bomAggregation";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface AllergensDisplayProps {
  recipeId: string;
}

export function AllergensDisplay({ recipeId }: AllergensDisplayProps) {
  const [allergens, setAllergens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAllergens() {
      setIsLoading(true);
      try {
        const result = await aggregateAllergensForRecipe(recipeId);
        if (!cancelled) {
          setAllergens(result);
        }
      } catch (error) {
        console.error("Error loading allergens:", error);
        if (!cancelled) {
          setAllergens([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAllergens();

    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Allergens
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
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        Allergens
      </Label>

      {allergens.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {allergens.map((allergen) => (
            <Badge
              key={allergen}
              variant="outline"
              className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700"
            >
              {allergen}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No allergens identified in materials
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Allergens are aggregated from all materials in this BOM
      </p>
    </div>
  );
}