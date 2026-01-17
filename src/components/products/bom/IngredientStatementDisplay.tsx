import { useState, useEffect } from "react";
import { getIngredientStatementPreviewForRecipe } from "@/lib/ingredientStatement";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Info } from "lucide-react";

interface IngredientStatementDisplayProps {
  recipeId: string;
}

export function IngredientStatementDisplay({ recipeId }: IngredientStatementDisplayProps) {
  const [statement, setStatement] = useState<{
    statement: string;
    itemCount: number;
    hasItems: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStatement() {
      setIsLoading(true);
      try {
        const result = await getIngredientStatementPreviewForRecipe(recipeId);
        if (!cancelled) {
          setStatement(result);
        }
      } catch (error) {
        console.error("Error loading ingredient statement:", error);
        if (!cancelled) {
          setStatement({
            statement: "Error loading ingredient statement",
            itemCount: 0,
            hasItems: false,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadStatement();

    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ingredient Statement
          </Label>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground p-4 bg-muted rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!statement) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Ingredient Statement
        </Label>
        <Badge variant="secondary" className="text-xs">
          Auto-generated from Label Copy
        </Badge>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm leading-relaxed">
          {statement.statement}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        {statement.hasItems ? (
          <>
            {statement.itemCount} ingredient{statement.itemCount !== 1 ? "s" : ""} • Sorted by weight (descending) • Source: Material "Label Copy" field
          </>
        ) : (
          "Add materials to BOM to generate statement"
        )}
      </p>

      {/* Help text */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <strong>Auto-Generated:</strong> This statement is automatically created from the "Label Copy" field of each material in this BOM, sorted by quantity (weight) from highest to lowest. To modify, update the Label Copy field in the Material Edit form.
        </div>
      </div>
    </div>
  );
}