import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

// Browse approved leases with filters (public view)
export const browseLeases = query({
  args: {
    state: v.optional(v.string()),
    minAcreage: v.optional(v.number()),
    maxAcreage: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    gameType: v.optional(v.string()),
    leaseTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let leasesQuery = ctx.db
      .query("landLeases")
      .withIndex("by_status", (q) => q.eq("status", "approved"));

    const leases = await leasesQuery.collect();

    // Apply filters
    let filtered = leases;

    if (args.state) {
      filtered = filtered.filter((l) => l.state === args.state);
    }

    if (args.minAcreage !== undefined) {
      const minAcreage = args.minAcreage;
      filtered = filtered.filter((l) => l.acreage >= minAcreage);
    }

    if (args.maxAcreage !== undefined) {
      const maxAcreage = args.maxAcreage;
      filtered = filtered.filter((l) => l.acreage <= maxAcreage);
    }

    if (args.maxPrice !== undefined) {
      const maxPrice = args.maxPrice;
      filtered = filtered.filter((l) => {
        // Check both new price field and legacy pricePerYear
        const comparePrice = l.price || l.pricePerYear || 0;
        return comparePrice <= maxPrice;
      });
    }

    if (args.gameType) {
      const gameType = args.gameType;
      filtered = filtered.filter((l) => {
        // Check legacy gameTypes field if it exists
        return l.gameTypes ? l.gameTypes.includes(gameType) : false;
      });
    }

    if (args.leaseTerm) {
      filtered = filtered.filter((l) => l.leaseTerm === args.leaseTerm);
    }

    // Get owner info for each lease
    const leasesWithOwners = await Promise.all(
      filtered.map(async (lease) => {
        const owner = await ctx.db.get(lease.ownerId);
        return {
          ...lease,
          ownerName: owner?.name || "Unknown",
          ownerEmail: owner?.email,
        };
      })
    );

    return leasesWithOwners;
  },
});

// Get a single lease by ID
export const getLeaseById = query({
  args: { leaseId: v.id("landLeases") },
  handler: async (ctx, args) => {
    const lease = await ctx.db.get(args.leaseId);
    if (!lease) {
      throw new ConvexError({
        message: "Lease not found",
        code: "NOT_FOUND",
      });
    }

    const owner = await ctx.db.get(lease.ownerId);

    return {
      ...lease,
      ownerName: owner?.name || "Unknown",
      ownerEmail: owner?.email,
    };
  },
});

// Increment view count for a lease
export const incrementLeaseView = mutation({
  args: { leaseId: v.id("landLeases") },
  handler: async (ctx, args) => {
    const lease = await ctx.db.get(args.leaseId);
    if (!lease) {
      return;
    }

    await ctx.db.patch(args.leaseId, {
      views: lease.views + 1,
    });
  },
});

// Get leases owned by current user
export const getMyLeases = query({
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

    const leases = await ctx.db
      .query("landLeases")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    return leases;
  },
});

// Create a new lease listing
export const createLease = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    acreage: v.number(),
    address: v.optional(v.string()),
    state: v.string(),
    county: v.string(),
    lat: v.number(),
    lng: v.number(),
    pricePerYear: v.number(),
    pricePerSeason: v.optional(v.number()),
    pricePerDay: v.optional(v.number()),
    leaseTerm: v.string(),
    minLeaseDays: v.optional(v.number()),
    availableFrom: v.number(),
    availableTo: v.number(),
    allowedActivities: v.array(v.string()),
    gameTypes: v.array(v.string()),
    maxHunters: v.optional(v.number()),
    amenities: v.array(v.string()),
    terrain: v.optional(v.string()),
    waterSources: v.optional(v.array(v.string())),
    rules: v.optional(v.string()),
    exclusiveAccess: v.boolean(),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
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

    const leaseId = await ctx.db.insert("landLeases", {
      ownerId: user._id,
      title: args.title,
      description: args.description,
      acreage: args.acreage,
      
      // New required fields with defaults for backward compatibility
      country: "United States",
      streetAddress: args.address || "Address not provided",
      city: "Not specified",
      zipCode: "00000",
      landTypes: [],
      availableHunting: [],
      huntingPartySize: args.maxHunters || 1,
      price: args.pricePerYear,
      priceType: "per_year",
      isPriceNegotiable: false,
      
      // Legacy fields
      address: args.address,
      state: args.state,
      county: args.county,
      lat: args.lat,
      lng: args.lng,
      pricePerYear: args.pricePerYear,
      pricePerSeason: args.pricePerSeason,
      pricePerDay: args.pricePerDay,
      leaseTerm: args.leaseTerm,
      minLeaseDays: args.minLeaseDays,
      availableFrom: args.availableFrom,
      availableTo: args.availableTo,
      allowedActivities: args.allowedActivities,
      gameTypes: args.gameTypes,
      maxHunters: args.maxHunters,
      amenities: args.amenities,
      terrain: args.terrain,
      waterSources: args.waterSources,
      rules: args.rules,
      exclusiveAccess: args.exclusiveAccess,
      contactPhone: args.contactPhone,
      contactEmail: args.contactEmail,
      status: "pending",
      views: 0,
      createdAt: now,
      updatedAt: now,
    });

    return leaseId;
  },
});

