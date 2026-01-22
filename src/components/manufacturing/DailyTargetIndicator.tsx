import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface DailyTargetIndicatorProps {
  scheduledVolume: number;
  targetVolume: number;
  unit?: string;
}

export function DailyTargetIndicator({ 
  scheduledVolume, 
  targetVolume, 
  unit = "gal" 
}: DailyTargetIndicatorProps) {
  const percentage = targetVolume > 0 ? (scheduledVolume / targetVolume) * 100 : 0;
  
  const getStatus = () => {
    if (percentage >= 100) return { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" };
    if (percentage >= 80) return { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100" };
    return { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" };
  };
  
  const status = getStatus();
  const Icon = status.icon;
  
  if (targetVolume <= 0) return null;
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
      status.bg
    )}>
      <Icon className={cn("h-3.5 w-3.5", status.color)} />
      <span className={status.color}>
        {scheduledVolume.toFixed(0)}/{targetVolume.toFixed(0)} {unit}
      </span>
    </div>
  );
}
