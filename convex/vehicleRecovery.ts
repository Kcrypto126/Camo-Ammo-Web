import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Helper function to calculate distance between two points (in miles)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get all active requests
export const getRequests = query({
  args: {
    userLat: v.optional(v.number()),
    userLng: v.optional(v.number()),
    maxDistance: v.optional(v.number()), // in miles, default 50
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("vehicleRecoveryRequests")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(100);

    // Enrich with user info
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const user = await ctx.db.get(request.userId);
        
        // Calculate distance if user location provided
        let distance = undefined;
        if (args.userLat !== undefined && args.userLng !== undefined) {
          distance = calculateDistance(
            args.userLat,
            args.userLng,
            request.lat,
            request.lng
          );
        }

        return {
          ...request,
          user: user
            ? {
                _id: user._id,
                name: user.name || "Unknown",
              }
            : null,
          distance,
        };
      })
    );

    // Filter by distance if provided
    const maxDistance = args.maxDistance || 50;
    const filtered = enrichedRequests.filter((req) => {
      if (req.distance === undefined) return true;
      return req.distance <= maxDistance;
    });

    // Sort by distance if available
    return filtered.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });
  },
});

// Get single request with comments
export const getRequest = query({
  args: { requestId: v.id("vehicleRecoveryRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({
        message: "Request not found",
        code: "NOT_FOUND",
      });
    }

    const user = await ctx.db.get(request.userId);

    // Get comments
    const comments = await ctx.db
      .query("vehicleRecoveryComments")
      .withIndex("by_request_created", (q) => q.eq("requestId", args.requestId))
      .order("asc")
      .collect();

    // Enrich comments with user info
    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
        const commentUser = await ctx.db.get(comment.userId);
        return {
          ...comment,
          user: commentUser
            ? {
                _id: commentUser._id,
                name: commentUser.name || "Unknown",
              }
            : null,
        };
      })
    );

    return {
      ...request,
      user: user
        ? {
            _id: user._id,
            name: user.name || "Unknown",
          }
        : null,
      comments: enrichedComments,
    };
  },
});

// Create a new request
export const createRequest = mutation({
  args: {
    serviceNeeded: v.string(),
    description: v.optional(v.string()),
    phoneNumber: v.string(),
    lat: v.number(),
    lng: v.number(),
    locationName: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
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
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    const requestId = await ctx.db.insert("vehicleRecoveryRequests", {
      userId: user._id,
      serviceNeeded: args.serviceNeeded,
      description: args.description,
      phoneNumber: args.phoneNumber,
      lat: args.lat,
      lng: args.lng,
      locationName: args.locationName,
      photos: args.photos,
      status: "active",
      commentCount: 0,
      createdAt: now,
      nextFollowUpAt: now + oneHour, // Schedule first follow-up in 1 hour
    });

    // TODO: In a production app, this would trigger push notifications
    // to users within 50 miles of the request location

    return requestId;
  },
});

// Add a comment to a request
export const addComment = mutation({
  args: {
    requestId: v.id("vehicleRecoveryRequests"),
    content: v.string(),
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
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const commentId = await ctx.db.insert("vehicleRecoveryComments", {
      requestId: args.requestId,
      userId: user._id,
      content: args.content,
      createdAt: Date.now(),
    });

    // Update comment count on request
    const request = await ctx.db.get(args.requestId);
    if (request) {
      await ctx.db.patch(args.requestId, {
        commentCount: request.commentCount + 1,
      });
    }

    return commentId;
  },
});

// Update request status (member updates like "still waiting", "in progress")
export const updateRequestStatus = mutation({
  args: {
    requestId: v.id("vehicleRecoveryRequests"),
    requestStatus: v.union(v.literal("still_waiting"), v.literal("in_progress")),
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
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({
        message: "Request not found",
        code: "NOT_FOUND",
      });
    }

    // Only the request owner can update status
    if (request.userId !== user._id) {
      throw new ConvexError({
        message: "You can only update your own requests",
        code: "FORBIDDEN",
      });
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    await ctx.db.patch(args.requestId, {
      requestStatus: args.requestStatus,
      lastFollowUpAt: now,
      nextFollowUpAt: now + oneHour, // Schedule next follow-up in 1 hour
    });

    return { success: true };
  },
});

