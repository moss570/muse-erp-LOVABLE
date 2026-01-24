import React, { createContext, useContext, ReactNode } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';
import { useStagedEdit, UseStagedEditReturn } from '@/hooks/useStagedEdit';
import { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

interface StagedEditContextValue extends UseStagedEditReturn {
  form: UseFormReturn<any>;
  resourceName: string;
}

const StagedEditContext = createContext<StagedEditContextValue | null>(null);

export function useStagedEditContext() {
  const context = useContext(StagedEditContext);
  if (!context) {
    throw new Error('useStagedEditContext must be used within a StagedEditProvider');
  }
  return context;
}

interface StagedEditProviderProps<T extends FieldValues> {
  children: ReactNode;
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

export function StagedEditProvider<T extends FieldValues>({
  children,
  resourceType,
  resourceId,
  tableName,
  form,
  initialData,
  enabled = true,
  resourceName = 'record',
  canEdit = false,
  onSaveSuccess,
  onDataRefresh,
}: StagedEditProviderProps<T>) {
  const stagedEdit = useStagedEdit({
    resourceType,
    resourceId,
    tableName,
    form,
    initialData,
    enabled,
    resourceName,
    canEdit,
    onSaveSuccess,
    onDataRefresh,
  });

  return (
    <StagedEditContext.Provider value={{ ...stagedEdit, form, resourceName }}>
      {children}
    </StagedEditContext.Provider>
  );
}
