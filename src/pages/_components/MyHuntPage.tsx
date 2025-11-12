import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { NotificationBell } from "@/components/ui/notification-bell.tsx";
import {
  Plus,
  Trophy,
  Target,
  Clock,
  MapPin,
  Calendar,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Thermometer,
  Wind,
  Droplets,
  Cloud,
  Eye,
  Home,
  Route,
  AlertTriangle,
  FileText,
  Compass,
  Map,
  Trees,
  Sunrise,
  Sunset,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import * as SunCalc from "suncalc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from "@/lib/google-maps.ts";
import AddWaypointDialog from "@/components/tracking/AddWaypointDialog.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const SPECIES_OPTIONS = [
  "Deer",
  "Turkey",
  "Elk",
  "Duck",
  "Goose",
  "Rabbit",
  "Squirrel",
  "Bear",
  "Hog",
  "Other",
];

const METHOD_OPTIONS = ["Rifle", "Bow", "Shotgun", "Muzzleloader", "Other"];

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  windDirection: number;
  location: string;
  country: string;
}

interface ForecastData {
  forecast: Array<{
    timestamp: number;
    precipitationProbability: number;
  }>;
}

interface MyHuntPageProps {
  onViewFullMap: () => void;
  onStartTracking: () => void;
  onEmergency: () => void;
  userRole?: string;
  onNavigateToForumModeration?: () => void;
  onNavigateToOpenTickets?: () => void;
  onNavigateToPendingPosts?: () => void;
  onNavigateToReportedPosts?: () => void;
}

