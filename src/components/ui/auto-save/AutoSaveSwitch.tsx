import React, { useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { FieldSaveIndicator } from './FieldSaveIndicator';
import { useAutoSaveContext } from './AutoSaveProvider';

interface AutoSaveSwitchProps {
  name: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  showIndicator?: boolean;
  disabled?: boolean;
}

/**
 * Switch that auto-saves immediately on change.
 */
export function AutoSaveSwitch({
  name,
  checked,
  onCheckedChange,
  showIndicator = true,
  disabled,
}: AutoSaveSwitchProps) {
  const { saveField, savingFields, savedFields, errors } = useAutoSaveContext();

  const handleChange = useCallback(async (newChecked: boolean) => {
    onCheckedChange?.(newChecked);
    await saveField(name, newChecked);
  }, [name, saveField, onCheckedChange]);

  const isSaving = savingFields.has(name);
  const isSaved = savedFields.has(name);
  const error = errors[name];

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={checked}
        onCheckedChange={handleChange}
        disabled={disabled || isSaving}
      />
      {showIndicator && (
        <FieldSaveIndicator
          fieldName={name}
          isSaving={isSaving}
          isSaved={isSaved}
          error={error}
        />
      )}
    </div>
  );
}
