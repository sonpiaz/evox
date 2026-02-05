import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// AGT-80: Git Activity Tracking
// Store and query git commits per agent

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Log a git commit from GitHub webhook
 */
export const logCommit = mutation({
  args: {
    commitHash: v.string(),
    message: v.string(),
    authorName: v.string(),
    authorUsername: v.optional(v.string()),
    authorEmail: v.optional(v.string()),
    repo: v.string(),
    branch: v.string(),
    url: v.optional(v.string()),
    pushedBy: v.optional(v.string()),
    commitTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Map author to agent name
    const agentName = mapAuthorToAgent(
      args.authorName,
      args.authorUsername,
      args.authorEmail
    );

    // Extract linked ticket from commit message (closes AGT-XXX)
    const ticketMatch = args.message.match(/closes?\s+(AGT-\d+)/i);
    const linkedTicketId = ticketMatch ? ticketMatch[1].toUpperCase() : undefined;

    // Look up task ID if we have a ticket
    let linkedTaskId: Id<"tasks"> | undefined = undefined;
    if (linkedTicketId) {
      const tasks = await ctx.db.query("tasks").collect();
      const task = tasks.find(
        (t) => t.linearIdentifier?.toUpperCase() === linkedTicketId
      );
      if (task) {
        linkedTaskId = task._id;
      }
    }

    // Check if commit already exists (dedup)
    const existing = await ctx.db
      .query("gitActivity")
      .withIndex("by_commit", (q) => q.eq("commitHash", args.commitHash))
      .first();

    if (existing) {
      // Update existing record if needed
      return existing._id;
    }

    // Insert new commit
    const id = await ctx.db.insert("gitActivity", {
      commitHash: args.commitHash,
      shortHash: args.commitHash.slice(0, 7),
      message: args.message,
      timestamp: args.commitTimestamp ?? now,
      authorName: args.authorName,
      authorUsername: args.authorUsername,
      authorEmail: args.authorEmail,
      agentName,
      linkedTaskId,
      linkedTicketId,
      repo: args.repo,
      branch: args.branch,
      url: args.url,
      pushedAt: now,
      pushedBy: args.pushedBy,
    });

    // Log activity event if we have an agent
    if (agentName) {
      const agents = await ctx.db.query("agents").collect();
      const agent = agents.find(
        (a) => a.name.toLowerCase() === agentName.toLowerCase()
      );

      if (agent) {
        await ctx.db.insert("activityEvents", {
          agentId: agent._id,
          agentName: agentName.toLowerCase(),
          category: "git",
          eventType: "commit",
          title: `${agentName.toUpperCase()} pushed commit ${args.commitHash.slice(0, 7)}`,
          description: args.message,
          taskId: linkedTaskId,
          linearIdentifier: linkedTicketId,
          metadata: {
            commitHash: args.commitHash.slice(0, 7),
            branch: args.branch,
            source: "github_webhook",
          },
          timestamp: now,
        });
      }
    }

    return id;
  },
});

/**
 * Batch log multiple commits
 */
