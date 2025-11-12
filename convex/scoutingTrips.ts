import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

// Create a new scouting trip
export const createTrip = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    locationName: v.string(),
    lat: v.number(),
    lng: v.number(),
    state: v.optional(v.string()),
    activityType: v.string(),
    gameType: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    privacy: v.string(),
    maxParticipants: v.optional(v.number()),
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

    // Create the trip
    const tripId = await ctx.db.insert("scoutingTrips", {
      creatorId: user._id,
      title: args.title,
      description: args.description,
      locationName: args.locationName,
      lat: args.lat,
      lng: args.lng,
      state: args.state,
      activityType: args.activityType,
      gameType: args.gameType,
      startDate: args.startDate,
      endDate: args.endDate,
      privacy: args.privacy,
      maxParticipants: args.maxParticipants,
      status: "upcoming",
      createdAt: Date.now(),
    });

    // Add creator as first participant
    await ctx.db.insert("scoutingTripParticipants", {
      tripId,
      userId: user._id,
      status: "joined",
      role: "creator",
      joinedAt: Date.now(),
    });

    return { tripId };
  },
});

// Get trips created by the current user
export const getMyTrips = query({
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

    const trips = await ctx.db
      .query("scoutingTrips")
      .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
      .order("desc")
      .collect();

    // Get participant counts for each trip
    const tripsWithCounts = await Promise.all(
      trips.map(async (trip) => {
        const participants = await ctx.db
          .query("scoutingTripParticipants")
          .withIndex("by_trip_status", (q) =>
            q.eq("tripId", trip._id).eq("status", "joined")
          )
          .collect();

        return {
          ...trip,
          participantCount: participants.length,
        };
      })
    );

    return tripsWithCounts;
  },
});

// Get trips the user is participating in
export const getMyParticipatingTrips = query({
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

    const participations = await ctx.db
      .query("scoutingTripParticipants")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "joined")
      )
      .collect();

    const trips = await Promise.all(
      participations.map(async (participation) => {
        const trip = await ctx.db.get(participation.tripId);
        if (!trip) return null;

        // Skip trips created by the user (they're in getMyTrips)
        if (trip.creatorId === user._id) return null;

        const participants = await ctx.db
          .query("scoutingTripParticipants")
          .withIndex("by_trip_status", (q) =>
            q.eq("tripId", trip._id).eq("status", "joined")
          )
          .collect();

        const creator = await ctx.db.get(trip.creatorId);

        return {
          ...trip,
          participantCount: participants.length,
          creatorName: creator?.name || "Unknown",
        };
      })
    );

    return trips.filter((t) => t !== null);
  },
});

// Get available trips (public or friends-only trips user can join)
export const getAvailableTrips = query({
  args: {
    activityType: v.optional(v.string()),
    state: v.optional(v.string()),
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

    // Get user's friends
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

    // Get all upcoming trips
    let allTrips = await ctx.db
      .query("scoutingTrips")
      .withIndex("by_status", (q) => q.eq("status", "upcoming"))
      .collect();

    // Filter by activity type if provided
    if (args.activityType) {
      allTrips = allTrips.filter((t) => t.activityType === args.activityType);
    }

    // Filter by state if provided
    if (args.state) {
      allTrips = allTrips.filter((t) => t.state === args.state);
    }

    // Filter trips based on privacy and get details
    const availableTrips = await Promise.all(
      allTrips.map(async (trip) => {
        // Skip trips created by the user
        if (trip.creatorId === user._id) return null;

        // Check privacy settings
        if (trip.privacy === "private") return null;
        if (
          trip.privacy === "friends_only" &&
          !friendIds.includes(trip.creatorId)
        ) {
          return null;
        }

        // Check if already joined
        const participation = await ctx.db
          .query("scoutingTripParticipants")
          .withIndex("by_trip_status", (q) =>
            q.eq("tripId", trip._id).eq("status", "joined")
          )
          .filter((q) => q.eq(q.field("userId"), user._id))
          .first();

        if (participation) return null;

        // Get participant count
        const participants = await ctx.db
          .query("scoutingTripParticipants")
          .withIndex("by_trip_status", (q) =>
            q.eq("tripId", trip._id).eq("status", "joined")
          )
          .collect();

        // Check if trip is full
        if (
          trip.maxParticipants &&
          participants.length >= trip.maxParticipants
        ) {
          return null;
        }

        const creator = await ctx.db.get(trip.creatorId);

        return {
          ...trip,
          participantCount: participants.length,
          creatorName: creator?.name || "Unknown",
        };
      })
    );

    return availableTrips.filter((t) => t !== null);
  },
});

