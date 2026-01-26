import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface QuickActionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  to: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'muted';
  badge?: string | number;
  disabled?: boolean;
}

const variantStyles = {
  default: 'bg-card hover:bg-accent border-border',
  primary: 'bg-primary/10 hover:bg-primary/20 border-primary/20',
  success: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20',
  warning: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20',
  muted: 'bg-muted/50 hover:bg-muted border-muted',
};

const iconVariantStyles = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  muted: 'text-muted-foreground',
};

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  to,
  variant = 'default',
  badge,
  disabled = false,
}: QuickActionCardProps) {
  const content = (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 min-h-[140px]',
        'active:scale-95 touch-manipulation',
        variantStyles[variant],
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {badge !== undefined && (
        <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
          {badge}
        </span>
      )}
      <Icon className={cn('h-10 w-10 mb-3', iconVariantStyles[variant])} />
      <span className="text-base font-semibold text-center leading-tight">{title}</span>
      {description && (
        <span className="text-xs text-muted-foreground text-center mt-1">{description}</span>
      )}
    </div>
  );

  if (disabled) {
    return content;
  }

  return (
    <Link to={to} className="block">
      {content}
    </Link>
  );
}
