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
import type * as activityLogs from "../activityLogs.js";
import type * as agentActions from "../agentActions.js";
import type * as agentEvents from "../agentEvents.js";
import type * as agentMappings from "../agentMappings.js";
import type * as agentMemory from "../agentMemory.js";
import type * as agentMesh from "../agentMesh.js";
import type * as agentMessages from "../agentMessages.js";
import type * as agentMessaging from "../agentMessaging.js";
import type * as agentTemplates from "../agentTemplates.js";
import type * as agents from "../agents.js";
import type * as alerts from "../alerts.js";
import type * as approval from "../approval.js";
import type * as automation from "../automation.js";
import type * as automationMetrics from "../automationMetrics.js";
import type * as costs from "../costs.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as debates from "../debates.js";
import type * as dispatches from "../dispatches.js";
import type * as documents from "../documents.js";
import type * as execution from "../execution.js";
import type * as execution_context from "../execution/context.js";
import type * as execution_engine from "../execution/engine.js";
import type * as execution_github from "../execution/github.js";
import type * as execution_mutations from "../execution/mutations.js";
import type * as execution_queries from "../execution/queries.js";
import type * as execution_tools from "../execution/tools.js";
import type * as healthMonitor from "../healthMonitor.js";
import type * as heartbeat from "../heartbeat.js";
import type * as http from "../http.js";
import type * as learnings from "../learnings.js";
import type * as linearSync from "../linearSync.js";
import type * as maxMonitor from "../maxMonitor.js";
import type * as mentions from "../mentions.js";
import type * as messages from "../messages.js";
import type * as messaging from "../messaging.js";
import type * as notifications from "../notifications.js";
import type * as parallelWorkers from "../parallelWorkers.js";
import type * as performanceMetrics from "../performanceMetrics.js";
import type * as projects from "../projects.js";
import type * as qa from "../qa.js";
import type * as quinnBrowser from "../quinnBrowser.js";
import type * as rateLimit from "../rateLimit.js";
import type * as recovery from "../recovery.js";
import type * as scheduler from "../scheduler.js";
import type * as scratchNotes from "../scratchNotes.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as skills from "../skills.js";
import type * as slackNotify from "../slackNotify.js";
import type * as standup from "../standup.js";
import type * as system from "../system.js";
import type * as taskComments from "../taskComments.js";
import type * as taskSplitting from "../taskSplitting.js";
import type * as taskSplittingMutations from "../taskSplittingMutations.js";
import type * as taskSplittingQueries from "../taskSplittingQueries.js";
import type * as tasks from "../tasks.js";
import type * as visionProgress from "../visionProgress.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  activityEvents: typeof activityEvents;
  activityLogs: typeof activityLogs;
  agentActions: typeof agentActions;
  agentEvents: typeof agentEvents;
  agentMappings: typeof agentMappings;
  agentMemory: typeof agentMemory;
  agentMesh: typeof agentMesh;
  agentMessages: typeof agentMessages;
  agentMessaging: typeof agentMessaging;
  agentTemplates: typeof agentTemplates;
  agents: typeof agents;
  alerts: typeof alerts;
  approval: typeof approval;
  automation: typeof automation;
  automationMetrics: typeof automationMetrics;
  costs: typeof costs;
  crons: typeof crons;
  dashboard: typeof dashboard;
  debates: typeof debates;
  dispatches: typeof dispatches;
  documents: typeof documents;
  execution: typeof execution;
  "execution/context": typeof execution_context;
  "execution/engine": typeof execution_engine;
  "execution/github": typeof execution_github;
  "execution/mutations": typeof execution_mutations;
  "execution/queries": typeof execution_queries;
  "execution/tools": typeof execution_tools;
  healthMonitor: typeof healthMonitor;
  heartbeat: typeof heartbeat;
  http: typeof http;
  learnings: typeof learnings;
  linearSync: typeof linearSync;
  maxMonitor: typeof maxMonitor;
  mentions: typeof mentions;
  messages: typeof messages;
  messaging: typeof messaging;
  notifications: typeof notifications;
  parallelWorkers: typeof parallelWorkers;
  performanceMetrics: typeof performanceMetrics;
  projects: typeof projects;
  qa: typeof qa;
  quinnBrowser: typeof quinnBrowser;
  rateLimit: typeof rateLimit;
  recovery: typeof recovery;
  scheduler: typeof scheduler;
  scratchNotes: typeof scratchNotes;
  seed: typeof seed;
  settings: typeof settings;
  skills: typeof skills;
  slackNotify: typeof slackNotify;
  standup: typeof standup;
  system: typeof system;
  taskComments: typeof taskComments;
  taskSplitting: typeof taskSplitting;
  taskSplittingMutations: typeof taskSplittingMutations;
  taskSplittingQueries: typeof taskSplittingQueries;
  tasks: typeof tasks;
  visionProgress: typeof visionProgress;
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
