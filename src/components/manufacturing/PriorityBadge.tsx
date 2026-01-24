import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  level: "critical" | "high" | "medium" | "low";
  rank?: number;
  className?: string;
}

const levelConfig = {
  critical: {
    emoji: "🔴",
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-950",
    border: "border-red-300 dark:border-red-800",
  },
  high: {
    emoji: "🟠",
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-950",
    border: "border-orange-300 dark:border-orange-800",
  },
  medium: {
    emoji: "🟡",
    color: "text-yellow-600",
    bg: "bg-yellow-100 dark:bg-yellow-950",
    border: "border-yellow-300 dark:border-yellow-800",
  },
  low: {
    emoji: "🟢",
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-950",
    border: "border-green-300 dark:border-green-800",
  },
};

export function PriorityBadge({ level, rank, className }: PriorityBadgeProps) {
  const config = levelConfig[level];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium border",
        config.bg,
        config.border,
        config.color,
        className
      )}
    >
      <span>{config.emoji}</span>
      {rank !== undefined && <span>{rank}</span>}
    </div>
  );
}

// Row background color helper for tables
export function getPriorityRowClass(level: "critical" | "high" | "medium" | "low"): string {
  switch (level) {
    case "critical":
      return "bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50";
    case "high":
      return "bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50";
    case "medium":
      return "bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50";
    case "low":
      return "bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50";
    default:
      return "";
  }
}
