import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Get all forum posts (only approved posts for regular users)
export const getPosts = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    let isAdmin = false;

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier),
        )
        .unique();
      
      isAdmin = user?.role === "owner" || user?.role === "admin";
    }

    let postsQuery = ctx.db
      .query("forumPosts")
      .withIndex("by_active", (q) => q.eq("isActive", true));

    if (args.category) {
      postsQuery = ctx.db
        .query("forumPosts")
        .withIndex("by_category", (q) => q.eq("category", args.category));
    }

    const posts = await postsQuery.order("desc").take(50);

    // Filter posts based on status and user role
    const filteredPosts = posts.filter(post => {
      // For old posts without status field, treat them as approved
      const postStatus = post.status || "approved";
      
      if (isAdmin) {
        return postStatus !== "hidden"; // Admins see all except hidden
      }
      return postStatus === "approved"; // Regular users only see approved
    });

    // Enrich with author info
    const enrichedPosts = await Promise.all(
      filteredPosts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        return {
          ...post,
          author: author
            ? {
                _id: author._id,
                name: author.name || "Unknown",
              }
            : null,
        };
      })
    );

    return enrichedPosts;
  },
});

// Get single post with comments
export const getPost = query({
  args: { postId: v.id("forumPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError({
        message: "Post not found",
        code: "NOT_FOUND",
      });
    }

    const author = await ctx.db.get(post.authorId);

    // Get comments
    const comments = await ctx.db
      .query("forumComments")
      .withIndex("by_post_created", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();

    // Enrich comments with author info
    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
        const commentAuthor = await ctx.db.get(comment.authorId);
        return {
          ...comment,
          author: commentAuthor
            ? {
                _id: commentAuthor._id,
                name: commentAuthor.name || "Unknown",
              }
            : null,
        };
      })
    );

    return {
      ...post,
      author: author
        ? {
            _id: author._id,
            name: author.name || "Unknown",
          }
        : null,
      comments: enrichedComments,
    };
  },
});

// Create a new post
export const createPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
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

    // Check if user is banned from posting
    const now = Date.now();
    if (user.forumBanExpiresAt && user.forumBanExpiresAt > now) {
      throw new ConvexError({
        message: "You are currently banned from posting in forums",
        code: "FORBIDDEN",
      });
    }

    const postId = await ctx.db.insert("forumPosts", {
      authorId: user._id,
      title: args.title,
      content: args.content,
      category: args.category,
      images: args.images,
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      isActive: true,
      status: "pending", // All posts start as pending
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return postId;
  },
});

// Add a comment to a post
export const addComment = mutation({
  args: {
    postId: v.id("forumPosts"),
    content: v.string(),
    parentCommentId: v.optional(v.id("forumComments")),
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

    // Check if user is banned from posting
    const now = Date.now();
    if (user.forumBanExpiresAt && user.forumBanExpiresAt > now) {
      throw new ConvexError({
        message: "You are currently banned from commenting in forums",
        code: "FORBIDDEN",
      });
    }

    const commentId = await ctx.db.insert("forumComments", {
      postId: args.postId,
      authorId: user._id,
      content: args.content,
      parentCommentId: args.parentCommentId,
      likeCount: 0,
      createdAt: Date.now(),
    });

    // Update comment count on post
    const post = await ctx.db.get(args.postId);
    if (post) {
      await ctx.db.patch(args.postId, {
        commentCount: post.commentCount + 1,
      });
    }

    return commentId;
  },
});

// Like/unlike a post
export const toggleLikePost = mutation({
  args: { postId: v.id("forumPosts") },
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

    // Check if already liked
    const existingLike = await ctx.db
      .query("forumLikes")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", user._id).eq("postId", args.postId),
      )
      .unique();

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError({
        message: "Post not found",
        code: "NOT_FOUND",
      });
    }

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.postId, {
        likeCount: Math.max(0, post.likeCount - 1),
      });
      return { liked: false };
    } else {
      // Like
      await ctx.db.insert("forumLikes", {
        userId: user._id,
        postId: args.postId,
        createdAt: Date.now(),
      });
      await ctx.db.patch(args.postId, {
        likeCount: post.likeCount + 1,
      });
      return { liked: true };
    }
  },
});

