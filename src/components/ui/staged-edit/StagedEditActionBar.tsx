import React from 'react';
import { Button } from '@/components/ui/button';
import { useStagedEditContext } from './StagedEditProvider';
import { Loader2, Save, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StagedEditActionBarProps {
  onSave: () => void;
  saveLabel?: string;
  className?: string;
}

/**
 * Sticky action bar that appears at the bottom when in edit mode.
 * Shows Discard, Cancel, and Save buttons.
 */
export function StagedEditActionBar({
  onSave,
  saveLabel = 'Save Changes',
  className,
}: StagedEditActionBarProps) {
  const { isEditing, isDirty, isSaving, cancelEdit, discardChanges, resourceName } = useStagedEditContext();

  if (!isEditing) {
    return null;
  }

  return (
    <div
      className={cn(
        "sticky bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]",
        "px-4 py-3",
        "flex items-center justify-between gap-4",
        "animate-in slide-in-from-bottom-2 duration-200",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-muted-foreground">
          Editing {resourceName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={discardChanges}
          disabled={!isDirty || isSaving}
          className="text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Discard
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={cancelEdit}
          disabled={isSaving}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" />
              {saveLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
