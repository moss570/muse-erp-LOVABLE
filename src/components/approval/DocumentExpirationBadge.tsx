import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { differenceInDays, parseISO, isValid } from 'date-fns';

interface DocumentExpirationBadgeProps {
  expirationDate: string | null | undefined;
  showDays?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

type ExpirationStatus = 'expired' | 'expiring_soon' | 'valid' | 'no_expiry';

function getExpirationStatus(dateString: string | null | undefined): {
  status: ExpirationStatus;
  daysUntil: number | null;
} {
  if (!dateString) {
    return { status: 'no_expiry', daysUntil: null };
  }

  const date = parseISO(dateString);
  if (!isValid(date)) {
    return { status: 'no_expiry', daysUntil: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = differenceInDays(date, today);

  if (daysUntil < 0) {
    return { status: 'expired', daysUntil };
  } else if (daysUntil <= 45) {
    return { status: 'expiring_soon', daysUntil };
  } else {
    return { status: 'valid', daysUntil };
  }
}

const statusConfig: Record<ExpirationStatus, {
  label: string;
  className: string;
  icon: React.ElementType;
}> = {
  expired: {
    label: 'Expired',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
    icon: XCircle,
  },
  expiring_soon: {
    label: 'Expiring Soon',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
    icon: AlertTriangle,
  },
  valid: {
    label: 'Valid',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  no_expiry: {
    label: 'No Expiry',
    className: 'bg-muted text-muted-foreground border-muted',
    icon: CheckCircle2,
  },
};

export function DocumentExpirationBadge({
  expirationDate,
  showDays = true,
  size = 'md',
  className,
}: DocumentExpirationBadgeProps) {
  const { status, daysUntil } = getExpirationStatus(expirationDate);
  const config = statusConfig[status];
  const Icon = config.icon;

  const getDaysLabel = () => {
    if (daysUntil === null) return '';
    if (daysUntil === 0) return '(today)';
    if (daysUntil < 0) return `(${Math.abs(daysUntil)} days ago)`;
    return `(${daysUntil} days)`;
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium gap-1.5 border',
        config.className,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-0.5',
        className
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {config.label}
      {showDays && daysUntil !== null && (
        <span className="opacity-75">{getDaysLabel()}</span>
      )}
    </Badge>
  );
}

// Export the helper function for use in other components
export { getExpirationStatus, type ExpirationStatus };