// Update lease status
export const updateLeaseStatus = mutation({
  args: {
    leaseId: v.id("landLeases"),
    status: v.string(),
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

    const lease = await ctx.db.get(args.leaseId);
    if (!lease) {
      throw new ConvexError({
        message: "Lease not found",
        code: "NOT_FOUND",
      });
    }

    if (lease.ownerId !== user._id) {
      throw new ConvexError({
        message: "Not authorized to update this lease",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.leaseId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// Delete a lease
export const deleteLease = mutation({
  args: { leaseId: v.id("landLeases") },
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

    const lease = await ctx.db.get(args.leaseId);
    if (!lease) {
      throw new ConvexError({
        message: "Lease not found",
        code: "NOT_FOUND",
      });
    }

    if (lease.ownerId !== user._id) {
      throw new ConvexError({
        message: "Not authorized to delete this lease",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.delete(args.leaseId);
  },
});

// Send an inquiry about a lease
export const sendInquiry = mutation({
  args: {
    leaseId: v.id("landLeases"),
    message: v.string(),
    contactInfo: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    numberOfHunters: v.optional(v.number()),
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

    const lease = await ctx.db.get(args.leaseId);
    if (!lease) {
      throw new ConvexError({
        message: "Lease not found",
        code: "NOT_FOUND",
      });
    }

    const inquiryId = await ctx.db.insert("leaseInquiries", {
      leaseId: args.leaseId,
      fromUserId: user._id,
      toUserId: lease.ownerId,
      message: args.message,
      contactInfo: args.contactInfo,
      startDate: args.startDate,
      endDate: args.endDate,
      numberOfHunters: args.numberOfHunters,
      status: "pending",
      createdAt: Date.now(),
    });

    return inquiryId;
  },
});

// Get inquiries for my leases (as owner)
export const getMyInquiries = query({
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

    const inquiries = await ctx.db
      .query("leaseInquiries")
      .withIndex("by_to_user", (q) => q.eq("toUserId", user._id))
      .collect();

    // Get lease and sender info for each inquiry
    const inquiriesWithDetails = await Promise.all(
      inquiries.map(async (inquiry) => {
        const lease = await ctx.db.get(inquiry.leaseId);
        const sender = await ctx.db.get(inquiry.fromUserId);
        return {
          ...inquiry,
          leaseTitle: lease?.title || "Unknown",
          senderName: sender?.name || "Unknown",
          senderEmail: sender?.email,
        };
      })
    );

    return inquiriesWithDetails;
  },
});

// Get inquiries I've sent
export const getMySentInquiries = query({
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

    const inquiries = await ctx.db
      .query("leaseInquiries")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", user._id))
      .collect();

    // Get lease and owner info for each inquiry
    const inquiriesWithDetails = await Promise.all(
      inquiries.map(async (inquiry) => {
        const lease = await ctx.db.get(inquiry.leaseId);
        const owner = await ctx.db.get(inquiry.toUserId);
        return {
          ...inquiry,
          leaseTitle: lease?.title || "Unknown",
          ownerName: owner?.name || "Unknown",
          ownerEmail: owner?.email,
        };
      })
    );

    return inquiriesWithDetails;
  },
});

// Respond to an inquiry
export const respondToInquiry = mutation({
  args: {
    inquiryId: v.id("leaseInquiries"),
    response: v.string(),
    status: v.string(),
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

    const inquiry = await ctx.db.get(args.inquiryId);
    if (!inquiry) {
      throw new ConvexError({
        message: "Inquiry not found",
        code: "NOT_FOUND",
      });
    }

    if (inquiry.toUserId !== user._id) {
      throw new ConvexError({
        message: "Not authorized to respond to this inquiry",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.inquiryId, {
      response: args.response,
      status: args.status,
      respondedAt: Date.now(),
    });
  },
});

// Add sample leases for demo
export const addSampleLeases = mutation({
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

    const now = Date.now();
    const nextYear = now + 365 * 24 * 60 * 60 * 1000;

    // Sample lease 1: Premium deer hunting property
    await ctx.db.insert("landLeases", {
      ownerId: user._id,
      title: "Premium 250-Acre Deer & Turkey Hunting Property",
      description:
        "Exceptional whitetail hunting property with mature hardwoods, food plots, and established stands. Property has been QDM managed for 10+ years with trophy bucks regularly seen. Multiple shooting houses and ladder stands included. Cabin with electricity and running water available for hunters.",
      acreage: 250,
      
      // New required fields
      country: "United States",
      streetAddress: "Near Columbia",
      city: "Columbia",
      zipCode: "65201",
      landTypes: ["forest", "pasture"],
      availableHunting: ["big_game", "upland_bird"],
      huntingPartySize: 4,
      price: 8500,
      priceType: "per_year",
      isPriceNegotiable: false,
      
      // Legacy fields
      address: "Near Columbia, MO",
      state: "Missouri",
      county: "Boone",
      lat: 38.9517,
      lng: -92.3341,
      pricePerYear: 8500,
      pricePerSeason: 3500,
      leaseTerm: "annual",
      availableFrom: now,
      availableTo: nextYear,
      allowedActivities: [
        "deer_hunting",
        "turkey_hunting",
        "small_game",
        "camping",
      ],
      gameTypes: ["deer", "turkey", "rabbit", "squirrel"],
      maxHunters: 4,
      amenities: [
        "cabin",
        "deerstands",
        "food_plots",
        "atv_access",
        "camp_site",
      ],
      terrain: "hardwoods",
      waterSources: ["creek", "pond"],
      rules:
        "QDM practices required. 8-point minimum or 3.5+ years. Turkey season only - no fall harvest. ATVs for hunting access only.",
      exclusiveAccess: true,
      contactPhone: "(555) 123-4567",
      contactEmail: "landowner@example.com",
      status: "approved",
      views: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Sample lease 2: Waterfowl property
    await ctx.db.insert("landLeases", {
      ownerId: user._id,
      title: "150-Acre Prime Waterfowl Wetland",
      description:
        "Flooded timber and open water perfect for duck and goose hunting. Property is located in prime Mississippi Flyway. Includes blind sites and a boat launch. Great for groups.",
      acreage: 150,
      
      // New required fields
      country: "United States",
      streetAddress: "Rural Property Near Helena",
      city: "Helena",
      zipCode: "72342",
      landTypes: ["wetlands", "forest"],
      availableHunting: ["waterfowl"],
      huntingPartySize: 6,
      price: 5000,
      priceType: "per_year",
      isPriceNegotiable: true,
      
      // Legacy fields
      state: "Arkansas",
      county: "Phillips",
      lat: 34.4415,
      lng: -90.5993,
      pricePerYear: 5000,
      pricePerSeason: 2500,
      leaseTerm: "seasonal",
      availableFrom: now,
      availableTo: now + 120 * 24 * 60 * 60 * 1000,
      allowedActivities: ["waterfowl", "fishing"],
      gameTypes: ["duck", "goose"],
      maxHunters: 6,
      amenities: ["blinds", "boat_launch", "parking"],
      terrain: "bottomland",
      waterSources: ["flooded_timber", "ponds"],
      rules:
        "Arkansas state waterfowl regulations apply. Steel shot only. Retrieve all downed birds.",
      exclusiveAccess: false,
      contactPhone: "(555) 987-6543",
      status: "approved",
      views: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Sample lease 3: Affordable small property
    await ctx.db.insert("landLeases", {
      ownerId: user._id,
      title: "Affordable 40-Acre Hunting Lease",
      description:
        "Small property perfect for a solo hunter or father-son team. Mixed terrain with some timber and open fields. Deer, turkey, and small game present.",
      acreage: 40,
      
      // New required fields
      country: "United States",
      streetAddress: "Rural Property Near Jefferson City",
      city: "Jefferson City",
      zipCode: "65109",
      landTypes: ["forest", "pasture"],
      availableHunting: ["big_game", "small_game_furbearer"],
      huntingPartySize: 2,
      price: 1200,
      priceType: "per_year",
      isPriceNegotiable: false,
      
      // Legacy fields
      state: "Missouri",
      county: "Cole",
      lat: 38.5767,
      lng: -92.1735,
      pricePerYear: 1200,
      pricePerDay: 75,
      leaseTerm: "annual",
      availableFrom: now,
      availableTo: nextYear,
      allowedActivities: ["deer_hunting", "turkey_hunting", "small_game"],
      gameTypes: ["deer", "turkey", "rabbit"],
      maxHunters: 2,
      amenities: [],
      terrain: "mixed",
      waterSources: ["creek"],
      rules: "All MO hunting regulations apply. No ATVs.",
      exclusiveAccess: true,
      contactPhone: "(555) 555-1234",
      status: "approved",
      views: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Check if current user has admin permission
export const hasLandReviewPermission = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return false;
    }

    return user.isAdmin && user.adminPermissions?.includes("land_review");
  },
});

// Get pending leases for admin review
export const getPendingLeases = query({
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

    // Check if user has land review permission
    if (!user.isAdmin || !user.adminPermissions?.includes("land_review")) {
      throw new ConvexError({
        message: "Not authorized to review land leases",
        code: "FORBIDDEN",
      });
    }

    const leases = await ctx.db
      .query("landLeases")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Get owner info for each lease
    const leasesWithOwners = await Promise.all(
      leases.map(async (lease) => {
        const owner = await ctx.db.get(lease.ownerId);
        return {
          ...lease,
          ownerName: owner?.name || "Unknown",
          ownerEmail: owner?.email,
        };
      })
    );

    return leasesWithOwners;
  },
});

// Approve or reject a lease (admin only)
export const reviewLease = mutation({
  args: {
    leaseId: v.id("landLeases"),
    action: v.union(v.literal("approve"), v.literal("reject")),
    rejectionReason: v.optional(v.string()),
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

    // Check if user has land review permission
    if (!user.isAdmin || !user.adminPermissions?.includes("land_review")) {
      throw new ConvexError({
        message: "Not authorized to review land leases",
        code: "FORBIDDEN",
      });
    }

    const lease = await ctx.db.get(args.leaseId);
    if (!lease) {
      throw new ConvexError({
        message: "Lease not found",
        code: "NOT_FOUND",
      });
    }

    if (lease.status !== "pending") {
      throw new ConvexError({
        message: "Lease has already been reviewed",
        code: "BAD_REQUEST",
      });
    }

    await ctx.db.patch(args.leaseId, {
      status: args.action === "approve" ? "approved" : "rejected",
      reviewedBy: user._id,
      reviewedAt: Date.now(),
      rejectionReason: args.action === "reject" ? args.rejectionReason : undefined,
      updatedAt: Date.now(),
    });
  },
});

// Grant admin permissions to user (for testing purposes)
export const grantAdminPermission = mutation({
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

    await ctx.db.patch(user._id, {
      isAdmin: true,
      adminPermissions: ["land_review"],
    });
  },
});

// Create a new property listing
export const createListing = mutation({
  args: {
    // Location information
    country: v.string(),
    region: v.optional(v.string()),
    streetAddress: v.string(),
    streetAddressContinued: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    county: v.string(),
    zipCode: v.string(),
    lat: v.number(),
    lng: v.number(),
    
    // Property details
    acreage: v.number(),
    landTypes: v.array(v.string()),
    availableHunting: v.array(v.string()),
    huntingPartySize: v.number(),
    
    // Amenities & description
    amenities: v.array(v.string()),
    description: v.string(),
    
    // Pricing
    price: v.number(),
    priceType: v.string(),
    isPriceNegotiable: v.boolean(),
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

    // Create the listing
    const leaseId = await ctx.db.insert("landLeases", {
      ownerId: user._id,
      
      // Location
      country: args.country,
      region: args.region,
      streetAddress: args.streetAddress,
      streetAddressContinued: args.streetAddressContinued,
      city: args.city,
      state: args.state,
      county: args.county,
      zipCode: args.zipCode,
      lat: args.lat,
      lng: args.lng,
      
      // Property details
      acreage: args.acreage,
      landTypes: args.landTypes,
      description: args.description,
      
      // Hunting details
      availableHunting: args.availableHunting,
      huntingPartySize: args.huntingPartySize,
      
      // Amenities
      amenities: args.amenities,
      
      // Pricing
      price: args.price,
      priceType: args.priceType,
      isPriceNegotiable: args.isPriceNegotiable,
      
      // Status and metadata
      status: "pending", // Requires admin approval
      views: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return leaseId;
  },
});
