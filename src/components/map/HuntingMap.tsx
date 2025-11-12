import { Layers, Navigation, Cloud } from "lucide-react";
import { useState, useCallback } from "react";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { toast } from "sonner";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, DEFAULT_MAP_OPTIONS } from "@/lib/google-maps.ts";
import PropertyLayer from "./PropertyLayer.tsx";
import LayerControl from "./LayerControl.tsx";
import PropertyDetailsPanel from "./PropertyDetailsPanel.tsx";
import HuntingUnitLayer from "./HuntingUnitLayer.tsx";
import HuntingUnitPanel from "./HuntingUnitPanel.tsx";
import WeatherPanel from "../weather/WeatherPanel.tsx";
import TrackingControl from "../tracking/TrackingControl.tsx";
import TrackLayer from "../tracking/TrackLayer.tsx";
import WaypointLayer from "../tracking/WaypointLayer.tsx";
import AddWaypointDialog from "../tracking/AddWaypointDialog.tsx";
import FriendLocationLayer from "../friends/FriendLocationLayer.tsx";
import { Authenticated } from "convex/react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

export type MapType = "roadmap" | "satellite" | "hybrid" | "terrain";

const MAP_TYPE_NAMES: Record<MapType, string> = {
  roadmap: "Roadmap",
  satellite: "Satellite",
  hybrid: "Hybrid",
  terrain: "Terrain",
};

function MapTypeControl({
  mapType,
  onMapTypeChange,
}: {
  mapType: MapType;
  onMapTypeChange: (mapType: MapType) => void;
}) {
  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-2 shadow-lg">
            <Layers className="h-4 w-4" />
            {MAP_TYPE_NAMES[mapType]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onMapTypeChange("roadmap")}>
            Roadmap
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMapTypeChange("satellite")}>
            Satellite
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMapTypeChange("hybrid")}>
            Hybrid
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMapTypeChange("terrain")}>
            Terrain
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function LocationButton({
  map,
  onWeatherClick,
  onLocationUpdate,
}: {
  map: google.maps.Map | null;
  onWeatherClick: () => void;
  onLocationUpdate: (lat: number, lng: number) => void;
}) {
  const [isLocating, setIsLocating] = useState(false);

  const handleLocate = () => {
    if (!map) return;
    
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          map.setCenter(pos);
          map.setZoom(16);
          onLocationUpdate(pos.lat, pos.lng);
          setIsLocating(false);
          toast.success("Location found");
        },
        () => {
          setIsLocating(false);
          toast.error("Unable to find your location");
        }
      );
    } else {
      setIsLocating(false);
      toast.error("Geolocation is not supported by your browser");
    }
  };

  return (
    <div className="absolute bottom-20 right-4 z-[1000] flex flex-col gap-2 md:bottom-4">
      <Button
        size="icon"
        onClick={onWeatherClick}
        className="shadow-lg"
        title="View weather"
      >
        <Cloud className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        onClick={handleLocate}
        disabled={isLocating}
        className="shadow-lg"
        title="Find my location"
      >
        <Navigation className={`h-4 w-4 ${isLocating ? "animate-pulse" : ""}`} />
      </Button>
    </div>
  );
}

interface HuntingMapProps {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  className?: string;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export default function HuntingMap({
  initialCenter = { lat: 39.8283, lng: -98.5795 }, // Center of US
  initialZoom = 5,
  className = "h-screen w-full",
  onLocationUpdate,
}: HuntingMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapType, setMapType] = useState<MapType>("hybrid");
  const [layers, setLayers] = useState({
    properties: true,
    huntingUnits: false,
    publicLand: false,
    friends: true,
  });
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedProperty, setSelectedProperty] =
    useState<Doc<"properties"> | null>(null);
  const [selectedHuntingUnit, setSelectedHuntingUnit] =
    useState<Doc<"huntingUnits"> | null>(null);
  const [showWeather, setShowWeather] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState(initialCenter);
  const [waypointDialogOpen, setWaypointDialogOpen] = useState(false);
  const [waypointLocation, setWaypointLocation] = useState<{
    lat: number;
    lng: number;
    altitude?: number;
  } | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleLayerToggle = (layer: string, enabled: boolean) => {
    setLayers((prev) => ({ ...prev, [layer]: enabled }));
  };

  const handlePropertyClick = (property: Doc<"properties">) => {
    setSelectedProperty(property);
    setSelectedHuntingUnit(null);
  };

  const handleHuntingUnitClick = (unit: Doc<"huntingUnits">) => {
    setSelectedHuntingUnit(unit);
    setSelectedProperty(null);
  };

  const handleWeatherClick = () => {
    setShowWeather(true);
  };

  const handleWaypointAdd = (lat: number, lng: number, altitude?: number) => {
    setWaypointLocation({ lat, lng, altitude });
    setWaypointDialogOpen(true);
  };

  if (loadError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Failed to load Google Maps</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please check your API key in environment variables
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted">
        <p className="text-lg text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerClassName={className}
        center={initialCenter}
        zoom={initialZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          ...DEFAULT_MAP_OPTIONS,
          mapTypeId: mapType,
        }}
      >
        <Authenticated>
          {layers.properties && (
            <PropertyLayer onPropertyClick={handlePropertyClick} map={map} />
          )}
          {layers.huntingUnits && (
            <HuntingUnitLayer onUnitClick={handleHuntingUnitClick} map={map} />
          )}
          <TrackLayer map={map} />
          <WaypointLayer map={map} />
          <FriendLocationLayer visible={layers.friends} map={map} />
        </Authenticated>
        {userLocation && <Marker position={userLocation} />}
      </GoogleMap>
      
      <MapTypeControl mapType={mapType} onMapTypeChange={setMapType} />
      <LocationButton
        map={map}
        onWeatherClick={handleWeatherClick}
        onLocationUpdate={(lat, lng) => {
          setUserLocation({ lat, lng });
          if (onLocationUpdate) {
            onLocationUpdate(lat, lng);
          }
        }}
      />
      
      <Authenticated>
        <LayerControl layers={layers} onLayerToggle={handleLayerToggle} />
        <TrackingControl
          onWaypointAdd={handleWaypointAdd}
          onLocationUpdate={(lat, lng) => {
            setUserLocation({ lat, lng });
            if (onLocationUpdate) {
              onLocationUpdate(lat, lng);
            }
          }}
        />
        {showWeather && (
          <WeatherPanel
            lat={weatherLocation.lat}
            lng={weatherLocation.lng}
            onClose={() => setShowWeather(false)}
          />
        )}
        {!showWeather && selectedProperty && (
          <PropertyDetailsPanel
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
          />
        )}
        {!showWeather && !selectedProperty && selectedHuntingUnit && (
          <HuntingUnitPanel
            unit={selectedHuntingUnit}
            onClose={() => setSelectedHuntingUnit(null)}
          />
        )}
        {waypointLocation && (
          <AddWaypointDialog
            open={waypointDialogOpen}
            onOpenChange={setWaypointDialogOpen}
            lat={waypointLocation.lat}
            lng={waypointLocation.lng}
            altitude={waypointLocation.altitude}
          />
        )}
      </Authenticated>
    </div>
  );
}
