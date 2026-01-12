import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AllergenItem {
  materialId: string;
  materialName: string;
  materialCode: string;
  allergens: string[];
  isApproved: boolean;
}

interface AllergenAcknowledgmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allergenItems: AllergenItem[];
  onAcknowledge: (notes?: string) => void;
  isTrialBatch?: boolean;
}

export function AllergenAcknowledgmentDialog({
  open,
  onOpenChange,
  allergenItems,
  onAcknowledge,
  isTrialBatch = false,
}: AllergenAcknowledgmentDialogProps) {
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");

  const hasUnapprovedMaterials = allergenItems.some((item) => !item.isApproved);
  const allAllergens = [...new Set(allergenItems.flatMap((item) => item.allergens))];
  const allAcknowledged = allergenItems.every((item) =>
    acknowledged.has(item.materialId)
  );

  const handleAcknowledge = (materialId: string, checked: boolean) => {
    setAcknowledged((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(materialId);
      } else {
        next.delete(materialId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onAcknowledge(notes || undefined);
    setAcknowledged(new Set());
    setNotes("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setAcknowledged(new Set());
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-6 w-6" />
            {hasUnapprovedMaterials
              ? "Allergen & Approval Warning"
              : "Allergen Warning"}
          </DialogTitle>
          <DialogDescription>
            {isTrialBatch
              ? "This trial batch contains materials that require acknowledgment before proceeding."
              : "Please review and acknowledge the following before proceeding with production."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Overall Allergen Summary */}
          {allAllergens.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                Allergens in this batch:
              </p>
              <div className="flex flex-wrap gap-2">
                {allAllergens.map((allergen) => (
                  <Badge key={allergen} variant="destructive">
                    {allergen}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Unapproved Materials Warning */}
          {hasUnapprovedMaterials && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Unapproved Materials Detected
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {isTrialBatch
                      ? "Using unapproved materials is allowed for R&D trials."
                      : "This batch contains unapproved materials and should only be used for trials."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Individual Material Acknowledgments */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {allergenItems.map((item) => (
              <div
                key={item.materialId}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  acknowledged.has(item.materialId)
                    ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                    : "bg-muted/50"
                )}
              >
                <Checkbox
                  id={item.materialId}
                  checked={acknowledged.has(item.materialId)}
                  onCheckedChange={(checked) =>
                    handleAcknowledge(item.materialId, checked as boolean)
                  }
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor={item.materialId}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {item.materialName}
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {item.materialCode}
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {item.allergens.map((allergen) => (
                      <Badge
                        key={allergen}
                        variant="outline"
                        className="text-xs border-amber-400 text-amber-700"
                      >
                        {allergen}
                      </Badge>
                    ))}
                    {!item.isApproved && (
                      <Badge variant="destructive" className="text-xs">
                        Unapproved
                      </Badge>
                    )}
                  </div>
                </div>
                {acknowledged.has(item.materialId) && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="ack-notes">Acknowledgment Notes (Optional)</Label>
            <Textarea
              id="ack-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about allergen handling..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!allAcknowledged}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Acknowledge & Proceed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}