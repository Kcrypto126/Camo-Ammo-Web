import type { Doc } from "@/convex/_generated/dataModel.d.ts";

interface HuntingUnitLayerProps {
  onUnitClick?: (unit: Doc<"huntingUnits">) => void;
  map: google.maps.Map | null;
}

export default function HuntingUnitLayer({ onUnitClick, map }: HuntingUnitLayerProps) {
  // TODO: Implement hunting unit polygons using Google Maps Polygon API
  return null;
}