// Check if user has liked a post
export const hasLikedPost = query({
  args: { postId: v.id("forumPosts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      return false;
    }

    const like = await ctx.db
      .query("forumLikes")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", user._id).eq("postId", args.postId),
      )
      .unique();

    return !!like;
  },
});

// Delete a post (author only)
export const deletePost = mutation({
  args: { postId: v.id("forumPosts") },
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

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError({
        message: "Post not found",
        code: "NOT_FOUND",
      });
    }

    // Check if user is admin or post author
    const isAdmin = user.role === "owner" || user.role === "admin";
    const isAuthor = post.authorId === user._id;

    if (!isAdmin && !isAuthor) {
      throw new ConvexError({
        message: "You can only delete your own posts",
        code: "FORBIDDEN",
      });
    }

    // Check if post is locked (only admins can delete locked posts)
    if (post.isLocked && !isAdmin) {
      throw new ConvexError({
        message: "This post is locked and cannot be deleted",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.postId, { isActive: false });
    return { success: true };
  },
});

// ADMIN ONLY: Get pending posts
export const getPendingPosts = query({
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
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    const posts = await ctx.db
      .query("forumPosts")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    // Enrich with author info
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        return {
          ...post,
          author: author
            ? {
                _id: author._id,
                name: author.name || "Unknown",
              }
            : null,
        };
      })
    );

    return enrichedPosts;
  },
});

// ADMIN ONLY: Approve a post
export const approvePost = mutation({
  args: { postId: v.id("forumPosts") },
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

    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError({
        message: "Post not found",
        code: "NOT_FOUND",
      });
    }

    await ctx.db.patch(args.postId, {
      status: "approved",
      reviewedBy: user._id,
      reviewedAt: Date.now(),
    });

    // Send notification to post author
    await ctx.db.insert("notifications", {
      userId: post.authorId,
      type: "post_approved",
      title: "Post Approved",
      message: `Your post "${post.title}" has been approved and is now live!`,
      relatedId: args.postId,
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ADMIN ONLY: Reject a post
export const rejectPost = mutation({
  args: {
    postId: v.id("forumPosts"),
    reason: v.string(),
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

    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError({
        message: "Post not found",
        code: "NOT_FOUND",
      });
    }

    await ctx.db.patch(args.postId, {
      status: "rejected",
      rejectionReason: args.reason,
      reviewedBy: user._id,
      reviewedAt: Date.now(),
    });

    // Send notification to post author
    await ctx.db.insert("notifications", {
      userId: post.authorId,
      type: "post_rejected",
      title: "Post Rejected",
      message: `Your post "${post.title}" was rejected. Reason: ${args.reason}`,
      relatedId: args.postId,
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ADMIN ONLY: Hide a post
export const hidePost = mutation({
  args: { postId: v.id("forumPosts") },
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

    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.postId, {
      status: "hidden",
      reviewedBy: user._id,
      reviewedAt: Date.now(),
    });

    return { success: true };
  },
});

// ADMIN ONLY: Lock a post
export const lockPost = mutation({
  args: { postId: v.id("forumPosts"), locked: v.boolean() },
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

    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.postId, {
      isLocked: args.locked,
    });

    return { success: true };
  },
});

// Report a post
export const reportPost = mutation({
  args: {
    postId: v.id("forumPosts"),
    reason: v.union(
      v.literal("spam"),
      v.literal("hate_speech"),
      v.literal("violence"),
      v.literal("harassment")
    ),
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
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const reportId = await ctx.db.insert("forumReports", {
      postId: args.postId,
      reporterId: user._id,
      reason: args.reason,
      description: args.description,
      status: "pending",
      createdAt: Date.now(),
    });

    return reportId;
  },
});

// ADMIN ONLY: Get reported posts
export const getReportedPosts = query({
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
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    const reports = await ctx.db
      .query("forumReports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    // Enrich with post and reporter info
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        const post = await ctx.db.get(report.postId);
        const reporter = await ctx.db.get(report.reporterId);
        const author = post ? await ctx.db.get(post.authorId) : null;

        return {
          ...report,
          post: post
            ? {
                ...post,
                author: author
                  ? {
                      _id: author._id,
                      name: author.name || "Unknown",
                    }
                  : null,
              }
            : null,
          reporter: reporter
            ? {
                _id: reporter._id,
                name: reporter.name || "Unknown",
              }
            : null,
        };
      })
    );

    return enrichedReports;
  },
});

