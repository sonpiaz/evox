/**
 * AGT-332: Agent Identity System - Stable IDs
 *
 * Provides stable, human-readable agent IDs that survive migrations.
 * Solves case-sensitivity issues (EVOX ≠ evox) and unstable technical IDs.
 *
 * Registry: agt_evox_000, agt_max_001, agt_sam_002, agt_leo_003, agt_quinn_004
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** Canonical agent ID mapping — name (lowercase) → stable ID */
const AGENT_ID_MAP: Record<string, string> = {
  evox: "agt_evox_000",
  max: "agt_max_001",
  sam: "agt_sam_002",
  leo: "agt_leo_003",
  quinn: "agt_quinn_004",
};

/** Reverse lookup — stable ID → canonical name */
const ID_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(AGENT_ID_MAP).map(([name, id]) => [id, name])
);

/**
 * Get agent by stable agentId.
 * Returns full agent document or null.
 */
export const getByAgentId = query({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .first();
    return agent;
  },
});

/**
 * Resolve any agent name/handle to a stable agentId (case-insensitive).
 * Accepts: "EVOX", "evox", "Evox", "@max", "MAX", "agt_sam_002", etc.
 * Returns: { agentId, name, convexId } or null.
 */
export const resolveAgentId = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const input = args.name.toLowerCase().replace(/^@/, "");

    // Direct stable ID lookup
    if (ID_TO_NAME[input]) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_agentId", (q) => q.eq("agentId", input))
        .first();
      return agent
        ? { agentId: input, name: agent.name, convexId: agent._id }
        : { agentId: input, name: ID_TO_NAME[input], convexId: null };
    }

    // Name-based lookup (case-insensitive)
    const agentId = AGENT_ID_MAP[input];
    if (!agentId) {
      return null;
    }

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
      .first();

    // Fallback: try by_name index if agentId not yet migrated
    if (!agent) {
      const byName = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", input))
        .first();
      return byName
        ? { agentId, name: byName.name, convexId: byName._id }
        : { agentId, name: input, convexId: null };
    }

    return { agentId, name: agent.name, convexId: agent._id };
  },
});

/**
 * List all registered agent IDs with their current status.
 */
export const listAll = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    return agents.map((a) => ({
      convexId: a._id,
      agentId: a.agentId ?? AGENT_ID_MAP[a.name.toLowerCase()] ?? null,
      name: a.name,
      role: a.role,
      status: a.status,
      migrated: !!a.agentId,
    }));
  },
});

/**
 * Migration: Assign stable agentIds to all existing agents.
 * Safe to run multiple times (idempotent).
 */
export const initializeAgentIds = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const results: { name: string; agentId: string; action: string }[] = [];

    for (const agent of agents) {
      const nameLower = agent.name.toLowerCase();
      const targetId = AGENT_ID_MAP[nameLower];

      if (!targetId) {
        results.push({
          name: agent.name,
          agentId: "unknown",
          action: "skipped — not in registry",
        });
        continue;
      }

      if (agent.agentId === targetId) {
        results.push({
          name: agent.name,
          agentId: targetId,
          action: "already migrated",
        });
        continue;
      }

      await ctx.db.patch(agent._id, { agentId: targetId });
      results.push({
        name: agent.name,
        agentId: targetId,
        action: "migrated",
      });
    }

    return { migrated: results.filter((r) => r.action === "migrated").length, results };
  },
});
