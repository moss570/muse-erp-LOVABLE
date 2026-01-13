import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Calendar, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import type { ApprovedParentLot } from "@/hooks/useProductionStages";

interface ParentLotSelectorProps {
  parentLots: ApprovedParentLot[];
  selectedLotId: string | null;
  onLotSelect: (lotId: string) => void;
  quantityToConsume: number;
  onQuantityChange: (qty: number) => void;
  isLoading?: boolean;
  disabled?: boolean;
  stageLabel: string; // "base" or "flavored"
}

export function ParentLotSelector({
  parentLots,
  selectedLotId,
  onLotSelect,
  quantityToConsume,
  onQuantityChange,
  isLoading,
  disabled,
  stageLabel,
}: ParentLotSelectorProps) {
  const selectedLot = parentLots.find((lot) => lot.id === selectedLotId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg border bg-muted/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-muted-foreground">Loading approved {stageLabel} lots...</span>
      </div>
    );
  }

  if (parentLots.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Package className="h-4 w-4" />
          <span className="font-medium">No approved {stageLabel} lots available</span>
        </div>
        <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
          Complete and get QA approval for a {stageLabel} batch first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-primary" />
        <Label className="text-base font-semibold">Select {stageLabel.charAt(0).toUpperCase() + stageLabel.slice(1)} Lot to Use</Label>
      </div>

      <Select
        value={selectedLotId || ""}
        onValueChange={onLotSelect}
        disabled={disabled}
      >
        <SelectTrigger className="h-14">
          <SelectValue placeholder={`Select an approved ${stageLabel} lot`} />
        </SelectTrigger>
        <SelectContent>
          {parentLots.map((lot) => (
            <SelectItem key={lot.id} value={lot.id} className="py-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{lot.lot_number}</span>
                  <Badge variant="secondary" className="text-xs">
                    {lot.quantity_available?.toFixed(2)} available
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{lot.product?.name}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(lot.production_date), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedLot && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Available Quantity</Label>
            <div className="h-10 flex items-center px-3 bg-background rounded-md border font-mono">
              {selectedLot.quantity_available?.toFixed(2)} KG
            </div>
          </div>
          <div className="space-y-2">
            <Label>Quantity to Consume</Label>
            <Input
              type="number"
              step="0.01"
              value={quantityToConsume || ""}
              onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 0)}
              max={selectedLot.quantity_available || 0}
              disabled={disabled}
              className="h-10 font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}
