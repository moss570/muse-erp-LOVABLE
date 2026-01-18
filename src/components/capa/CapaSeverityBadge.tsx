import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CAPA_SEVERITY_CONFIG, type CapaSeverity } from '@/types/capa';

interface CapaSeverityBadgeProps {
  severity: CapaSeverity;
  className?: string;
}

export function CapaSeverityBadge({ severity, className }: CapaSeverityBadgeProps) {
  const config = CAPA_SEVERITY_CONFIG[severity];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.bgColor, 
        config.color, 
        config.borderColor,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
