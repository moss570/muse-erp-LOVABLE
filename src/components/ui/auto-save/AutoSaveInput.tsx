import React, { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { FieldSaveIndicator } from './FieldSaveIndicator';
import { useAutoSaveContext } from './AutoSaveProvider';
import { cn } from '@/lib/utils';

interface AutoSaveInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onBlur' | 'onFocus' | 'value'> {
  name: string;
  value: string;
  onValueChange?: (value: string) => void;
  label?: string;
  showIndicator?: boolean;
  transformValue?: (value: string) => string;
}

/**
 * Input that auto-saves on blur.
 * Uses a ref to track the original value when focus starts to ensure
 * changes are detected even when parent state updates synchronously.
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
  // Track the value when focus started to compare against on blur
  const originalValueRef = useRef(value);

  // Sync local value when prop changes (e.g., from external updates)
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleFocus = useCallback(() => {
    // Capture the current value when user starts editing
    originalValueRef.current = localValue;
  }, [localValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onValueChange?.(newValue);
  }, [onValueChange]);

  const handleBlur = useCallback(() => {
    // Compare against the original value captured on focus
    if (localValue !== originalValueRef.current) {
      const valueToSave = transformValue ? transformValue(localValue) : localValue;
      queueSave(name, valueToSave || null);
      // Update original ref after queuing save
      originalValueRef.current = localValue;
    }
  }, [localValue, name, queueSave, transformValue]);

  const isSaving = savingFields.has(name);
  const isSaved = savedFields.has(name);
  const error = errors[name];

  return (
    <div className="relative">
      <Input
        {...props}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
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
