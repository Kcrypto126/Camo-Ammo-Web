import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const getMyProfile = query({
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

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    return user;
  },
});

// Generate upload URL for profile photo
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

// Get URL for a photo stored in Convex storage
export const getPhotoUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    country: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    emergencyContact1: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),
    emergencyContact2: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),
    emergencyContact3: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),
    huntingPreferences: v.optional(v.array(v.string())),
    weaponTypes: v.optional(v.array(v.string())),
    interestedInSpecialEvents: v.optional(v.boolean()),
    bio: v.optional(v.string()),
    profilePhotos: v.optional(v.array(v.string())),
    yearsOfExperience: v.optional(v.number()),
    favoriteSpecies: v.optional(v.string()),
    hobbies: v.optional(v.array(v.string())),
    profileCompleted: v.optional(v.boolean()),
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

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.avatar !== undefined) updates.avatar = args.avatar;
    if (args.country !== undefined) updates.country = args.country;
    if (args.streetAddress !== undefined) updates.streetAddress = args.streetAddress;
    if (args.city !== undefined) updates.city = args.city;
    if (args.state !== undefined) updates.state = args.state;
    if (args.zipCode !== undefined) updates.zipCode = args.zipCode;
    if (args.emergencyContact1 !== undefined) updates.emergencyContact1 = args.emergencyContact1;
    if (args.emergencyContact2 !== undefined) updates.emergencyContact2 = args.emergencyContact2;
    if (args.emergencyContact3 !== undefined) updates.emergencyContact3 = args.emergencyContact3;
    if (args.huntingPreferences !== undefined) updates.huntingPreferences = args.huntingPreferences;
    if (args.weaponTypes !== undefined) updates.weaponTypes = args.weaponTypes;
    if (args.interestedInSpecialEvents !== undefined) updates.interestedInSpecialEvents = args.interestedInSpecialEvents;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.profilePhotos !== undefined) updates.profilePhotos = args.profilePhotos;
    if (args.yearsOfExperience !== undefined) updates.yearsOfExperience = args.yearsOfExperience;
    if (args.favoriteSpecies !== undefined) updates.favoriteSpecies = args.favoriteSpecies;
    if (args.hobbies !== undefined) updates.hobbies = args.hobbies;
    if (args.profileCompleted !== undefined) updates.profileCompleted = args.profileCompleted;

    await ctx.db.patch(user._id, updates);

    // Log the profile update
    const changesArray = Object.keys(updates).map(key => `${key}`);
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "Updated profile",
      entityType: "profile",
      entityId: user._id,
      changes: changesArray.join(", "),
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Get public profile of any user
export const getPublicProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Check if user is archived
    if (user.archived) {
      throw new ConvexError({
        message: "User profile not available",
        code: "NOT_FOUND",
      });
    }

    // Return only public information
    return {
      _id: user._id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      city: user.city,
      state: user.state,
      country: user.country,
      bio: user.bio,
      profilePhotos: user.profilePhotos,
      yearsOfExperience: user.yearsOfExperience,
      favoriteSpecies: user.favoriteSpecies,
      hobbies: user.hobbies,
      huntingPreferences: user.huntingPreferences,
      weaponTypes: user.weaponTypes,
      role: user.role,
      _creationTime: user._creationTime,
    };
  },
});
