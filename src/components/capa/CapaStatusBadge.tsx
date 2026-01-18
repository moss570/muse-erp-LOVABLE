import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CAPA_STATUS_CONFIG, type CapaStatus } from '@/types/capa';

interface CapaStatusBadgeProps {
  status: CapaStatus;
  className?: string;
}

export function CapaStatusBadge({ status, className }: CapaStatusBadgeProps) {
  const config = CAPA_STATUS_CONFIG[status];
  
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
