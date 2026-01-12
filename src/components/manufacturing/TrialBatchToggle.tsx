import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrialBatchToggleProps {
  isTrialBatch: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

export function TrialBatchToggle({
  isTrialBatch,
  onToggle,
  disabled,
}: TrialBatchToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border transition-colors",
        isTrialBatch
          ? "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700"
          : "bg-muted/50"
      )}
    >
      <div className="flex items-center gap-3">
        <FlaskConical
          className={cn(
            "h-5 w-5",
            isTrialBatch ? "text-amber-600" : "text-muted-foreground"
          )}
        />
        <div>
          <Label
            htmlFor="trial-mode"
            className="text-base font-semibold cursor-pointer"
          >
            R&D Trial Mode
          </Label>
          <p className="text-sm text-muted-foreground">
            {isTrialBatch
              ? "This batch will be flagged as R&D and cannot be shipped"
              : "Enable for experimental batches"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isTrialBatch && (
          <Badge
            variant="outline"
            className="border-amber-500 text-amber-700 dark:text-amber-400 gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            No Shipping
          </Badge>
        )}
        <Switch
          id="trial-mode"
          checked={isTrialBatch}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
      </div>
    </div>
  );
}