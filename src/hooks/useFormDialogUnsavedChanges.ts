import { useState, useCallback } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';

/**
 * Hook to manage unsaved changes detection and dialog state for form dialogs.
 * 
 * USAGE:
 * 1. Pass your form and onOpenChange callback
 * 2. Use handleDialogOpenChange as the Dialog's onOpenChange prop
 * 3. Render UnsavedChangesDialog with the returned props
 * 
 * EXAMPLE:
 * ```tsx
 * import { useFormDialogUnsavedChanges } from '@/hooks/useFormDialogUnsavedChanges';
 * import { UnsavedChangesDialog } from '@/components/ui/staged-edit';
 * 
 * function MyFormDialog({ open, onOpenChange }) {
 *   const form = useForm<MyFormData>({ ... });
 *   const isSubmitting = mutation.isPending;
 * 
 *   const {
 *     showUnsavedChangesDialog,
 *     setShowUnsavedChangesDialog,
 *     handleDialogOpenChange,
 *     handleDiscardChanges,
 *     handleSaveAndClose,
 *   } = useFormDialogUnsavedChanges({
 *     form,
 *     onOpenChange,
 *     onSave: async () => {
 *       await form.handleSubmit(mySubmitHandler)();
 *     },
 *   });
 * 
 *   return (
 *     <>
 *       <Dialog open={open} onOpenChange={handleDialogOpenChange}>
 *         ...
 *       </Dialog>
 *       <UnsavedChangesDialog
 *         open={showUnsavedChangesDialog}
 *         onOpenChange={setShowUnsavedChangesDialog}
 *         onDiscard={handleDiscardChanges}
 *         onKeepEditing={() => setShowUnsavedChangesDialog(false)}
 *         onSaveAndClose={handleSaveAndClose}
 *         showSaveOption={true}
 *         isSaving={isSubmitting}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

export interface UseFormDialogUnsavedChangesOptions<T extends FieldValues> {
  /** The react-hook-form instance */
  form: UseFormReturn<T>;
  /** The original onOpenChange callback from the dialog props */
  onOpenChange: (open: boolean) => void;
  /** Async function to save the form data. Should handle validation and submission. */
  onSave?: () => Promise<void>;
}

export interface UseFormDialogUnsavedChangesReturn {
  /** Whether the unsaved changes dialog is currently shown */
  showUnsavedChangesDialog: boolean;
  /** Setter for the dialog visibility state */
  setShowUnsavedChangesDialog: (show: boolean) => void;
  /** 
   * Replacement for the Dialog's onOpenChange prop.
   * Intercepts close attempts and shows the unsaved changes dialog if there are dirty fields.
   */
  handleDialogOpenChange: (newOpen: boolean) => void;
  /** Handler for discarding changes - resets form and closes dialog */
  handleDiscardChanges: () => void;
  /** Handler for saving and closing - validates, saves, then closes dialog */
  handleSaveAndClose: () => Promise<void>;
}

export function useFormDialogUnsavedChanges<T extends FieldValues>({
  form,
  onOpenChange,
  onSave,
}: UseFormDialogUnsavedChangesOptions<T>): UseFormDialogUnsavedChangesReturn {
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);

  const handleDialogOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && form.formState.isDirty) {
      // User is trying to close and there are unsaved changes
      setShowUnsavedChangesDialog(true);
    } else {
      onOpenChange(newOpen);
    }
  }, [form.formState.isDirty, onOpenChange]);

  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    form.reset();
    onOpenChange(false);
  }, [form, onOpenChange]);

  const handleSaveAndClose = useCallback(async () => {
    if (onSave) {
      const isValid = await form.trigger();
      if (isValid) {
        await onSave();
      }
    }
    setShowUnsavedChangesDialog(false);
  }, [form, onSave]);

  return {
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    handleDialogOpenChange,
    handleDiscardChanges,
    handleSaveAndClose,
  };
}
