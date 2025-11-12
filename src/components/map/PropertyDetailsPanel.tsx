import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { X, Phone, Mail, MapPin, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";

interface PropertyDetailsPanelProps {
  property: Doc<"properties"> | null;
  onClose: () => void;
}

export default function PropertyDetailsPanel({
  property,
  onClose,
}: PropertyDetailsPanelProps) {
  if (!property) return null;

  return (
    <div className="absolute top-0 left-0 bottom-0 w-96 bg-background border-r shadow-lg z-[1000]">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-bold">Property Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="p-4 space-y-6">
          {/* Owner Information */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">
              OWNER INFORMATION
            </h3>
            <div className="space-y-3">
              <div>
                <p className="font-bold text-lg">{property.ownerName}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {property.propertyType} Property Owner
                </p>
              </div>

              {property.ownerPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <a
                      href={`tel:${property.ownerPhone}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {property.ownerPhone}
                    </a>
                  </div>
                </div>
              )}

              {property.ownerEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${property.ownerEmail}`}
                      className="text-primary hover:underline"
                    >
                      {property.ownerEmail}
                    </a>
                  </div>
                </div>
              )}

              {property.ownerAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Mailing Address
                    </p>
                    <p className="text-sm">{property.ownerAddress}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Property Information */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              PROPERTY INFORMATION
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Acreage</p>
                  <p className="font-bold text-xl">
                    {property.acreage.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Property Type</p>
                  <p className="font-medium capitalize">
                    {property.propertyType}
                  </p>
                </div>
              </div>

              {property.landUse && (
                <div>
                  <p className="text-xs text-muted-foreground">Land Use</p>
                  <p className="font-medium">{property.landUse}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">
                  {property.address || "No address"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {property.county}, {property.state}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Parcel ID</p>
                <p className="font-mono text-sm">{property.parcelId}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Coordinates</p>
                <p className="text-sm font-mono">
                  {property.centerLat.toFixed(6)}, {property.centerLng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Verification Status
                </p>
                <p
                  className={`font-medium ${
                    property.verified ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {property.verified ? "✓ Verified" : "⚠ Unverified"}
                </p>
              </div>
              {property.lastUpdated && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm">
                    {new Date(property.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button className="w-full" size="lg">
              Request Hunting Permission
            </Button>
            <Button variant="outline" className="w-full">
              Save to My Properties
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
