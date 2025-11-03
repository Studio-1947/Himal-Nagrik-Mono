import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  passengerService,
  type FetchDashboardSummaryParams,
  type PassengerDashboardSummary,
} from "@/lib/passenger-service";
import { useAuth } from "@/hooks/use-auth";
import { realtimeClient, type RealtimeEvent } from "@/lib/realtime";

const MAX_EVENTS = 10;

export const usePassengerDashboard = () => {
  const { session } = useAuth();
  const token = session?.token;
  const [summary, setSummary] = useState<PassengerDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<FetchDashboardSummaryParams | undefined>();
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const refreshTimeoutRef = useRef<number | null>(null);

  const canLoad = useMemo(() => Boolean(token), [token]);

  const loadDashboard = useCallback(
    async (overrideParams?: FetchDashboardSummaryParams) => {
      if (!token) {
        return;
      }

      const params = overrideParams ?? query;
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
    [token, query],
  );

  useEffect(() => {
    if (canLoad) {
      void loadDashboard();
    }
  }, [canLoad, loadDashboard]);

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
        }
      }),
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [summary, scheduleRealtimeRefresh]);

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
  };
};