export const logCommitBatch = mutation({
  args: {
    commits: v.array(
      v.object({
        commitHash: v.string(),
        message: v.string(),
        authorName: v.string(),
        authorUsername: v.optional(v.string()),
        authorEmail: v.optional(v.string()),
        repo: v.string(),
        branch: v.string(),
        url: v.optional(v.string()),
        pushedBy: v.optional(v.string()),
        commitTimestamp: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids: Id<"gitActivity">[] = [];

    for (const commit of args.commits) {
      const now = Date.now();
      const agentName = mapAuthorToAgent(
        commit.authorName,
        commit.authorUsername,
        commit.authorEmail
      );

      const ticketMatch = commit.message.match(/closes?\s+(AGT-\d+)/i);
      const linkedTicketId = ticketMatch
        ? ticketMatch[1].toUpperCase()
        : undefined;

      // Check for existing
      const existing = await ctx.db
        .query("gitActivity")
        .withIndex("by_commit", (q) => q.eq("commitHash", commit.commitHash))
        .first();

      if (existing) {
        ids.push(existing._id);
        continue;
      }

      const id = await ctx.db.insert("gitActivity", {
        commitHash: commit.commitHash,
        shortHash: commit.commitHash.slice(0, 7),
        message: commit.message,
        timestamp: commit.commitTimestamp ?? now,
        authorName: commit.authorName,
        authorUsername: commit.authorUsername,
        authorEmail: commit.authorEmail,
        agentName,
        linkedTaskId: undefined,
        linkedTicketId,
        repo: commit.repo,
        branch: commit.branch,
        url: commit.url,
        pushedAt: now,
        pushedBy: commit.pushedBy,
      });
      ids.push(id);
    }

    return { inserted: ids.length, ids };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get recent git activity (all agents)
 */
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);

    return await ctx.db
      .query("gitActivity")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get git activity for a specific agent
 */
export const getByAgent = query({
  args: {
    agentName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 100);

    return await ctx.db
      .query("gitActivity")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName.toLowerCase()))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get git activity for a specific task
 */
export const getByTask = query({
  args: {
    taskId: v.id("tasks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 100);

    return await ctx.db
      .query("gitActivity")
      .withIndex("by_task", (q) => q.eq("linkedTaskId", args.taskId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get git activity summary by agent
 */
export const getSummaryByAgent = query({
  args: {
    startTs: v.optional(v.number()),
    endTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startTs = args.startTs ?? Date.now() - 7 * 24 * 60 * 60 * 1000; // Default: last 7 days
    const endTs = args.endTs ?? Date.now();

    const commits = await ctx.db
      .query("gitActivity")
      .withIndex("by_timestamp")
      .collect();

    const filtered = commits.filter(
      (c) => c.pushedAt >= startTs && c.pushedAt <= endTs
    );

    // Group by agent
    const byAgent: Record<
      string,
      {
        agentName: string;
        commitCount: number;
        tasksLinked: number;
        branches: Set<string>;
      }
    > = {};

    for (const commit of filtered) {
      const agent = commit.agentName ?? "unknown";
      if (!byAgent[agent]) {
        byAgent[agent] = {
          agentName: agent,
          commitCount: 0,
          tasksLinked: 0,
          branches: new Set(),
        };
      }
      byAgent[agent].commitCount += 1;
      if (commit.linkedTicketId) {
        byAgent[agent].tasksLinked += 1;
      }
      byAgent[agent].branches.add(commit.branch);
    }

    // Convert to array and serialize branches
    const summary = Object.values(byAgent).map((a) => ({
      agentName: a.agentName,
      commitCount: a.commitCount,
      tasksLinked: a.tasksLinked,
      branchCount: a.branches.size,
    }));

    return {
      startTs,
      endTs,
      totalCommits: filtered.length,
      byAgent: summary.sort((a, b) => b.commitCount - a.commitCount),
    };
  },
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map git author to agent name based on various fields
 */
function mapAuthorToAgent(
  name: string,
  username?: string,
  email?: string
): string | undefined {
  const lower = (s?: string) => s?.toLowerCase() ?? "";

  // Known mappings (add more as needed)
  const mappings: Record<string, string[]> = {
    sam: ["sam", "sonpiaz", "son tung"],
    leo: ["leo", "leonguyen"],
    max: ["max", "maxwells"],
    quinn: ["quinn"],
  };

  // Check username, name, and email against mappings
  for (const [agent, patterns] of Object.entries(mappings)) {
    for (const pattern of patterns) {
      if (
        lower(username).includes(pattern) ||
        lower(name).includes(pattern) ||
        lower(email).includes(pattern)
      ) {
        return agent;
      }
    }
  }

  // Check for Claude-authored commits (co-authored-by)
  if (lower(email).includes("noreply@anthropic.com")) {
    return undefined; // Don't attribute to a specific agent
  }

  return undefined;
}
