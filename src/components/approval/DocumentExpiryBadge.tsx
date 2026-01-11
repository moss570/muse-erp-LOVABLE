import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';

interface DocumentExpiryBadgeProps {
  expiryDate: string | null | undefined;
  size?: 'sm' | 'default';
}

export function DocumentExpiryBadge({ expiryDate, size = 'default' }: DocumentExpiryBadgeProps) {
  if (!expiryDate) {
    return null;
  }

  const today = new Date();
  const expiry = parseISO(expiryDate);
  const daysUntilExpiry = differenceInDays(expiry, today);

  const iconClass = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  if (daysUntilExpiry < 0) {
    return (
      <Badge 
        variant="outline" 
        className="bg-destructive/10 text-destructive border-destructive/30 gap-1"
      >
        <Clock className={iconClass} />
        Expired {format(expiry, 'MMM d, yyyy')}
      </Badge>
    );
  }

  if (daysUntilExpiry <= 30) {
    return (
      <Badge 
        variant="outline" 
        className="bg-amber-500/10 text-amber-700 border-amber-500/30 gap-1"
      >
        <AlertTriangle className={iconClass} />
        {daysUntilExpiry === 0 ? 'Expires today' : `${daysUntilExpiry}d left`}
      </Badge>
    );
  }

  if (daysUntilExpiry <= 90) {
    return (
      <Badge 
        variant="outline" 
        className="bg-blue-500/10 text-blue-700 border-blue-500/30 gap-1"
      >
        <Clock className={iconClass} />
        {format(expiry, 'MMM d, yyyy')}
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className="bg-green-500/10 text-green-700 border-green-500/30 gap-1"
    >
      <CheckCircle2 className={iconClass} />
      Valid until {format(expiry, 'MMM d, yyyy')}
    </Badge>
  );
}
