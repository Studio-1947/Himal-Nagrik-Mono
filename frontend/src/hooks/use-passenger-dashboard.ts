import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  passengerService,
  type FetchDashboardSummaryParams,
  type PassengerDashboardSummary,
} from "@/lib/passenger-service";
import { useAuth } from "@/hooks/use-auth";
import { realtimeClient, type RealtimeEvent } from "@/lib/realtime";
import { useGeolocation } from "@/hooks/use-geolocation";

const MAX_EVENTS = 10;

export const usePassengerDashboard = () => {
  const { session } = useAuth();
  const token = session?.token;
  const [summary, setSummary] = useState<PassengerDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<FetchDashboardSummaryParams | undefined>();
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [useRealLocation, setUseRealLocation] = useState(true);
  const [activeTripLocation, setActiveTripLocation] = useState<{
    rideId: string;
    location: { latitude: number; longitude: number };
    timestamp: string;
  } | null>(null);
  const [completedRidePrompt, setCompletedRidePrompt] = useState<{
    rideId: string;
    driverId?: string;
    fare?: unknown;
    completedAt?: string;
  } | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  
  // Get user's real-time location
  const geolocation = useGeolocation({
    enableHighAccuracy: true,
    watch: true, // Continuously update location
    timeout: 15000,
    maximumAge: 30000, // Use cached location if less than 30 seconds old
  });

  const canLoad = useMemo(() => Boolean(token), [token]);

  const loadDashboard = useCallback(
    async (overrideParams?: FetchDashboardSummaryParams) => {
      if (!token) {
        return;
      }

      let params = overrideParams ?? query;
      
      // Use real-time location if available and enabled
      if (useRealLocation && geolocation.position && !overrideParams) {
        params = {
          ...params,
          lat: geolocation.position.latitude,
          lng: geolocation.position.longitude,
        };
      }
      
      if (overrideParams) {
        setQuery(overrideParams);
      }

      setIsLoading(true);
      try {
        const data = await passengerService.getDashboardSummary(token, params);
        setSummary(data);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to load dashboard summary.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [token, query, useRealLocation, geolocation.position],
  );

  useEffect(() => {
    if (canLoad) {
      void loadDashboard();
    }
  }, [canLoad, loadDashboard]);

  useEffect(() => {
    if (!summary?.activeBooking) {
      setActiveTripLocation(null);
    }
  }, [summary?.activeBooking]);

  useEffect(() => {
    if (!canLoad) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadDashboard();
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canLoad, loadDashboard]);

  const scheduleRealtimeRefresh = useCallback(
    (overrideParams?: FetchDashboardSummaryParams) => {
      if (refreshTimeoutRef.current !== null) {
        return;
      }
      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;
        void loadDashboard(overrideParams);
      }, 1200);
    },
    [loadDashboard],
  );

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!summary) {
      return;
    }

    const unsubscribes: Array<() => void> = [];

    unsubscribes.push(
      realtimeClient.subscribe("dispatch:availability", (event) => {
        if (event.type === "dispatch.availability") {
          scheduleRealtimeRefresh();
        }
      }),
    );

    const passengerChannel = `passenger:${summary.passenger.id}`;
    unsubscribes.push(
      realtimeClient.subscribe(passengerChannel, (event) => {
        if (event.type.startsWith("booking.")) {
          setEvents((prev) => [...prev.slice(-MAX_EVENTS + 1), event]);
          scheduleRealtimeRefresh();
        } else if (event.type === "trip.location") {
          const payload = event.payload as {
            rideId?: string;
            location?: { latitude: number; longitude: number };
            timestamp?: string;
          };
          if (
            payload.rideId &&
            payload.location &&
            summary.activeBooking &&
            payload.rideId === summary.activeBooking.id
          ) {
            setActiveTripLocation({
              rideId: payload.rideId,
              location: payload.location,
              timestamp: payload.timestamp ?? new Date().toISOString(),
            });
          }
        } else if (event.type === "trip.completed") {
          setActiveTripLocation(null);
          setSummary((prev) =>
            prev
              ? {
                  ...prev,
                  activeBooking:
                    prev.activeBooking &&
                    prev.activeBooking.id === (event.payload as { rideId?: string }).rideId
                      ? null
                      : prev.activeBooking,
                }
              : prev,
          );
          const payload = event.payload as {
            rideId?: string;
            driverId?: string;
            fare?: unknown;
            completedAt?: string;
          };
          if (payload?.rideId) {
            setCompletedRidePrompt({
              rideId: payload.rideId,
              driverId: payload.driverId,
              fare: payload.fare,
              completedAt: payload.completedAt,
            });
          }
          scheduleRealtimeRefresh();
        }
      }),
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [summary, scheduleRealtimeRefresh]);

  // Refresh dashboard when location updates
  useEffect(() => {
    if (canLoad && geolocation.position && useRealLocation) {
      void loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad, geolocation.position?.latitude, geolocation.position?.longitude, useRealLocation]);

  return {
    summary,
    isLoading: isLoading && !summary,
    isRefreshing: isLoading && !!summary,
    error,
    refresh: loadDashboard,
    setFocus: (params: FetchDashboardSummaryParams) => {
      setQuery(params);
      void loadDashboard(params);
    },
    currentQuery: query,
    events,
    activeTripLocation,
    completedRidePrompt,
    dismissCompletedRidePrompt: () => setCompletedRidePrompt(null),
    // Location-related
    geolocation,
    useRealLocation,
    setUseRealLocation,
    currentLocation: geolocation.position ? {
      latitude: geolocation.position.latitude,
      longitude: geolocation.position.longitude,
    } : null,
  };
};
