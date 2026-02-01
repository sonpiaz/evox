"use node";

import { v } from "convex/values";
import { action, mutation, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { LinearClient } from "@linear/sdk";

const EVOX_PROJECT_ID = "d5bf6ea1-9dcb-4fa7-96e8-66fa03746cfe";

/**
 * Map Linear status to EVOX task status
 */
function mapLinearStatus(
  linearStatus: string
): "backlog" | "todo" | "in_progress" | "review" | "done" {
  const statusLower = linearStatus.toLowerCase();

  if (statusLower.includes("backlog")) return "backlog";
  if (statusLower.includes("todo")) return "todo";
  if (statusLower.includes("in progress") || statusLower.includes("started")) {
    return "in_progress";
  }
  if (statusLower.includes("done") || statusLower.includes("completed")) {
    return "done";
  }
  if (statusLower.includes("review")) return "review";

  return "todo";
}

/**
 * Map Linear priority (1-4) to EVOX priority
 */
function mapLinearPriority(
  linearPriority: number
): "low" | "medium" | "high" | "urgent" {
  switch (linearPriority) {
    case 1:
      return "urgent";
    case 2:
      return "high";
    case 3:
      return "medium";
    case 4:
      return "low";
    default:
      return "medium";
  }
}

/**
 * Fetch Linear issues for EVOX project
 */
async function fetchLinearIssues(apiKey: string) {
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is required");
  }

  const client = new LinearClient({ apiKey });

  const issues = await client.issues({
    filter: {
      project: { id: { eq: EVOX_PROJECT_ID } },
    },
    includeArchived: false,
  });

  const issueNodes = await issues.nodes;

  const mappedIssues = await Promise.all(
    issueNodes.map(async (issue) => {
      const state = await issue.state;
      const assignee = await issue.assignee;
      const project = await issue.project;

      return {
        linearId: issue.id,
        linearIdentifier: issue.identifier,
        linearUrl: issue.url,
        title: issue.title,
        description: issue.description || "",
        status: mapLinearStatus(state?.name || "Todo"),
        priority: mapLinearPriority(issue.priority || 3),
        assigneeName: assignee?.name || null,
        projectName: project?.name || null,
        createdAt: new Date(issue.createdAt).getTime(),
        updatedAt: new Date(issue.updatedAt).getTime(),
      };
    })
  );

  return mappedIssues;
}

/**
 * Sync tasks from Linear to Convex
 * Fetches issues from Linear EVOX project and upserts them
 */
export const syncFromLinear = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; total: number; created: number; updated: number; message: string }> => {
    const apiKey = process.env.LINEAR_API_KEY;

    if (!apiKey) {
      throw new Error(
        "LINEAR_API_KEY not found in environment variables. Please set it in .env.local"
      );
    }

    try {
      // Fetch issues from Linear
      const linearIssues = await fetchLinearIssues(apiKey);

      console.log(`Fetched ${linearIssues.length} issues from Linear`);

      // Get all agents for matching assignees and finding system agent
      const agents = await ctx.runQuery(api.agents.list);
      const systemAgent = agents.find((a) => a.role === "pm");

      if (!systemAgent) {
        throw new Error("No system agent (PM) found. Run seed first.");
      }

      // Get EVOX project
      const projects = await ctx.runQuery(api.projects.list);
      const evoxProject = projects.find((p) => p.name === "EVOX");

      if (!evoxProject) {
        throw new Error("EVOX project not found. Run seed first.");
      }

      // Upsert each task
      const results = await Promise.all(
        linearIssues.map(async (issue) => {
          // Try to match assignee by name
          let assigneeId: Id<"agents"> | undefined = undefined;
          if (issue.assigneeName) {
            const matchedAgent = agents.find(
              (a) => a.name.toLowerCase() === issue.assigneeName?.toLowerCase()
            );
            assigneeId = matchedAgent?._id;
          }

          return await ctx.runMutation(api.tasks.upsertByLinearId, {
            projectId: evoxProject._id,
            linearId: issue.linearId,
            linearIdentifier: issue.linearIdentifier,
            linearUrl: issue.linearUrl,
            title: issue.title,
            description: issue.description,
            status: issue.status,
            priority: issue.priority,
            assignee: assigneeId,
            createdBy: systemAgent._id,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
          });
        })
      );

      const created = results.filter((r) => r.created).length;
      const updated = results.filter((r) => !r.created).length;

      return {
        success: true,
        total: linearIssues.length,
        created,
        updated,
        message: `Synced ${linearIssues.length} tasks: ${created} created, ${updated} updated`,
      };
    } catch (error) {
      console.error("Linear sync failed:", error);
      throw new Error(`Linear sync failed: ${error}`);
    }
  },
});
