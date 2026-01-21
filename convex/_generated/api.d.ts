/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_eurostat from "../actions/eurostat.js";
import type * as actions_fetchAllData from "../actions/fetchAllData.js";
import type * as actions_openmeteo from "../actions/openmeteo.js";
import type * as actions_overpass from "../actions/overpass.js";
import type * as actions_seedCities from "../actions/seedCities.js";
import type * as actions_wikipedia from "../actions/wikipedia.js";
import type * as cities from "../cities.js";
import type * as mutations from "../mutations.js";
import type * as scoring from "../scoring.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/eurostat": typeof actions_eurostat;
  "actions/fetchAllData": typeof actions_fetchAllData;
  "actions/openmeteo": typeof actions_openmeteo;
  "actions/overpass": typeof actions_overpass;
  "actions/seedCities": typeof actions_seedCities;
  "actions/wikipedia": typeof actions_wikipedia;
  cities: typeof cities;
  mutations: typeof mutations;
  scoring: typeof scoring;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
