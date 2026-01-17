import React, { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ViewModeValueProps {
  value: any;
  type?: 'text' | 'email' | 'phone' | 'url' | 'currency' | 'boolean' | 'badge' | 'date';
  emptyText?: string;
  className?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  formatOptions?: Intl.NumberFormatOptions;
}

/**
 * Utility component for rendering values nicely in view mode.
 * Handles common formatting patterns like currency, dates, booleans, etc.
 */
export function ViewModeValue({
  value,
  type = 'text',
  emptyText = '—',
  className,
  badgeVariant = 'secondary',
  formatOptions,
}: ViewModeValueProps) {
  // Handle empty/null/undefined values
  if (value === null || value === undefined || value === '') {
    return <span className={cn("text-muted-foreground", className)}>{emptyText}</span>;
  }

  switch (type) {
    case 'currency':
      const amount = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(amount)) {
        return <span className={cn("text-muted-foreground", className)}>{emptyText}</span>;
      }
      return (
        <span className={cn("font-mono", className)}>
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            ...formatOptions,
          }).format(amount)}
        </span>
      );

    case 'boolean':
      return (
        <Badge 
          variant={value ? 'default' : 'secondary'} 
          className={cn(value ? 'bg-emerald-100 text-emerald-800' : '', className)}
        >
          {value ? 'Yes' : 'No'}
        </Badge>
      );

    case 'badge':
      return (
        <Badge variant={badgeVariant} className={className}>
          {String(value)}
        </Badge>
      );

    case 'date':
      try {
        const date = new Date(value);
        return (
          <span className={className}>
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        );
      } catch {
        return <span className={className}>{String(value)}</span>;
      }

    case 'email':
      return (
        <a 
          href={`mailto:${value}`} 
          className={cn("text-primary hover:underline", className)}
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );

    case 'phone':
      return (
        <a 
          href={`tel:${value}`} 
          className={cn("text-primary hover:underline", className)}
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );

    case 'url':
      const url = value.startsWith('http') ? value : `https://${value}`;
      return (
        <a 
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("text-primary hover:underline", className)}
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );

    case 'text':
    default:
      return <span className={className}>{String(value)}</span>;
  }
}
