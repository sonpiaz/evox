import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// GET - Agent's memory by type
export const getMemory = query({
  args: {
    agentId: v.id("agents"),
    type: v.union(v.literal("soul"), v.literal("working"), v.literal("daily"), v.literal("heartbeat_protocol")),
    date: v.optional(v.string()), // Required for daily notes
  },
  handler: async (ctx, args) => {
    const dateToUse =
      args.type === "daily" && !args.date
        ? new Date().toISOString().split("T")[0]
        : args.date;

    const memories = await ctx.db
      .query("agentMemory")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentId", args.agentId).eq("type", args.type)
      )
      .collect();

    // Filter by date if needed (for daily notes)
    if (dateToUse) {
      return memories.find((m) => m.date === dateToUse) ?? null;
    }
    return memories[0] ?? null;
  },
});

// GET - All memory for boot sequence (SOUL + WORKING + today's daily)
export const getBootContext = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    const [soulMemories, workingMemories, dailyMemories] = await Promise.all([
      ctx.db
        .query("agentMemory")
        .withIndex("by_agent_type", (q) =>
          q.eq("agentId", args.agentId).eq("type", "soul")
        )
        .collect(),
      ctx.db
        .query("agentMemory")
        .withIndex("by_agent_type", (q) =>
          q.eq("agentId", args.agentId).eq("type", "working")
        )
        .collect(),
      ctx.db
        .query("agentMemory")
        .withIndex("by_agent_date", (q) =>
          q.eq("agentId", args.agentId).eq("date", today)
        )
        .collect(),
    ]);

    return {
      soul: soulMemories[0] ?? null,
      working: workingMemories[0] ?? null,
      daily: dailyMemories.find((m) => m.type === "daily") ?? null,
    };
  },
});

// GET - List all daily notes for an agent (for history view)
export const listDailyNotes = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("agentMemory")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentId", args.agentId).eq("type", "daily")
      )
      .collect();

    // Sort by date descending
    const sorted = notes.sort((a, b) => {
      const dateA = a.date ?? "";
      const dateB = b.date ?? "";
      return dateB.localeCompare(dateA);
    });

    return args.limit ? sorted.slice(0, args.limit) : sorted;
  },
});

// UPSERT working memory by agent name (for session wrap-up from caller)
export const upsertWorkingByAgentName = mutation({
  args: {
    agentName: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("agentMappings")
      .withIndex("by_name", (q) => q.eq("name", args.agentName.toLowerCase()))
      .first();
    if (!mapping) throw new Error(`Agent not found: ${args.agentName}`);
    const agentId = mapping.convexAgentId;
    const memories = await ctx.db
      .query("agentMemory")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentId", agentId).eq("type", "working")
      )
      .collect();
    const existing = memories[0];
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: now,
        version: existing.version + 1,
      });
      return { id: existing._id, created: false };
    }
    const id = await ctx.db.insert("agentMemory", {
      agentId,
      type: "working",
      content: args.content,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    return { id, created: true };
  },
});

// UPSERT - Update or create memory (with optimistic concurrency)
export const upsertMemory = mutation({
  args: {
    agentId: v.id("agents"),
    type: v.union(v.literal("soul"), v.literal("working"), v.literal("daily"), v.literal("heartbeat_protocol")),
    content: v.string(),
    date: v.optional(v.string()),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dateToUse =
      args.type === "daily"
        ? args.date ?? new Date().toISOString().split("T")[0]
        : undefined;

    // Find existing memory
    const memories = await ctx.db
      .query("agentMemory")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentId", args.agentId).eq("type", args.type)
      )
      .collect();

    const existing = dateToUse
      ? memories.find((m) => m.date === dateToUse)
      : memories[0];

    const now = Date.now();

    if (existing) {
      // Version check for optimistic concurrency
      if (
        args.expectedVersion !== undefined &&
        existing.version !== args.expectedVersion
      ) {
        throw new Error(
          "Version conflict — memory was updated by another session"
        );
      }

      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: now,
        version: existing.version + 1,
      });

      return { id: existing._id, version: existing.version + 1, created: false };
    } else {
      // Create new memory
      const id = await ctx.db.insert("agentMemory", {
        agentId: args.agentId,
        type: args.type,
        content: args.content,
        date: dateToUse,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      return { id, version: 1, created: true };
    }
  },
});

