import { useEffect, useMemo, useRef, useState } from "react";

import type { PassengerDashboardSummary } from "@/lib/passenger-service";
import {
  MAP_DEFAULT_PITCH,
  MAP_DEFAULT_ZOOM,
  MAP_STYLE_URL,
  MAP_ATTRIBUTION,
} from "@/config/map";

type PassengerMapProps = {
  summary: PassengerDashboardSummary;
};

type MapLibreModule = typeof import("maplibre-gl");

const StylisedFallbackMap = () => (
  <div className="flex h-72 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/60 to-slate-900 text-sm text-slate-300">
    Add a default pickup location to visualise nearby drivers.
  </div>
);

export const PassengerMap = ({ summary }: PassengerMapProps) => {
  const driverLocations = summary.driverAvailability.drivers;
  const passengerLocation =
    summary.passenger.defaultLocation?.location ??
    driverLocations[0]?.location ??
    null;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<Array<{ id: string; marker: import("maplibre-gl").Marker }>>([]);
  const maplibreRef = useRef<MapLibreModule | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const hasAnyLocation = Boolean(passengerLocation);

  const boundsCoordinates = useMemo(() => {
    if (!passengerLocation) {
      return null;
    }
    const coords = driverLocations.map((driver) => driver.location);
    return [passengerLocation, ...coords];
  }, [driverLocations, passengerLocation]);

  useEffect(() => {
    if (!passengerLocation) {
      return;
    }
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    let isCancelled = false;

    const initialiseMap = async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (isCancelled || !mapContainerRef.current) {
          return;
        }

        maplibreRef.current = maplibregl;

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: MAP_STYLE_URL,
          center: [
            passengerLocation.longitude,
            passengerLocation.latitude,
          ],
          zoom: MAP_DEFAULT_ZOOM,
          pitch: MAP_DEFAULT_PITCH,
          attributionControl: false,
        });

        mapRef.current = map;

        map.addControl(
          new maplibregl.NavigationControl({
            showCompass: false,
          }),
          "top-right",
        );

        map.on("load", () => {
          if (!isCancelled) {
            setIsReady(true);
            map.addControl(
              new maplibregl.AttributionControl({
                customAttribution: MAP_ATTRIBUTION,
              }),
            );
          }
        });
      } catch (error) {
        console.error("Failed to load map", error);
        setMapError(
          "Unable to load the live map at the moment. We will fall back to a static view.",
        );
      }
    };

    void initialiseMap();

    return () => {
      isCancelled = true;
      markersRef.current.forEach((entry) => entry.marker.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [passengerLocation]);

  useEffect(() => {
    const maplibregl = maplibreRef.current;
    const map = mapRef.current;
    if (
      !map ||
      !maplibregl ||
      !passengerLocation ||
      !boundsCoordinates ||
      mapError
    ) {
      return;
    }

    markersRef.current.forEach((entry) => entry.marker.remove());
    markersRef.current = [];

    const passengerMarker = new maplibregl.Marker({
      color: "#10b981",
      scale: 1.2,
    })
      .setLngLat([passengerLocation.longitude, passengerLocation.latitude])
      .addTo(map);

    markersRef.current.push({
      id: "passenger",
      marker: passengerMarker,
    });

    driverLocations.forEach((driver) => {
      const marker = new maplibregl.Marker({
        color: "#22d3ee",
      })
        .setLngLat([driver.location.longitude, driver.location.latitude])
        .setPopup(
          new maplibregl.Popup({
            closeButton: false,
            closeOnClick: true,
            offset: 12,
          }).setHTML(
            `<div style="font-size:12px;font-weight:600;color:#0f172a;">ETA ${driver.etaMinutes} min</div>`,
          ),
        )
        .addTo(map);

      markersRef.current.push({
        id: driver.driverId,
        marker,
      });
    });

    if (boundsCoordinates.length > 0) {
      const bounds = boundsCoordinates.reduce((acc, location) => {
        return acc.extend([location.longitude, location.latitude]);
      }, new maplibregl.LngLatBounds());

      if (map.isStyleLoaded()) {
        map.fitBounds(bounds, {
          padding: 80,
          maxZoom: 16,
          animate: true,
        });
      } else {
        map.once("load", () => {
          map.fitBounds(bounds, {
            padding: 80,
            maxZoom: 16,
            animate: true,
          });
        });
      }
    }
  }, [
    driverLocations,
    passengerLocation,
    boundsCoordinates,
    mapError,
  ]);

  if (!hasAnyLocation) {
    return <StylisedFallbackMap />;
  }

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
      <div ref={mapContainerRef} className="h-full w-full" />
      {!isReady && !mapError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-sm text-slate-200 backdrop-blur-sm">
          Loading live map…
        </div>
      ) : null}
      {mapError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 text-sm text-slate-200 backdrop-blur-sm">
          <div className="text-center leading-snug">{mapError}</div>
          <StylisedFallbackMap />
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 shadow-lg shadow-slate-900/50">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
            Nearby drivers
          </p>
          <p className="text-base font-semibold text-white">
            {summary.driverAvailability.total}
          </p>
          <p className="text-[11px] text-slate-400">
            Radius {summary.driverAvailability.radiusKm} km
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 shadow-lg shadow-slate-900/50">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
            Avg pickup
          </p>
          <p className="text-base font-semibold text-white">
            {summary.driverAvailability.averageEtaMinutes ?? "—"} min
          </p>
          <p className="text-[11px] text-slate-400">Live updated</p>
        </div>
      </div>
    </div>
  );
};
