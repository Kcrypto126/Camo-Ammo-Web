import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";

// Register that a user is viewing an item
export const registerViewer = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Check if viewer record already exists
    const existing = await ctx.db
      .query("activeViewers")
      .withIndex("by_entity_user", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      // Update last active time
      await ctx.db.patch(existing._id, { lastActiveAt: Date.now() });
    } else {
      // Create new viewer record
      await ctx.db.insert("activeViewers", {
        entityType: args.entityType,
        entityId: args.entityId,
        userId: user._id,
        lastActiveAt: Date.now(),
      });
    }
  },
});

// Unregister viewer when they leave
export const unregisterViewer = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return; // Silent fail if not authenticated
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return; // Silent fail if user not found
    }

    // Find and delete viewer record
    const existing = await ctx.db
      .query("activeViewers")
      .withIndex("by_entity_user", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Get all active viewers for an item
export const getActiveViewers = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!currentUser) {
      return [];
    }

    // Get viewers active in the last 30 seconds
    const thirtySecondsAgo = Date.now() - 30000;
    const viewers = await ctx.db
      .query("activeViewers")
      .withIndex("by_entity", (q) => q.eq("entityType", args.entityType).eq("entityId", args.entityId))
      .collect();

    // Filter out stale viewers and current user
    const activeViewers = viewers.filter(
      (v) => v.lastActiveAt > thirtySecondsAgo && v.userId !== currentUser._id
    );

    // Get user info for each viewer
    const viewersWithInfo = await Promise.all(
      activeViewers.map(async (viewer) => {
        const user = await ctx.db.get(viewer.userId);
        return {
          userId: viewer.userId,
          userName: user?.name || "Unknown",
          userAvatar: user?.avatar,
          lastActiveAt: viewer.lastActiveAt,
        };
      })
    );

    return viewersWithInfo;
  },
});

// Cleanup stale viewer records (called periodically)
export const cleanupStaleViewers = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Remove viewers inactive for more than 1 minute
    const oneMinuteAgo = Date.now() - 60000;
    const staleViewers = await ctx.db
      .query("activeViewers")
      .withIndex("by_last_active", (q) => q.lt("lastActiveAt", oneMinuteAgo))
      .collect();

    for (const viewer of staleViewers) {
      await ctx.db.delete(viewer._id);
    }
  },
});
