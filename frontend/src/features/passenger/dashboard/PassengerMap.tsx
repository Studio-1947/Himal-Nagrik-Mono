import { useEffect, useMemo, useRef, useState } from "react";

import type { PassengerDashboardSummary } from "@/lib/passenger-service";
import {
  MAP_ATTRIBUTION,
  MAP_DEFAULT_PITCH,
  MAP_DEFAULT_ZOOM,
  MAP_STYLE_URL,
} from "@/config/map";

type PassengerMapProps = {
  summary: PassengerDashboardSummary;
};

type MapLibreModule = typeof import("maplibre-gl");

const RADIUS_SOURCE_ID = "passenger-radius-source";
const RADIUS_LAYER_ID = "passenger-radius-layer";

const StylisedFallbackMap = () => (
  <div className="flex h-72 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/60 to-slate-900 text-sm text-slate-300">
    Add a default pickup location to visualise nearby drivers.
  </div>
);

const createMarkerElement = (tone: "passenger" | "driver") => {
  const wrapper = document.createElement("div");
  wrapper.className =
    "flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-white/90 shadow-[0_0_18px_rgba(16,185,129,0.35)]";
  wrapper.style.backdropFilter = "blur(6px)";

  const dot = document.createElement("div");
  dot.className = tone === "passenger" ? "h-3 w-3 rounded-full bg-emerald-500" : "h-3 w-3 rounded-full bg-sky-400";
  dot.style.boxShadow =
    tone === "passenger"
      ? "0 0 14px rgba(16,185,129,0.55)"
      : "0 0 12px rgba(14,165,233,0.5)";

  wrapper.appendChild(dot);
  return wrapper;
};

const createCircleGeoJSON = (
  centre: { latitude: number; longitude: number },
  radiusKm: number,
  points = 64,
) => {
  const earthRadiusKm = 6371;
  const coordinates: Array<[number, number]> = [];

  for (let i = 0; i <= points; i += 1) {
    const angle = (i * 2 * Math.PI) / points;
    const dx = (radiusKm / earthRadiusKm) * Math.cos(angle);
    const dy = (radiusKm / earthRadiusKm) * Math.sin(angle);
    const latitude = centre.latitude + (dy * 180) / Math.PI;
    const longitude =
      centre.longitude + ((dx * 180) / Math.PI) / Math.cos((centre.latitude * Math.PI) / 180);
    coordinates.push([longitude, latitude]);
  }

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [coordinates],
        },
        properties: {},
      },
    ],
  };
};

export const PassengerMap = ({ summary }: PassengerMapProps) => {
  const driverLocations = summary.driverAvailability.drivers;
  const passengerLocation =
    summary.passenger.defaultLocation?.location ??
    driverLocations[0]?.location ??
    null;
  const radiusKm = summary.driverAvailability.radiusKm;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<Array<{ id: string; marker: import("maplibre-gl").Marker }>>([]);
  const maplibreRef = useRef<MapLibreModule | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

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
          center: [passengerLocation.longitude, passengerLocation.latitude],
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
          if (isCancelled) {
            return;
          }
          setIsReady(true);

          if (!map.getSource(RADIUS_SOURCE_ID)) {
            map.addSource(RADIUS_SOURCE_ID, {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
          }

          if (!map.getLayer(RADIUS_LAYER_ID)) {
            map.addLayer({
              id: RADIUS_LAYER_ID,
              type: "fill",
              source: RADIUS_SOURCE_ID,
              paint: {
                "fill-color": "#22d3ee",
                "fill-opacity": 0.12,
              },
            });
          }

          map.addControl(
            new maplibregl.AttributionControl({
              customAttribution: MAP_ATTRIBUTION,
            }),
          );
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
    if (!map || !maplibregl || !passengerLocation || !boundsCoordinates || mapError) {
      return;
    }

    markersRef.current.forEach((entry) => entry.marker.remove());
    markersRef.current = [];

    const passengerMarker = new maplibregl.Marker({
      element: createMarkerElement("passenger"),
    })
      .setLngLat([passengerLocation.longitude, passengerLocation.latitude])
      .addTo(map);

    markersRef.current.push({
      id: "passenger",
      marker: passengerMarker,
    });

    driverLocations.forEach((driver) => {
      const element = createMarkerElement("driver");
      element.title = `ETA ${driver.etaMinutes} min`;

      const marker = new maplibregl.Marker({ element })
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

      markersRef.current.push({ id: driver.driverId, marker });
    });

    if (passengerLocation && radiusKm > 0) {
      const source = map.getSource(RADIUS_SOURCE_ID) as import("maplibre-gl").GeoJSONSource | undefined;
      if (source) {
        source.setData(createCircleGeoJSON(passengerLocation, radiusKm));
      }
    }

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
  }, [driverLocations, passengerLocation, boundsCoordinates, mapError, radiusKm]);

  if (!passengerLocation) {
    return <StylisedFallbackMap />;
  }

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
      <div ref={mapContainerRef} className="h-full w-full" />
      {!isReady && !mapError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-sm text-slate-200 backdrop-blur-sm">
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
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Nearby drivers</p>
          <p className="text-base font-semibold text-white">
            {summary.driverAvailability.total}
          </p>
          <p className="text-[11px] text-slate-400">Radius {radiusKm} km</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 shadow-lg shadow-slate-900/50">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Avg pickup</p>
          <p className="text-base font-semibold text-white">
            {summary.driverAvailability.averageEtaMinutes ?? "—"} min
          </p>
          <p className="text-[11px] text-slate-400">Live updated</p>
        </div>
      </div>
    </div>
  );
};
