import React, { useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { FieldSaveIndicator } from './FieldSaveIndicator';
import { useAutoSaveContext } from './AutoSaveProvider';
import { cn } from '@/lib/utils';

interface AutoSaveTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'onBlur' | 'value'> {
  name: string;
  value: string;
  onValueChange?: (value: string) => void;
  showIndicator?: boolean;
}

/**
 * Textarea that auto-saves on blur.
 */
export function AutoSaveTextarea({
  name,
  value,
  onValueChange,
  showIndicator = true,
  className,
  ...props
}: AutoSaveTextareaProps) {
  const { queueSave, savingFields, savedFields, errors } = useAutoSaveContext();
  const [localValue, setLocalValue] = useState(value);

  // Sync local value when prop changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onValueChange?.(newValue);
  }, [onValueChange]);

  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      queueSave(name, localValue || null);
    }
  }, [localValue, value, name, queueSave]);

  const isSaving = savingFields.has(name);
  const isSaved = savedFields.has(name);
  const error = errors[name];

  return (
    <div className="relative">
      <Textarea
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
        <div className="absolute right-3 top-3">
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
