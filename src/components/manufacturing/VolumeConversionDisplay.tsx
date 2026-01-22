import { useMemo } from "react";
import { Calculator } from "lucide-react";

interface VolumeConversionDisplayProps {
  targetQuantityKg: number;
  batchSize: number | null;
  batchVolume: number | null;
  batchVolumeUnit: string | null;
}

export function VolumeConversionDisplay({
  targetQuantityKg,
  batchSize,
  batchVolume,
  batchVolumeUnit,
}: VolumeConversionDisplayProps) {
  const estimatedVolume = useMemo(() => {
    if (!batchVolume || !batchSize || targetQuantityKg <= 0) {
      return null;
    }

    // Calculate: (targetQty / batchSize) * batchVolume
    const numBatches = targetQuantityKg / batchSize;
    const volume = numBatches * batchVolume;

    return {
      value: volume,
      unit: batchVolumeUnit || "GAL",
      batches: numBatches,
    };
  }, [targetQuantityKg, batchSize, batchVolume, batchVolumeUnit]);

  if (!estimatedVolume) {
    return null;
  }

  return (
    <div className="bg-muted/50 rounded-md p-3 flex items-center gap-3">
      <Calculator className="h-4 w-4 text-muted-foreground" />
      <div className="text-sm">
        <span className="text-muted-foreground">Estimated Volume: </span>
        <span className="font-medium">
          {estimatedVolume.value.toFixed(1)} {estimatedVolume.unit}
        </span>
        <span className="text-muted-foreground text-xs ml-2">
          ({estimatedVolume.batches.toFixed(2)} batches)
        </span>
      </div>
    </div>
  );
}
