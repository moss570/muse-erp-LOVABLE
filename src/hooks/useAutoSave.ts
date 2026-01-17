import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

export interface UseAutoSaveOptions {
  tableName: TableName;
  recordId: string | undefined;
  debounceMs?: number;
  enabled?: boolean;
  queryKey?: string[];
  onSuccess?: (fieldName: string) => void;
  onError?: (fieldName: string, error: Error) => void;
}

export interface UseAutoSaveReturn {
  queueSave: (fieldName: string, value: any) => void;
  saveNow: () => Promise<void>;
  saveField: (fieldName: string, value: any) => Promise<boolean>;
  pendingChanges: Record<string, any>;
  savingFields: Set<string>;
  savedFields: Set<string>;
  isSaving: boolean;
  lastSaved: Date | null;
  errors: Record<string, string>;
  clearError: (fieldName: string) => void;
}

/**
 * Hook for auto-saving form fields to the database.
 * Queues changes and batches them after a debounce period.
 */
export function useAutoSave({
  tableName,
  recordId,
  debounceMs = 500,
  enabled = true,
  queryKey,
  onSuccess,
  onError,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Clear saved indicator after 1.5 seconds
  useEffect(() => {
    if (savedFields.size > 0) {
      const timer = setTimeout(() => {
        setSavedFields(new Set());
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [savedFields]);

  // Perform the actual save
  const performSave = useCallback(async (changes: Record<string, any>) => {
    if (!recordId || !enabled || Object.keys(changes).length === 0) return;

    const fieldNames = Object.keys(changes);
    setSavingFields(prev => new Set([...prev, ...fieldNames]));
    
    // Clear any previous errors for these fields
    setErrors(prev => {
      const next = { ...prev };
      fieldNames.forEach(f => delete next[f]);
      return next;
    });

    try {
      const { error } = await supabase
        .from(tableName as any)
        .update(changes)
        .eq('id', recordId);

      if (error) throw error;

      // Success
      setLastSaved(new Date());
      setSavedFields(new Set(fieldNames));
      
      // Invalidate query cache
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }

      fieldNames.forEach(field => onSuccess?.(field));
    } catch (err) {
      const error = err as Error;
      
      // Set errors for each field
      const errorMessage = error.message || 'Failed to save';
      setErrors(prev => {
        const next = { ...prev };
        fieldNames.forEach(f => { next[f] = errorMessage; });
        return next;
      });

      fieldNames.forEach(field => onError?.(field, error));

      // Retry once after 2 seconds
      setTimeout(async () => {
        try {
          const { error: retryError } = await supabase
            .from(tableName as any)
            .update(changes)
            .eq('id', recordId);

          if (!retryError) {
            setLastSaved(new Date());
            setSavedFields(new Set(fieldNames));
            setErrors(prev => {
              const next = { ...prev };
              fieldNames.forEach(f => delete next[f]);
              return next;
            });
            if (queryKey) {
              queryClient.invalidateQueries({ queryKey });
            }
            fieldNames.forEach(field => onSuccess?.(field));
          }
        } catch {
          // Retry failed, error state already set
        }
      }, 2000);
    } finally {
      setSavingFields(prev => {
        const next = new Set(prev);
        fieldNames.forEach(f => next.delete(f));
        return next;
      });
      setPendingChanges({});
    }
  }, [recordId, enabled, tableName, queryKey, queryClient, onSuccess, onError]);

  // Queue a field change (debounced)
  const queueSave = useCallback((fieldName: string, value: any) => {
    if (!enabled || !recordId) return;

    setPendingChanges(prev => ({ ...prev, [fieldName]: value }));

    // Clear existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce timer
    debounceRef.current = setTimeout(() => {
      setPendingChanges(current => {
        if (Object.keys(current).length > 0) {
          performSave(current);
        }
        return current;
      });
    }, debounceMs);
  }, [enabled, recordId, debounceMs, performSave]);

  // Save immediately (flush queue)
  const saveNow = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (Object.keys(pendingChanges).length > 0) {
      await performSave(pendingChanges);
    }
  }, [pendingChanges, performSave]);

  // Save a single field immediately (no debounce)
  const saveField = useCallback(async (fieldName: string, value: any): Promise<boolean> => {
    if (!enabled || !recordId) return false;

    setSavingFields(prev => new Set([...prev, fieldName]));
    setErrors(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });

    try {
      const { error } = await supabase
        .from(tableName as any)
        .update({ [fieldName]: value })
        .eq('id', recordId);

      if (error) throw error;

      setLastSaved(new Date());
      setSavedFields(new Set([fieldName]));
      
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }
      
      onSuccess?.(fieldName);
      return true;
    } catch (err) {
      const error = err as Error;
      setErrors(prev => ({ ...prev, [fieldName]: error.message || 'Failed to save' }));
      onError?.(fieldName, error);
      return false;
    } finally {
      setSavingFields(prev => {
        const next = new Set(prev);
        next.delete(fieldName);
        return next;
      });
    }
  }, [enabled, recordId, tableName, queryKey, queryClient, onSuccess, onError]);

  // Clear a specific error
  const clearError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    queueSave,
    saveNow,
    saveField,
    pendingChanges,
    savingFields,
    savedFields,
    isSaving: savingFields.size > 0,
    lastSaved,
    errors,
    clearError,
  };
}
