import { useState, useEffect, useCallback, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface DebouncedTextareaProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  debounceMs?: number;
}

export function DebouncedTextarea({
  value: externalValue,
  onSave,
  placeholder,
  rows = 4,
  className,
  debounceMs = 1000,
}: DebouncedTextareaProps) {
  const [localValue, setLocalValue] = useState(externalValue || '');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef(externalValue || '');

  // Sync local value when external value changes (e.g., from database)
  useEffect(() => {
    // Only sync if the external value is different from what we last saved
    if (externalValue !== lastSavedRef.current) {
      setLocalValue(externalValue || '');
      lastSavedRef.current = externalValue || '';
    }
  }, [externalValue]);

  const debouncedSave = useCallback(
    (newValue: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (newValue !== lastSavedRef.current) {
          lastSavedRef.current = newValue;
          onSave(newValue);
        }
      }, debounceMs);
    },
    [onSave, debounceMs]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedSave(newValue);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Save on blur to ensure changes aren't lost
  const handleBlur = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (localValue !== lastSavedRef.current) {
      lastSavedRef.current = localValue;
      onSave(localValue);
    }
  };

  return (
    <Textarea
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      rows={rows}
      className={cn('mt-1', className)}
    />
  );
}
