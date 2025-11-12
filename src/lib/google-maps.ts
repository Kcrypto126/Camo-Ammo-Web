// Google Maps configuration and utilities

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export const GOOGLE_MAPS_LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ["places", "drawing", "geometry"];

export const DEFAULT_MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
  gestureHandling: "greedy",
};
