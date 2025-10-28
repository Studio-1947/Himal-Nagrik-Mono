
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  passengerService,
  type FetchDashboardSummaryParams,
  type PassengerDashboardSummary,
} from "@/lib/passenger-service";
import { useAuth } from "@/hooks/use-auth";

export const usePassengerDashboard = () => {
  const { session } = useAuth();
  const token = session?.token;
  const [summary, setSummary] = useState<PassengerDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<FetchDashboardSummaryParams | undefined>();

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
  };
};
