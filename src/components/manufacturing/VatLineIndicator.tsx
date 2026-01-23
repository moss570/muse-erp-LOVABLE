import { Beaker } from "lucide-react";
import { cn } from "@/lib/utils";

interface VatLineIndicatorProps {
  workOrderCount: number;
  totalVolume: number;
  volumeUnit?: string;
}

export function VatLineIndicator({ 
  workOrderCount, 
  totalVolume, 
  volumeUnit = "GAL" 
}: VatLineIndicatorProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium bg-muted"
    )}>
      <Beaker className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">
        {workOrderCount} WO{workOrderCount !== 1 ? "s" : ""} · {totalVolume.toFixed(0)} {volumeUnit.toLowerCase()}
      </span>
    </div>
  );
}
