import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FieldSaveIndicatorProps {
  fieldName: string;
  isSaving: boolean;
  isSaved: boolean;
  error?: string;
  className?: string;
}

/**
 * Visual indicator for field save status.
 * Shows nothing when idle, spinner when saving, checkmark when saved, X when error.
 */
export function FieldSaveIndicator({
  fieldName,
  isSaving,
  isSaved,
  error,
  className,
}: FieldSaveIndicatorProps) {
  if (!isSaving && !isSaved && !error) {
    return null;
  }

  if (isSaving) {
    return (
      <Loader2 
        className={cn("h-4 w-4 animate-spin text-muted-foreground", className)} 
        aria-label="Saving..."
      />
    );
  }

  if (error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertCircle 
            className={cn("h-4 w-4 text-destructive cursor-help", className)} 
            aria-label="Save failed"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{error}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isSaved) {
    return (
      <Check 
        className={cn(
          "h-4 w-4 text-emerald-500 animate-in fade-in duration-200",
          className
        )} 
        aria-label="Saved"
      />
    );
  }

  return null;
}
