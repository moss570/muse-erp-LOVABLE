import { useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Hook to warn users about unsaved changes when navigating away.
 * Shows browser's native "Leave site?" dialog on page unload,
 * and optionally blocks React Router navigation.
 */
export function useUnsavedChangesWarning(
  isDirty: boolean,
  options?: {
    message?: string;
    blockNavigation?: boolean;
  }
) {
  const { message = 'You have unsaved changes. Are you sure you want to leave?', blockNavigation = true } = options || {};

  // Handle browser navigation (refresh, close tab, external links)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  // Block React Router navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && 
      blockNavigation && 
      currentLocation.pathname !== nextLocation.pathname
  );

  const confirmNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  const cancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  return {
    isBlocked: blocker.state === 'blocked',
    confirmNavigation,
    cancelNavigation,
  };
}
