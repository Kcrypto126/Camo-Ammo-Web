import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

// Search users by username, email, or phone
export const searchUsers = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!currentUser) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const searchLower = args.searchTerm.toLowerCase().trim();
    
    // Search by email, username, or phone
    const allUsers = await ctx.db.query("users").collect();
    
    const matchedUsers = allUsers.filter((user) => {
      if (user._id === currentUser._id) return false; // Don't show current user
      
      const email = user.email?.toLowerCase() || "";
      const username = user.username?.toLowerCase() || "";
      const phone = user.phoneNumber || "";
      const name = user.name?.toLowerCase() || "";
      
      return (
        email.includes(searchLower) ||
        username.includes(searchLower) ||
        phone.includes(searchLower) ||
        name.includes(searchLower)
      );
    });

    // Limit to 20 results
    return matchedUsers.slice(0, 20).map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber,
    }));
  },
});

// Send a friend request by user ID
export const sendFriendRequestById = mutation({
  args: {
    toUserId: v.id("users"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const fromUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!fromUser) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const toUser = await ctx.db.get(args.toUserId);

    if (!toUser) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    if (toUser._id === fromUser._id) {
      throw new ConvexError({
        message: "Cannot send friend request to yourself",
        code: "BAD_REQUEST",
      });
    }

    // Check if they're already friends
    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1Id", fromUser._id))
      .filter((q) => q.eq(q.field("user2Id"), toUser._id))
      .first();

    const existingFriendship2 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1Id", toUser._id))
      .filter((q) => q.eq(q.field("user2Id"), fromUser._id))
      .first();

    if (existingFriendship || existingFriendship2) {
      throw new ConvexError({
        message: "Already friends with this user",
        code: "CONFLICT",
      });
    }

    // Check if there's already a pending request
    const existingRequest = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", fromUser._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("toUserId"), toUser._id),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingRequest) {
      throw new ConvexError({
        message: "Friend request already sent",
        code: "CONFLICT",
      });
    }

    // Check for reverse request (they sent us one)
    const reverseRequest = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", toUser._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("toUserId"), fromUser._id),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (reverseRequest) {
      // Automatically accept their request and create friendship
      await ctx.db.patch(reverseRequest._id, {
        status: "accepted",
        respondedAt: Date.now(),
      });

      await ctx.db.insert("friendships", {
        user1Id: fromUser._id,
        user2Id: toUser._id,
        createdAt: Date.now(),
      });

      return {
        message: "Automatically accepted their pending request",
        friendshipCreated: true,
      };
    }

    // Create new friend request
    const requestId = await ctx.db.insert("friendRequests", {
      fromUserId: fromUser._id,
      toUserId: toUser._id,
      status: "pending",
      message: args.message,
      createdAt: Date.now(),
    });

    return { requestId, friendshipCreated: false };
  },
});

// Send a friend request (legacy email-based)
export const sendFriendRequest = mutation({
  args: {
    toUserEmail: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const fromUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!fromUser) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Find target user by email
    const toUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.toUserEmail))
      .first();

    if (!toUser) {
      throw new ConvexError({
        message: "User with that email not found",
        code: "NOT_FOUND",
      });
    }

    if (toUser._id === fromUser._id) {
      throw new ConvexError({
        message: "Cannot send friend request to yourself",
        code: "BAD_REQUEST",
      });
    }

    // Check if they're already friends
    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1Id", fromUser._id))
      .filter((q) => q.eq(q.field("user2Id"), toUser._id))
      .first();

    const existingFriendship2 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1Id", toUser._id))
      .filter((q) => q.eq(q.field("user2Id"), fromUser._id))
      .first();

    if (existingFriendship || existingFriendship2) {
      throw new ConvexError({
        message: "Already friends with this user",
        code: "CONFLICT",
      });
    }

    // Check if there's already a pending request
    const existingRequest = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", fromUser._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("toUserId"), toUser._id),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingRequest) {
      throw new ConvexError({
        message: "Friend request already sent",
        code: "CONFLICT",
      });
    }

    // Check for reverse request (they sent us one)
    const reverseRequest = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", toUser._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("toUserId"), fromUser._id),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (reverseRequest) {
      // Automatically accept their request and create friendship
      await ctx.db.patch(reverseRequest._id, {
        status: "accepted",
        respondedAt: Date.now(),
      });

      await ctx.db.insert("friendships", {
        user1Id: fromUser._id,
        user2Id: toUser._id,
        createdAt: Date.now(),
      });

      return {
        message: "Automatically accepted their pending request",
        friendshipCreated: true,
      };
    }

    // Create new friend request
    const requestId = await ctx.db.insert("friendRequests", {
      fromUserId: fromUser._id,
      toUserId: toUser._id,
      status: "pending",
      message: args.message,
      createdAt: Date.now(),
    });

    return { requestId, friendshipCreated: false };
  },
});

