import { cn } from '@/lib/utils';
import {
  FileText,
  ClipboardList,
  Wrench,
  ShieldCheck,
  FileSpreadsheet,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import type { PolicyType } from '@/types/policies';

interface PolicyTypeIconProps {
  policyType: PolicyType | Pick<PolicyType, 'abbreviation' | 'type_name'> | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

// Map policy type abbreviations to icons
const typeIconMap: Record<string, React.ElementType> = {
  POL: FileText,
  SOP: ClipboardList,
  WI: Wrench,
  HACCP: ShieldCheck,
  FORM: FileSpreadsheet,
  GUIDE: BookOpen,
  OTHER: FileText,
};

const typeColorMap: Record<string, string> = {
  POL: 'text-blue-600 dark:text-blue-400',
  SOP: 'text-purple-600 dark:text-purple-400',
  WI: 'text-amber-600 dark:text-amber-400',
  HACCP: 'text-red-600 dark:text-red-400',
  FORM: 'text-green-600 dark:text-green-400',
  GUIDE: 'text-indigo-600 dark:text-indigo-400',
  OTHER: 'text-muted-foreground',
};

export function PolicyTypeIcon({
  policyType,
  size = 'md',
  className,
  showTooltip = true,
}: PolicyTypeIconProps) {
  // Extract abbreviation from PolicyType object or string
  const abbreviation = typeof policyType === 'string'
    ? policyType
    : policyType.abbreviation;

  const typeName = typeof policyType === 'string'
    ? policyType
    : policyType.type_name || policyType.abbreviation;

  const Icon = typeIconMap[abbreviation] || FileText;
  const colorClass = typeColorMap[abbreviation] || typeColorMap.OTHER;

  return (
    <div className="relative inline-flex">
      <Icon
        className={cn(
          sizeClasses[size],
          colorClass,
          className
        )}
        aria-label={typeName}
        title={showTooltip ? typeName : undefined}
      />
    </div>
  );
}

// Badge variant that shows both icon and type name
interface PolicyTypeBadgeProps extends PolicyTypeIconProps {
  showLabel?: boolean;
}

export function PolicyTypeBadge({
  policyType,
  size = 'md',
  showLabel = true,
  className,
}: PolicyTypeBadgeProps) {
  const abbreviation = typeof policyType === 'string'
    ? policyType
    : policyType.abbreviation;

  const typeName = typeof policyType === 'string'
    ? policyType
    : policyType.type_name || policyType.abbreviation;

  const Icon = typeIconMap[abbreviation] || FileText;
  const colorClass = typeColorMap[abbreviation] || typeColorMap.OTHER;

  const badgeSizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
    xl: 'text-base px-4 py-1.5 gap-2',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border bg-background font-medium',
        badgeSizeClasses[size],
        className
      )}
    >
      <Icon className={cn(sizeClasses[size], colorClass)} />
      {showLabel && <span>{abbreviation}</span>}
    </div>
  );
}
