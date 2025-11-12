import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

// Update current user's location
export const updateMyLocation = mutation({
  args: {
    lat: v.number(),
    lng: v.number(),
    accuracy: v.optional(v.number()),
    heading: v.optional(v.number()),
    speed: v.optional(v.number()),
    altitude: v.optional(v.number()),
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

    // Find existing location share
    const existingShare = await ctx.db
      .query("locationShares")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingShare) {
      // Update existing location
      await ctx.db.patch(existingShare._id, {
        lat: args.lat,
        lng: args.lng,
        accuracy: args.accuracy,
        heading: args.heading,
        speed: args.speed,
        altitude: args.altitude,
        lastUpdated: Date.now(),
      });
      return { locationId: existingShare._id };
    } else {
      // Create new location share (default to inactive)
      const locationId = await ctx.db.insert("locationShares", {
        userId: user._id,
        lat: args.lat,
        lng: args.lng,
        accuracy: args.accuracy,
        heading: args.heading,
        speed: args.speed,
        altitude: args.altitude,
        isActive: false,
        shareWith: "none",
        lastUpdated: Date.now(),
      });
      return { locationId };
    }
  },
});

// Toggle location sharing on/off
export const toggleLocationSharing = mutation({
  args: {
    isActive: v.boolean(),
    shareWith: v.optional(v.string()), // "all_friends", "selected_friends", "none"
    selectedFriends: v.optional(v.array(v.id("users"))),
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

    const existingShare = await ctx.db
      .query("locationShares")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!existingShare) {
      throw new ConvexError({
        message: "No location data available. Update location first.",
        code: "NOT_FOUND",
      });
    }

    const updateData: {
      isActive: boolean;
      shareWith?: string;
      selectedFriends?: Id<"users">[];
      lastUpdated: number;
    } = {
      isActive: args.isActive,
      lastUpdated: Date.now(),
    };

    if (args.shareWith !== undefined) {
      updateData.shareWith = args.shareWith;
    }

    if (args.selectedFriends !== undefined) {
      updateData.selectedFriends = args.selectedFriends;
    }

    await ctx.db.patch(existingShare._id, updateData);

    return { success: true };
  },
});

// Get my location sharing status
export const getMyLocationStatus = query({
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

    const locationShare = await ctx.db
      .query("locationShares")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!locationShare) {
      return {
        isActive: false,
        shareWith: "none",
        hasLocation: false,
      };
    }

    return {
      isActive: locationShare.isActive,
      shareWith: locationShare.shareWith,
      selectedFriends: locationShare.selectedFriends,
      hasLocation: true,
      lastUpdated: locationShare.lastUpdated,
    };
  },
});

// Get friends' locations (only those sharing with me)
export const getFriendsLocations = query({
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

    // Get all my friends
    const friendships1 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1Id", user._id))
      .collect();

    const friendships2 = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) => q.eq("user2Id", user._id))
      .collect();

    const friendIds: Id<"users">[] = [
      ...friendships1.map((f) => f.user2Id),
      ...friendships2.map((f) => f.user1Id),
    ];

    // Get locations for each friend
    const friendsWithLocations = await Promise.all(
      friendIds.map(async (friendId) => {
        const friend = await ctx.db.get(friendId);
        if (!friend) return null;

        const locationShare = await ctx.db
          .query("locationShares")
          .withIndex("by_user", (q) => q.eq("userId", friendId))
          .first();

        if (!locationShare || !locationShare.isActive) {
          return null;
        }

        // Check sharing permissions
        if (locationShare.shareWith === "none") {
          return null;
        }

        if (locationShare.shareWith === "selected_friends") {
          const selectedFriends = locationShare.selectedFriends || [];
          if (!selectedFriends.includes(user._id)) {
            return null;
          }
        }

        // They're sharing with all friends or we're in their selected list
        return {
          userId: friendId,
          name: friend.name || "Unknown",
          email: friend.email,
          lat: locationShare.lat,
          lng: locationShare.lng,
          accuracy: locationShare.accuracy,
          heading: locationShare.heading,
          speed: locationShare.speed,
          altitude: locationShare.altitude,
          lastUpdated: locationShare.lastUpdated,
        };
      })
    );

    return friendsWithLocations.filter((f) => f !== null);
  },
});