// Get pending friend requests (received)
export const getPendingRequests = query({
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

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user_status", (q) =>
        q.eq("toUserId", user._id).eq("status", "pending")
      )
      .collect();

    // Populate sender info
    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const fromUser = await ctx.db.get(request.fromUserId);
        return {
          ...request,
          fromUser: fromUser
            ? {
                _id: fromUser._id,
                name: fromUser.name,
                email: fromUser.email,
              }
            : null,
        };
      })
    );

    return requestsWithUsers;
  },
});

// Accept friend request
export const acceptFriendRequest = mutation({
  args: {
    requestId: v.id("friendRequests"),
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

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({
        message: "Friend request not found",
        code: "NOT_FOUND",
      });
    }

    if (request.toUserId !== user._id) {
      throw new ConvexError({
        message: "Not authorized to accept this request",
        code: "FORBIDDEN",
      });
    }

    if (request.status !== "pending") {
      throw new ConvexError({
        message: "Friend request already responded to",
        code: "CONFLICT",
      });
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "accepted",
      respondedAt: Date.now(),
    });

    // Create friendship
    await ctx.db.insert("friendships", {
      user1Id: request.fromUserId,
      user2Id: request.toUserId,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Reject friend request
export const rejectFriendRequest = mutation({
  args: {
    requestId: v.id("friendRequests"),
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

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({
        message: "Friend request not found",
        code: "NOT_FOUND",
      });
    }

    if (request.toUserId !== user._id) {
      throw new ConvexError({
        message: "Not authorized to reject this request",
        code: "FORBIDDEN",
      });
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "rejected",
      respondedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get all friends
export const getFriends = query({
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

    // Get friendships where user is user1
    const friendships1 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1Id", user._id))
      .collect();

    // Get friendships where user is user2
    const friendships2 = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) => q.eq("user2Id", user._id))
      .collect();

    // Extract friend IDs
    const friendIds: Id<"users">[] = [
      ...friendships1.map((f) => f.user2Id),
      ...friendships2.map((f) => f.user1Id),
    ];

    // Get friend details
    const friends = await Promise.all(
      friendIds.map(async (friendId) => {
        const friend = await ctx.db.get(friendId);
        return friend
          ? {
              _id: friend._id,
              name: friend.name,
              email: friend.email,
            }
          : null;
      })
    );

    return friends.filter((f) => f !== null);
  },
});

// Remove a friend
export const removeFriend = mutation({
  args: {
    friendId: v.id("users"),
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

    // Find and delete the friendship
    const friendship1 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1Id", user._id))
      .filter((q) => q.eq(q.field("user2Id"), args.friendId))
      .first();

    const friendship2 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1Id", args.friendId))
      .filter((q) => q.eq(q.field("user2Id"), user._id))
      .first();

    if (friendship1) {
      await ctx.db.delete(friendship1._id);
    } else if (friendship2) {
      await ctx.db.delete(friendship2._id);
    } else {
      throw new ConvexError({
        message: "Friendship not found",
        code: "NOT_FOUND",
      });
    }

    return { success: true };
  },
});
