import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface OptimisticLockState<T> {
  originalData: T | null;
  originalUpdatedAt: string | null;
  hasConflict: boolean;
  conflictData: T | null;
}

interface UseOptimisticLockOptions<T> {
  onConflict?: (serverData: T, localData: T) => void;
  resourceName?: string;
}

export function useOptimisticLock<T extends { updated_at?: string }>(
  options: UseOptimisticLockOptions<T> = {}
) {
  const { onConflict, resourceName = 'record' } = options;
  
  const [state, setState] = useState<OptimisticLockState<T>>({
    originalData: null,
    originalUpdatedAt: null,
    hasConflict: false,
    conflictData: null,
  });
  
  const localChangesRef = useRef<Partial<T> | null>(null);

  // Call this when loading data into the form
  const initializeLock = useCallback((data: T) => {
    setState({
      originalData: data,
      originalUpdatedAt: data.updated_at || null,
      hasConflict: false,
      conflictData: null,
    });
    localChangesRef.current = null;
  }, []);

  // Call this to track local changes
  const trackChanges = useCallback((changes: Partial<T>) => {
    localChangesRef.current = changes;
  }, []);

  // Check if the server data has been modified since we loaded it
  const checkForConflict = useCallback((serverData: T): boolean => {
    if (!state.originalUpdatedAt) return false;
    
    const serverUpdatedAt = serverData.updated_at;
    if (!serverUpdatedAt) return false;
    
    const hasConflict = new Date(serverUpdatedAt) > new Date(state.originalUpdatedAt);
    
    if (hasConflict) {
      setState(prev => ({
        ...prev,
        hasConflict: true,
        conflictData: serverData,
      }));
      
      onConflict?.(serverData, localChangesRef.current as T);
      
      toast.error(`This ${resourceName} was modified by another user`, {
        description: 'Please review the changes before saving.',
        duration: 5000,
      });
    }
    
    return hasConflict;
  }, [state.originalUpdatedAt, onConflict, resourceName]);

  // Resolve conflict by keeping local changes
  const resolveWithLocal = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasConflict: false,
      conflictData: null,
      // Update the original timestamp to the server's so next save will work
      originalUpdatedAt: prev.conflictData?.updated_at || prev.originalUpdatedAt,
    }));
  }, []);

  // Resolve conflict by accepting server changes
  const resolveWithServer = useCallback(() => {
    const serverData = state.conflictData;
    setState(prev => ({
      ...prev,
      hasConflict: false,
      conflictData: null,
      originalData: serverData,
      originalUpdatedAt: serverData?.updated_at || null,
    }));
    localChangesRef.current = null;
    return serverData;
  }, [state.conflictData]);

  // Reset the lock state
  const resetLock = useCallback(() => {
    setState({
      originalData: null,
      originalUpdatedAt: null,
      hasConflict: false,
      conflictData: null,
    });
    localChangesRef.current = null;
  }, []);

  return {
    originalData: state.originalData,
    originalUpdatedAt: state.originalUpdatedAt,
    hasConflict: state.hasConflict,
    conflictData: state.conflictData,
    initializeLock,
    trackChanges,
    checkForConflict,
    resolveWithLocal,
    resolveWithServer,
    resetLock,
  };
}
