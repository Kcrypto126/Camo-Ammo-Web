import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

// Get user's hunts
export const getMyHunts = query({
  args: {},
  handler: async (ctx) => {
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

    const hunts = await ctx.db
      .query("hunts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return hunts;
  },
});

// Get active hunt
export const getActiveHunt = query({
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

    const activeHunt = await ctx.db
      .query("hunts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .first();

    return activeHunt;
  },
});

// Get hunt statistics
export const getHuntStats = query({
  args: {},
  handler: async (ctx) => {
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

    const allHunts = await ctx.db
      .query("hunts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const completedHunts = allHunts.filter((h) => h.status === "completed");
    const successfulHunts = completedHunts.filter((h) => h.successful);
    const totalHarvested = successfulHunts.reduce(
      (sum, h) => sum + (h.harvested || 0),
      0
    );

    // Calculate stats by species
    const speciesStats: Record<string, { total: number; successful: number }> = {};
    completedHunts.forEach((hunt) => {
      if (!speciesStats[hunt.species]) {
        speciesStats[hunt.species] = { total: 0, successful: 0 };
      }
      speciesStats[hunt.species].total++;
      if (hunt.successful) {
        speciesStats[hunt.species].successful++;
      }
    });

    return {
      totalHunts: completedHunts.length,
      successfulHunts: successfulHunts.length,
      successRate:
        completedHunts.length > 0
          ? Math.round((successfulHunts.length / completedHunts.length) * 100)
          : 0,
      totalHarvested,
      speciesStats,
      activeHunts: allHunts.filter((h) => h.status === "active").length,
    };
  },
});

// Start a new hunt
export const startHunt = mutation({
  args: {
    title: v.string(),
    locationName: v.string(),
    lat: v.number(),
    lng: v.number(),
    state: v.optional(v.string()),
    species: v.string(),
    method: v.optional(v.string()),
    notes: v.optional(v.string()),
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

    const now = Date.now();
    const huntId = await ctx.db.insert("hunts", {
      userId: user._id,
      title: args.title,
      date: now,
      startTime: now,
      locationName: args.locationName,
      lat: args.lat,
      lng: args.lng,
      state: args.state,
      species: args.species,
      method: args.method,
      status: "active",
      successful: false,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return huntId;
  },
});

// End a hunt
export const endHunt = mutation({
  args: {
    huntId: v.id("hunts"),
    successful: v.boolean(),
    harvested: v.optional(v.number()),
    harvestDetails: v.optional(
      v.array(
        v.object({
          species: v.string(),
          sex: v.optional(v.string()),
          age: v.optional(v.string()),
          weight: v.optional(v.number()),
          points: v.optional(v.number()),
          time: v.number(),
          notes: v.optional(v.string()),
        })
      )
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const hunt = await ctx.db.get(args.huntId);
    if (!hunt) {
      throw new ConvexError({
        message: "Hunt not found",
        code: "NOT_FOUND",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user || hunt.userId !== user._id) {
      throw new ConvexError({
        message: "Not authorized",
        code: "FORBIDDEN",
      });
    }

    const now = Date.now();
    await ctx.db.patch(args.huntId, {
      status: "completed",
      endTime: now,
      successful: args.successful,
      harvested: args.harvested,
      harvestDetails: args.harvestDetails,
      notes: args.notes || hunt.notes,
      updatedAt: now,
    });
  },
});

// Update hunt notes
export const updateHuntNotes = mutation({
  args: {
    huntId: v.id("hunts"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const hunt = await ctx.db.get(args.huntId);
    if (!hunt) {
      throw new ConvexError({
        message: "Hunt not found",
        code: "NOT_FOUND",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user || hunt.userId !== user._id) {
      throw new ConvexError({
        message: "Not authorized",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.huntId, {
      notes: args.notes,
      updatedAt: Date.now(),
    });
  },
});

// Delete a hunt
export const deleteHunt = mutation({
  args: {
    huntId: v.id("hunts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const hunt = await ctx.db.get(args.huntId);
    if (!hunt) {
      throw new ConvexError({
        message: "Hunt not found",
        code: "NOT_FOUND",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user || hunt.userId !== user._id) {
      throw new ConvexError({
        message: "Not authorized",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.delete(args.huntId);
  },
});
