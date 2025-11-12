import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  X,
  Wind,
  Droplets,
  Gauge,
  Sunrise,
  Sunset,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  description: string;
  icon: string;
  condition: string;
  windSpeed: number;
  windDirection: number;
  windGust?: number;
  sunrise: number;
  sunset: number;
  location: string;
  country: string;
  timestamp: number;
  units: string;
}

interface ForecastData {
  location: string;
  country: string;
  forecast: Array<{
    timestamp: number;
    dateTime: string;
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    description: string;
    icon: string;
    condition: string;
    windSpeed: number;
    windDirection: number;
    windGust?: number;
    precipitationProbability: number;
  }>;
  units: string;
}

interface WeatherPanelProps {
  lat: number;
  lng: number;
  onClose: () => void;
}

function WindDirectionArrow({ degrees }: { degrees: number }) {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <div
        className="absolute w-0.5 h-5 bg-primary"
        style={{
          transform: `rotate(${degrees}deg)`,
          transformOrigin: "center",
        }}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-primary"></div>
      </div>
      <div className="absolute text-xs text-muted-foreground">
        {Math.round(degrees)}°
      </div>
    </div>
  );
}

function getWindDirection(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

export default function WeatherPanel({ lat, lng, onClose }: WeatherPanelProps) {
  const getCurrentWeather = useAction(api.weather.getCurrentWeather);
  const getForecast = useAction(api.weather.getForecast);
  
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForecast, setShowForecast] = useState(false);

  const loadWeatherData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [weather, forecastData] = await Promise.all([
        getCurrentWeather({ lat, lng, units: "imperial" }),
        getForecast({ lat, lng, units: "imperial" }),
      ]);
      setCurrentWeather(weather);
      setForecast(forecastData);
    } catch (error) {
      console.error("Failed to load weather:", error);
    } finally {
      setIsLoading(false);
    }
  }, [lat, lng, getCurrentWeather, getForecast]);

  useEffect(() => {
    loadWeatherData();
  }, [loadWeatherData]);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-full bg-background border-l shadow-lg z-[1000] md:w-96">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-bold">Weather Forecast</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={loadWeatherData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-73px-64px)] md:h-[calc(100vh-73px)]">
        {isLoading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : currentWeather ? (
          <div className="p-4 space-y-6">
            {/* Current Weather */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {currentWeather.location}, {currentWeather.country}
              </p>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-5xl font-bold">
                    {currentWeather.temperature}°F
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 capitalize">
                    {currentWeather.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Feels like {currentWeather.feelsLike}°F
                  </p>
                </div>
                <img
                  src={`https://openweathermap.org/img/wn/${currentWeather.icon}@2x.png`}
                  alt={currentWeather.description}
                  className="w-20 h-20"
                />
              </div>
            </div>

            {/* Wind Information */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Wind className="w-4 h-4" />
                Wind Conditions
              </h3>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Speed</p>
                  <p className="text-2xl font-bold">{currentWeather.windSpeed} mph</p>
                  {currentWeather.windGust && (
                    <p className="text-xs text-muted-foreground">
                      Gusts up to {currentWeather.windGust} mph
                    </p>
                  )}
                  <p className="text-sm font-medium mt-2">
                    {getWindDirection(currentWeather.windDirection)}
                  </p>
                </div>
                <WindDirectionArrow degrees={currentWeather.windDirection} />
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Droplets className="w-4 h-4" />
                  <span className="text-xs">Humidity</span>
                </div>
                <p className="text-2xl font-bold">{currentWeather.humidity}%</p>
              </div>
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Gauge className="w-4 h-4" />
                  <span className="text-xs">Pressure</span>
                </div>
                <p className="text-2xl font-bold">
                  {Math.round(currentWeather.pressure * 0.02953)} inHg
                </p>
              </div>
            </div>

            {/* Sunrise/Sunset */}
            <div className="border rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Sunrise className="w-4 h-4" />
                    <span className="text-xs">Sunrise</span>
                  </div>
                  <p className="font-semibold">
                    {new Date(currentWeather.sunrise * 1000).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Sunset className="w-4 h-4" />
                    <span className="text-xs">Sunset</span>
                  </div>
                  <p className="font-semibold">
                    {new Date(currentWeather.sunset * 1000).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 5-Day Forecast Toggle */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowForecast(!showForecast)}
            >
              {showForecast ? "Hide" : "View"} 5-Day Forecast
              <ChevronRight
                className={`ml-2 h-4 w-4 transition-transform ${
                  showForecast ? "rotate-90" : ""
                }`}
              />
            </Button>

            {/* Hourly Forecast */}
            {showForecast && forecast && (
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Hourly Forecast</h3>
                <div className="space-y-2">
                  {forecast.forecast.slice(0, 16).map((item, index) => {
                    const date = new Date(item.timestamp * 1000);
                    const isNewDay =
                      index === 0 ||
                      new Date(forecast.forecast[index - 1].timestamp * 1000).getDate() !==
                        date.getDate();

                    return (
                      <div key={item.timestamp}>
                        {isNewDay && (
                          <div className="text-xs font-semibold text-muted-foreground mt-3 mb-1">
                            {date.toLocaleDateString([], {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        )}
                        <div className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium w-16">
                              {date.toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                            <img
                              src={`https://openweathermap.org/img/wn/${item.icon}.png`}
                              alt={item.description}
                              className="w-10 h-10"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {item.temperature}°F
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {item.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Wind className="w-3 h-3" />
                              <span>
                                {item.windSpeed} mph {getWindDirection(item.windDirection)}
                              </span>
                            </div>
                            {item.precipitationProbability > 0 && (
                              <div className="flex items-center gap-1 text-xs text-blue-600">
                                <Droplets className="w-3 h-3" />
                                <span>{item.precipitationProbability}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            Failed to load weather data
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
