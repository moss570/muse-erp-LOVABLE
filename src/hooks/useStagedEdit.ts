import { useState, useCallback, useRef, useEffect } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';
import { useConcurrentEdit } from './useConcurrentEdit';
import { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

export interface UseStagedEditOptions<T extends FieldValues> {
  resourceType: string;
  resourceId: string | undefined;
  tableName: TableName;
  form: UseFormReturn<T>;
  initialData: T | null;
  enabled?: boolean;
  resourceName?: string;
  canEdit?: boolean;
  onSaveSuccess?: () => void;
  onDataRefresh?: (data: Record<string, unknown>) => void;
}

export interface UseStagedEditReturn {
  // Mode state
  isEditing: boolean;
  isViewMode: boolean;
  isDirty: boolean;
  
  // Actions
  startEdit: () => void;
  cancelEdit: () => void;
  discardChanges: () => void;
  
  // Saving state
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  
  // Permissions
  canEdit: boolean;
  
  // Original data reference
  originalData: Record<string, unknown> | null;
  
  // Concurrent edit integration
  otherEditors: Array<{
    id: string;
    user_id: string;
    profile?: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    };
  }>;
  hasConflict: boolean;
  showConflictDialog: boolean;
  setShowConflictDialog: (value: boolean) => void;
  checkBeforeSave: () => Promise<{ canSave: boolean; latestData?: Record<string, unknown> }>;
  handleKeepLocal: () => void;
  handleAcceptServer: () => Record<string, unknown> | undefined;
  initializeEdit: (data: Record<string, unknown>) => void;
}

/**
 * Hook to manage staged editing with View/Edit mode pattern.
 * Integrates with concurrent edit system for presence tracking and conflict detection.
 */
export function useStagedEdit<T extends FieldValues>({
  resourceType,
  resourceId,
  tableName,
  form,
  initialData,
  enabled = true,
  resourceName = 'record',
  canEdit: canEditProp = true,
  onSaveSuccess,
  onDataRefresh,
}: UseStagedEditOptions<T>): UseStagedEditReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const originalDataRef = useRef<Record<string, unknown> | null>(null);

  // Concurrent edit integration - only active when editing
  const {
    otherEditors,
    hasConflict,
    showConflictDialog,
    setShowConflictDialog,
    initializeEdit,
    checkBeforeSave,
    handleKeepLocal,
    handleAcceptServer,
    unregisterAsEditor,
  } = useConcurrentEdit({
    resourceType,
    resourceId,
    tableName,
    enabled: enabled && isEditing && !!resourceId,
    resourceName,
    onDataRefresh,
  });

  // Track dirty state from form
  const isDirty = form.formState.isDirty;

  // Start editing mode
  const startEdit = useCallback(() => {
    if (!canEditProp) return;
    
    // Store original data for discard functionality
    originalDataRef.current = form.getValues() as Record<string, unknown>;
    
    // Initialize concurrent edit tracking
    if (resourceId && initialData) {
      initializeEdit(initialData as Record<string, unknown>);
    }
    
    setIsEditing(true);
  }, [canEditProp, form, resourceId, initialData, initializeEdit]);

  // Cancel editing and revert to original data
  const cancelEdit = useCallback(() => {
    if (originalDataRef.current) {
      form.reset(originalDataRef.current as T);
    }
    setIsEditing(false);
    unregisterAsEditor();
  }, [form, unregisterAsEditor]);

  // Discard changes but stay in edit mode
  const discardChanges = useCallback(() => {
    if (originalDataRef.current) {
      form.reset(originalDataRef.current as T);
    }
  }, [form]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isEditing) {
        unregisterAsEditor();
      }
    };
  }, [isEditing, unregisterAsEditor]);

  return {
    // Mode state
    isEditing,
    isViewMode: !isEditing,
    isDirty,
    
    // Actions
    startEdit,
    cancelEdit,
    discardChanges,
    
    // Saving state
    isSaving,
    setIsSaving,
    
    // Permissions
    canEdit: canEditProp,
    
    // Original data
    originalData: originalDataRef.current,
    
    // Concurrent edit integration
    otherEditors,
    hasConflict,
    showConflictDialog,
    setShowConflictDialog,
    checkBeforeSave,
    handleKeepLocal,
    handleAcceptServer,
    initializeEdit,
  };
}
