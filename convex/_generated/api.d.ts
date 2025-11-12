/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activeViewers from "../activeViewers.js";
import type * as audit from "../audit.js";
import type * as deerRecovery from "../deerRecovery.js";
import type * as forums from "../forums.js";
import type * as friends from "../friends.js";
import type * as huntingUnits from "../huntingUnits.js";
import type * as hunts from "../hunts.js";
import type * as landLeases from "../landLeases.js";
import type * as locationSharing from "../locationSharing.js";
import type * as profile from "../profile.js";
import type * as properties from "../properties.js";
import type * as roles from "../roles.js";
import type * as scoutingTrips from "../scoutingTrips.js";
import type * as support from "../support.js";
import type * as tracks from "../tracks.js";
import type * as users from "../users.js";
import type * as vehicleRecovery from "../vehicleRecovery.js";
import type * as waypoints from "../waypoints.js";
import type * as weather from "../weather.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activeViewers: typeof activeViewers;
  audit: typeof audit;
  deerRecovery: typeof deerRecovery;
  forums: typeof forums;
  friends: typeof friends;
  huntingUnits: typeof huntingUnits;
  hunts: typeof hunts;
  landLeases: typeof landLeases;
  locationSharing: typeof locationSharing;
  profile: typeof profile;
  properties: typeof properties;
  roles: typeof roles;
  scoutingTrips: typeof scoutingTrips;
  support: typeof support;
  tracks: typeof tracks;
  users: typeof users;
  vehicleRecovery: typeof vehicleRecovery;
  waypoints: typeof waypoints;
  weather: typeof weather;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
