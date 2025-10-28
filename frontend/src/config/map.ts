
const FALLBACK_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL?.trim() || FALLBACK_STYLE_URL;

export const MAP_DEFAULT_ZOOM = Number.parseFloat(
  import.meta.env.VITE_MAP_DEFAULT_ZOOM ?? "13",
);

export const MAP_DEFAULT_PITCH = Number.parseFloat(
  import.meta.env.VITE_MAP_DEFAULT_PITCH ?? "0",
);

export const MAP_ATTRIBUTION =
  import.meta.env.VITE_MAP_ATTRIBUTION ??
  '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors';
