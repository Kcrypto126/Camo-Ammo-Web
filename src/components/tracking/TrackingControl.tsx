import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Play,
  Square,
  MapPin,
  Navigation as NavigationIcon,
  Clock,
  Route,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface TrackingControlProps {
  onWaypointAdd: (lat: number, lng: number) => void;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export default function TrackingControl({
  onWaypointAdd,
  onLocationUpdate,
}: TrackingControlProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
    altitude?: number;
    accuracy?: number;
  } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [trackStats, setTrackStats] = useState({
    distance: 0,
    duration: 0,
    points: 0,
  });

  const startTrack = useMutation(api.tracks.startTrack);
  const addTrackPoint = useMutation(api.tracks.addTrackPoint);
  const stopTrack = useMutation(api.tracks.stopTrack);
  const activeTrack = useQuery(api.tracks.getActiveTrack);

  const handleStartTracking = async () => {
    try {
      const trackId = await startTrack({
        name: `Track ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      });

      setIsTracking(true);
      toast.success("Tracking started");

      // Start watching position
      if ("geolocation" in navigator) {
        const id = navigator.geolocation.watchPosition(
          async (position) => {
            const coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              altitude: position.coords.altitude ?? undefined,
              accuracy: position.coords.accuracy,
            };
            
            setCurrentPosition(coords);

            // Notify parent of location update
            if (onLocationUpdate) {
              onLocationUpdate(coords.lat, coords.lng);
            }

            // Add point to track
            try {
              await addTrackPoint({
                trackId,
                ...coords,
              });
            } catch (error) {
              console.error("Failed to add track point:", error);
            }
          },
          (error) => {
            console.error("Geolocation error:", error);
            toast.error("Failed to get location");
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          }
        );
        setWatchId(id);
      }
    } catch (error) {
      toast.error("Failed to start tracking");
      console.error(error);
    }
  };

  const handleStopTracking = async () => {
    if (!activeTrack) return;

    try {
      await stopTrack({ trackId: activeTrack._id });
      
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }

      setIsTracking(false);
      toast.success("Track saved");
      setTrackStats({ distance: 0, duration: 0, points: 0 });
    } catch (error) {
      toast.error("Failed to stop tracking");
      console.error(error);
    }
  };

  const handleAddWaypoint = () => {
    if (currentPosition) {
      onWaypointAdd(currentPosition.lat, currentPosition.lng);
    } else {
      toast.error("Current position not available");
    }
  };

  // Update track stats
  useEffect(() => {
    if (activeTrack) {
      const duration = (Date.now() - activeTrack.startTime) / 1000;
      setTrackStats({
        distance: activeTrack.distance,
        duration,
        points: activeTrack.coordinates.length,
      });
    }
  }, [activeTrack]);

  // Sync isTracking state with activeTrack
  useEffect(() => {
    if (activeTrack && !isTracking) {
      setIsTracking(true);
    } else if (!activeTrack && isTracking) {
      setIsTracking(false);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
    }
  }, [activeTrack, isTracking, watchId]);

  const formatDistance = (meters: number) => {
    const miles = meters * 0.000621371;
    return miles < 0.1
      ? `${Math.round(meters * 3.28084)} ft`
      : `${miles.toFixed(2)} mi`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="absolute bottom-20 left-4 z-[1000] bg-background border rounded-lg shadow-lg p-3 space-y-3 w-64 md:top-4 md:bottom-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">GPS Tracker</h3>
        <div
          className={`w-2 h-2 rounded-full ${
            isTracking ? "bg-red-500 animate-pulse" : "bg-muted"
          }`}
        />
      </div>

      {isTracking && (
        <div className="space-y-2 text-sm border-t pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Route className="w-4 h-4" />
              <span>Distance</span>
            </div>
            <span className="font-bold">{formatDistance(trackStats.distance)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Duration</span>
            </div>
            <span className="font-bold">{formatDuration(trackStats.duration)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>Points</span>
            </div>
            <span className="font-bold">{trackStats.points}</span>
          </div>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t">
        {!isTracking ? (
          <Button
            onClick={handleStartTracking}
            className="w-full gap-2"
            size="sm"
          >
            <Play className="w-4 h-4" />
            Start Tracking
          </Button>
        ) : (
          <>
            <Button
              onClick={handleStopTracking}
              variant="destructive"
              className="w-full gap-2"
              size="sm"
            >
              <Square className="w-4 h-4" />
              Stop & Save Track
            </Button>
            <Button
              onClick={handleAddWaypoint}
              variant="outline"
              className="w-full gap-2"
              size="sm"
              disabled={!currentPosition}
            >
              <MapPin className="w-4 h-4" />
              Drop Waypoint
            </Button>
          </>
        )}
      </div>

      {currentPosition && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          <div className="flex items-center gap-1">
            <NavigationIcon className="w-3 h-3" />
            <span>
              {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
            </span>
          </div>
          {currentPosition.accuracy && (
            <div className="mt-1">
              Accuracy: ±{Math.round(currentPosition.accuracy)}m
            </div>
          )}
        </div>
      )}
    </div>
  );
}
