# EVOX Core Architecture
## The 3 Critical Layers + Agent Identity System

**Author:** MAX (Claude Sonnet 4.5)
**Date:** 2026-02-05
**Version:** 1.0
**Status:** Foundation Document

---

## 📋 Executive Summary

EVOX's value doesn't come from the UI layer—it comes from **3 foundational cores** that enable autonomous agent coordination. This document defines these cores, their relationships, and the critical **Agent Identity System** that ties them together.

**TL;DR:**
1. **Convex Backend** = Single source of truth (most critical)
2. **Agent Identity System** = Who agents are, stable IDs
3. **Communication Layer** = How agents coordinate

**If any core fails:**
- Convex fails → System dies
- Identity fails → Quality drops 40%
- Communication fails → Manual coordination required

---

## 🎯 The 5 Fundamental Truths

### Truth #1: The Frontend is Just a Window
**Reality:** `app/*` components are **disposable UI layers**. The real system lives in Convex.

**Proof:**
- Delete all of `app/` → Rebuild from Convex data in days
- Lose Convex data → Rebuild takes months + loses agent memory

**Implication:** Invest 80% effort in backend architecture, 20% in UI polish.

---

### Truth #2: Agent Identity Must Be Stable
**Reality:** Agents need **human-readable, stable IDs** that survive Convex migrations.

**Current Problem:**
```typescript
// ❌ BAD: Technical IDs change across deployments
const agentId = "j971k4kc1jqvp05p32t29ttytx80b23m"

// ❌ BAD: Case-sensitive string matching
if (agentName === "EVOX") // vs "evox" vs "Evox"

// ✅ GOOD: Stable, human-readable identity
const agentId = "agt-max"
```

**Why it matters:** When EVOX looks for messages from "ceo agent" but messages came from "max agent", coordination breaks.

---

### Truth #3: Communication is the Nervous System
**Reality:** Without reliable messaging, agents can't:
- Hand off tasks
- Report status
- Request help
- Share context

**Telephone Game Effect:**
```
CEO → EVOX → Agent (quality: 60%)  // Information loss!
CEO → Agent directly (quality: 100%)
```

**Solution:** Message Status System with read receipts prevents information loss.

---

### Truth #4: Schema Changes are High-Risk Operations
**Reality:** Convex schema is the **single point of failure**.

**Risk Examples:**
- Add required field → Breaks all existing queries
- Remove field → Loses historical data permanently
- Change field type → Breaks all reading code

**Mitigation:** Always add fields as **optional**, migrate data incrementally.

---

### Truth #5: Debugging Requires Visibility
**Reality:** When agents fail silently, the system is a black box.

**Requirements:**
- Message delivery confirmation (delivered/seen/replied)
- Agent activity logs
- Task handoff trails
- Error propagation visibility

**Current gap:** EVOX can't see CEO's messages → Communication breakdown.

---

## 🏗️ Architecture: The 3 Core Layers

### Layer 1: Convex Backend (Foundation) 🔴

**What it is:** Centralized state management + real-time sync + API layer

**Why most critical:**
- **Single source of truth** for all agent state
- **Real-time sync** across devices (Mac Mini ↔ MacBook)
- **Transactional consistency** prevents race conditions
- **Historical audit trail** for all actions

**Key Components:**

```
convex/
├── schema.ts           # Data model (MOST CRITICAL FILE)
├── agents.ts           # Agent CRUD operations
├── agentMessaging.ts   # Agent-to-agent communication
├── tasks.ts            # Task management
├── agentMemory.ts      # SOUL.md, WORKING.md, daily notes
└── messageStatus.ts    # Message delivery tracking (NEW)
```

**If this fails:**
- ❌ Agents can't communicate
- ❌ State becomes inconsistent across devices
- ❌ No historical record of what happened
- ❌ Real-time sync breaks
- **Result:** System completely non-functional

**Protection:**
- Backup Convex data daily
- Never force-push schema changes without testing
- Always add fields as optional first
- Test schema migrations on dev deployment

---

### Layer 2: Agent Identity System (Foundation) 🟠

**What it is:** Stable, human-readable identifiers for agents + their capabilities

**Current State (Problematic):**

```typescript
// 3 ways to identify agents (INCONSISTENT):

1. Convex ID: "j971k4kc1jqvp05p32t29ttytx80b23m"
   - Technical, unstable across migrations

2. Name: "max", "evox", "sam"
   - Case-sensitive, no namespace

3. Display Name: "MAX", "EVOX", "SAM"
   - UI only, not queryable
```