// ADMIN ONLY: Dismiss a report
export const dismissReport = mutation({
  args: { reportId: v.id("forumReports") },
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

    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.reportId, {
      status: "dismissed",
      reviewedBy: user._id,
      reviewedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get user notifications
export const getMyNotifications = query({
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

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);

    return notifications;
  },
});

// Mark notification as read
export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });

    return { success: true };
  },
});

// Get all forum posts and replies by a specific user (admin only)
export const getUserForumActivity = query({
  args: { userId: v.id("users") },
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

    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    // Get user's posts
    const posts = await ctx.db
      .query("forumPosts")
      .filter((q) => q.eq(q.field("authorId"), args.userId))
      .order("desc")
      .take(50);

    // Get user's comments
    const comments = await ctx.db
      .query("forumComments")
      .filter((q) => q.eq(q.field("authorId"), args.userId))
      .order("desc")
      .take(50);

    // Enrich comments with post info
    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
        const post = await ctx.db.get(comment.postId);
        return {
          ...comment,
          post: post
            ? {
                _id: post._id,
                title: post.title,
              }
            : null,
        };
      })
    );

    return {
      posts,
      comments: enrichedComments,
    };
  },
});

// Check if current user is banned from posting
export const getMyForumBanStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isBanned: false };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      return { isBanned: false };
    }

    const now = Date.now();
    const isBanned = user.forumBanExpiresAt && user.forumBanExpiresAt > now;

    return {
      isBanned: !!isBanned,
      banExpiresAt: user.forumBanExpiresAt || null,
      banReason: user.forumBanReason || null,
      warningCount: user.forumWarningCount || 0,
    };
  },
});

// ADMIN ONLY: Issue warning to a post (increments warning count and may trigger ban)
export const warnPost = mutation({
  args: {
    postId: v.id("forumPosts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!admin || (admin.role !== "owner" && admin.role !== "admin")) {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError({
        message: "Post not found",
        code: "NOT_FOUND",
      });
    }

    const author = await ctx.db.get(post.authorId);
    if (!author) {
      throw new ConvexError({
        message: "Author not found",
        code: "NOT_FOUND",
      });
    }

    // Mark post as warned
    await ctx.db.patch(args.postId, {
      hasWarning: true,
      warningIssuedBy: admin._id,
      warningIssuedAt: Date.now(),
    });

    // Increment warning count
    const newWarningCount = (author.forumWarningCount || 0) + 1;
    
    // Calculate ban duration based on warning count
    let banDurationMs = 0;
    let banReason = "";
    
    if (newWarningCount === 1) {
      banReason = "Warning 1: Please follow community guidelines";
    } else if (newWarningCount === 2) {
      banDurationMs = 24 * 60 * 60 * 1000; // 24 hours
      banReason = "Warning 2: 24 hour ban from posting/commenting";
    } else if (newWarningCount === 3) {
      banDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      banReason = "Warning 3: 7 day ban from posting/commenting";
    } else if (newWarningCount === 4) {
      banDurationMs = 14 * 24 * 60 * 60 * 1000; // 14 days
      banReason = "Warning 4: 14 day ban from posting/commenting";
    } else if (newWarningCount === 5) {
      banDurationMs = 30 * 24 * 60 * 60 * 1000; // 30 days
      banReason = "Warning 5: 30 day ban from posting/commenting";
    } else if (newWarningCount >= 6) {
      banDurationMs = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months
      banReason = "Warning 6+: 6 month ban from posting/commenting";
    }

    const updateData: {
      forumWarningCount: number;
      forumBanExpiresAt?: number;
      forumBanReason?: string;
    } = {
      forumWarningCount: newWarningCount,
    };

    if (banDurationMs > 0) {
      updateData.forumBanExpiresAt = Date.now() + banDurationMs;
      updateData.forumBanReason = banReason;
    }

    await ctx.db.patch(author._id, updateData);

    // Send notification to user
    await ctx.db.insert("notifications", {
      userId: author._id,
      type: "forum_warning",
      title: "Forum Warning Issued",
      message: banDurationMs > 0 
        ? `You received a warning on your post "${post.title}". ${banReason}. Further violations may result in longer bans or permanent removal.`
        : `You received a warning on your post "${post.title}". ${banReason}. Future violations will result in temporary bans.`,
      relatedId: args.postId,
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true, warningCount: newWarningCount };
  },
});

