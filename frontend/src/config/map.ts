
// Using OSM tiles with English language preference
// Stamen Terrain provides English labels and good accuracy for all regions
const FALLBACK_STYLE_URL = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        // Using multiple tile servers for better availability and English labels
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    "osm-bright": {
      type: "raster",
      tiles: [
        // CartoDB Voyager has better English label support
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "osm-layer",
      type: "raster",
      source: "osm-bright", // Using CARTO Voyager for better English labels
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

export const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL?.trim() || FALLBACK_STYLE_URL;

export const MAP_DEFAULT_ZOOM = Number.parseFloat(
  import.meta.env.VITE_MAP_DEFAULT_ZOOM ?? "15",
);

export const MAP_DEFAULT_PITCH = Number.parseFloat(
  import.meta.env.VITE_MAP_DEFAULT_PITCH ?? "0",
);

export const MAP_ATTRIBUTION =
  import.meta.env.VITE_MAP_ATTRIBUTION ??
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