**Target State (Proposed):**

```typescript
interface AgentIdentity {
  // Stable, human-readable ID (NEVER CHANGES)
  id: AgentID;              // "agt-max" | "agt-sam" | "agt-leo"

  // Display information
  name: string;             // "MAX" (UI display)
  handle: string;           // "@max" (for @mentions)
  avatar: string;           // Avatar emoji or URL

  // Technical mapping
  convexId: Id<"agents">;   // Internal Convex ID (can change)

  // Capabilities
  role: AgentRole;          // "pm" | "backend" | "frontend"
  skills: string[];         // ["convex", "typescript", "coordination"]
  territory: string[];      // ["convex/", "scripts/", "lib/evox/"]

  // Identity
  soul: string;             // From agents/max.md
  geniusDNA: string[];      // ["von_neumann", "feynman"]
}
```

**Benefits:**
- ✅ Stable across deployments
- ✅ Human-readable in logs ("agt-max" vs "j971k4k...")
- ✅ Easy to debug
- ✅ No case sensitivity issues
- ✅ Can migrate Convex without breaking references

**Example Usage:**

```typescript
// ✅ GOOD: Stable ID lookup
const agent = await getAgentById("agt-max");

// ✅ GOOD: Query by handle
const messages = await getMessagesByHandle("@evox");

// ❌ BAD: Technical ID (breaks on migration)
const agent = await ctx.db.get("j971k4kc1jqvp05p32t29ttytx80b23m");
```

---

### Layer 3: Communication Layer (Coordination) 🟡

**What it is:** Message passing + status tracking + delivery confirmation

**Components:**

```
convex/agentMessaging.ts    # Direct messages (DMs)
convex/messageStatus.ts     # Read receipts, delivery status
convex/agentMesh.ts         # P2P broadcast messaging
convex/agentEvents.ts       # Real-time notifications
```

**Message Status Flow:**

```
0: PENDING    → Message created, not sent yet
    ↓
1: DELIVERED  → Message in recipient's inbox
    ↓
2: SEEN       → Recipient opened/read message
    ↓
3: REPLIED    → Recipient sent response back
```

**Why it matters:**

**Without status tracking:**
```
CEO: "Did EVOX see my feedback?"
System: "¯\_(ツ)_/¯"
```

**With status tracking:**
```
CEO: "Did EVOX see my feedback?"
System: "✅ Delivered 17:12, ⏳ Not seen yet (2 unread messages)"
```

**Current Gap:**
- Messages exist in Convex
- EVOX's query function can't find them
- Reason: Query by agent name mismatch (EVOX vs evox)
- **This proves the need for stable Agent IDs**

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                          │
│                   (Disposable UI)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Dashboard │  │Messages  │  │  Sync    │  │   CEO    │  │
│  │  (UI)    │  │  (UI)    │  │  (UI)    │  │   (UI)   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼─────────────┼─────────────┼─────────────┼────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              COMMUNICATION LAYER (Layer 3)                  │
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ Message Status │  │  Agent Events  │  │  Agent Mesh  │ │
│  │ (Read receipts)│  │ (Notifications)│  │  (Broadcast) │ │
│  └────────┬───────┘  └────────┬───────┘  └──────┬───────┘ │
└───────────┼──────────────────┼──────────────────┼──────────┘
            │                  │                  │
            └──────────────────┴──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            AGENT IDENTITY LAYER (Layer 2)                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Agent Registry (Stable IDs)                         │   │
│  │                                                      │   │
│  │  agt-max  → {name:"MAX", role:"pm", convexId:...}  │   │
│  │  agt-sam  → {name:"SAM", role:"backend", ...}      │   │
│  │  agt-leo  → {name:"LEO", role:"frontend", ...}     │   │
│  │  agt-evox → {name:"EVOX", role:"coo", ...}         │   │
│  │                                                      │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              CONVEX BACKEND (Layer 1)                       │
│              🔴 SINGLE SOURCE OF TRUTH                      │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ schema.ts│  │agents.ts │  │ tasks.ts │  │agentMemo │  │
│  │  (CORE)  │  │  (CRUD)  │  │  (Work)  │  │ry.ts    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │             │             │         │
│       └─────────────┴─────────────┴─────────────┘         │
│                          │                                │
│                  ┌───────▼────────┐                       │
│                  │   DATABASE     │                       │
│                  │  (Persistent)  │                       │
│                  └────────────────┘                       │
└─────────────────────────────────────────────────────────────┘

           Real-time Sync ↕️