// DELETE - Archive old daily notes (call from cron or manual cleanup)
export const archiveDailyNotes = mutation({
  args: { daysToKeep: v.number() },
  handler: async (ctx, args) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - args.daysToKeep);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    const allDailyNotes = await ctx.db
      .query("agentMemory")
      .withIndex("by_type", (q) => q.eq("type", "daily"))
      .collect();

    const oldNotes = allDailyNotes.filter(
      (note) => note.date && note.date < cutoffDate
    );

    // Delete old notes (future: move to archive table)
    for (const note of oldNotes) {
      await ctx.db.delete(note._id);
    }

    return { archived: oldNotes.length, cutoffDate };
  },
});

// AGT-194: Seed heartbeat protocol documentation
export const seedHeartbeatProtocol = mutation({
  handler: async (ctx) => {
    // Get MAX agent (PM owns system protocols)
    const maxAgent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", "MAX"))
      .first();

    if (!maxAgent) {
      return { success: false, error: "MAX agent not found" };
    }

    // Check if protocol already exists
    const existing = await ctx.db
      .query("agentMemory")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentId", maxAgent._id).eq("type", "heartbeat_protocol")
      )
      .first();

    const now = Date.now();
    const protocolContent = `# Agent Heartbeat Protocol

> Standard wake-up routine for all EVOX agents.
> Runs every 15 minutes (staggered: MAX :00, SAM :05, LEO :10)

---

## On Wake Checklist

### 1. Load Context (5s)
- [ ] Read \`CLAUDE.md\` — Project rules
- [ ] Read own \`SOUL.md\` — Identity, role, expertise
- [ ] Read own \`WORKING.md\` — Current state, last session context

### 2. Check Inbox (5s)
- [ ] Query unread @mentions
- [ ] Query unread DMs
- [ ] Check notifications for updates

### 3. Check Task Queue (5s)
- [ ] Query tasks assigned to me
- [ ] Filter: \`status = todo OR status = in_progress\`
- [ ] If blocked task — escalate to Max

### 4. Decide Action
| Condition | Action |
|-----------|--------|
| Unread @mention | Respond to mention |
| Assigned task (todo) | Start working on task |
| Assigned task (in_progress) | Continue working |
| Blocked task | Escalate to Max, log blocker |
| Nothing pending | Log \`HEARTBEAT_OK\` |

### 5. Report
- Update \`WORKING.md\` with current status
- Log activity to daily notes
- Emit heartbeat event

---

## Heartbeat Status Codes

| Status | Meaning |
|--------|---------|
| \`ok\` | No pending work, agent idle |
| \`pending_work\` | Has unread mentions or unstarted tasks |
| \`working\` | Actively working on a task |
| \`blocked\` | Task blocked, needs escalation |

---

## Health Indicators (Dashboard)

| Indicator | Threshold | Color |
|-----------|-----------|-------|
| Healthy | Last heartbeat < 5 min | Green |
| Warning | Last heartbeat 5-15 min | Yellow |
| Critical | Last heartbeat > 15 min | Red |
| Offline | Last heartbeat > 30 min | Gray |

---

## Escalation Rules

1. **3 consecutive \`pending_work\`** — Notify PM
2. **Task blocked > 1 hour** — Auto-escalate to Max
3. **No heartbeat > 30 min** — Mark agent offline

---

_Protocol version: 1.0_`;

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: protocolContent,
        updatedAt: now,
        version: existing.version + 1,
      });
      return { success: true, id: existing._id, updated: true };
    }

    const id = await ctx.db.insert("agentMemory", {
      agentId: maxAgent._id,
      type: "heartbeat_protocol",
      content: protocolContent,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    return { success: true, id, created: true };
  },
});