// Close request (member closes ticket)
export const closeRequest = mutation({
  args: {
    requestId: v.id("vehicleRecoveryRequests"),
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
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({
        message: "Request not found",
        code: "NOT_FOUND",
      });
    }

    // Only the request owner can close
    if (request.userId !== user._id) {
      throw new ConvexError({
        message: "You can only close your own requests",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.requestId, {
      status: "resolved",
      closedAt: Date.now(),
      closedBy: user._id,
      nextFollowUpAt: undefined, // Stop follow-ups
    });

    return { success: true };
  },
});

// Reopen request (admin/owner only)
export const reopenRequest = mutation({
  args: {
    requestId: v.id("vehicleRecoveryRequests"),
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
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Check if user is admin or owner
    const isAdmin = user.role === "admin" || user.role === "owner";
    if (!isAdmin) {
      throw new ConvexError({
        message: "Only admins and owners can reopen requests",
        code: "FORBIDDEN",
      });
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({
        message: "Request not found",
        code: "NOT_FOUND",
      });
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    await ctx.db.patch(args.requestId, {
      status: "active",
      reopenedAt: now,
      reopenedBy: user._id,
      nextFollowUpAt: now + oneHour, // Resume follow-ups
    });

    return { success: true };
  },
});

// Update request status (legacy - for backward compatibility)
export const updateStatus = mutation({
  args: {
    requestId: v.id("vehicleRecoveryRequests"),
    status: v.union(v.literal("active"), v.literal("resolved"), v.literal("cancelled")),
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
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({
        message: "Request not found",
        code: "NOT_FOUND",
      });
    }

    // Only the request owner can update status
    if (request.userId !== user._id) {
      throw new ConvexError({
        message: "You can only update your own requests",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.requestId, {
      status: args.status,
      resolvedAt: args.status === "resolved" ? Date.now() : request.resolvedAt,
    });

    return { success: true };
  },
});

// Get user's own requests
export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      return [];
    }

    const requests = await ctx.db
      .query("vehicleRecoveryRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    return requests;
  },
});

// Generate upload URL for photos
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Get photo URL from storage ID
export const getPhotoUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId as never);
  },
});

// Get request history
export const getRequestHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      return [];
    }

    const isAdmin = user.role === "admin" || user.role === "owner";
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    // Get all closed requests for this user
    const allRequests = await ctx.db
      .query("vehicleRecoveryRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const closedRequests = allRequests.filter((req) => req.closedAt !== undefined);

    // For members, only show requests closed in the last 10 minutes
    // For admins/owners, show all closed requests
    if (!isAdmin) {
      return closedRequests.filter((req) => {
        if (!req.closedAt) return false;
        return now - req.closedAt <= tenMinutes;
      });
    }

    return closedRequests;
  },
});

// Get all request history (admin/owner only)
export const getAllRequestHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      return [];
    }

    // Check if user is admin or owner
    const isAdmin = user.role === "admin" || user.role === "owner";
    if (!isAdmin) {
      throw new ConvexError({
        message: "Only admins and owners can view all request history",
        code: "FORBIDDEN",
      });
    }

    // Get all closed requests
    const allRequests = await ctx.db
      .query("vehicleRecoveryRequests")
      .withIndex("by_status", (q) => q.eq("status", "resolved"))
      .order("desc")
      .take(100);

    const enrichedRequests = await Promise.all(
      allRequests.map(async (request) => {
        const requestUser = await ctx.db.get(request.userId);
        return {
          ...request,
          user: requestUser
            ? {
                _id: requestUser._id,
                name: requestUser.name || "Unknown",
              }
            : null,
        };
      })
    );

    return enrichedRequests.filter((req) => req.closedAt !== undefined);
  },
});

// Check and send follow-ups (called by scheduled function)
export const checkAndSendFollowUps = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all requests that need follow-up
    const allRequests = await ctx.db
      .query("vehicleRecoveryRequests")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const requestsNeedingFollowUp = allRequests.filter((req) => {
      return req.nextFollowUpAt !== undefined && req.nextFollowUpAt <= now;
    });

    // Send notifications for each request
    for (const request of requestsNeedingFollowUp) {
      await ctx.db.insert("notifications", {
        userId: request.userId,
        type: "vehicle_recovery_followup",
        title: "Vehicle Recovery Update Needed",
        message: "Please update your vehicle recovery request status",
        relatedId: request._id,
        isRead: false,
        createdAt: now,
      });
    }

    return { sent: requestsNeedingFollowUp.length };
  },
});