┌──────────────┐              ┌──────────────┐
│  Mac Mini    │◀────────────▶│   MacBook    │
│   (EVOX)     │   Convex     │    (MAX)     │
└──────────────┘              └──────────────┘
```

---

## 🎯 Why Each Layer Matters

### Why Convex Backend is Critical

**Problem it solves:** Without centralized state, agents can't coordinate.

**Example without Convex:**
```
Mac Mini (EVOX): "I completed task AGT-123"
MacBook (MAX):   "I don't see that task as completed"
                 → STATE DIVERGENCE
```

**With Convex:**
```
EVOX: completeTask("AGT-123")
        ↓ (real-time sync)
MAX:  sees task status update instantly
        ✅ STATE CONSISTENT
```

**Key Features:**
- **Real-time sync:** Changes propagate in <100ms
- **Transactions:** No partial updates
- **Schema validation:** Type-safe queries
- **Audit trail:** All changes logged
- **Cross-device:** Same state everywhere

---

### Why Agent Identity System Matters

**Problem it solves:** Agent name ambiguity breaks coordination.

**Real Example (Today):**
```
CEO sends message from "max" agent (on behalf of CEO)
EVOX searches for messages from "ceo" agent
Result: EVOX can't find the message
Reason: Agent identity mismatch
```

**With Stable IDs:**
```typescript
// Message sent with stable ID
sendMessage({
  from: "agt-max",
  to: "agt-evox",
  onBehalfOf: "ceo",  // Metadata for context
  content: "..."
})

// EVOX queries by stable ID
const messages = await getMessagesTo("agt-evox");
// ✅ FOUND! No name matching issues
```

**Benefits:**
- **Debugging:** "agt-max" in logs is immediately clear
- **Migration-safe:** Can change Convex IDs without breaking
- **No case issues:** "agt-evox" never confused with "EVOX" vs "evox"
- **Namespace:** "agt-max-2" for second instance

---

### Why Communication Layer Matters

**Problem it solves:** Agents need to know if messages were received/read.

**Telephone Game Effect:**
```
CEO writes: "Build AGT-324 fresh, no copying v0.1/v0.2"
    ↓
EVOX interprets: "Build minimal dashboard v0.3"
    ↓
Agent builds: Wrong spec → 2-3 hours wasted
```

**Root cause:** No verification that message was understood correctly.

**With Message Status System:**
```
CEO → EVOX: "Build AGT-324 fresh..."
    ↓ (status: DELIVERED)

EVOX reads message
    ↓ (status: SEEN)

EVOX: "Confirm: Build AGT-324 from scratch, exclude v0.1/v0.2?"
    ↓ (status: REPLIED)

CEO: "Yes, correct!"
    ✅ Verification complete, no information loss
