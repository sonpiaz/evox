import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

// Slack notification action
export const sendSlackNotification = action({
  args: {
    event: v.union(
      v.literal("task_completed"),
      v.literal("agent_blocked"),
      v.literal("deploy_done")
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
    }[args.event];

    const color = {
      task_completed: "#10B981", // green
      agent_blocked: "#F59E0B", // yellow
      deploy_done: "#3B82F6", // blue
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
  handler: async (ctx, args) => {
    return await ctx.runAction(sendSlackNotification, {
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
  handler: async (ctx, args) => {
    return await ctx.runAction(sendSlackNotification, {
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
  handler: async (ctx, args) => {
    return await ctx.runAction(sendSlackNotification, {
      event: "deploy_done",
      title: "Deployment Complete",
      message: `*Environment:* ${args.environment}${
        args.deployedBy ? `\n*Deployed by:* ${args.deployedBy}` : ""
      }${args.commitHash ? `\n*Commit:* \`${args.commitHash}\`` : ""}`,
      metadata: { environment: args.environment },
    });
  },
});
