import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PolicyCategory } from '@/types/policies';

interface PolicyCategoryBadgeProps {
  category: PolicyCategory | Pick<PolicyCategory, 'name' | 'color_hex' | 'icon_name'>;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-sm px-3 py-1',
};

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export function PolicyCategoryBadge({
  category,
  size = 'md',
  showIcon = true,
  className,
}: PolicyCategoryBadgeProps) {
  // Generate text color from hex (simple contrast detection)
  const getTextColor = (hexColor?: string) => {
    if (!hexColor) return '';

    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return dark text for light backgrounds, light text for dark backgrounds
    return luminance > 0.5 ? '#1f2937' : '#ffffff';
  };

  const backgroundColor = category.color_hex || '#6b7280';
  const textColor = getTextColor(category.color_hex);

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium gap-1.5 border',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${backgroundColor}15`,
        borderColor: `${backgroundColor}40`,
        color: backgroundColor,
      }}
    >
      {showIcon && category.icon_name && (
        <span className={iconSizeClasses[size]} aria-label={category.icon_name}>
          {/* Icon placeholder - in real implementation, map icon_name to actual icon */}
          📁
        </span>
      )}
      {category.name}
    </Badge>
  );
}
