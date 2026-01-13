import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Beaker, Palette, Package } from "lucide-react";
import type { ProductionStage } from "@/hooks/useProductionStages";

interface ProductionStageSelectorProps {
  selectedStage: ProductionStage;
  onStageChange: (stage: ProductionStage) => void;
  disabled?: boolean;
}

const stages: { id: ProductionStage; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "base",
    label: "Base Manufacturing",
    description: "Create base mix (requires QA release)",
    icon: <Beaker className="h-6 w-6" />,
  },
  {
    id: "flavoring",
    label: "Flavoring",
    description: "Add flavors to approved base",
    icon: <Palette className="h-6 w-6" />,
  },
  {
    id: "finished",
    label: "Freezing & Tubbing",
    description: "Package into finished goods",
    icon: <Package className="h-6 w-6" />,
  },
];

export function ProductionStageSelector({
  selectedStage,
  onStageChange,
  disabled,
}: ProductionStageSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Production Stage</label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {stages.map((stage, index) => (
          <Card
            key={stage.id}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50",
              selectedStage === stage.id && "border-primary ring-2 ring-primary/20",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && onStageChange(stage.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  selectedStage === stage.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {stage.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Step {index + 1}
                    </Badge>
                  </div>
                  <h3 className="font-semibold mt-1">{stage.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stage.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
