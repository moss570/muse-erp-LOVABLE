import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onKeepEditing: () => void;
  onSaveAndClose?: () => void;
  showSaveOption?: boolean;
  isSaving?: boolean;
}

/**
 * Dialog shown when user tries to close/navigate away with unsaved changes.
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  onKeepEditing,
  onSaveAndClose,
  showSaveOption = true,
  isSaving = false,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes that will be lost. What would you like to do?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isSaving}
            className="sm:order-1"
          >
            Discard Changes
          </Button>
          <Button
            variant="ghost"
            onClick={onKeepEditing}
            disabled={isSaving}
            className="sm:order-2"
          >
            Keep Editing
          </Button>
          {showSaveOption && onSaveAndClose && (
            <Button
              onClick={onSaveAndClose}
              disabled={isSaving}
              className="sm:order-3"
            >
              {isSaving ? 'Saving...' : 'Save & Close'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
