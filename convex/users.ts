import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { GenericMutationCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel.d.ts";

// Super admin email
const SUPER_ADMIN_EMAIL = "rex@diazcorporations.com";

// Generate unique member number
async function generateMemberNumber(
  ctx: GenericMutationCtx<DataModel>
): Promise<string> {
  // Get the count of all users (including archived)
  const allUsers = await ctx.db.query("users").collect();
  const nextNumber = allUsers.length + 1;
  
  // Format as M-00001, M-00002, etc.
  const memberNumber = `M-${nextNumber.toString().padStart(5, "0")}`;
  
  // Check if this number already exists (shouldn't happen, but be safe)
  const existing = allUsers.find((u) => u.memberNumber === memberNumber);
  if (existing) {
    // If it exists, try the next number
    return `M-${(nextNumber + 1).toString().padStart(5, "0")}`;
  }
  
  return memberNumber;
}

// Default permissions for each role
const DEFAULT_PERMISSIONS = {
  owner: [
    "view_users",
    "edit_users",
    "delete_users",
    "ban_users",
    "manage_roles",
    "moderate_forums",
    "moderate_marketplace",
    "manage_subscriptions",
    "view_analytics",
  ],
  admin: [
    "view_users",
    "edit_users",
    "ban_users",
    "moderate_forums",
    "moderate_marketplace",
    "view_analytics",
  ],
  member: [],
};

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    // Check if we've already stored this identity before.
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user !== null) {
      return user._id;
    }
    
    // Determine role: owner if super admin email, otherwise member
    const role = identity.email === SUPER_ADMIN_EMAIL ? "owner" : "member";
    const permissions = DEFAULT_PERMISSIONS[role];
    
    // Generate unique member number
    const memberNumber = await generateMemberNumber(ctx);
    
    // If it's a new identity, create a new User.
    const userId = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      avatar: typeof identity.profileUrl === "string" ? identity.profileUrl : undefined,
      role,
      permissions,
      memberNumber,
      profileCompleted: false, // New users must complete their profile
    });
    
    // Log the account creation
    await ctx.db.insert("auditLogs", {
      userId,
      action: "Account created",
      entityType: "user",
      entityId: userId,
      timestamp: Date.now(),
    });
    
    return userId;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Called getCurrentUser without authentication present",
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    
    // Check if account access is restricted
    if (user?.accountAccessRestricted) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Your account is currently under review. Please wait at least 24-48 hours before submitting a support ticket.",
      });
    }
    
    return user;
  },
});

// Migration: Add member numbers to existing users
export const addMemberNumbersToExistingUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    // Only allow owners to run this migration
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!currentUser || currentUser.role !== "owner") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only owners can run this migration",
      });
    }

    // Get all users without member numbers
    const allUsers = await ctx.db.query("users").collect();
    const usersWithoutNumbers = allUsers.filter(u => !u.memberNumber);

    let count = 0;
    for (const user of usersWithoutNumbers) {
      const memberNumber = await generateMemberNumber(ctx);
      await ctx.db.patch(user._id, { memberNumber });
      count++;
    }

    return { 
      message: `Successfully added member numbers to ${count} users`,
      updated: count 
    };
  },
});
