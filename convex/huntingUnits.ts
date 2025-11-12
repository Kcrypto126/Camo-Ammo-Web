import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

export const getHuntingUnitsInBounds = query({
  args: {
    minLat: v.number(),
    maxLat: v.number(),
    minLng: v.number(),
    maxLng: v.number(),
  },
  handler: async (ctx, args) => {
    const allUnits = await ctx.db.query("huntingUnits").collect();
    
    return allUnits.filter(
      (unit) =>
        unit.centerLat >= args.minLat &&
        unit.centerLat <= args.maxLat &&
        unit.centerLng >= args.minLng &&
        unit.centerLng <= args.maxLng
    );
  },
});

export const getHuntingUnitsByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("huntingUnits")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .collect();
  },
});

export const getHuntingUnitsByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("huntingUnits")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
  },
});

export const getHuntingUnitById = query({
  args: { id: v.id("huntingUnits") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const searchHuntingUnits = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const allUnits = await ctx.db.query("huntingUnits").collect();
    const searchLower = args.searchTerm.toLowerCase();
    
    return allUnits.filter(
      (unit) =>
        unit.name.toLowerCase().includes(searchLower) ||
        unit.unitId.toLowerCase().includes(searchLower) ||
        unit.state.toLowerCase().includes(searchLower)
    );
  },
});

export const addSampleWMA = mutation({
  args: {},
  handler: async (ctx) => {
    // Sample WMA in Missouri
    await ctx.db.insert("huntingUnits", {
      unitId: "MO-WMA-001",
      name: "Eagle Bluffs Conservation Area",
      type: "WMA",
      state: "Missouri",
      description: "7,000-acre wetland complex along the Missouri River. Excellent waterfowl hunting and deer hunting opportunities.",
      regulations: "Hunting permitted in season with proper licenses. Waterfowl hunting by permit only in designated areas.",
      boundaries: {
        type: "Polygon",
        coordinates: [
          [
            [-92.32, 38.88],
            [-92.32, 38.92],
            [-92.26, 38.92],
            [-92.26, 38.88],
            [-92.32, 38.88],
          ],
        ],
      },
      centerLat: 38.9,
      centerLng: -92.29,
      allowsHunting: true,
      seasonDates: "Deer: Nov-Jan, Waterfowl: Oct-Jan, Turkey: Apr-May",
      permitRequired: true,
    });

    // Sample National Forest
    await ctx.db.insert("huntingUnits", {
      unitId: "MO-NF-001",
      name: "Mark Twain National Forest - Rolla District",
      type: "National Forest",
      state: "Missouri",
      description: "Part of the 1.5 million acre Mark Twain National Forest. Excellent deer and turkey hunting.",
      regulations: "Open to hunting in season with state hunting license. Federal lands permit not required.",
      boundaries: {
        type: "Polygon",
        coordinates: [
          [
            [-92.0, 37.9],
            [-92.0, 38.0],
            [-91.8, 38.0],
            [-91.8, 37.9],
            [-92.0, 37.9],
          ],
        ],
      },
      centerLat: 37.95,
      centerLng: -91.9,
      allowsHunting: true,
      seasonDates: "Deer: Nov-Jan, Turkey: Apr-May, Small Game: Year-round",
      permitRequired: false,
    });

    // Sample State Park (limited hunting)
    await ctx.db.insert("huntingUnits", {
      unitId: "MO-SP-001",
      name: "Knob Noster State Park",
      type: "State Park",
      state: "Missouri",
      description: "3,934-acre park with limited hunting opportunities in designated areas only.",
      regulations: "Hunting only permitted in designated hunting areas. Must check in at park office.",
      boundaries: {
        type: "Polygon",
        coordinates: [
          [
            [-93.6, 38.75],
            [-93.6, 38.78],
            [-93.55, 38.78],
            [-93.55, 38.75],
            [-93.6, 38.75],
          ],
        ],
      },
      centerLat: 38.765,
      centerLng: -93.575,
      allowsHunting: true,
      seasonDates: "Deer: Nov-Dec only",
      permitRequired: true,
    });

    return { success: true };
  },
});
