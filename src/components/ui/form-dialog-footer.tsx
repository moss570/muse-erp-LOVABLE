import * as React from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface FormDialogFooterProps {
  onClose: () => void;
  onSave?: () => void;
  onSaveAndClose?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  saveAndCloseLabel?: string;
  closeLabel?: string;
  showSaveAndClose?: boolean;
  disabled?: boolean;
  variant?: "default" | "destructive";
  children?: React.ReactNode;
}

export function FormDialogFooter({
  onClose,
  onSave,
  onSaveAndClose,
  isSaving = false,
  saveLabel = "Save",
  saveAndCloseLabel = "Save & Close",
  closeLabel = "Close",
  showSaveAndClose = true,
  disabled = false,
  variant = "default",
  children,
}: FormDialogFooterProps) {
  return (
    <DialogFooter className="gap-2 sm:gap-2">
      {children}
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={isSaving}
      >
        {closeLabel}
      </Button>
      {onSave && (
        <Button
          type="button"
          variant={variant}
          disabled={disabled || isSaving}
          onClick={onSave}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saveLabel}
        </Button>
      )}
      {showSaveAndClose && onSaveAndClose && (
        <Button
          type="button"
          variant={variant}
          disabled={disabled || isSaving}
          onClick={onSaveAndClose}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saveAndCloseLabel}
        </Button>
      )}
    </DialogFooter>
  );
}