// Get trip details with participants
export const getTripDetails = query({
  args: {
    tripId: v.id("scoutingTrips"),
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

    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError({
        message: "Trip not found",
        code: "NOT_FOUND",
      });
    }

    // Get creator info
    const creator = await ctx.db.get(trip.creatorId);

    // Get all participants
    const participations = await ctx.db
      .query("scoutingTripParticipants")
      .withIndex("by_trip_status", (q) =>
        q.eq("tripId", args.tripId).eq("status", "joined")
      )
      .collect();

    const participants = await Promise.all(
      participations.map(async (p) => {
        const participant = await ctx.db.get(p.userId);
        return {
          _id: p.userId,
          name: participant?.name || "Unknown",
          email: participant?.email,
          role: p.role,
          joinedAt: p.joinedAt,
        };
      })
    );

    // Check if current user is a participant
    const userParticipation = participations.find(
      (p) => p.userId === user._id
    );

    return {
      ...trip,
      creatorName: creator?.name || "Unknown",
      creatorEmail: creator?.email,
      participants,
      isParticipant: !!userParticipation,
      userRole: userParticipation?.role,
    };
  },
});

// Join a trip
export const joinTrip = mutation({
  args: {
    tripId: v.id("scoutingTrips"),
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

    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError({
        message: "Trip not found",
        code: "NOT_FOUND",
      });
    }

    if (trip.status !== "upcoming") {
      throw new ConvexError({
        message: "Cannot join a trip that is not upcoming",
        code: "BAD_REQUEST",
      });
    }

    // Check if already joined
    const existingParticipation = await ctx.db
      .query("scoutingTripParticipants")
      .withIndex("by_trip_status", (q) =>
        q.eq("tripId", args.tripId).eq("status", "joined")
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existingParticipation) {
      throw new ConvexError({
        message: "Already joined this trip",
        code: "CONFLICT",
      });
    }

    // Check if trip is full
    const participants = await ctx.db
      .query("scoutingTripParticipants")
      .withIndex("by_trip_status", (q) =>
        q.eq("tripId", args.tripId).eq("status", "joined")
      )
      .collect();

    if (trip.maxParticipants && participants.length >= trip.maxParticipants) {
      throw new ConvexError({
        message: "Trip is full",
        code: "CONFLICT",
      });
    }

    // Add participant
    await ctx.db.insert("scoutingTripParticipants", {
      tripId: args.tripId,
      userId: user._id,
      status: "joined",
      role: "participant",
      joinedAt: Date.now(),
    });

    return { success: true };
  },
});

// Leave a trip
export const leaveTrip = mutation({
  args: {
    tripId: v.id("scoutingTrips"),
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

    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError({
        message: "Trip not found",
        code: "NOT_FOUND",
      });
    }

    // Cannot leave if you're the creator
    if (trip.creatorId === user._id) {
      throw new ConvexError({
        message: "Creator cannot leave their own trip. Cancel it instead.",
        code: "BAD_REQUEST",
      });
    }

    const participation = await ctx.db
      .query("scoutingTripParticipants")
      .withIndex("by_trip_status", (q) =>
        q.eq("tripId", args.tripId).eq("status", "joined")
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (!participation) {
      throw new ConvexError({
        message: "Not a participant of this trip",
        code: "NOT_FOUND",
      });
    }

    // Remove participation
    await ctx.db.delete(participation._id);

    return { success: true };
  },
});

// Cancel a trip (creator only)
export const cancelTrip = mutation({
  args: {
    tripId: v.id("scoutingTrips"),
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

    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError({
        message: "Trip not found",
        code: "NOT_FOUND",
      });
    }

    if (trip.creatorId !== user._id) {
      throw new ConvexError({
        message: "Only the creator can cancel a trip",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.tripId, {
      status: "cancelled",
    });

    return { success: true };
  },
});
