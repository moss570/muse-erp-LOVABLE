import React, { createContext, useContext, ReactNode } from 'react';
import { useAutoSave, UseAutoSaveReturn, UseAutoSaveOptions } from '@/hooks/useAutoSave';

interface AutoSaveContextValue extends UseAutoSaveReturn {
  recordId: string | undefined;
}

const AutoSaveContext = createContext<AutoSaveContextValue | null>(null);

export function useAutoSaveContext() {
  const context = useContext(AutoSaveContext);
  if (!context) {
    throw new Error('useAutoSaveContext must be used within an AutoSaveProvider');
  }
  return context;
}

interface AutoSaveProviderProps extends UseAutoSaveOptions {
  children: ReactNode;
}

/**
 * Provider that enables auto-save functionality for child components.
 */
export function AutoSaveProvider({
  children,
  ...options
}: AutoSaveProviderProps) {
  const autoSave = useAutoSave(options);

  return (
    <AutoSaveContext.Provider value={{ ...autoSave, recordId: options.recordId }}>
      {children}
    </AutoSaveContext.Provider>
  );
}
