import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const createWaypoint = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    altitude: v.optional(v.number()),
    type: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    trackId: v.optional(v.id("tracks")),
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

    const waypointId = await ctx.db.insert("waypoints", {
      userId: user._id,
      name: args.name,
      description: args.description,
      lat: args.lat,
      lng: args.lng,
      altitude: args.altitude,
      type: args.type,
      icon: args.icon,
      color: args.color,
      trackId: args.trackId,
      createdAt: Date.now(),
    });

    return waypointId;
  },
});

export const getMyWaypoints = query({
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
      .query("waypoints")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const deleteWaypoint = mutation({
  args: { waypointId: v.id("waypoints") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const waypoint = await ctx.db.get(args.waypointId);
    if (!waypoint) {
      throw new ConvexError({
        message: "Waypoint not found",
        code: "NOT_FOUND",
      });
    }

    await ctx.db.delete(args.waypointId);
    return { success: true };
  },
});

export const updateWaypoint = mutation({
  args: {
    waypointId: v.id("waypoints"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const waypoint = await ctx.db.get(args.waypointId);
    if (!waypoint) {
      throw new ConvexError({
        message: "Waypoint not found",
        code: "NOT_FOUND",
      });
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.type !== undefined) updates.type = args.type;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.waypointId, updates);
    return { success: true };
  },
});
