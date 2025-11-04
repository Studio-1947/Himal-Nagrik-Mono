import { useEffect, useMemo, useRef, useState } from "react";

import type { PassengerDashboardSummary } from "@/lib/passenger-service";
import type { GeolocationPosition } from "@/hooks/use-geolocation";
import {
  MAP_ATTRIBUTION,
  MAP_DEFAULT_PITCH,
  MAP_DEFAULT_ZOOM,
  MAP_STYLE_URL,
} from "@/config/map";

type PassengerMapProps = {
  summary: PassengerDashboardSummary;
  currentLocation?: GeolocationPosition | null;
  useRealLocation?: boolean;
  onToggleRealLocation?: () => void;
  locationError?: string | null;
};

type MapLibreModule = typeof import("maplibre-gl");

const RADIUS_SOURCE_ID = "passenger-radius-source";
const RADIUS_LAYER_ID = "passenger-radius-layer";
const HEATMAP_SOURCE_ID = "driver-heatmap-source";
const HEATMAP_LAYER_ID = "driver-heatmap-layer";
const HEATMAP_POINT_LAYER_ID = "driver-heatmap-points";

const StylisedFallbackMap = () => (
  <div className="flex h-72 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/60 to-slate-900 text-sm text-slate-300">
    Add a default pickup location to visualise nearby drivers.
  </div>
);

