import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeolocation } from './use-geolocation';
import { dispatchService, type DriverAvailability } from '@/lib/dispatch-service';

export interface UseDriverLocationOptions {
  token: string | null;
  capacity: number;
  autoHeartbeat?: boolean; // Automatically send heartbeat with GPS location
  heartbeatInterval?: number; // In milliseconds
}

export const useDriverLocation = ({
  token,
  capacity,
  autoHeartbeat = true,
  heartbeatInterval = 30000, // 30 seconds default
}: UseDriverLocationOptions) => {
  const [isOnline, setIsOnline] = useState(false);
  const [availability, setAvailability] = useState<DriverAvailability | null>(null);
  const [heartbeatError, setHeartbeatError] = useState<string | null>(null);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const heartbeatTimerRef = useRef<number | null>(null);

  // Get driver's real-time GPS location
  const geolocation = useGeolocation({
    enableHighAccuracy: true,
    watch: true,
    timeout: 15000,
    maximumAge: 30000,
  });

  // Send heartbeat with current location
  const sendHeartbeat = useCallback(
    async (forceStatus?: 'available' | 'unavailable') => {
      if (!token) {
        return;
      }

      const status = forceStatus ?? (isOnline ? 'available' : 'unavailable');

      // Use GPS location if available, otherwise don't send location
      const location = geolocation.position
        ? {
            latitude: geolocation.position.latitude,
            longitude: geolocation.position.longitude,
          }
        : undefined;

      setIsSending(true);
      setHeartbeatError(null);

      try {
        const result = await dispatchService.sendHeartbeat(token, {
          status,
          capacity,
          location,
        });

        setAvailability(result);
        setLastHeartbeatAt(new Date().toISOString());

        // Update online status based on result
        if (result.status === 'available') {
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }

        console.log('[Driver Location] Heartbeat sent:', {
          status: result.status,
          hasLocation: !!location,
          location,
          capacity,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to send heartbeat';
        setHeartbeatError(message);
        console.error('[Driver Location] Heartbeat error:', error);
      } finally {
        setIsSending(false);
      }
    },
    [token, capacity, isOnline, geolocation.position]
  );

  // Go online (send available heartbeat)
  const goOnline = useCallback(async () => {
    await sendHeartbeat('available');
  }, [sendHeartbeat]);

  // Go offline (send unavailable heartbeat)
  const goOffline = useCallback(async () => {
    await sendHeartbeat('unavailable');
  }, [sendHeartbeat]);

  // Toggle online/offline status
  const toggleStatus = useCallback(async () => {
    if (isOnline) {
      await goOffline();
    } else {
      await goOnline();
    }
  }, [isOnline, goOnline, goOffline]);

  // Auto-heartbeat effect
  useEffect(() => {
    if (!autoHeartbeat || !token || !isOnline) {
      // Clear timer if auto-heartbeat disabled or offline
      if (heartbeatTimerRef.current) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    // Send initial heartbeat when going online
    void sendHeartbeat();

    // Set up periodic heartbeat
    heartbeatTimerRef.current = window.setInterval(() => {
      void sendHeartbeat();
    }, heartbeatInterval);

    return () => {
      if (heartbeatTimerRef.current) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [autoHeartbeat, token, isOnline, heartbeatInterval, sendHeartbeat]);

  // Send heartbeat when location updates (if online)
  useEffect(() => {
    if (
      isOnline &&
      geolocation.position &&
      !isSending &&
      autoHeartbeat
    ) {
      // Debounce - only update if location changed significantly (>50m)
      // This prevents too many updates from minor GPS fluctuations
      void sendHeartbeat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geolocation.position?.latitude, geolocation.position?.longitude, isOnline]);

  return {
    // GPS data
    geolocation,
    currentLocation: geolocation.position
      ? {
          latitude: geolocation.position.latitude,
          longitude: geolocation.position.longitude,
        }
      : null,

    // Status
    isOnline,
    availability,
    lastHeartbeatAt,
    isSending,

    // Errors
    locationError: geolocation.error?.message,
    heartbeatError,

    // Actions
    goOnline,
    goOffline,
    toggleStatus,
    sendHeartbeat: () => sendHeartbeat(),
    refreshLocation: geolocation.getCurrentPosition,
  };
};


