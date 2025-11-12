import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Super admin email
const SUPER_ADMIN_EMAIL = "rex@diazcorporations.com";

// Permission constants
export const PERMISSIONS = {
  // User management
  VIEW_USERS: "view_users",
  EDIT_USERS: "edit_users",
  DELETE_USERS: "delete_users",
  BAN_USERS: "ban_users",
  
  // Role management
  MANAGE_ROLES: "manage_roles",
  
  // Content moderation
  MODERATE_FORUMS: "moderate_forums",
  MODERATE_MARKETPLACE: "moderate_marketplace",
  
  // Subscriptions
  MANAGE_SUBSCRIPTIONS: "manage_subscriptions",
  
  // System
  VIEW_ANALYTICS: "view_analytics",
} as const;

// Default permissions for each role
const DEFAULT_PERMISSIONS = {
  owner: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.BAN_USERS,
    PERMISSIONS.MODERATE_FORUMS,
    PERMISSIONS.MODERATE_MARKETPLACE,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  member: [],
};

// Check if user is owner
export const isOwner = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    
    return user?.role === "owner";
  },
});

// Check if user is admin or owner
export const isAdminOrOwner = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    
    return user?.role === "owner" || user?.role === "admin";
  },
});

// Get user's role
export const getMyRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    
    return user?.role || "member";
  },
});

// List all users (admin only) - excludes archived users
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
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
    
    const users = await ctx.db.query("users").collect();
    return users.filter((user) => !user.archived);
  },
});

// List archived users (admin only)
export const listArchivedUsers = query({
  args: {},
  handler: async (ctx) => {
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
    
    const users = await ctx.db.query("users").collect();
    return users.filter((user) => user.archived);
  },
});

// Change user role (owner only)
export const changeUserRole = mutation({
  args: {
    userId: v.id("users"),
    newRole: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
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
    
    if (!currentUser || currentUser.role !== "owner") {
      throw new ConvexError({
        message: "Only owners can change roles",
        code: "FORBIDDEN",
      });
    }
    
    // Get target user's old role
    const targetUser = await ctx.db.get(args.userId);
    const oldRole = targetUser?.role || "member";
    
    // Get default permissions for the new role
    const permissions = DEFAULT_PERMISSIONS[args.newRole];
    
    await ctx.db.patch(args.userId, {
      role: args.newRole,
      permissions,
    });
    
    // Log the role change
    await ctx.db.insert("auditLogs", {
      userId: currentUser._id,
      action: `Changed user role from ${oldRole} to ${args.newRole}`,
      entityType: "user",
      entityId: args.userId,
      changes: `role: ${oldRole} → ${args.newRole}`,
      timestamp: Date.now(),
    });
  },
});

// Get all role permissions
export const getAllRolePermissions = query({
  args: {},
  handler: async (ctx) => {
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
    
    if (!currentUser || currentUser.role !== "owner") {
      throw new ConvexError({
        message: "Only owners can view role permissions",
        code: "FORBIDDEN",
      });
    }
    
    // Return current default permissions
    // In a production app, you'd store these in a database table
    return DEFAULT_PERMISSIONS;
  },
});

// Update role permissions (owner only)
export const updateRolePermissions = mutation({
  args: {
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    permissions: v.array(v.string()),
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
    
    if (!currentUser || currentUser.role !== "owner") {
      throw new ConvexError({
        message: "Only owners can update role permissions",
        code: "FORBIDDEN",
      });
    }
    
    // Cannot modify owner permissions
    if (args.role === "owner") {
      throw new ConvexError({
        message: "Cannot modify owner permissions",
        code: "FORBIDDEN",
      });
    }
    
    // Update all users with this role to have the new permissions
    const usersWithRole = await ctx.db
      .query("users")
      .collect();
    
    for (const user of usersWithRole) {
      if (user.role === args.role) {
        await ctx.db.patch(user._id, {
          permissions: args.permissions,
        });
      }
    }
    
    return { success: true, updated: usersWithRole.filter(u => u.role === args.role).length };
  },
});

// Initialize super admin (run once)
export const ensureSuperAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    // Find user with super admin email
    const superAdminUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), SUPER_ADMIN_EMAIL))
      .first();
    
    if (superAdminUser && superAdminUser.role !== "owner") {
      await ctx.db.patch(superAdminUser._id, {
        role: "owner",
        permissions: DEFAULT_PERMISSIONS.owner,
      });
      return { updated: true, userId: superAdminUser._id };
    }
    
    return { updated: false, message: "Super admin already set or user not found" };
  },
});

// Get user by ID (admin only)
export const getUserById = query({
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
    
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }
    
    return user;
  },
});

// Update account status (admin only)
export const updateAccountStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("hold"), v.literal("banned")),
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
    
    await ctx.db.patch(args.userId, {
      accountStatus: args.status,
    });
    
    // Log the status change
    await ctx.db.insert("auditLogs", {
      userId: currentUser._id,
      action: `Changed account status to ${args.status}`,
      entityType: "user",
      entityId: args.userId,
      changes: `accountStatus: ${args.status}`,
      timestamp: Date.now(),
    });
  },
});

