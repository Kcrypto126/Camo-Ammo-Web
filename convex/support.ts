import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Create a support ticket
export const createTicket = mutation({
  args: {
    subject: v.string(),
    message: v.string(),
    category: v.string(),
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

    const ticketId = await ctx.db.insert("supportTickets", {
      userId: user._id,
      subject: args.subject,
      message: args.message,
      category: args.category,
      status: "open",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return ticketId;
  },
});

// Get my support tickets
export const getMyTickets = query({
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const tickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return tickets;
  },
});

// Get all support tickets (admin only)
export const getAllTickets = query({
  args: {
    status: v.optional(v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed"))),
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!currentUser || (currentUser.role !== "owner" && currentUser.role !== "admin")) {
      throw new ConvexError({
        message: "Not authorized",
        code: "FORBIDDEN",
      });
    }

    let tickets;
    if (args.status) {
      const statusFilter = args.status as "open" | "in_progress" | "resolved" | "closed";
      tickets = await ctx.db
        .query("supportTickets")
        .withIndex("by_status", (q) => q.eq("status", statusFilter))
        .order("desc")
        .collect();
    } else {
      tickets = await ctx.db
        .query("supportTickets")
        .order("desc")
        .collect();
    }

    // Fetch user info for each ticket
    const ticketsWithUsers = await Promise.all(
      tickets.map(async (ticket) => {
        const user = await ctx.db.get(ticket.userId);
        return {
          ...ticket,
          userName: user?.name || "Unknown",
          userEmail: user?.email || "",
        };
      })
    );

    return ticketsWithUsers;
  },
});

// Get tickets for a specific user (admin only)
export const getUserTickets = query({
  args: { userId: v.id("users") },
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!currentUser || (currentUser.role !== "owner" && currentUser.role !== "admin")) {
      throw new ConvexError({
        message: "Not authorized",
        code: "FORBIDDEN",
      });
    }

    const tickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return tickets;
  },
});

// Update ticket status (admin only)
export const updateTicketStatus = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed")),
    response: v.optional(v.string()),
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!currentUser || (currentUser.role !== "owner" && currentUser.role !== "admin")) {
      throw new ConvexError({
        message: "Not authorized",
        code: "FORBIDDEN",
      });
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.response) {
      updates.adminResponse = args.response;
      updates.respondedBy = currentUser._id;
      updates.respondedAt = Date.now();
    }

    await ctx.db.patch(args.ticketId, updates);
  },
});

// Get replies for a ticket
export const getTicketReplies = query({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const replies = await ctx.db
      .query("ticketReplies")
      .withIndex("by_ticket_created", (q) => q.eq("ticketId", args.ticketId))
      .order("asc")
      .collect();

    // Fetch user info for each reply
    const repliesWithUsers = await Promise.all(
      replies.map(async (reply) => {
        const user = await ctx.db.get(reply.userId);
        return {
          ...reply,
          userName: user?.name || "Unknown",
          userAvatar: user?.avatar,
        };
      })
    );

    return repliesWithUsers;
  },
});

// Add a reply to a ticket
export const addTicketReply = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    message: v.string(),
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      fileName: v.string(),
      fileSize: v.number(),
    }))),
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!currentUser) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Check if user is admin/owner or the ticket owner
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new ConvexError({
        message: "Ticket not found",
        code: "NOT_FOUND",
      });
    }

    const isAdmin = currentUser.role === "owner" || currentUser.role === "admin";
    const isTicketOwner = ticket.userId === currentUser._id;

    if (!isAdmin && !isTicketOwner) {
      throw new ConvexError({
        message: "Not authorized",
        code: "FORBIDDEN",
      });
    }

    // Insert the reply
    const replyId = await ctx.db.insert("ticketReplies", {
      ticketId: args.ticketId,
      userId: currentUser._id,
      message: args.message,
      attachments: args.attachments,
      isAdminReply: isAdmin,
      createdAt: Date.now(),
    });

    // Update ticket status and timestamp
    await ctx.db.patch(args.ticketId, {
      updatedAt: Date.now(),
      status: isAdmin && ticket.status === "open" ? "in_progress" : ticket.status,
    });

    return replyId;
  },
});

// Generate upload URL for ticket reply attachments
export const generateReplyUploadUrl = mutation({
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

// Get attachment URL
export const getAttachmentUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    return await ctx.storage.getUrl(args.storageId);
  },
});
