import React, { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldSaveIndicator } from './FieldSaveIndicator';
import { useAutoSaveContext } from './AutoSaveProvider';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface AutoSaveSelectProps {
  name: string;
  value: string;
  options: SelectOption[];
  onValueChange?: (value: string) => void;
  placeholder?: string;
  showIndicator?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * Select that auto-saves immediately on change.
 */
export function AutoSaveSelect({
  name,
  value,
  options,
  onValueChange,
  placeholder = 'Select...',
  showIndicator = true,
  className,
  disabled,
}: AutoSaveSelectProps) {
  const { saveField, savingFields, savedFields, errors } = useAutoSaveContext();

  const handleChange = useCallback(async (newValue: string) => {
    onValueChange?.(newValue);
    await saveField(name, newValue || null);
  }, [name, saveField, onValueChange]);

  const isSaving = savingFields.has(name);
  const isSaved = savedFields.has(name);
  const error = errors[name];

  return (
    <div className="relative flex items-center gap-2">
      <Select value={value} onValueChange={handleChange} disabled={disabled || isSaving}>
        <SelectTrigger className={cn(
          error && "border-destructive focus:ring-destructive",
          className
        )}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