const createDriverMarkerElement = (etaMinutes: number) => {
  const wrapper = document.createElement("div");
  wrapper.style.width = "60px";
  wrapper.style.height = "60px";
  wrapper.style.position = "relative";
  wrapper.style.cursor = "pointer";
  wrapper.style.transition = "transform 0.2s ease";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  
  // Pulsing animation ring
  const pulseRing = document.createElement("div");
  pulseRing.style.position = "absolute";
  pulseRing.style.top = "8px";
  pulseRing.style.left = "50%";
  pulseRing.style.transform = "translate(-50%, 0)";
  pulseRing.style.width = "40px";
  pulseRing.style.height = "40px";
  pulseRing.style.borderRadius = "50%";
  pulseRing.style.backgroundColor = "rgba(14, 165, 233, 0.2)";
  pulseRing.style.animation = "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite";
  wrapper.appendChild(pulseRing);

  // Car icon container
  const carContainer = document.createElement("div");
  carContainer.style.position = "absolute";
  carContainer.style.top = "8px";
  carContainer.style.left = "50%";
  carContainer.style.transform = "translate(-50%, 0)";
  carContainer.style.width = "32px";
  carContainer.style.height = "32px";
  carContainer.style.backgroundColor = "#0ea5e9";
  carContainer.style.borderRadius = "50%";
  carContainer.style.border = "3px solid white";
  carContainer.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(14, 165, 233, 0.2)";
  carContainer.style.display = "flex";
  carContainer.style.alignItems = "center";
  carContainer.style.justifyContent = "center";
  
  // Car SVG icon
  const carSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  carSvg.setAttribute("width", "18");
  carSvg.setAttribute("height", "18");
  carSvg.setAttribute("viewBox", "0 0 24 24");
  carSvg.setAttribute("fill", "white");
  
  const carPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  carPath.setAttribute(
    "d",
    "M5 11l1.5-4.5h11L19 11m-1.5 5a1.5 1.5 0 01-3 0m-9 0a1.5 1.5 0 013 0m12 0h1.5m-16.5 0h-1.5m17-5H5m2.5-6h9L18 8H6l1.5-3z"
  );
  carSvg.appendChild(carPath);
  carContainer.appendChild(carSvg);
  wrapper.appendChild(carContainer);

  // Driver label
  const driverLabel = document.createElement("div");
  driverLabel.style.position = "absolute";
  driverLabel.style.top = "42px";
  driverLabel.style.left = "50%";
  driverLabel.style.transform = "translateX(-50%)";
  driverLabel.style.backgroundColor = "rgba(14, 165, 233, 0.95)";
  driverLabel.style.color = "white";
  driverLabel.style.padding = "2px 8px";
  driverLabel.style.borderRadius = "6px";
  driverLabel.style.fontSize = "9px";
  driverLabel.style.fontWeight = "700";
  driverLabel.style.letterSpacing = "0.05em";
  driverLabel.style.whiteSpace = "nowrap";
  driverLabel.style.border = "1px solid rgba(255, 255, 255, 0.3)";
  driverLabel.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.3)";
  driverLabel.textContent = "DRIVER";
  wrapper.appendChild(driverLabel);

  // ETA badge
  const etaBadge = document.createElement("div");
  etaBadge.style.position = "absolute";
  etaBadge.style.top = "-2px";
  etaBadge.style.right = "2px";
  etaBadge.style.backgroundColor = "rgba(15, 23, 42, 0.95)";
  etaBadge.style.color = "#22d3ee";
  etaBadge.style.padding = "2px 6px";
  etaBadge.style.borderRadius = "8px";
  etaBadge.style.fontSize = "10px";
  etaBadge.style.fontWeight = "700";
  etaBadge.style.whiteSpace = "nowrap";
  etaBadge.style.border = "1px solid rgba(34, 211, 238, 0.3)";
  etaBadge.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.4)";
  etaBadge.textContent = `${etaMinutes}m`;
  wrapper.appendChild(etaBadge);

  // Add CSS animation if not already added
  if (!document.getElementById("map-marker-styles")) {
    const style = document.createElement("style");
    style.id = "map-marker-styles";
    style.textContent = `
      @keyframes pulse-ring {
        0%, 100% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 0.4;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  wrapper.onmouseenter = () => {
    wrapper.style.transform = "scale(1.1)";
    wrapper.style.zIndex = "1000";
  };
  wrapper.onmouseleave = () => {
    wrapper.style.transform = "scale(1)";
    wrapper.style.zIndex = "auto";
  };

  return wrapper;
};

const createPassengerMarkerElement = () => {
  const wrapper = document.createElement("div");
  wrapper.style.width = "48px";
  wrapper.style.height = "56px";
  wrapper.style.position = "relative";
  wrapper.style.cursor = "pointer";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  
  // Pin body
  const pinBody = document.createElement("div");
  pinBody.style.position = "absolute";
  pinBody.style.top = "0";
  pinBody.style.left = "50%";
  pinBody.style.transform = "translateX(-50%)";
  pinBody.style.width = "30px";
  pinBody.style.height = "30px";
  pinBody.style.backgroundColor = "#10b981";
  pinBody.style.borderRadius = "50% 50% 50% 0";
  pinBody.style.transform = "translateX(-50%) rotate(-45deg)";
  pinBody.style.border = "3px solid white";
  pinBody.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(16, 185, 129, 0.2)";
  
  // Pin center dot
  const pinDot = document.createElement("div");
  pinDot.style.position = "absolute";
  pinDot.style.top = "50%";
  pinDot.style.left = "50%";
  pinDot.style.transform = "translate(-50%, -50%) rotate(45deg)";
  pinDot.style.width = "10px";
  pinDot.style.height = "10px";
  pinDot.style.backgroundColor = "white";
  pinDot.style.borderRadius = "50%";
  pinBody.appendChild(pinDot);
  wrapper.appendChild(pinBody);

  // "YOU" Label
  const youLabel = document.createElement("div");
  youLabel.style.position = "absolute";
  youLabel.style.top = "34px";
  youLabel.style.left = "50%";
  youLabel.style.transform = "translateX(-50%)";
  youLabel.style.backgroundColor = "rgba(16, 185, 129, 0.95)";
  youLabel.style.color = "white";
  youLabel.style.padding = "3px 10px";
  youLabel.style.borderRadius = "8px";
  youLabel.style.fontSize = "10px";
  youLabel.style.fontWeight = "700";
  youLabel.style.letterSpacing = "0.1em";
  youLabel.style.whiteSpace = "nowrap";
  youLabel.style.border = "2px solid white";
  youLabel.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.4)";
  youLabel.textContent = "YOU";
  wrapper.appendChild(youLabel);

  // Shadow
  const shadow = document.createElement("div");
  shadow.style.position = "absolute";
  shadow.style.bottom = "0";
  shadow.style.left = "50%";
  shadow.style.transform = "translateX(-50%)";
  shadow.style.width = "16px";
  shadow.style.height = "4px";
  shadow.style.backgroundColor = "rgba(0, 0, 0, 0.25)";
  shadow.style.borderRadius = "50%";
  shadow.style.filter = "blur(2px)";
  wrapper.appendChild(shadow);

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

export const PassengerMap = ({ 
  summary, 
  currentLocation,
  useRealLocation = false,
  onToggleRealLocation,
  locationError,
}: PassengerMapProps) => {
  const driverLocations = summary.driverAvailability.drivers;
  
  // Determine which location to use: real-time GPS or saved location
  const passengerLocation = useMemo(() => {
    if (useRealLocation && currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };
    }
    return summary.passenger.defaultLocation?.location ?? 
           driverLocations[0]?.location ?? 
           null;
  }, [useRealLocation, currentLocation, summary.passenger.defaultLocation, driverLocations]);
  
  const radiusKm = summary.driverAvailability.radiusKm;
  const isUsingRealLocation = useRealLocation && currentLocation && passengerLocation;

  // Debug: Log location coordinates to help identify issues
  useEffect(() => {
    if (passengerLocation?.latitude != null && passengerLocation?.longitude != null) {
      console.log('[Map Debug] Passenger Location:', {
        source: isUsingRealLocation ? 'GPS (Real-time)' : 'Saved Location',
        latitude: passengerLocation.latitude,
        longitude: passengerLocation.longitude,
        accuracy: currentLocation?.accuracy ? `±${Math.round(currentLocation.accuracy)}m` : 'N/A',
        formatted: `${passengerLocation.latitude}, ${passengerLocation.longitude}`,
        googleMapsLink: `https://www.google.com/maps?q=${passengerLocation.latitude},${passengerLocation.longitude}`,
      });
    }
    if (driverLocations.length > 0) {
      console.log('[Map Debug] Driver Locations:', driverLocations.map(d => ({
        driverId: d.driverId,
        latitude: d.location?.latitude,
        longitude: d.location?.longitude,
      })));
    }
  }, [passengerLocation, driverLocations, isUsingRealLocation, currentLocation]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<Array<{ id: string; marker: import("maplibre-gl").Marker }>>([]);
  const maplibreRef = useRef<MapLibreModule | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

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

          // Add heatmap source
          if (!map.getSource(HEATMAP_SOURCE_ID)) {
            map.addSource(HEATMAP_SOURCE_ID, {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
          }

          // Add heatmap layer
          if (!map.getLayer(HEATMAP_LAYER_ID)) {
            map.addLayer({
              id: HEATMAP_LAYER_ID,
              type: "heatmap",
              source: HEATMAP_SOURCE_ID,
              paint: {
                // Increase the heatmap weight based on frequency and property magnitude
                "heatmap-weight": [
                  "interpolate",
                  ["linear"],
                  ["get", "weight"],
                  0,
                  0,
                  6,
                  1,
                ],
                // Increase the heatmap color weight by zoom level
                // heatmap-intensity is a multiplier on top of heatmap-weight
                "heatmap-intensity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0,
                  1,
                  15,
                  3,
                ],
                // Color ramp for heatmap - use vibrant colors for better visibility
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(33,102,172,0)",
                  0.2,
                  "rgb(103,169,207)",
                  0.4,
                  "rgb(209,229,240)",
                  0.6,
                  "rgb(253,219,199)",
                  0.8,
                  "rgb(239,138,98)",
                  1,
                  "rgb(178,24,43)",
                ],
                // Adjust the heatmap radius by zoom level
                "heatmap-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0,
                  2,
                  15,
                  50,
                ],
                // Transition from heatmap to circle layer by zoom level
                "heatmap-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  7,
                  1,
                  18,
                  0.5,
                ],
              },
              layout: {
                visibility: "none",
              },
            });
          }

          // Add a circle layer for point visualization when zoomed in
          if (!map.getLayer(HEATMAP_POINT_LAYER_ID)) {
            map.addLayer({
              id: HEATMAP_POINT_LAYER_ID,
              type: "circle",
              source: HEATMAP_SOURCE_ID,
              paint: {
                // Size circle radius by zoom level and weight
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  7,
                  ["interpolate", ["linear"], ["get", "weight"], 1, 3, 6, 6],
                  16,
                  ["interpolate", ["linear"], ["get", "weight"], 1, 10, 6, 20],
                ],
                // Color circle by weight
                "circle-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "weight"],
                  1,
                  "rgba(33,102,172,0.7)",
                  3,
                  "rgba(103,169,207,0.7)",
                  5,
                  "rgba(239,138,98,0.7)",
                  6,
                  "rgba(178,24,43,0.7)",
                ],
                "circle-stroke-color": "white",
                "circle-stroke-width": 1,
                // Transition from heatmap to circle layer by zoom level
                "circle-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  7,
                  0,
                  18,
                  0.8,
                ],
              },
              layout: {
                visibility: "none",
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

    // Passenger marker (pin) - always visible
    const passengerMarker = new maplibregl.Marker({
      element: createPassengerMarkerElement(),
      anchor: "bottom",
    })
      .setLngLat([passengerLocation.longitude, passengerLocation.latitude])
      .addTo(map);

    markersRef.current.push({
      id: "passenger",
      marker: passengerMarker,
    });

    // Driver markers (cars with ETA) - only show when heatmap is off
    if (!showHeatmap) {
      driverLocations.forEach((driver) => {
        const element = createDriverMarkerElement(driver.etaMinutes);
        element.title = `Driver • ETA ${driver.etaMinutes} min`;

        const marker = new maplibregl.Marker({
          element,
          anchor: "center",
        })
          .setLngLat([driver.location.longitude, driver.location.latitude])
          .setPopup(
            new maplibregl.Popup({
              closeButton: false,
              closeOnClick: true,
              offset: [0, -10],
              maxWidth: "160px",
              className: "driver-popup",
            }).setHTML(
              `<div style="
                padding: 8px 12px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                font-family: system-ui, -apple-system, sans-serif;
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <div style="
                    width: 24px;
                    height: 24px;
                    background: #0ea5e9;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  ">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <path d="M5 11l1.5-4.5h11L19 11m-1.5 5a1.5 1.5 0 01-3 0m-9 0a1.5 1.5 0 013 0m12 0h1.5m-16.5 0h-1.5m17-5H5m2.5-6h9L18 8H6l1.5-3z"/>
                    </svg>
                  </div>
                  <div>
                    <div style="
                      font-size: 13px;
                      font-weight: 600;
                      color: #0f172a;
                      margin-bottom: 2px;
                    ">Available driver</div>
                    <div style="
                      font-size: 11px;
                      color: #64748b;
                    ">Estimated arrival: <strong style="color: #0ea5e9;">${driver.etaMinutes} min</strong></div>
                  </div>
                </div>
              </div>`,
            ),
          )
          .addTo(map);

        markersRef.current.push({ id: driver.driverId, marker });
      });
    }

    // Update heatmap data with driver locations
    const heatmapSource = map.getSource(HEATMAP_SOURCE_ID) as import("maplibre-gl").GeoJSONSource | undefined;
    if (heatmapSource) {
      const features = driverLocations.map((driver) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [driver.location.longitude, driver.location.latitude],
        },
        properties: {
          weight: Math.max(1, 7 - driver.etaMinutes), // Closer drivers have higher weight
        },
      }));

      heatmapSource.setData({
        type: "FeatureCollection",
        features,
      });
    }

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
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 17,
          animate: true,
          duration: 800,
        });
      } else {
        map.once("load", () => {
          map.fitBounds(bounds, {
            padding: { top: 100, bottom: 100, left: 100, right: 100 },
            maxZoom: 17,
            animate: true,
            duration: 800,
          });
        });
      }
    }
  }, [driverLocations, passengerLocation, boundsCoordinates, mapError, radiusKm, showHeatmap]);

  // Toggle heatmap visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) {
      return;
    }

    const heatmapLayer = map.getLayer(HEATMAP_LAYER_ID);
    const pointLayer = map.getLayer(HEATMAP_POINT_LAYER_ID);
    
    if (heatmapLayer) {
      map.setLayoutProperty(
        HEATMAP_LAYER_ID,
        "visibility",
        showHeatmap ? "visible" : "none"
      );
    }
    
    if (pointLayer) {
      map.setLayoutProperty(
        HEATMAP_POINT_LAYER_ID,
        "visibility",
        showHeatmap ? "visible" : "none"
      );
    }
  }, [showHeatmap, isReady]);

  if (!passengerLocation) {
    return <StylisedFallbackMap />;
  }

  return (
    <div className="relative h-[500px] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-xl">
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
        
        {/* Location Status Indicator */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 shadow-lg shadow-slate-900/50">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isUsingRealLocation ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              {isUsingRealLocation ? 'Live GPS' : 'Saved Loc'}
            </p>
          </div>
          {isUsingRealLocation && currentLocation?.accuracy && (
            <p className="text-[11px] text-slate-400 mt-1">
              Accuracy: ±{Math.round(currentLocation.accuracy)}m
            </p>
          )}
        </div>
      </div>

      {/* Map Controls - Top Right */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        {/* GPS Toggle Button */}
        {onToggleRealLocation && (
          <button
            onClick={onToggleRealLocation}
            className={`pointer-events-auto group flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs shadow-lg shadow-slate-900/50 transition-all ${
              useRealLocation
                ? 'border-green-500/50 bg-green-950/70 text-green-200 hover:bg-green-900/80'
                : 'border-white/10 bg-slate-950/70 text-slate-200 hover:bg-slate-900/80 hover:border-sky-500/50'
            }`}
            title={useRealLocation ? "Using live GPS location" : "Click to use your real-time location"}
          >
            <div className="relative h-5 w-5 flex items-center justify-center">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                className="w-5 h-5"
              >
                <circle cx="12" cy="12" r="3" />
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="2" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="22" />
                <line x1="2" y1="12" x2="4" y2="12" />
                <line x1="20" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <span className="text-[11px] font-medium whitespace-nowrap">
              {useRealLocation ? "GPS Active" : "Use My Location"}
            </span>
          </button>
        )}
        
        {/* Heatmap Toggle Button */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className="pointer-events-auto group flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-slate-200 shadow-lg shadow-slate-900/50 transition-all hover:bg-slate-900/80 hover:border-sky-500/50"
          title={showHeatmap ? "Show individual drivers" : "Show driver density heat map"}
        >
          <div className="relative h-5 w-5 flex items-center justify-center">
            {showHeatmap ? (
              // Icon for markers view
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                className="w-5 h-5"
              >
                <path d="M5 11l1.5-4.5h11L19 11m-1.5 5a1.5 1.5 0 01-3 0m-9 0a1.5 1.5 0 013 0m12 0h1.5m-16.5 0h-1.5m17-5H5m2.5-6h9L18 8H6l1.5-3z"/>
              </svg>
            ) : (
              // Icon for heatmap view
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                className="w-5 h-5"
              >
                <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.8" />
                <circle cx="12" cy="12" r="6" opacity="0.4" />
                <circle cx="12" cy="12" r="9" opacity="0.2" />
              </svg>
            )}
          </div>
          <span className="text-[11px] font-medium whitespace-nowrap">
            {showHeatmap ? "Show Markers" : "Show Heat Map"}
          </span>
        </button>
      </div>

      {/* Heat map legend - only show when heatmap is active */}
      {showHeatmap && (
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 shadow-lg shadow-slate-900/50">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-2">Driver Density</p>
          <div className="flex items-center gap-2">
            <div className="flex h-3 w-24 rounded overflow-hidden">
              <div className="flex-1 bg-[rgb(103,169,207)]"></div>
              <div className="flex-1 bg-[rgb(209,229,240)]"></div>
              <div className="flex-1 bg-[rgb(253,219,199)]"></div>
              <div className="flex-1 bg-[rgb(239,138,98)]"></div>
              <div className="flex-1 bg-[rgb(178,24,43)]"></div>
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-slate-400">Low</span>
            <span className="text-[9px] text-slate-400">High</span>
          </div>
        </div>
      )}

      {/* Coordinates Display with Source Info */}
      {passengerLocation?.latitude != null && passengerLocation?.longitude != null && (
        <div className={`pointer-events-none absolute bottom-4 left-4 rounded-lg border px-3 py-2 text-[10px] shadow-lg ${
          isUsingRealLocation 
            ? 'border-green-500/30 bg-green-950/90 text-green-200'
            : 'border-yellow-500/30 bg-slate-950/90 text-yellow-200'
        }`}>
          <p className="text-[9px] text-slate-400 mb-1">
            {isUsingRealLocation ? '📍 Live GPS Location' : '📌 Saved Location'}
          </p>
          <p className="font-mono">
            {passengerLocation.latitude.toFixed(6)}, {passengerLocation.longitude.toFixed(6)}
          </p>
          <p className="text-[9px] text-slate-400 mt-1">
            Check console for verification link
          </p>
        </div>
      )}
      
      {/* Location Error Display */}
      {locationError && !isUsingRealLocation && (
        <div className="pointer-events-none absolute bottom-20 left-4 right-4 max-w-sm rounded-lg border border-red-500/30 bg-red-950/90 px-3 py-2 text-xs text-red-200 shadow-lg">
          <p className="font-semibold mb-1">⚠️ Location Access Needed</p>
          <p className="text-[10px]">{locationError}</p>
        </div>
      )}
    </div>
  );
};
