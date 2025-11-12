import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel.d.ts";

export const startTrack = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const trackId = await ctx.db.insert("tracks", {
      userId: user._id,
      name: args.name,
      description: args.description,
      distance: 0,
      duration: 0,
      coordinates: [],
      startTime: Date.now(),
      endTime: Date.now(),
      isActive: true,
    });

    return trackId;
  },
});

export const addTrackPoint = mutation({
  args: {
    trackId: v.id("tracks"),
    lat: v.number(),
    lng: v.number(),
    altitude: v.optional(v.number()),
    accuracy: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const track = await ctx.db.get(args.trackId);
    if (!track) {
      throw new ConvexError({
        message: "Track not found",
        code: "NOT_FOUND",
      });
    }

    if (!track.isActive) {
      throw new ConvexError({
        message: "Cannot add points to inactive track",
        code: "BAD_REQUEST",
      });
    }

    const newPoint = {
      lat: args.lat,
      lng: args.lng,
      timestamp: Date.now(),
      altitude: args.altitude,
      accuracy: args.accuracy,
    };

    const coordinates = [...track.coordinates, newPoint];
    
    // Calculate distance if we have previous point
    let distance = track.distance;
    if (track.coordinates.length > 0) {
      const lastPoint = track.coordinates[track.coordinates.length - 1];
      distance += calculateDistance(
        lastPoint.lat,
        lastPoint.lng,
        args.lat,
        args.lng
      );
    }

    await ctx.db.patch(args.trackId, {
      coordinates,
      distance,
      endTime: Date.now(),
    });

    return { success: true };
  },
});

export const stopTrack = mutation({
  args: {
    trackId: v.id("tracks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const track = await ctx.db.get(args.trackId);
    if (!track) {
      throw new ConvexError({
        message: "Track not found",
        code: "NOT_FOUND",
      });
    }

    // Calculate final statistics
    const duration = (track.endTime - track.startTime) / 1000; // seconds
    const averageSpeed = duration > 0 ? track.distance / duration : 0;

    // Calculate elevation changes
    let elevationGain = 0;
    let elevationLoss = 0;
    
    for (let i = 1; i < track.coordinates.length; i++) {
      const prev = track.coordinates[i - 1];
      const curr = track.coordinates[i];
      
      if (prev.altitude && curr.altitude) {
        const diff = curr.altitude - prev.altitude;
        if (diff > 0) {
          elevationGain += diff;
        } else {
          elevationLoss += Math.abs(diff);
        }
      }
    }

    await ctx.db.patch(args.trackId, {
      isActive: false,
      duration,
      averageSpeed,
      elevationGain: elevationGain > 0 ? elevationGain : undefined,
      elevationLoss: elevationLoss > 0 ? elevationLoss : undefined,
    });

    return { success: true };
  },
});

export const getMyTracks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("tracks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getActiveTrack = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return null;
    }

    return await ctx.db
      .query("tracks")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .first();
  },
});

export const deleteTrack = mutation({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const track = await ctx.db.get(args.trackId);
    if (!track) {
      throw new ConvexError({
        message: "Track not found",
        code: "NOT_FOUND",
      });
    }

    await ctx.db.delete(args.trackId);
    return { success: true };
  },
});

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