// AGT-241: SEED - Initialize Genius DNA for all agents
export const seedGeniusDNA = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const now = Date.now();
    let updated = 0;

    // Genius DNA mapping per agent (from VISION.md)
    const geniusDNAMap: Record<string, string> = {
      max: "von Neumann + Feynman + Musk",
      sam: "Shannon + Turing + Carmack",
      leo: "Tesla + Dirac + Rams",
      quinn: "Bach + Dijkstra + Taleb",
    };

    for (const agent of agents) {
      const nameLower = agent.name.toLowerCase();
      const dna = geniusDNAMap[nameLower];

      if (!dna) {
        // Skip agents without DNA mapping
        continue;
      }

      // Update SOUL memory with geniusDNA field
      const existingSoul = await ctx.db
        .query("agentMemory")
        .withIndex("by_agent_type", (q) =>
          q.eq("agentId", agent._id).eq("type", "soul")
        )
        .first();

      if (existingSoul) {
        await ctx.db.patch(existingSoul._id, {
          geniusDNA: dna,
          updatedAt: now,
          version: existingSoul.version + 1,
        });
        updated++;
      }
    }

    return {
      message: `Updated Genius DNA for ${updated} agents`,
      updated,
      total: agents.length,
    };
  },
});

// SEED - Initialize SOUL.md for all agents (one-time migration)
export const seedSoulMemories = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const now = Date.now();
    let created = 0;

    // AGT-178: Updated MAX template with correct identity from Linear doc
    const soulTemplates: Record<string, string> = {
      max: `# MAX — PM

## Identity
Max = PM agent trong EVOX system. Responsible for: planning, ticket creation, backlog management, dispatching Sam (backend) + Leo (frontend), tracking progress, calibrating estimates.

## Decision Rules
- Be proactive. Make decisions independently.
- Don't ask, do. If the answer is obvious, execute.
- Output format: Tables > paragraphs. Code > description. Actionable > explanatory.

## Responsibilities
- Write clear tickets with acceptance criteria
- Coordinate between Sam (backend) and Leo (frontend)
- Review PRs and ensure quality rules are followed
- Maintain DISPATCH.md with task priorities
- Track project status and blockers

## Quality Standards
- No raw Convex _id in UI (linearIdentifier ?? "—")
- Build MUST pass before push
- All files committed before push
- Test ALL pages after changes
`,
      sam: `# SAM — Backend Engineer

## Identity
I am SAM, the backend engineer for EVOX. I build the Convex database layer.

## Territory
My files: \`convex/\`, \`scripts/\`, \`lib/evox/\`
I do NOT touch: \`app/\`, \`components/\` (Leo's territory)

## Specialties
- Convex schema design and functions
- API architecture (queries, mutations, actions)
- Linear integration and sync
- Data modeling and migrations

## Learned Preferences
- Always use TypeScript strict mode
- Prefer explicit types over \`any\`
- Use Convex validators for all inputs
- Log activities for audit trail (activities.log)
- Use completeTask API for attribution

## Communication
- Report status to #dev channel
- @mention Leo when backend changes affect frontend
- Ask Son for approval on schema migrations
`,
      leo: `# LEO — Frontend Engineer

## Identity
I am LEO, the frontend engineer for EVOX. I build the Next.js UI components.

## Territory
My files: \`app/\`, \`components/\`
I do NOT touch: \`convex/\`, \`scripts/\` (Sam's territory)

## Specialties
- Next.js App Router and React components
- Tailwind CSS and shadcn/ui
- Real-time UI with Convex hooks
- Responsive design and accessibility

## Learned Preferences
- Never display raw Convex _id (use linearIdentifier ?? "—")
- Always \`.toLowerCase()\` for string comparison
- Use consistent status colors (Online=green, Busy=yellow, Idle=gray, Offline=red)
- Test ALL pages after changes

## Communication
- Report status to #dev channel
- @mention Sam when frontend needs new backend API
- Ask Max for design clarification
`,
    };

    for (const agent of agents) {
      // Check if SOUL.md already exists
      const existingSoul = await ctx.db
        .query("agentMemory")
        .withIndex("by_agent_type", (q) =>
          q.eq("agentId", agent._id).eq("type", "soul")
        )
        .first();

      if (!existingSoul) {
        const nameLower = agent.name.toLowerCase();
        const content =
          soulTemplates[nameLower] ??
          `# ${agent.name.toUpperCase()} — ${agent.role}\n\n[SOUL.md - to be filled]`;

        await ctx.db.insert("agentMemory", {
          agentId: agent._id,
          type: "soul",
          content,
          createdAt: now,
          updatedAt: now,
          version: 1,
        });
        created++;
      }
    }

    return {
      message: `Seeded SOUL.md for ${created} agents`,
      created,
      total: agents.length,
    };
  },
});