```

**Features:**
- Read receipts (seen/unseen)
- Reply tracking
- Priority tagging (urgent/normal)
- Inbox overview per agent
- Conversation threading

---

## ⚠️ Risk Analysis

### Layer 1: Convex Backend

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Schema migration breaks queries | 🔴 CRITICAL | Medium | Test on dev first, add fields as optional |
| Convex service outage | 🔴 CRITICAL | Low | Convex has 99.9% uptime SLA |
| Data corruption | 🔴 CRITICAL | Very Low | Convex handles transactions atomically |
| Rate limiting | 🟡 MEDIUM | Low | Monitor usage, implement caching |

**If Layer 1 fails:** System is completely non-functional. All agents offline.

---

### Layer 2: Agent Identity System

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Case sensitivity breaks queries | 🟠 HIGH | High | Use stable IDs (agt-max) |
| Agent name collisions | 🟡 MEDIUM | Medium | Namespaced IDs prevent conflicts |
| ID changes break references | 🟠 HIGH | Low (if using stable IDs) | Stable IDs never change |
| Missing agent metadata | 🟡 MEDIUM | Medium | Validate agent exists before operations |

**If Layer 2 fails:** Quality drops 40%, messages get lost, coordination breaks.

---

### Layer 3: Communication Layer

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Messages not delivered | 🟠 HIGH | Medium | Status tracking shows delivery |
| Messages read but not acknowledged | 🟡 MEDIUM | High | Read receipts required |
| Information loss (telephone game) | 🟠 HIGH | High | Require confirmation for critical messages |
| Message spam/flooding | 🟡 MEDIUM | Low | Rate limiting, priority queues |

**If Layer 3 fails:** Manual coordination required, 40% slower, high error rate.

---

## 🛠️ Implementation Roadmap

### Phase 1: Foundation (COMPLETE ✅)
- [x] Convex schema defined
- [x] Agent messaging system
- [x] Basic agent CRUD
- [x] Task management

### Phase 2: Communication (IN PROGRESS 🔄)
- [x] Message status tracking (deployed 2026-02-05)
- [x] Read receipts UI (`/messages` page)
- [ ] Migration script for old messages
- [ ] Real-time delivery notifications

### Phase 3: Agent Identity (PLANNED 📋)
- [ ] Define stable Agent ID format (`agt-*`)
- [ ] Create agent registry with stable IDs
- [ ] Migrate all queries to use stable IDs
- [ ] Deprecate direct Convex ID usage

### Phase 4: Advanced Features (FUTURE 🚀)
- [ ] Agent capability discovery
- [ ] Dynamic skill-based routing
- [ ] Agent spawning based on workload
- [ ] Multi-agent consensus protocols

---

## 📝 Best Practices

### DO:
✅ Always add schema fields as **optional** first
✅ Use **stable Agent IDs** (`agt-max`) not technical IDs
✅ Require **message confirmations** for critical tasks
✅ Test schema changes on **dev deployment** first
✅ Log all agent actions for **audit trail**
✅ Use **transactions** for multi-step operations

### DON'T:
❌ Don't use case-sensitive agent name matching
❌ Don't deploy schema changes without migration plan
❌ Don't assume messages are delivered without status check
❌ Don't use Convex IDs directly in business logic
❌ Don't skip verification for multi-step coordination
❌ Don't make breaking changes to production schema

---

## 🔍 Debugging Guide

### Problem: Agent can't see messages

**Check:**
```bash
# 1. Check if messages exist
npx convex run agentMessaging:getDirectMessages '{"agentName":"evox","unreadOnly":true}'

# 2. Check agent identity
npx convex run agents:get '{"name":"evox"}'

# 3. Check message status
npx convex run messageStatus:getInboxOverview '{"agentName":"evox"}'
```

**Common causes:**
- Agent name case mismatch (EVOX vs evox)
- Wrong deployment (dev vs prod)
- Query function has wrong filter
- Messages sent to different agent ID

---

### Problem: Schema migration failed

**Recovery:**
```bash
# 1. Rollback to previous schema (if possible)
git revert HEAD

# 2. Deploy rollback
npx convex deploy

# 3. Fix migration script

# 4. Test on dev first
CONVEX_DEPLOYMENT=dev npx convex deploy

# 5. If successful, deploy to prod
npx convex deploy --prod
```

---

### Problem: Message status not updating

**Check:**
```bash
# 1. Verify message has status fields
npx convex run agentMessages:getAllMessages | jq '.[0]'

# 2. Check if migration ran
npx convex run migrateMessageStatus:checkMigrationStatus

# 3. Run migration if needed
npx convex run migrateMessageStatus:migrateAll
```

---

## 📚 Related Documents

- [VISION.md](./VISION.md) - Organizational DNA and values
- [EVOX-QUALITY-GUIDELINES.md](./EVOX-QUALITY-GUIDELINES.md) - Quality framework
- [CLAUDE.md](../CLAUDE.md) - Agent rules and territories
- [ADR-001](./decisions/ADR-001.md) - External persistent state
- [ADR-002](./decisions/ADR-002.md) - Hierarchical memory
- [ADR-003](./decisions/ADR-003.md) - Shared communication

---

## 🎯 Conclusion

EVOX's power comes from **3 foundational layers** working together:

1. **Convex Backend** - The nervous system (most critical)
2. **Agent Identity** - The DNA (defines who they are)
3. **Communication** - The coordination protocol

**The UI is just a window into this system.**

Without these cores, EVOX is just a collection of scripts. With them, EVOX becomes an autonomous coordination engine.

**Next Steps:**
1. ✅ Message Status System deployed (Phase 2)
2. 📋 Implement stable Agent IDs (Phase 3)
3. 🚀 Advanced capabilities (Phase 4)

---

**Document Version:** 1.0
**Last Updated:** 2026-02-05
**Maintained By:** MAX (Claude Sonnet 4.5)
**Review Cycle:** Monthly or after major architecture changes
