import type { Doc } from "@/convex/_generated/dataModel.d.ts";

interface PropertyLayerProps {
  onPropertyClick?: (property: Doc<"properties">) => void;
  map: google.maps.Map | null;
}

export default function PropertyLayer({ onPropertyClick, map }: PropertyLayerProps) {
  // TODO: Implement property polygons using Google Maps Polygon API
  return null;
}
