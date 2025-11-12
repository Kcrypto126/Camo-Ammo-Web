import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { X, MapPin, Calendar, ShieldCheck, FileText, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Badge } from "@/components/ui/badge.tsx";

interface HuntingUnitPanelProps {
  unit: Doc<"huntingUnits"> | null;
  onClose: () => void;
}

export default function HuntingUnitPanel({
  unit,
  onClose,
}: HuntingUnitPanelProps) {
  if (!unit) return null;

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "WMA":
        return "default";
      case "National Forest":
        return "secondary";
      case "State Park":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="absolute top-0 left-0 bottom-0 w-96 bg-background border-r shadow-lg z-[1000]">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-bold">Hunting Unit Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-xl">{unit.name}</h3>
              <Badge variant={getTypeBadgeVariant(unit.type)}>
                {unit.type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{unit.state}</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              ID: {unit.unitId}
            </p>
          </div>

          {/* Description */}
          {unit.description && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                ABOUT THIS AREA
              </h4>
              <p className="text-sm leading-relaxed">{unit.description}</p>
            </div>
          )}

          {/* Hunting Status */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-muted-foreground mb-3">
              HUNTING STATUS
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className={`w-5 h-5 mt-0.5 ${
                    unit.allowsHunting ? "text-green-600" : "text-red-600"
                  }`}
                />
                <div>
                  <p className="font-medium">
                    {unit.allowsHunting ? "Hunting Allowed" : "No Hunting Permitted"}
                  </p>
                  {unit.allowsHunting && unit.permitRequired && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ⚠️ Permit or reservation required
                    </p>
                  )}
                  {unit.allowsHunting && !unit.permitRequired && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ✓ No special permit required (state license needed)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Season Dates */}
          {unit.seasonDates && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">
                HUNTING SEASONS
              </h4>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-line">{unit.seasonDates}</p>
                </div>
              </div>
            </div>
          )}

          {/* Regulations */}
          {unit.regulations && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">
                REGULATIONS & RULES
              </h4>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{unit.regulations}</p>
                </div>
              </div>
            </div>
          )}

          {/* Location Information */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-muted-foreground mb-3">
              LOCATION
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Center Point</span>
              </div>
              <p className="text-sm font-mono pl-6">
                {unit.centerLat.toFixed(6)}, {unit.centerLng.toFixed(6)}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 mt-2"
                onClick={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${unit.centerLat},${unit.centerLng}`;
                  window.open(url, "_blank");
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Open in Google Maps
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button className="w-full" size="lg">
              Save to My Hunting Areas
            </Button>
            <Button variant="outline" className="w-full">
              Share Location
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
