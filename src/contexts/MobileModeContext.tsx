import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type MobileDepartment = 'warehouse' | 'manufacturing' | 'quality' | 'employee' | 'auto';
export type KioskMode = 'none' | 'warehouse' | 'manufacturing' | 'employee';

interface MobileModeContextType {
  isMobileMode: boolean;
  setMobileMode: (value: boolean) => void;
  activeDepartment: MobileDepartment;
  setActiveDepartment: (dept: MobileDepartment) => void;
  kioskMode: KioskMode;
  setKioskMode: (mode: KioskMode) => void;
  toggleMobileMode: () => void;
}

const MobileModeContext = createContext<MobileModeContextType | undefined>(undefined);

const MOBILE_MODE_KEY = 'erp-mobile-mode';
const DEPARTMENT_KEY = 'erp-active-department';
const KIOSK_MODE_KEY = 'erp-kiosk-mode';

interface MobileModeProviderProps {
  children: ReactNode;
}

export function MobileModeProvider({ children }: MobileModeProviderProps) {
  const [isMobileMode, setIsMobileMode] = useState(() => {
    const stored = localStorage.getItem(MOBILE_MODE_KEY);
    return stored === 'true';
  });

  const [activeDepartment, setActiveDepartmentState] = useState<MobileDepartment>(() => {
    const stored = localStorage.getItem(DEPARTMENT_KEY);
    return (stored as MobileDepartment) || 'auto';
  });

  const [kioskMode, setKioskModeState] = useState<KioskMode>(() => {
    const stored = localStorage.getItem(KIOSK_MODE_KEY);
    return (stored as KioskMode) || 'none';
  });

  // Persist mobile mode preference
  useEffect(() => {
    localStorage.setItem(MOBILE_MODE_KEY, String(isMobileMode));
  }, [isMobileMode]);

  // Persist department preference
  useEffect(() => {
    localStorage.setItem(DEPARTMENT_KEY, activeDepartment);
  }, [activeDepartment]);

  // Persist kiosk mode preference
  useEffect(() => {
    localStorage.setItem(KIOSK_MODE_KEY, kioskMode);
  }, [kioskMode]);

  const setMobileMode = (value: boolean) => {
    setIsMobileMode(value);
  };

  const setActiveDepartment = (dept: MobileDepartment) => {
    setActiveDepartmentState(dept);
  };

  const setKioskMode = (mode: KioskMode) => {
    setKioskModeState(mode);
  };

  const toggleMobileMode = () => {
    setIsMobileMode(prev => !prev);
  };

  return (
    <MobileModeContext.Provider
      value={{
        isMobileMode,
        setMobileMode,
        activeDepartment,
        setActiveDepartment,
        kioskMode,
        setKioskMode,
        toggleMobileMode,
      }}
    >
      {children}
    </MobileModeContext.Provider>
  );
}

export function useMobileMode() {
  const context = useContext(MobileModeContext);
  if (context === undefined) {
    throw new Error('useMobileMode must be used within a MobileModeProvider');
  }
  return context;
}

// Optional hook for components that may be outside provider
export function useMobileModeOptional() {
  return useContext(MobileModeContext);
}
