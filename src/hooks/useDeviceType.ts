import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

const MOBILE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1024;

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return getDeviceType(window.innerWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      setDeviceType(getDeviceType(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceType;
}

function getDeviceType(width: number): DeviceType {
  if (width <= MOBILE_MAX_WIDTH) return 'mobile';
  if (width <= TABLET_MAX_WIDTH) return 'tablet';
  return 'desktop';
}

export function useIsMobileOrTablet(): boolean {
  const deviceType = useDeviceType();
  return deviceType === 'mobile' || deviceType === 'tablet';
}

export function useIsTablet(): boolean {
  const deviceType = useDeviceType();
  return deviceType === 'tablet';
}

// Check if touch is supported (additional mobile detection)
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}
