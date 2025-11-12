"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

interface WeatherResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    description: string;
    icon: string;
    main: string;
  }>;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  sys: {
    sunrise: number;
    sunset: number;
    country: string;
  };
  name: string;
  dt: number;
}

interface ForecastResponse {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      humidity: number;
      pressure: number;
    };
    weather: Array<{
      description: string;
      icon: string;
      main: string;
    }>;
    wind: {
      speed: number;
      deg: number;
      gust?: number;
    };
    pop: number; // Probability of precipitation
    dt_txt: string;
  }>;
  city: {
    name: string;
    country: string;
    sunrise: number;
    sunset: number;
  };
}

export const getCurrentWeather = action({
  args: {
    lat: v.number(),
    lng: v.number(),
    units: v.optional(v.union(v.literal("metric"), v.literal("imperial"))),
  },
  handler: async (ctx, { lat, lng, units = "imperial" }) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENWEATHER_API_KEY not configured");
    }

    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      appid: apiKey,
      units,
    });

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch weather data");
    }

    const data: WeatherResponse = await response.json();

    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      condition: data.weather[0].main,
      windSpeed: Math.round(data.wind.speed),
      windDirection: data.wind.deg,
      windGust: data.wind.gust ? Math.round(data.wind.gust) : undefined,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      location: data.name,
      country: data.sys.country,
      timestamp: data.dt,
      units,
    };
  },
});

export const getForecast = action({
  args: {
    lat: v.number(),
    lng: v.number(),
    units: v.optional(v.union(v.literal("metric"), v.literal("imperial"))),
  },
  handler: async (ctx, { lat, lng, units = "imperial" }) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENWEATHER_API_KEY not configured");
    }

    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      appid: apiKey,
      units,
      cnt: "40", // 5 days * 8 times per day
    });

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch forecast data");
    }

    const data: ForecastResponse = await response.json();

    return {
      location: data.city.name,
      country: data.city.country,
      forecast: data.list.map((item) => ({
        timestamp: item.dt,
        dateTime: item.dt_txt,
        temperature: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        humidity: item.main.humidity,
        pressure: item.main.pressure,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        condition: item.weather[0].main,
        windSpeed: Math.round(item.wind.speed),
        windDirection: item.wind.deg,
        windGust: item.wind.gust ? Math.round(item.wind.gust) : undefined,
        precipitationProbability: Math.round(item.pop * 100),
      })),
      units,
    };
  },
});
