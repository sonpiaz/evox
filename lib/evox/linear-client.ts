import { LinearClient } from "@linear/sdk";

const EVOX_PROJECT_ID = "d5bf6ea1-9dcb-4fa7-96e8-66fa03746cfe";
const AGENT_FACTORY_TEAM_ID = "AGT"; // Team key for Agent Factory

// Linear priority mapping: 1=Urgent, 2=High, 3=Medium, 4=Low, 0=No priority
type LinearPriority = 0 | 1 | 2 | 3 | 4;

/**
 * Create a new issue in Linear (AGT team)
 */
export async function createLinearIssue(
  apiKey: string,
  options: {
    title: string;
    description?: string;
    priority?: "urgent" | "high" | "medium" | "low";
    assigneeName?: string; // Agent name: sam, leo, max, quinn
    labels?: string[];
  }
) {
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is required");
  }

  const client = new LinearClient({ apiKey });

  // Map priority to Linear format
  const priorityMap: Record<string, LinearPriority> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  const priority = options.priority ? priorityMap[options.priority] : 3;

  // Get team by key
  const teams = await client.teams();
  const team = teams.nodes.find((t) => t.key === AGENT_FACTORY_TEAM_ID);
  if (!team) {
    throw new Error(`Team ${AGENT_FACTORY_TEAM_ID} not found`);
  }

  // Find assignee if specified
  let assigneeId: string | undefined;
  if (options.assigneeName) {
    const users = await client.users();
    const user = users.nodes.find(
      (u) => u.name.toLowerCase() === options.assigneeName?.toLowerCase()
    );
    if (user) {
      assigneeId = user.id;
    }
  }

  // Create issue
  const result = await client.createIssue({
    teamId: team.id,
    projectId: EVOX_PROJECT_ID,
    title: options.title,
    description: options.description,
    priority,
    assigneeId,
  });

  const issue = await result.issue;
  if (!issue) {
    throw new Error("Failed to create issue");
  }

  return {
    id: issue.id,
    identifier: issue.identifier,
    url: issue.url,
    title: issue.title,
  };
}

/**
 * Map Linear status to EVOX task status
 */
export function mapLinearStatus(
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

  // Default fallback
  return "todo";
}

/**
 * Map Linear priority (1-4) to EVOX priority (p1-p4)
 */
export function mapLinearPriority(
  linearPriority: number
): "low" | "medium" | "high" | "urgent" {
  switch (linearPriority) {
    case 1:
      return "urgent"; // P1 → urgent
    case 2:
      return "high"; // P2 → high
    case 3:
      return "medium"; // P3 → medium
    case 4:
      return "low"; // P4 → low
    default:
      return "medium";
  }
}

/**
 * Fetch Linear issues for EVOX project
 * Returns array of issues with mapped fields
 */
export async function fetchLinearIssues(apiKey: string) {
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is required");
  }

  const client = new LinearClient({ apiKey });

  try {
    // Fetch issues from EVOX project
    const issues = await client.issues({
      filter: {
        project: { id: { eq: EVOX_PROJECT_ID } },
      },
      includeArchived: false,
    });

    const issueNodes = await issues.nodes;

    // Map Linear issues to EVOX format
    const mappedIssues = await Promise.all(
      issueNodes.map(async (issue) => {
        const state = await issue.state;
        const assignee = await issue.assignee;
        const project = await issue.project;

        return {
          linearId: issue.id,
          linearIdentifier: issue.identifier, // e.g., "AGT-72"
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
  } catch (error) {
    console.error("Failed to fetch Linear issues:", error);
    throw new Error(`Linear API error: ${error}`);
  }
}
