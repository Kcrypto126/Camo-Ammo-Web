import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { MapPin, Settings, Users, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Separator } from "@/components/ui/separator.tsx";

interface LocationSharingControlProps {
  userLocation: { lat: number; lng: number } | null;
}

export default function LocationSharingControl({
  userLocation,
}: LocationSharingControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareWith, setShareWith] = useState<string>("all_friends");

  const locationStatus = useQuery(api.locationSharing.getMyLocationStatus);
  const updateLocation = useMutation(api.locationSharing.updateMyLocation);
  const toggleSharing = useMutation(api.locationSharing.toggleLocationSharing);

  // Update location in backend when it changes
  useEffect(() => {
    if (userLocation && locationStatus?.isActive) {
      updateLocation({
        lat: userLocation.lat,
        lng: userLocation.lng,
      }).catch((error) => {
        console.error("Failed to update location:", error);
      });
    }
  }, [userLocation, locationStatus?.isActive, updateLocation]);

  const handleToggle = async (checked: boolean) => {
    if (!userLocation && checked) {
      toast.error("Enable GPS location to start sharing");
      return;
    }

    try {
      // Update location first if turning on
      if (checked && userLocation) {
        await updateLocation({
          lat: userLocation.lat,
          lng: userLocation.lng,
        });
      }

      await toggleSharing({
        isActive: checked,
        shareWith: shareWith,
      });

      toast.success(
        checked ? "Location sharing enabled" : "Location sharing disabled"
      );
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message: errorMessage } = error.data as {
          code: string;
          message: string;
        };
        toast.error(errorMessage);
      } else {
        toast.error("Failed to update location sharing");
      }
    }
  };

  const handleShareWithChange = async (value: string) => {
    setShareWith(value);

    if (locationStatus?.isActive) {
      try {
        await toggleSharing({
          isActive: true,
          shareWith: value,
        });
        toast.success("Privacy settings updated");
      } catch (error) {
        if (error instanceof ConvexError) {
          const { message: errorMessage } = error.data as {
            code: string;
            message: string;
          };
          toast.error(errorMessage);
        } else {
          toast.error("Failed to update settings");
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={locationStatus?.isActive ? "default" : "outline"}
          size="sm"
          className="gap-2"
        >
          {locationStatus?.isActive ? (
            <>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Sharing</span>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              <span className="hidden sm:inline">Not Sharing</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location Sharing
          </DialogTitle>
          <DialogDescription>
            Share your real-time location with friends while hunting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Toggle */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="location-sharing" className="text-base">
                  Share Location
                </Label>
                <div className="text-sm text-muted-foreground">
                  {locationStatus?.isActive
                    ? "Your location is visible to friends"
                    : "Your location is hidden"}
                </div>
              </div>
              <Switch
                id="location-sharing"
                checked={locationStatus?.isActive || false}
                onCheckedChange={handleToggle}
              />
            </div>
          </Card>

          {/* Privacy Settings */}
          {locationStatus?.isActive && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base">Privacy Settings</Label>
                </div>

                <RadioGroup
                  value={shareWith}
                  onValueChange={handleShareWithChange}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="all_friends" id="all" />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="all" className="cursor-pointer">
                        All Friends
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Share with everyone on your friends list
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 opacity-50">
                    <RadioGroupItem
                      value="selected_friends"
                      id="selected"
                      disabled
                    />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="selected" className="cursor-not-allowed">
                        Selected Friends (Coming Soon)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Choose specific friends to share with
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="none" id="none" />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="none" className="cursor-pointer">
                        No One
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Update location but don't share it
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {/* Info */}
          <Card className="p-4 bg-muted">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  Location updates automatically while GPS tracking is enabled
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Only friends you've accepted can see your location</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  Your location is never stored permanently on our servers
                </span>
              </p>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