// Restrict account access (admin only)
export const restrictAccountAccess = mutation({
  args: {
    userId: v.id("users"),
    restricted: v.boolean(),
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
    
    await ctx.db.patch(args.userId, {
      accountAccessRestricted: args.restricted,
    });
    
    // Log the access restriction change
    await ctx.db.insert("auditLogs", {
      userId: currentUser._id,
      action: args.restricted ? "Restricted account access" : "Restored account access",
      entityType: "user",
      entityId: args.userId,
      changes: `accountAccessRestricted: ${args.restricted}`,
      timestamp: Date.now(),
    });
  },
});

// Get admin notes for a user (admin only)
export const getAdminNotes = query({
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
    
    const notes = await ctx.db
      .query("adminNotes")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    
    // Fetch author info for each note
    const notesWithAuthors = await Promise.all(
      notes.map(async (note) => {
        const author = await ctx.db.get(note.authorId);
        return {
          ...note,
          authorName: author?.name || "Unknown",
        };
      })
    );
    
    return notesWithAuthors;
  },
});

// Add admin note (admin only)
export const addAdminNote = mutation({
  args: {
    userId: v.id("users"),
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
    
    const noteId = await ctx.db.insert("adminNotes", {
      userId: args.userId,
      authorId: currentUser._id,
      content: args.content,
      createdAt: Date.now(),
    });
    
    return noteId;
  },
});

// Delete admin note (owner only)
export const deleteAdminNote = mutation({
  args: { noteId: v.id("adminNotes") },
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
    
    if (!currentUser || currentUser.role !== "owner") {
      throw new ConvexError({
        message: "Only owners can delete admin notes",
        code: "FORBIDDEN",
      });
    }
    
    await ctx.db.delete(args.noteId);
  },
});

// Archive user (admin only)
export const archiveUser = mutation({
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
    
    await ctx.db.patch(args.userId, {
      archived: true,
      archivedAt: Date.now(),
      archivedBy: currentUser._id,
    });
    
    // Log the archive action
    await ctx.db.insert("auditLogs", {
      userId: currentUser._id,
      action: "Archived user account",
      entityType: "user",
      entityId: args.userId,
      timestamp: Date.now(),
    });
  },
});

// Unarchive user (admin only)
export const unarchiveUser = mutation({
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
    
    await ctx.db.patch(args.userId, {
      archived: false,
      archivedAt: undefined,
      archivedBy: undefined,
    });
    
    // Log the unarchive action
    await ctx.db.insert("auditLogs", {
      userId: currentUser._id,
      action: "Restored user account from archive",
      entityType: "user",
      entityId: args.userId,
      timestamp: Date.now(),
    });
  },
});

// Get call logs for a user (admin only)
export const getCallLogs = query({
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
    
    const logs = await ctx.db
      .query("callLogs")
      .withIndex("by_user_call_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    
    // Fetch author info for each log
    const logsWithAuthors = await Promise.all(
      logs.map(async (log) => {
        const author = await ctx.db.get(log.authorId);
        return {
          ...log,
          authorName: author?.name || "Unknown",
        };
      })
    );
    
    return logsWithAuthors;
  },
});

// Add call log (admin only)
export const addCallLog = mutation({
  args: {
    userId: v.id("users"),
    callType: v.union(v.literal("inbound"), v.literal("outbound")),
    duration: v.optional(v.number()),
    notes: v.string(),
    phoneNumber: v.optional(v.string()),
    callDate: v.number(),
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
    
    const logId = await ctx.db.insert("callLogs", {
      userId: args.userId,
      authorId: currentUser._id,
      callType: args.callType,
      duration: args.duration,
      notes: args.notes,
      phoneNumber: args.phoneNumber,
      callDate: args.callDate,
      createdAt: Date.now(),
    });
    
    return logId;
  },
});

// Get member files (admin only)
export const getMemberFiles = query({
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
    
    const files = await ctx.db
      .query("memberFiles")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    
    // Fetch uploader info for each file
    const filesWithUploaders = await Promise.all(
      files.map(async (file) => {
        const uploader = await ctx.db.get(file.uploadedBy);
        return {
          ...file,
          uploaderName: uploader?.name || "Unknown",
        };
      })
    );
    
    return filesWithUploaders;
  },
});

// Generate upload URL for member file (admin only)
export const generateMemberFileUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
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
    
    return await ctx.storage.generateUploadUrl();
  },
});

// Add member file (admin only)
export const addMemberFile = mutation({
  args: {
    userId: v.id("users"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    storageId: v.id("_storage"),
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
    
    const fileId = await ctx.db.insert("memberFiles", {
      userId: args.userId,
      uploadedBy: currentUser._id,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      storageId: args.storageId,
      description: args.description,
      createdAt: Date.now(),
    });
    
    return fileId;
  },
});

// Delete member file (admin only)
export const deleteMemberFile = mutation({
  args: { fileId: v.id("memberFiles") },
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
    
    const file = await ctx.db.get(args.fileId);
    if (file) {
      await ctx.storage.delete(file.storageId);
    }
    
    await ctx.db.delete(args.fileId);
  },
});

// Get file URL for download (admin only)
export const getMemberFileUrl = query({
  args: { storageId: v.id("_storage") },
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
    
    return await ctx.storage.getUrl(args.storageId);
  },
});
