/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as activityEvents from "../activityEvents.js";
import type * as agentActions from "../agentActions.js";
import type * as agentMappings from "../agentMappings.js";
import type * as agentMemory from "../agentMemory.js";
import type * as agentMessages from "../agentMessages.js";
import type * as agents from "../agents.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as heartbeat from "../heartbeat.js";
import type * as http from "../http.js";
import type * as linearSync from "../linearSync.js";
import type * as mentions from "../mentions.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as projects from "../projects.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as skills from "../skills.js";
import type * as slackNotify from "../slackNotify.js";
import type * as standup from "../standup.js";
import type * as tasks from "../tasks.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  activityEvents: typeof activityEvents;
  agentActions: typeof agentActions;
  agentMappings: typeof agentMappings;
  agentMemory: typeof agentMemory;
  agentMessages: typeof agentMessages;
  agents: typeof agents;
  crons: typeof crons;
  documents: typeof documents;
  heartbeat: typeof heartbeat;
  http: typeof http;
  linearSync: typeof linearSync;
  mentions: typeof mentions;
  messages: typeof messages;
  notifications: typeof notifications;
  projects: typeof projects;
  seed: typeof seed;
  settings: typeof settings;
  skills: typeof skills;
  slackNotify: typeof slackNotify;
  standup: typeof standup;
  tasks: typeof tasks;
  webhooks: typeof webhooks;
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
