import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    avatar: v.optional(v.string()),
    
    // Profile completion tracking
    profileCompleted: v.optional(v.boolean()),
    
    // Address fields
    country: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    
    // Emergency contacts (optional)
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
    
    // Hunting preferences (multi-select)
    huntingPreferences: v.optional(v.array(v.string())), // deer, elk, turkey, waterfowl, small game, predator
    
    // Weapon types (multi-select)
    weaponTypes: v.optional(v.array(v.string())), // rifle, bow, shotgun, muzzle loader
    
    // Special events interest
    interestedInSpecialEvents: v.optional(v.boolean()),
    
    // Public profile fields
    bio: v.optional(v.string()),
    profilePhotos: v.optional(v.array(v.string())), // Array of photo URLs
    yearsOfExperience: v.optional(v.number()),
    favoriteSpecies: v.optional(v.string()),
    hobbies: v.optional(v.array(v.string())), // Other hobbies beyond hunting
    
    // Member identification
    memberNumber: v.optional(v.string()), // Unique member number (e.g., "M-00001")
    
    // Roles and permissions
    role: v.optional(v.union(v.literal("owner"), v.literal("admin"), v.literal("member"))),
    permissions: v.optional(v.array(v.string())),
    
    // Account status
    accountStatus: v.optional(v.union(v.literal("active"), v.literal("hold"), v.literal("banned"))),
    accountAccessRestricted: v.optional(v.boolean()), // When true, user cannot sign in
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    archivedBy: v.optional(v.id("users")),
    
    // Forum moderation - warning and ban tracking
    forumWarningCount: v.optional(v.number()), // Total warnings received
    forumBanExpiresAt: v.optional(v.number()), // When current ban expires (null = not banned)
    forumBanReason: v.optional(v.string()), // Reason for current ban
    
    // Legacy admin fields (deprecated, use role/permissions instead)
    isAdmin: v.optional(v.boolean()),
    adminPermissions: v.optional(v.array(v.string())),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_admin", ["isAdmin"])
    .index("by_username", ["username"])
    .index("by_phone", ["phoneNumber"]),

  adminNotes: defineTable({
    userId: v.id("users"), // The user the note is about
    authorId: v.id("users"), // The admin who wrote the note
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_author", ["authorId"])
    .index("by_user_created", ["userId", "createdAt"]),

  callLogs: defineTable({
    userId: v.id("users"), // The member the call is about
    authorId: v.id("users"), // The admin who logged the call
    callType: v.union(v.literal("inbound"), v.literal("outbound")),
    duration: v.optional(v.number()), // Duration in minutes
    notes: v.string(),
    phoneNumber: v.optional(v.string()),
    callDate: v.number(), // When the call occurred
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_author", ["authorId"])
    .index("by_user_call_date", ["userId", "callDate"]),

  memberFiles: defineTable({
    userId: v.id("users"), // The member the file belongs to
    uploadedBy: v.id("users"), // Who uploaded it (could be member or admin)
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(), // mime type
    storageId: v.id("_storage"),
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_uploaded_by", ["uploadedBy"])
    .index("by_user_created", ["userId", "createdAt"]),

  auditLogs: defineTable({
    userId: v.id("users"), // User who performed the action
    action: v.string(), // Description of the action (e.g., "Updated profile", "Created hunt")
    entityType: v.string(), // Type of entity affected (e.g., "profile", "hunt", "friend")
    entityId: v.optional(v.string()), // ID of the affected entity
    changes: v.optional(v.string()), // JSON string of changes made
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user_timestamp", ["userId", "timestamp"]),

  properties: defineTable({
    // Property identification
    parcelId: v.string(),
    address: v.optional(v.string()),
    county: v.string(),
    state: v.string(),
    
    // Ownership info
    ownerName: v.string(),
    ownerAddress: v.optional(v.string()),
    ownerPhone: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    
    // Property details
    acreage: v.number(),
    propertyType: v.string(), // "public", "private", "state", "federal"
    landUse: v.optional(v.string()),
    
    // Boundary data (GeoJSON polygon coordinates)
    boundaries: v.object({
      type: v.literal("Polygon"),
      coordinates: v.array(v.array(v.array(v.number()))),
    }),
    
    // Center point for quick map queries
    centerLat: v.number(),
    centerLng: v.number(),
    
    // Metadata
    verified: v.boolean(),
    lastUpdated: v.optional(v.number()),
  })
    .index("by_parcel", ["parcelId"])
    .index("by_location", ["state", "county"])
    .index("by_owner", ["ownerName"])
    .index("by_type", ["propertyType"]),

  huntingUnits: defineTable({
    unitId: v.string(),
    name: v.string(),
    type: v.string(), // "WMA", "National Forest", "State Park", etc.
    state: v.string(),
    description: v.optional(v.string()),
    regulations: v.optional(v.string()),
    
    // Boundary data
    boundaries: v.object({
      type: v.literal("Polygon"),
      coordinates: v.array(v.array(v.array(v.number()))),
    }),
    
    centerLat: v.number(),
    centerLng: v.number(),
    
    // Hunting info
    allowsHunting: v.boolean(),
    seasonDates: v.optional(v.string()),
    permitRequired: v.boolean(),
  })
    .index("by_unit", ["unitId"])
    .index("by_state", ["state"])
    .index("by_type", ["type"]),

  tracks: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    
    // Track statistics
    distance: v.number(), // in meters
    duration: v.number(), // in seconds
    elevationGain: v.optional(v.number()),
    elevationLoss: v.optional(v.number()),
    averageSpeed: v.optional(v.number()),
    maxSpeed: v.optional(v.number()),
    
    // Track data (array of coordinates)
    coordinates: v.array(
      v.object({
        lat: v.number(),
        lng: v.number(),
        timestamp: v.number(),
        altitude: v.optional(v.number()),
        accuracy: v.optional(v.number()),
      })
    ),
    
    // Timestamps
    startTime: v.number(),
    endTime: v.number(),
    
    // Status
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_start_time", ["startTime"]),

  waypoints: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    
    // Location
    lat: v.number(),
    lng: v.number(),
    altitude: v.optional(v.number()),
    
    // Category/Type
    type: v.string(), // "stand", "blind", "camera", "marker", "parking", "camp", etc.
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    
    // Optional associations
    trackId: v.optional(v.id("tracks")),
    photos: v.optional(v.array(v.string())),
    
    // Timestamps
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_track", ["trackId"]),

  friendRequests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    status: v.string(), // "pending", "accepted", "rejected"
    message: v.optional(v.string()),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_from_user", ["fromUserId"])
    .index("by_to_user", ["toUserId"])
    .index("by_status", ["status"])
    .index("by_to_user_status", ["toUserId", "status"]),

  friendships: defineTable({
    user1Id: v.id("users"),
    user2Id: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user1", ["user1Id"])
    .index("by_user2", ["user2Id"]),

  locationShares: defineTable({
    userId: v.id("users"),
    lat: v.number(),
    lng: v.number(),
    accuracy: v.optional(v.number()),
    heading: v.optional(v.number()),
    speed: v.optional(v.number()),
    altitude: v.optional(v.number()),
    
    // Sharing settings
    isActive: v.boolean(),
    shareWith: v.string(), // "all_friends", "selected_friends", "none"
    selectedFriends: v.optional(v.array(v.id("users"))),
    
    // Timestamps
    lastUpdated: v.number(),
    expiresAt: v.optional(v.number()), // optional auto-expire time
  })
    .index("by_user", ["userId"])
    .index("by_active", ["isActive"]),

  scoutingTrips: defineTable({
    creatorId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    
    // Location details
    locationName: v.string(),
    lat: v.number(),
    lng: v.number(),
    state: v.optional(v.string()),
    
    // Trip details
    activityType: v.string(), // "scouting", "hunting", "camping", "hiking"
    gameType: v.optional(v.string()), // "deer", "turkey", "elk", "waterfowl", etc.
    startDate: v.number(),
    endDate: v.number(),
    
    // Privacy and limits
    privacy: v.string(), // "public", "friends_only", "private"
    maxParticipants: v.optional(v.number()),
    
    // Status
    status: v.string(), // "upcoming", "in_progress", "completed", "cancelled"
    
    // Timestamps
    createdAt: v.number(),
  })
    .index("by_creator", ["creatorId"])
    .index("by_status", ["status"])
    .index("by_start_date", ["startDate"])
    .index("by_activity", ["activityType"])
    .index("by_privacy", ["privacy"]),

  scoutingTripParticipants: defineTable({
    tripId: v.id("scoutingTrips"),
    userId: v.id("users"),
    status: v.string(), // "invited", "joined", "declined", "removed"
    role: v.string(), // "creator", "participant"
    joinedAt: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_user", ["userId"])
    .index("by_trip_status", ["tripId", "status"])
    .index("by_user_status", ["userId", "status"]),

  landLeases: defineTable({
    ownerId: v.id("users"),
    propertyId: v.optional(v.id("properties")), // optional link to properties table
    
    // Property details
    title: v.optional(v.string()),
    description: v.string(),
    acreage: v.number(),
    
    // Address details
    country: v.string(),
    region: v.optional(v.string()),
    streetAddress: v.string(),
    streetAddressContinued: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    county: v.string(),
    zipCode: v.string(),
    address: v.optional(v.string()), // legacy field
    
    // Location
    lat: v.number(),
    lng: v.number(),
    boundaries: v.optional(v.object({
      type: v.literal("Polygon"),
      coordinates: v.array(v.array(v.array(v.number()))),
    })),
    
    // Land types
    landTypes: v.array(v.string()), // "pasture", "cropland", "forest", "wetlands", "rivers_streams", "coastal", "desert", "mountains"
    
    // Lease terms and pricing
    price: v.number(),
    priceType: v.string(), // "per_year", "per_day", "per_week", "per_month", "per_season", "per_person"
    isPriceNegotiable: v.boolean(),
    
    // Legacy pricing fields (for backward compatibility)
    pricePerYear: v.optional(v.number()),
    pricePerSeason: v.optional(v.number()),
    pricePerDay: v.optional(v.number()),
    leaseTerm: v.optional(v.string()), // "annual", "seasonal", "daily"
    minLeaseDays: v.optional(v.number()),
    
    // Dates
    availableFrom: v.optional(v.number()),
    availableTo: v.optional(v.number()),
    
    // Hunting details
    availableHunting: v.array(v.string()), // "big_game", "lease_game", "small_game_furbearer", "trapping", "upland_bird", "waterfowl"
    huntingPartySize: v.number(), // Number of hunters allowed
    
    // Legacy hunting fields (for backward compatibility)
    allowedActivities: v.optional(v.array(v.string())),
    gameTypes: v.optional(v.array(v.string())),
    maxHunters: v.optional(v.number()),
    
    // Amenities and features
    amenities: v.array(v.string()), // "cabin", "deerstands", "duck_blinds", "camp_site", "electricity_hookup", "pond", "food_plots", "atv_access"
    terrain: v.optional(v.string()), // "hardwoods", "pines", "mixed", "open_fields", "bottomland"
    waterSources: v.optional(v.array(v.string())), // "pond", "creek", "river", "lake"
    
    // Rules and restrictions
    rules: v.optional(v.string()),
    exclusiveAccess: v.optional(v.boolean()), // true = only one lease at a time
    
    // Contact
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    
    // Images
    photos: v.optional(v.array(v.string())),
    
    // Status and metadata
    status: v.string(), // "pending", "approved", "rejected", "leased", "inactive"
    views: v.number(),
    
    // Approval info
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_state", ["state"])
    .index("by_state_status", ["state", "status"])
    .index("by_price", ["price"])
    .index("by_acreage", ["acreage"]),

  leaseInquiries: defineTable({
    leaseId: v.id("landLeases"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"), // lease owner
    
    message: v.string(),
    contactInfo: v.optional(v.string()),
    
    // Inquiry details
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    numberOfHunters: v.optional(v.number()),
    
    status: v.string(), // "pending", "responded", "accepted", "declined"
    
    response: v.optional(v.string()),
    respondedAt: v.optional(v.number()),
    
    createdAt: v.number(),
  })
    .index("by_lease", ["leaseId"])
    .index("by_from_user", ["fromUserId"])
    .index("by_to_user", ["toUserId"])
    .index("by_status", ["status"])
    .index("by_to_user_status", ["toUserId", "status"]),

  hunts: defineTable({
    userId: v.id("users"),
    
    // Basic hunt info
    title: v.string(),
    date: v.number(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    
    // Location
    locationName: v.string(),
    lat: v.number(),
    lng: v.number(),
    state: v.optional(v.string()),
    
    // Hunt details
    species: v.string(), // "deer", "turkey", "elk", "duck", "goose", "rabbit", etc.
    method: v.optional(v.string()), // "rifle", "bow", "shotgun", "muzzleloader"
    weather: v.optional(v.string()),
    temperature: v.optional(v.number()),
    windSpeed: v.optional(v.number()),
    windDirection: v.optional(v.string()),
    
    // Hunt results
    status: v.string(), // "active", "completed", "unsuccessful"
    successful: v.boolean(),
    harvested: v.optional(v.number()), // number of animals harvested
    
    // Harvest details (if successful)
    harvestDetails: v.optional(v.array(v.object({
      species: v.string(),
      sex: v.optional(v.string()), // "male", "female", "unknown"
      age: v.optional(v.string()), // "juvenile", "adult", "mature"
      weight: v.optional(v.number()),
      points: v.optional(v.number()), // for antlered game
      time: v.number(),
      notes: v.optional(v.string()),
    }))),
    
    // Photos
    photos: v.optional(v.array(v.string())),
    
    // Notes and observations
    notes: v.optional(v.string()),
    wildlifeSeen: v.optional(v.array(v.string())),
    
    // Linked data
    trackId: v.optional(v.id("tracks")),
    propertyId: v.optional(v.id("properties")),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_date", ["date"])
    .index("by_user_date", ["userId", "date"])
    .index("by_species", ["species"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  forumPosts: defineTable({
    authorId: v.id("users"),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()), // "general", "tips", "stories", "gear", "spots"
    
    // Engagement
    likeCount: v.number(),
    commentCount: v.number(),
    viewCount: v.number(),
    
    // Images
    images: v.optional(v.array(v.string())),
    
    // Status
    isActive: v.boolean(),
    
    // Moderation fields
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("hidden"))),
    isLocked: v.optional(v.boolean()), // Locked posts cannot be deleted by creator
    rejectionReason: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    
    // Warning tracking
    hasWarning: v.optional(v.boolean()), // If this post received a warning
    warningIssuedBy: v.optional(v.id("users")), // Admin who issued warning
    warningIssuedAt: v.optional(v.number()), // When warning was issued
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_category", ["category"])
    .index("by_created", ["createdAt"])
    .index("by_active", ["isActive"])
    .index("by_status", ["status"]),

  forumComments: defineTable({
    postId: v.id("forumPosts"),
    authorId: v.id("users"),
    content: v.string(),
    
    // Engagement
    likeCount: v.number(),
    
    // Parent comment for nested replies
    parentCommentId: v.optional(v.id("forumComments")),
    
    // Warning tracking
    hasWarning: v.optional(v.boolean()), // If this comment received a warning
    warningIssuedBy: v.optional(v.id("users")), // Admin who issued warning
    warningIssuedAt: v.optional(v.number()), // When warning was issued
    
    // Timestamps
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentCommentId"])
    .index("by_post_created", ["postId", "createdAt"]),

  forumLikes: defineTable({
    userId: v.id("users"),
    postId: v.optional(v.id("forumPosts")),
    commentId: v.optional(v.id("forumComments")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_post", ["postId"])
    .index("by_comment", ["commentId"])
    .index("by_user_post", ["userId", "postId"])
    .index("by_user_comment", ["userId", "commentId"]),

  vehicleRecoveryRequests: defineTable({
    userId: v.id("users"),
    
    // Request details
    serviceNeeded: v.string(),
    description: v.optional(v.string()),
    phoneNumber: v.string(),
    
    // Location
    lat: v.number(),
    lng: v.number(),
    locationName: v.optional(v.string()),
    
    // Images
    photos: v.optional(v.array(v.string())),
    
    // Status
    status: v.string(), // "active", "resolved", "cancelled"
    requestStatus: v.optional(v.string()), // "still_waiting", "in_progress" - member's update
    
    // Engagement
    commentCount: v.number(),
    
    // Follow-up tracking
    lastFollowUpAt: v.optional(v.number()), // When last follow-up was sent
    nextFollowUpAt: v.optional(v.number()), // When next follow-up should be sent
    
    // Close tracking
    closedAt: v.optional(v.number()),
    closedBy: v.optional(v.id("users")),
    reopenedAt: v.optional(v.number()),
    reopenedBy: v.optional(v.id("users")),
    
    // Timestamps
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_location", ["lat", "lng"])
    .index("by_next_followup", ["nextFollowUpAt"]),

  vehicleRecoveryComments: defineTable({
    requestId: v.id("vehicleRecoveryRequests"),
    userId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_user", ["userId"])
    .index("by_request_created", ["requestId", "createdAt"]),

  deerRecoveryRequests: defineTable({
    userId: v.id("users"),
    
    // Request details
    notes: v.string(), // What do they need help with
    phoneNumber: v.string(),
    
    // Location
    lat: v.number(),
    lng: v.number(),
    locationName: v.optional(v.string()),
    
    // Deer details
    shotPlacement: v.optional(v.string()), // "quartered_away", "quartering_to", "broadside"
    yardsFromHit: v.optional(v.string()), // How many yards walked from hit site
    
    // Photos of blood trail
    photos: v.optional(v.array(v.string())),
    
    // Status
    status: v.string(), // "active", "resolved", "cancelled"
    requestStatus: v.optional(v.string()), // "still_waiting", "in_progress" - member's update
    
    // Engagement
    commentCount: v.number(),
    
    // Follow-up tracking
    lastFollowUpAt: v.optional(v.number()), // When last follow-up was sent
    nextFollowUpAt: v.optional(v.number()), // When next follow-up should be sent
    
    // Close tracking
    closedAt: v.optional(v.number()),
    closedBy: v.optional(v.id("users")),
    reopenedAt: v.optional(v.number()),
    reopenedBy: v.optional(v.id("users")),
    
    // Timestamps
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_location", ["lat", "lng"])
    .index("by_next_followup", ["nextFollowUpAt"]),

  deerRecoveryComments: defineTable({
    requestId: v.id("deerRecoveryRequests"),
    userId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_user", ["userId"])
    .index("by_request_created", ["requestId", "createdAt"]),

  forumReports: defineTable({
    postId: v.id("forumPosts"),
    reporterId: v.id("users"),
    reason: v.union(
      v.literal("spam"),
      v.literal("hate_speech"),
      v.literal("violence"),
      v.literal("harassment")
    ),
    description: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("dismissed")),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_reporter", ["reporterId"])
    .index("by_status", ["status"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(), // "post_approved", "post_rejected", etc.
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()), // ID of related entity (post, etc.)
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_created", ["createdAt"]),

  supportTickets: defineTable({
    userId: v.id("users"),
    subject: v.string(),
    message: v.string(),
    category: v.string(), // "technical", "account", "billing", "other"
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed")),
    priority: v.optional(v.string()), // "low", "medium", "high"
    
    // Admin response
    adminResponse: v.optional(v.string()),
    respondedBy: v.optional(v.id("users")),
    respondedAt: v.optional(v.number()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_user_status", ["userId", "status"]),

  // Ticket replies for ongoing communication
  ticketReplies: defineTable({
    ticketId: v.id("supportTickets"),
    userId: v.id("users"), // Who sent the reply (admin or member)
    message: v.string(),
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      fileName: v.string(),
      fileSize: v.number(),
    }))),
    isAdminReply: v.boolean(), // true if from admin, false if from member
    createdAt: v.number(),
  })
    .index("by_ticket", ["ticketId"])
    .index("by_user", ["userId"])
    .index("by_ticket_created", ["ticketId", "createdAt"]),

  // Track active viewers/editors for real-time collaboration
  activeViewers: defineTable({
    entityType: v.string(), // "supportTicket", "forumPost", etc.
    entityId: v.string(), // ID of the item being viewed
    userId: v.id("users"),
    lastActiveAt: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user", ["userId"])
    .index("by_entity_user", ["entityType", "entityId", "userId"])
    .index("by_last_active", ["lastActiveAt"]),
});
