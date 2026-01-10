import { useState, useCallback, useEffect } from 'react';
import { useOptimisticLock } from './useOptimisticLock';
import { useEditPresence } from './useEditPresence';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

interface UseConcurrentEditOptions {
  resourceType: string;
  resourceId: string | undefined;
  tableName: TableName;
  enabled?: boolean;
  resourceName?: string;
  onDataRefresh?: (data: Record<string, unknown>) => void;
}

/**
 * Combined hook for handling concurrent editing scenarios.
 * Provides both optimistic locking and real-time presence tracking.
 * 
 * Usage:
 * ```tsx
 * const {
 *   otherEditors,
 *   hasConflict,
 *   conflictData,
 *   initializeEdit,
 *   checkBeforeSave,
 *   resolveConflict,
 * } = useConcurrentEdit({
 *   resourceType: 'purchase_order',
 *   resourceId: poId,
 *   tableName: 'purchase_orders',
 *   resourceName: 'Purchase Order',
 * });
 * ```
 */
export function useConcurrentEdit({
  resourceType,
  resourceId,
  tableName,
  enabled = true,
  resourceName = 'record',
  onDataRefresh,
}: UseConcurrentEditOptions) {
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [latestServerData, setLatestServerData] = useState<Record<string, unknown> | null>(null);

  // Optimistic locking
  const {
    originalUpdatedAt,
    hasConflict,
    conflictData,
    initializeLock,
    checkForConflict,
    resolveWithLocal,
    resolveWithServer,
    resetLock,
  } = useOptimisticLock<Record<string, unknown>>({ resourceName });

  // Real-time presence
  const {
    otherEditors,
    isRegistered,
    unregisterAsEditor,
  } = useEditPresence({
    resourceType,
    resourceId,
    enabled: enabled && !!resourceId,
  });

  // Initialize editing session with data
  const initializeEdit = useCallback((data: Record<string, unknown>) => {
    initializeLock(data);
  }, [initializeLock]);

  // Check for conflicts before saving
  const checkBeforeSave = useCallback(async (): Promise<{ canSave: boolean; latestData?: Record<string, unknown> }> => {
    if (!resourceId) return { canSave: true };

    // Fetch the latest version from the database
    const { data: latestData, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', resourceId)
      .single();

    if (error) {
      console.error('Error fetching latest data:', error);
      return { canSave: true }; // Allow save if we can't check
    }

    const dataRecord = latestData as Record<string, unknown>;
    const hasConflict = checkForConflict(dataRecord);
    
    if (hasConflict) {
      setLatestServerData(dataRecord);
      setShowConflictDialog(true);
      return { canSave: false, latestData: dataRecord };
    }

    return { canSave: true, latestData: dataRecord };
  }, [resourceId, tableName, checkForConflict]);

  // Resolve conflict by keeping local changes
  const handleKeepLocal = useCallback(() => {
    resolveWithLocal();
    setShowConflictDialog(false);
    setLatestServerData(null);
  }, [resolveWithLocal]);

  // Resolve conflict by accepting server changes
  const handleAcceptServer = useCallback(() => {
    const serverData = resolveWithServer();
    setShowConflictDialog(false);
    if (latestServerData && onDataRefresh) {
      onDataRefresh(latestServerData);
    }
    setLatestServerData(null);
    return serverData;
  }, [resolveWithServer, onDataRefresh, latestServerData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetLock();
    };
  }, [resetLock]);

  return {
    // Presence
    otherEditors,
    isRegistered,
    
    // Conflict state
    hasConflict,
    conflictData,
    showConflictDialog,
    latestServerData,
    
    // Actions
    initializeEdit,
    checkBeforeSave,
    handleKeepLocal,
    handleAcceptServer,
    setShowConflictDialog,
    unregisterAsEditor,
    
    // For manual conflict resolution
    resolveWithLocal,
    resolveWithServer,
    
    // Original timestamp for reference
    originalUpdatedAt,
  };
}