export default function MyHuntPage({
  onViewFullMap,
  onStartTracking,
  onEmergency,
  userRole,
  onNavigateToForumModeration,
  onNavigateToOpenTickets,
  onNavigateToPendingPosts,
  onNavigateToReportedPosts,
}: MyHuntPageProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [waypointDialogOpen, setWaypointDialogOpen] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [newHunt, setNewHunt] = useState({
    title: "",
    locationName: "",
    species: "",
    method: "",
    notes: "",
  });
  const [endHuntData, setEndHuntData] = useState({
    successful: false,
    harvested: 0,
    notes: "",
  });

  const hunts = useQuery(api.hunts.getMyHunts);
  const activeHunt = useQuery(api.hunts.getActiveHunt);
  const stats = useQuery(api.hunts.getHuntStats);
  
  // Admin only queries
  const isAdmin = userRole === "owner" || userRole === "admin";
  const pendingPosts = useQuery(
    api.forums.getPendingPosts,
    isAdmin ? {} : "skip"
  );
  const reportedPosts = useQuery(
    api.forums.getReportedPosts,
    isAdmin ? {} : "skip"
  );
  const openTickets = useQuery(
    api.support.getAllTickets,
    isAdmin ? { status: "open" } : "skip"
  );

  const startHunt = useMutation(api.hunts.startHunt);
  const endHunt = useMutation(api.hunts.endHunt);
  
  const getCurrentWeather = useAction(api.weather.getCurrentWeather);
  const getForecast = useAction(api.weather.getForecast);

  const loadWeatherData = useCallback(
    async (lat: number, lng: number) => {
      setIsLoadingWeather(true);
      try {
        const [weatherData, forecastData] = await Promise.all([
          getCurrentWeather({ lat, lng, units: "imperial" }),
          getForecast({ lat, lng, units: "imperial" }),
        ]);
        setWeather(weatherData);
        setForecast(forecastData);
      } catch (error) {
        console.error("Failed to load weather:", error);
        toast.error("Failed to load weather data");
      } finally {
        setIsLoadingWeather(false);
      }
    },
    [getCurrentWeather, getForecast]
  );

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(coords);
          loadWeatherData(coords.lat, coords.lng);
        },
        (error) => {
          console.error("Geolocation error:", error);
          // Default to Kansas City if location fails
          const defaultLocation = { lat: 39.0997, lng: -94.5786 };
          setLocation(defaultLocation);
          loadWeatherData(defaultLocation.lat, defaultLocation.lng);
        }
      );
    }
  }, [loadWeatherData]);

  const getWindDirection = (degrees: number): string => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const getFloridaHuntZone = (lat: number, lng: number): { zone: string; description: string } => {
    // Florida boundaries approximately: 24.5°N to 31°N, -87.6°W to -80°W
    
    // Northwest Florida (Panhandle)
    if (lat > 30.2 && lng < -85) {
      return { zone: "Northwest Zone A", description: "Panhandle Region" };
    }
    
    // North Central Florida
    if (lat > 29.5 && lng >= -85 && lng < -82.5) {
      return { zone: "North Central Zone B", description: "North Central" };
    }
    
    // Northeast Florida
    if (lat > 29.5 && lng >= -82.5) {
      return { zone: "Northeast Zone C", description: "Northeast Coast" };
    }
    
    // Central Florida
    if (lat >= 27.5 && lat <= 29.5 && lng >= -82.5 && lng < -80.5) {
      return { zone: "Central Zone D", description: "Central Region" };
    }
    
    // Southwest Florida
    if (lat >= 26 && lat <= 29 && lng < -81.5) {
      return { zone: "Southwest Zone E", description: "Gulf Coast" };
    }
    
    // Southeast Florida
    if (lat >= 26 && lng >= -80.5) {
      return { zone: "Southeast Zone F", description: "Atlantic Coast" };
    }
    
    // South Florida / Everglades
    if (lat < 26.5) {
      return { zone: "South Zone G", description: "Everglades Region" };
    }
    
    // Default
    return { zone: "Florida Zone", description: "Statewide" };
  };

  const rainChance = forecast?.forecast[0]?.precipitationProbability ?? 0;
  const huntZone = location ? getFloridaHuntZone(location.lat, location.lng) : null;

  const handleAddMarker = () => {
    if (location) {
      setWaypointDialogOpen(true);
    } else {
      toast.error("Location not available");
    }
  };

  const handleStartHunt = async () => {
    if (!newHunt.title || !newHunt.locationName || !newHunt.species) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Get current location
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await startHunt({
              title: newHunt.title,
              locationName: newHunt.locationName,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              species: newHunt.species,
              method: newHunt.method || undefined,
              notes: newHunt.notes || undefined,
            });
            toast.success("Hunt started! Good luck!");
            setShowStartDialog(false);
            setNewHunt({
              title: "",
              locationName: "",
              species: "",
              method: "",
              notes: "",
            });
          },
          async () => {
            // Default location if geolocation fails
            await startHunt({
              title: newHunt.title,
              locationName: newHunt.locationName,
              lat: 39.0997,
              lng: -94.5786,
              species: newHunt.species,
              method: newHunt.method || undefined,
              notes: newHunt.notes || undefined,
            });
            toast.success("Hunt started! Good luck!");
            setShowStartDialog(false);
            setNewHunt({
              title: "",
              locationName: "",
              species: "",
              method: "",
              notes: "",
            });
          }
        );
      }
    } catch (error) {
      toast.error("Failed to start hunt");
      console.error(error);
    }
  };

  const handleEndHunt = async () => {
    if (!activeHunt) return;

    try {
      await endHunt({
        huntId: activeHunt._id,
        successful: endHuntData.successful,
        harvested: endHuntData.successful ? endHuntData.harvested : undefined,
        notes: endHuntData.notes || undefined,
      });
      toast.success("Hunt completed!");
      setShowEndDialog(false);
      setEndHuntData({ successful: false, harvested: 0, notes: "" });
    } catch (error) {
      toast.error("Failed to end hunt");
      console.error(error);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Location Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold">
                {weather?.location || "HQ"}
              </h1>
              {weather && (
                <p className="text-xs text-muted-foreground">
                  {weather.country}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button size="sm" onClick={() => setShowStartDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Start Hunt
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 pb-6">
        {/* Action Needed Section (Admin/Owner Only) */}
        {isAdmin && ((pendingPosts && pendingPosts.length > 0) || (reportedPosts && reportedPosts.length > 0) || (openTickets && openTickets.length > 0)) && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-base">Action Needed!</CardTitle>
                </div>
                <Badge variant="destructive" className="text-xs">
                  {(pendingPosts?.length || 0) + (reportedPosts?.length || 0) + (openTickets?.length || 0)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {openTickets && openTickets.length > 0 && (
                <div className="rounded-lg border border-blue-500/20 bg-background p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">Open Support Tickets</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {openTickets.length} {openTickets.length === 1 ? "ticket" : "tickets"} need attention
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onNavigateToOpenTickets}
                    >
                      View
                    </Button>
                  </div>
                </div>
              )}
              {pendingPosts && pendingPosts.length > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-background p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">Forum Posts Pending Approval</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pendingPosts.length} {pendingPosts.length === 1 ? "post" : "posts"} awaiting review
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onNavigateToPendingPosts}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              )}
              {reportedPosts && reportedPosts.length > 0 && (
                <div className="rounded-lg border border-red-500/20 bg-background p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">Reported Forum Posts</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {reportedPosts.length} {reportedPosts.length === 1 ? "post" : "posts"} reported by members
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onNavigateToReportedPosts}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Wind Analysis and Hunt Zone */}
        <div className="grid grid-cols-2 gap-3">
          {/* Wind Analysis */}
          <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center">
                <Compass className="mb-2 h-8 w-8 text-indigo-500" />
                <p className="text-xs font-semibold text-muted-foreground">Wind Analysis</p>
                {weather ? (
                  <>
                    <div className="mt-1 flex items-baseline gap-1">
                      <p className="text-xl font-bold">{getWindDirection(weather.windDirection)}</p>
                      <p className="text-xs text-muted-foreground">{weather.windSpeed} mph</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {weather.windSpeed < 5 ? "Calm" : weather.windSpeed < 10 ? "Light" : weather.windSpeed < 15 ? "Moderate" : "Strong"}
                    </p>
                  </>
                ) : (
                  <Skeleton className="mt-2 h-8 w-16" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hunt Zone */}
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center">
                <Target className="mb-2 h-8 w-8 text-green-500" />
                <p className="text-xs font-semibold text-muted-foreground">Hunt Zone</p>
                {huntZone ? (
                  <>
                    <p className="mt-1 text-base font-bold leading-tight">{huntZone.zone}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{huntZone.description}</p>
                  </>
                ) : (
                  <Skeleton className="mt-2 h-8 w-20" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weather Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          {isLoadingWeather ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : weather ? (
            <>
              {/* Temperature */}
              <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Temperature</p>
                      <p className="text-3xl font-bold">{weather.temperature}°F</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {weather.description}
                      </p>
                    </div>
                    <Thermometer className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Wind */}
              <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Wind</p>
                      <p className="text-3xl font-bold">{weather.windSpeed}</p>
                      <p className="text-xs text-muted-foreground">
                        mph {getWindDirection(weather.windDirection)}
                      </p>
                    </div>
                    <Wind className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Rain Chance */}
              <Card className="bg-gradient-to-br from-sky-500/10 to-blue-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Rain Chance</p>
                      <p className="text-3xl font-bold">{rainChance}%</p>
                      <p className="text-xs text-muted-foreground">Next hour</p>
                    </div>
                    <Droplets className="h-8 w-8 text-sky-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Humidity */}
              <Card className="bg-gradient-to-br from-teal-500/10 to-green-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Humidity</p>
                      <p className="text-3xl font-bold">{weather.humidity}%</p>
                      <p className="text-xs text-muted-foreground">
                        Feels {weather.feelsLike}°F
                      </p>
                    </div>
                    <Cloud className="h-8 w-8 text-teal-500" />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
              Weather data unavailable
            </div>
          )}
        </div>

        {/* Sunrise & Sunset Times */}
        {location && (
          <div className="grid grid-cols-2 gap-3">
            {(() => {
              const today = new Date();
              const times = SunCalc.getTimes(today, location.lat, location.lng);
              
              return (
                <>
                  {/* Sunrise */}
                  <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Sunrise</p>
                          <p className="text-3xl font-bold">
                            {format(times.sunrise, "h:mm a")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(today, "MMM d, yyyy")}
                          </p>
                        </div>
                        <Sunrise className="h-8 w-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sunset */}
                  <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Sunset</p>
                          <p className="text-3xl font-bold">
                            {format(times.sunset, "h:mm a")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(today, "MMM d, yyyy")}
                          </p>
                        </div>
                        <Sunset className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>
        )}

        {/* Map Preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Your Location</CardTitle>
              <Button size="sm" variant="ghost" onClick={onViewFullMap}>
                <Eye className="mr-2 h-4 w-4" />
                View Map
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {location && isLoaded ? (
              <div className="h-48 overflow-hidden rounded-b-lg">
                <GoogleMap
                  mapContainerClassName="h-full w-full"
                  center={location}
                  zoom={13}
                  options={{
                    disableDefaultUI: true,
                    gestureHandling: "none",
                    mapTypeId: "hybrid",
                  }}
                >
                  <Marker position={location} />
                </GoogleMap>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={onViewFullMap}
            >
              <Home className="h-6 w-6" />
              <span className="text-xs">Property Info</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={handleAddMarker}
            >
              <Plus className="h-6 w-6" />
              <span className="text-xs">Add Marker</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={onStartTracking}
            >
              <Route className="h-6 w-6" />
              <span className="text-xs">Track Path</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => window.open("https://www.floridamarine.org", "_blank")}
            >
              <FileText className="h-6 w-6" />
              <span className="text-xs">WMA Brochures</span>
            </Button>
            <Button
              variant="ghost"
              className="col-span-2 h-auto flex-col gap-2 border border-red-500/50 bg-red-500/5 py-4 hover:bg-red-500/10"
              onClick={onEmergency}
            >
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <span className="text-xs text-red-500">Emergency</span>
            </Button>
          </CardContent>
        </Card>

        {/* Active Hunt Alert */}
        {activeHunt && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    <p className="font-semibold">Active Hunt</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeHunt.title}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {activeHunt.species}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(activeHunt.startTime, "h:mm a")}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {activeHunt.locationName}
                    </div>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setShowEndDialog(true)}
              >
                End Hunt
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {stats ? (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Hunts</p>
                    <p className="text-3xl font-bold">{stats.totalHunts}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p className="text-3xl font-bold">{stats.successRate}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Successful</p>
                    <p className="text-3xl font-bold">{stats.successfulHunts}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Harvested</p>
                    <p className="text-3xl font-bold">{stats.totalHarvested}</p>
                  </div>
                  <Target className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {/* Hunt History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Hunts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              {hunts === undefined ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : hunts.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No hunts yet. Start your first hunt!
                </div>
              ) : (
                <div className="divide-y">
                  {hunts.slice(0, 10).map((hunt) => (
                    <div key={hunt._id} className="p-4 hover:bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{hunt.title}</p>
                            {hunt.status === "completed" && (
                              <Badge
                                variant={hunt.successful ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {hunt.successful ? (
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                ) : (
                                  <XCircle className="mr-1 h-3 w-3" />
                                )}
                                {hunt.successful ? "Success" : "No Harvest"}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {hunt.species}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(hunt.date, "MMM d, yyyy")}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {hunt.locationName}
                            </div>
                          </div>
                          {hunt.notes && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {hunt.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Start Hunt Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Hunt</DialogTitle>
            <DialogDescription>
              Record the details of your hunt before heading out
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Hunt Title *</Label>
              <Input
                id="title"
                placeholder="Morning Deer Hunt"
                value={newHunt.title}
                onChange={(e) =>
                  setNewHunt({ ...newHunt, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="Smith Property - North Field"
                value={newHunt.locationName}
                onChange={(e) =>
                  setNewHunt({ ...newHunt, locationName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="species">Species *</Label>
              <Select
                value={newHunt.species}
                onValueChange={(value) =>
                  setNewHunt({ ...newHunt, species: value })
                }
              >
                <SelectTrigger id="species">
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIES_OPTIONS.map((species) => (
                    <SelectItem key={species} value={species}>
                      {species}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Hunting Method</Label>
              <Select
                value={newHunt.method}
                onValueChange={(value) =>
                  setNewHunt({ ...newHunt, method: value })
                }
              >
                <SelectTrigger id="method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Weather conditions, strategy, etc."
                value={newHunt.notes}
                onChange={(e) =>
                  setNewHunt({ ...newHunt, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartHunt}>Start Hunt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Hunt Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Hunt</DialogTitle>
            <DialogDescription>
              Record the outcome of your hunt
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Was your hunt successful?</Label>
              <div className="flex gap-2">
                <Button
                  variant={endHuntData.successful ? "default" : "outline"}
                  className="flex-1"
                  onClick={() =>
                    setEndHuntData({ ...endHuntData, successful: true })
                  }
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Success
                </Button>
                <Button
                  variant={!endHuntData.successful ? "default" : "outline"}
                  className="flex-1"
                  onClick={() =>
                    setEndHuntData({ ...endHuntData, successful: false, harvested: 0 })
                  }
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  No Harvest
                </Button>
              </div>
            </div>
            {endHuntData.successful && (
              <div className="space-y-2">
                <Label htmlFor="harvested">Number Harvested</Label>
                <Input
                  id="harvested"
                  type="number"
                  min="1"
                  value={endHuntData.harvested}
                  onChange={(e) =>
                    setEndHuntData({
                      ...endHuntData,
                      harvested: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="endNotes">Notes</Label>
              <Textarea
                id="endNotes"
                placeholder="What did you see? Any observations?"
                value={endHuntData.notes}
                onChange={(e) =>
                  setEndHuntData({ ...endHuntData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEndHunt}>End Hunt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Waypoint Dialog */}
      {location && (
        <AddWaypointDialog
          open={waypointDialogOpen}
          onOpenChange={setWaypointDialogOpen}
          lat={location.lat}
          lng={location.lng}
        />
      )}
    </div>
  );
}