// ADMIN ONLY: Issue warning to a comment (increments warning count and may trigger ban)
export const warnComment = mutation({
  args: {
    commentId: v.id("forumComments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!admin || (admin.role !== "owner" && admin.role !== "admin")) {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new ConvexError({
        message: "Comment not found",
        code: "NOT_FOUND",
      });
    }

    const author = await ctx.db.get(comment.authorId);
    if (!author) {
      throw new ConvexError({
        message: "Author not found",
        code: "NOT_FOUND",
      });
    }

    // Mark comment as warned
    await ctx.db.patch(args.commentId, {
      hasWarning: true,
      warningIssuedBy: admin._id,
      warningIssuedAt: Date.now(),
    });

    // Increment warning count
    const newWarningCount = (author.forumWarningCount || 0) + 1;
    
    // Calculate ban duration based on warning count
    let banDurationMs = 0;
    let banReason = "";
    
    if (newWarningCount === 1) {
      banReason = "Warning 1: Please follow community guidelines";
    } else if (newWarningCount === 2) {
      banDurationMs = 24 * 60 * 60 * 1000; // 24 hours
      banReason = "Warning 2: 24 hour ban from posting/commenting";
    } else if (newWarningCount === 3) {
      banDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      banReason = "Warning 3: 7 day ban from posting/commenting";
    } else if (newWarningCount === 4) {
      banDurationMs = 14 * 24 * 60 * 60 * 1000; // 14 days
      banReason = "Warning 4: 14 day ban from posting/commenting";
    } else if (newWarningCount === 5) {
      banDurationMs = 30 * 24 * 60 * 60 * 1000; // 30 days
      banReason = "Warning 5: 30 day ban from posting/commenting";
    } else if (newWarningCount >= 6) {
      banDurationMs = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months
      banReason = "Warning 6+: 6 month ban from posting/commenting";
    }

    const updateData: {
      forumWarningCount: number;
      forumBanExpiresAt?: number;
      forumBanReason?: string;
    } = {
      forumWarningCount: newWarningCount,
    };

    if (banDurationMs > 0) {
      updateData.forumBanExpiresAt = Date.now() + banDurationMs;
      updateData.forumBanReason = banReason;
    }

    await ctx.db.patch(author._id, updateData);

    // Get post title for notification
    const post = await ctx.db.get(comment.postId);
    const postTitle = post?.title || "a post";

    // Send notification to user
    await ctx.db.insert("notifications", {
      userId: author._id,
      type: "forum_warning",
      title: "Forum Warning Issued",
      message: banDurationMs > 0 
        ? `You received a warning on your comment in "${postTitle}". ${banReason}. Further violations may result in longer bans or permanent removal.`
        : `You received a warning on your comment in "${postTitle}". ${banReason}. Future violations will result in temporary bans.`,
      relatedId: comment.postId,
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true, warningCount: newWarningCount };
  },
});

// ADMIN ONLY: Remove forum ban from a user
export const removeForumBan = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!admin || (admin.role !== "owner" && admin.role !== "admin")) {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.userId, {
      forumBanExpiresAt: undefined,
      forumBanReason: undefined,
    });

    // Send notification to user
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "forum_ban_removed",
      title: "Forum Ban Removed",
      message: "Your forum posting ban has been lifted by an administrator. Please continue to follow community guidelines.",
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
