import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sync Linear issues every 5 minutes (AGT-192: reduced from 30s to save Convex costs)
// 12 calls/hour instead of 120 = 90% reduction
// Real-time updates still come via /api/webhooks/linear webhook
crons.interval(
  "sync-linear",
  { minutes: 5 },
  internal.linearSync.syncAll,
  {}
);

// AGT-119: Agent heartbeats — staggered 15-min intervals
// MAX at :00, SAM at :05, LEO at :10 of each 15-min window
crons.cron(
  "heartbeat-max",
  "0,15,30,45 * * * *", // Every 15 mins at :00, :15, :30, :45
  internal.heartbeat.heartbeatMax,
  {}
);

crons.cron(
  "heartbeat-sam",
  "5,20,35,50 * * * *", // Every 15 mins at :05, :20, :35, :50
  internal.heartbeat.heartbeatSam,
  {}
);

crons.cron(
  "heartbeat-leo",
  "10,25,40,55 * * * *", // Every 15 mins at :10, :25, :40, :55
  internal.heartbeat.heartbeatLeo,
  {}
);

// AGT-120: Auto Daily Standup Generation
// Runs at 6:00 PM UTC (11:00 AM PST / 2:00 PM EST / end of Asia workday)
// Generates standup summaries and pushes to Son
crons.cron(
  "daily-standup",
  "0 18 * * *", // 6:00 PM UTC daily
  internal.standup.generateDailyStandup,
  {}
);

// AGT-215: Alert System — Check for stuck agents every 5 minutes
// Triggers alerts when agents are stuck on a task for >30 minutes
crons.interval(
  "check-stuck-agents",
  { minutes: 5 },
  internal.alerts.checkStuckAgents,
  {}
);

// AGT-218: Cloud-based Auto-Dispatch (24/7)
// Automatically assigns prioritized tasks to idle agents every 5 minutes
// Replaces local agent-daemon.sh for production use
crons.interval(
  "auto-dispatch-cycle",
  { minutes: 5 },
  internal.automation.runAutoDispatchCycleInternal,
  {}
);

// AGT-216: Auto-Recovery — Self-Healing Agent Restart & Retry
// Checks for crashed agents (heartbeat timeout) and auto-restarts with backoff
// Circuit breaker stops after 3 consecutive failures
crons.interval(
  "auto-recovery-check",
  { minutes: 5 },
  internal.recovery.runRecoveryCheck,
  {}
);

// AGT-223: Max Autonomous Monitor
// Background monitoring, self-check, agent sync, inter-agent coordination
// Checks: agent health, task progress, stuck tasks, errors
// Creates alerts but Telegram notifications are disabled until sendTelegramAlert is fixed
crons.interval(
  "max-monitor",
  { minutes: 15 },
  internal.maxMonitor.check,
  {}
);

// AGT-247: Event Bus — Cleanup expired events every 5 minutes
// Removes events older than 5 minutes that were never delivered
crons.interval(
  "cleanup-expired-events",
  { minutes: 5 },
  internal.agentEvents.cleanupExpiredEvents,
  {}
);

// AGT-250: Website Health Monitor — Check every 1 minute
// Alerts via Telegram if site goes down
crons.interval(
  "website-health-check",
  { minutes: 1 },
  internal.healthMonitor.checkWebsite,
  {}
);

// AGT-252: Auto-Recruit Agents — Check every 15 minutes
// Auto-spawns new agents when backlog is high or all agents busy
crons.interval(
  "auto-recruit-agents",
  { minutes: 15 },
  internal.agentTemplates.checkAndAutoSpawn,
  {}
);

export default crons;
