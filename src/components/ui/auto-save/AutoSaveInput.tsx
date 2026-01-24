import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { FieldSaveIndicator } from './FieldSaveIndicator';
import { useAutoSaveContext } from './AutoSaveProvider';
import { cn } from '@/lib/utils';

interface AutoSaveInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onBlur' | 'value'> {
  name: string;
  value: string;
  onValueChange?: (value: string) => void;
  label?: string;
  showIndicator?: boolean;
  transformValue?: (value: string) => string;
}

/**
 * Input that auto-saves on blur.
 */
export function AutoSaveInput({
  name,
  value,
  onValueChange,
  label,
  showIndicator = true,
  transformValue,
  className,
  ...props
}: AutoSaveInputProps) {
  const { queueSave, savingFields, savedFields, errors } = useAutoSaveContext();
  const [localValue, setLocalValue] = useState(value);

  // Sync local value when prop changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onValueChange?.(newValue);
  }, [onValueChange]);

  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      const valueToSave = transformValue ? transformValue(localValue) : localValue;
      queueSave(name, valueToSave || null);
    }
  }, [localValue, value, name, queueSave, transformValue]);

  const isSaving = savingFields.has(name);
  const isSaved = savedFields.has(name);
  const error = errors[name];

  return (
    <div className="relative">
      <Input
        {...props}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
      />
      {showIndicator && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <FieldSaveIndicator
            fieldName={name}
            isSaving={isSaving}
            isSaved={isSaved}
            error={error}
          />
        </div>
      )}
    </div>
  );
}
