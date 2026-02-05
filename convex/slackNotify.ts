import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Slack notification action
export const sendSlackNotification = internalAction({
  args: {
    event: v.union(
      v.literal("task_completed"),
      v.literal("agent_blocked"),
      v.literal("deploy_done"),
      v.literal("git_push")  // AGT-262: Notify on agent commit
    ),
    title: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn("SLACK_WEBHOOK_URL not configured, skipping Slack notification");
      return { success: false, reason: "webhook_not_configured" };
    }

    // Format message based on event type
    const emoji = {
      task_completed: ":white_check_mark:",
      agent_blocked: ":warning:",
      deploy_done: ":rocket:",
      git_push: ":hammer_and_wrench:",  // AGT-262
    }[args.event];

    const color = {
      task_completed: "#10B981", // green
      agent_blocked: "#F59E0B", // yellow
      deploy_done: "#3B82F6", // blue
      git_push: "#8B5CF6", // purple - AGT-262
    }[args.event];

    const payload = {
      attachments: [
        {
          color,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `${emoji} ${args.title}`,
                emoji: true,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: args.message,
              },
            },
            ...(args.metadata
              ? [
                  {
                    type: "context",
                    elements: [
                      {
                        type: "mrkdwn",
                        text: `*Event:* ${args.event} | *Time:* <!date^${Math.floor(
                          Date.now() / 1000
                        )}^{date_short_pretty} {time}|${new Date().toISOString()}>`,
                      },
                    ],
                  },
                ]
              : []),
          ],
        },
      ],
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("Failed to send Slack notification:", await response.text());
        return { success: false, reason: "webhook_failed" };
      }

      return { success: true };
    } catch (error) {
      console.error("Error sending Slack notification:", error);
      return { success: false, reason: "network_error" };
    }
  },
});

// Helper to notify on task completion
export const notifyTaskCompleted = internalAction({
  args: {
    taskId: v.string(),
    taskTitle: v.string(),
    assigneeName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; reason?: string }> => {
    // @ts-ignore - Convex type inference gets too deep with runAction
    return await ctx.runAction(internal.slackNotify.sendSlackNotification, {
      event: "task_completed",
      title: "Task Completed",
      message: `*${args.taskTitle}*${
        args.assigneeName ? `\nCompleted by: ${args.assigneeName}` : ""
      }\nTask ID: \`${args.taskId}\``,
      metadata: { taskId: args.taskId },
    });
  },
});

// Helper to notify when agent is blocked
export const notifyAgentBlocked = internalAction({
  args: {
    agentName: v.string(),
    taskId: v.string(),
    taskTitle: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; reason?: string }> => {
    return await ctx.runAction(internal.slackNotify.sendSlackNotification, {
      event: "agent_blocked",
      title: "Agent Blocked",
      message: `*Agent:* ${args.agentName}\n*Task:* ${args.taskTitle} (\`${args.taskId}\`)${
        args.reason ? `\n*Reason:* ${args.reason}` : ""
      }`,
      metadata: { agentName: args.agentName, taskId: args.taskId },
    });
  },
});

// Helper to notify on deployment completion
export const notifyDeployDone = internalAction({
  args: {
    environment: v.string(),
    deployedBy: v.optional(v.string()),
    commitHash: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; reason?: string }> => {
    return await ctx.runAction(internal.slackNotify.sendSlackNotification, {
      event: "deploy_done",
      title: "Deployment Complete",
      message: `*Environment:* ${args.environment}${
        args.deployedBy ? `\n*Deployed by:* ${args.deployedBy}` : ""
      }${args.commitHash ? `\n*Commit:* \`${args.commitHash}\`` : ""}`,
      metadata: { environment: args.environment },
    });
  },
});

// AGT-262: Helper to notify on agent git push
export const notifyGitPush = internalAction({
  args: {
    agentName: v.string(),
    commitHash: v.string(),
    commitMessage: v.string(),
    ticketId: v.optional(v.string()),
    filesChanged: v.optional(v.number()),
    commitUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; reason?: string }> => {
    // Build message with ticket link if available
    const ticketInfo = args.ticketId
      ? `\n*Ticket:* <https://linear.app/affitorai/issue/${args.ticketId}|${args.ticketId}>`
      : "";
    const filesInfo = args.filesChanged
      ? `\n*Files:* ${args.filesChanged} changed`
      : "";
    const linkInfo = args.commitUrl
      ? `\n<${args.commitUrl}|View on GitHub>`
      : "";

    return await ctx.runAction(internal.slackNotify.sendSlackNotification, {
      event: "git_push",
      title: `${args.agentName.toUpperCase()} pushed code`,
      message: `*Commit:* \`${args.commitHash}\`\n*Message:* ${args.commitMessage}${ticketInfo}${filesInfo}${linkInfo}`,
      metadata: {
        agentName: args.agentName,
        commitHash: args.commitHash,
        ticketId: args.ticketId,
      },
    });
  },
});
