import { useEffect, useState, useCallback } from 'react';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean; // If true, continuously watch position
}

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = false,
  } = options;

  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('geolocation' in navigator);
  }, []);

  const handleSuccess = useCallback((pos: globalThis.GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    });
    setError(null);
    setIsLoading(false);
  }, []);

  const handleError = useCallback((err: globalThis.GeolocationPositionError) => {
    let message = 'Unable to retrieve your location';
    
    switch (err.code) {
      case 1: // PERMISSION_DENIED
        message = 'Location permission denied. Please enable location access in your browser settings.';
        break;
      case 2: // POSITION_UNAVAILABLE
        message = 'Location information is unavailable. Please check your device settings.';
        break;
      case 3: // TIMEOUT
        message = 'Location request timed out. Please try again.';
        break;
    }

    setError({
      code: err.code,
      message,
    });
    setIsLoading(false);
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!isSupported) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by your browser',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  }, [isSupported, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  useEffect(() => {
    if (!watch || !isSupported) {
      return;
    }

    setIsLoading(true);
    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [watch, isSupported, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  return {
    position,
    error,
    isLoading,
    isSupported,
    getCurrentPosition,
    refresh: getCurrentPosition,
  };
};

