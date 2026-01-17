import React from 'react';
import { Check, Loader2, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutoSaveContext } from './AutoSaveProvider';

interface FormSaveStatusProps {
  className?: string;
}

/**
 * Shows overall form save status: "All changes saved" or "Saving..."
 */
export function FormSaveStatus({ className }: FormSaveStatusProps) {
  const { isSaving, lastSaved, errors } = useAutoSaveContext();

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving...</span>
        </>
      ) : hasErrors ? (
        <>
          <Cloud className="h-4 w-4 text-destructive" />
          <span className="text-destructive">Some changes failed to save</span>
        </>
      ) : lastSaved ? (
        <>
          <Check className="h-4 w-4 text-emerald-500" />
          <span>All changes saved</span>
        </>
      ) : (
        <>
          <Cloud className="h-4 w-4" />
          <span>Changes save automatically</span>
        </>
      )}
    </div>
  );
}
