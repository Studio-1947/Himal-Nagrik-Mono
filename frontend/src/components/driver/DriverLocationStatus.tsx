import { useEffect } from 'react';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UseDriverLocationOptions } from '@/hooks/use-driver-location';
import { useDriverLocation } from '@/hooks/use-driver-location';

interface DriverLocationStatusProps {
  token: string;
  capacity: number;
  onStatusChange?: (isOnline: boolean) => void;
}

export const DriverLocationStatus = ({
  token,
  capacity,
  onStatusChange,
}: DriverLocationStatusProps) => {
  const driverLocation = useDriverLocation({
    token,
    capacity,
    autoHeartbeat: true,
    heartbeatInterval: 30000, // 30 seconds
  });

  // Notify parent of status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(driverLocation.isOnline);
    }
  }, [driverLocation.isOnline, onStatusChange]);

  const hasGPS = !!driverLocation.currentLocation;
  const hasError = !!driverLocation.locationError || !!driverLocation.heartbeatError;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Driver Status</h2>
            <Badge
              className={
                driverLocation.isOnline
                  ? 'bg-emerald-500/15 text-emerald-200'
                  : 'bg-slate-700/40 text-slate-200'
              }
            >
              {driverLocation.isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-300">
            {driverLocation.isOnline
              ? 'You are visible to passengers and receiving ride requests'
              : 'Go online to start receiving ride requests'}
          </p>
        </div>

        <Button
          variant={driverLocation.isOnline ? 'outline' : 'default'}
          onClick={driverLocation.toggleStatus}
          disabled={driverLocation.isSending}
          className="shrink-0"
        >
          {driverLocation.isSending
            ? 'Updating...'
            : driverLocation.isOnline
            ? 'Go Offline'
            : 'Go Online'}
        </Button>
      </div>

      {/* GPS Location Status */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                hasGPS && driverLocation.isOnline
                  ? 'bg-emerald-500/15'
                  : 'bg-slate-700/40'
              }`}
            >
              {hasGPS && driverLocation.isOnline ? (
                <Navigation className="h-5 w-5 text-emerald-400" />
              ) : (
                <MapPin className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {hasGPS ? 'GPS Location Active' : 'GPS Location Unavailable'}
              </p>
              <p className="text-xs text-slate-400">
                {hasGPS && driverLocation.geolocation.position
                  ? `Accuracy: ±${Math.round(driverLocation.geolocation.position.accuracy || 0)}m`
                  : 'Enable location access to go online'}
              </p>
            </div>
          </div>

          {hasGPS && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs text-emerald-400">Live</span>
            </div>
          )}
        </div>

        {/* Coordinates Display (for debugging) */}
        {driverLocation.currentLocation && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-300">
                  Current Coordinates
                </p>
                <p className="mt-1 font-mono text-xs text-emerald-200/80">
                  {driverLocation.currentLocation.latitude.toFixed(6)},{' '}
                  {driverLocation.currentLocation.longitude.toFixed(6)}
                </p>
                {driverLocation.lastHeartbeatAt && (
                  <p className="mt-1 text-[10px] text-emerald-400/60">
                    Last update:{' '}
                    {new Date(driverLocation.lastHeartbeatAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={driverLocation.refreshLocation}
                disabled={driverLocation.geolocation.isLoading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    driverLocation.geolocation.isLoading ? 'animate-spin' : ''
                  }`}
                />
              </Button>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {hasError && (
          <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3">
            <p className="text-xs font-medium text-red-300">⚠️ Location Issue</p>
            <p className="mt-1 text-xs text-red-200/80">
              {driverLocation.locationError || driverLocation.heartbeatError}
            </p>
            {driverLocation.locationError && (
              <p className="mt-2 text-[10px] text-red-300/60">
                Please enable location access in your browser settings to go online
              </p>
            )}
          </div>
        )}

        {/* Info Message */}
        {!hasGPS && !hasError && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-950/20 p-3">
            <p className="text-xs font-medium text-blue-300">📍 GPS Required</p>
            <p className="mt-1 text-xs text-blue-200/80">
              Allow location access when prompted to share your position with passengers
            </p>
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="mt-4 rounded-lg border border-slate-700/40 bg-slate-900/40 p-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Your location is shared with passengers only when you're online and
            accepting rides. We update your position automatically every 30 seconds
            for accurate driver availability.
          </p>
        </div>
      </div>
    </div>
  );
};





