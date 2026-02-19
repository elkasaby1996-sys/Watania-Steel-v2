import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  screenWidth: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      screenWidth: 1280,
      deviceType: 'desktop',
    };
  }

  const width = window.innerWidth;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const ua = navigator.userAgent.toLowerCase();
  const mobileUa = /android|iphone|ipod|mobile|blackberry|opera mini|iemobile/i.test(ua);
  const tabletUa = /ipad|tablet/i.test(ua);

  const isMobileWidth = width < MOBILE_BREAKPOINT;
  const isTabletWidth = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;

  const isMobile = isMobileWidth || (mobileUa && !tabletUa);
  const isTablet = !isMobile && (isTabletWidth || tabletUa);
  const isDesktop = !isMobile && !isTablet;
  const deviceType: DeviceInfo['deviceType'] = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    screenWidth: width,
    deviceType,
  };
};

export function useDeviceInfo(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    const onResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return deviceInfo;
}

