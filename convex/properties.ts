import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getPropertiesInBounds = query({
  args: {
    minLat: v.number(),
    maxLat: v.number(),
    minLng: v.number(),
    maxLng: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all properties (in production, you'd use spatial indexing)
    const allProperties = await ctx.db.query("properties").collect();
    
    // Filter by bounds
    return allProperties.filter(
      (prop) =>
        prop.centerLat >= args.minLat &&
        prop.centerLat <= args.maxLat &&
        prop.centerLng >= args.minLng &&
        prop.centerLng <= args.maxLng
    );
  },
});

export const getPropertyById = query({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const searchPropertiesByOwner = query({
  args: { ownerName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerName", args.ownerName))
      .collect();
  },
});

export const getPropertiesByType = query({
  args: { propertyType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("properties")
      .withIndex("by_type", (q) => q.eq("propertyType", args.propertyType))
      .collect();
  },
});

export const addSampleProperty = mutation({
  args: {},
  handler: async (ctx) => {
    // Sample property in central US for demo
    await ctx.db.insert("properties", {
      parcelId: "DEMO-001",
      address: "Rural Route 1, Example County",
      county: "Example County",
      state: "Missouri",
      ownerName: "John Smith",
      ownerAddress: "123 Main St, Springfield, MO",
      ownerPhone: "(555) 123-4567",
      ownerEmail: "john.smith@example.com",
      acreage: 150,
      propertyType: "private",
      landUse: "Agricultural",
      boundaries: {
        type: "Polygon",
        coordinates: [
          [
            [-92.5, 38.5],
            [-92.5, 38.52],
            [-92.48, 38.52],
            [-92.48, 38.5],
            [-92.5, 38.5],
          ],
        ],
      },
      centerLat: 38.51,
      centerLng: -92.49,
      verified: true,
      lastUpdated: Date.now(),
    });

    // Sample public land
    await ctx.db.insert("properties", {
      parcelId: "PUBLIC-001",
      address: "State Forest",
      county: "Example County",
      state: "Missouri",
      ownerName: "State of Missouri",
      ownerAddress: "Department of Conservation",
      acreage: 2500,
      propertyType: "public",
      landUse: "Forest",
      boundaries: {
        type: "Polygon",
        coordinates: [
          [
            [-92.55, 38.48],
            [-92.55, 38.53],
            [-92.50, 38.53],
            [-92.50, 38.48],
            [-92.55, 38.48],
          ],
        ],
      },
      centerLat: 38.505,
      centerLng: -92.525,
      verified: true,
      lastUpdated: Date.now(),
    });

    return { success: true };
  },
});
