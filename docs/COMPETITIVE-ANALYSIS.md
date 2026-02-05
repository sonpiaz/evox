# Competitive Analysis: Agent Orchestration Systems

> **Created by:** COLE | **Date:** 2026-02-05 | **Purpose:** What can we steal? What can we do better?

---

## TL;DR — Actionable Insights

| Steal From | Feature | Priority | Implementation |
|------------|---------|----------|----------------|
| **CrewAI** | Role-based task delegation | P0 | Already have! Enhance with skills matrix |
| **CrewAI** | Hierarchical memory (ChromaDB + SQLite) | P1 | Add vector embeddings for agent memory |
| **LangGraph** | State machine with conditional branches | P0 | Implement graph-based dispatch routing |
| **MetaGPT** | SOP-driven workflows + structured outputs | P1 | Enforce output schemas per agent role |
| **SuperAGI** | Parallel agent execution | P0 | Already have worker pools! Add monitoring |
| **SuperAGI** | Web UI for agent monitoring | P0 | Already have! CEO Dashboard |

**EVOX Advantage:** We're already doing 70% of what competitors offer. Focus on the gaps.

---

## Framework Deep Dive

### 1. CrewAI
*"Role-playing, autonomous AI agents"*

**Architecture:**
- Role-based agents with specialized functions
- Hierarchical process with auto-generated manager
- Manager delegates tasks based on agent capabilities

**Memory System (Best-in-Class):**
```
┌─────────────────────────────────────────┐
│ Short-term: ChromaDB + RAG              │
│ Recent tasks: SQLite                    │
│ Long-term: SQLite (separate table)      │
│ Entity memory: Vector embeddings        │
└─────────────────────────────────────────┘
```

**What to Steal:**
- ✅ Layered memory architecture
- ✅ Automatic manager agent generation
- ✅ Task validation before completion

**What We Do Better:**
- Our real-time dashboard visibility
- Our dispatch queue with priority override
- Our Linear integration for external task tracking

**Sources:** [CrewAI GitHub](https://github.com/crewAIInc/crewAI), [CrewAI Docs](https://docs.crewai.com/), [Memory Deep Dive](https://sparkco.ai/blog/deep-dive-into-crewai-memory-systems)

---

### 2. LangGraph
*"Build resilient language agents as graphs"*

**Architecture:**
- Graph-based workflow: Nodes (agents) + Edges (transitions)
- Centralized StateGraph maintains context
- Conditional branching based on state/outputs

**Key Pattern:**
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Node A  │────▶│  Node B  │────▶│  Node C  │
│ (Agent)  │     │ (Agent)  │     │ (Agent)  │
└──────────┘     └────┬─────┘     └──────────┘
                      │ conditional
                      ▼
                ┌──────────┐
                │  Node D  │
                │ (Fallback)│
                └──────────┘
```

**What to Steal:**
- ✅ Conditional routing based on task state
- ✅ Error recovery branches
- ✅ Parallel node execution

**What We Do Better:**
- Our dispatch queue is simpler and works
- Our agent communication is human-readable
- Our Convex backend provides real-time sync

**Gap to Close:**
- Add conditional routing to dispatch system
- Implement error-triggered fallback dispatches

**Sources:** [LangGraph GitHub](https://github.com/langchain-ai/langgraph), [Architecture Guide](https://latenode.com/blog/langgraph-ai-framework-2025-complete-architecture-guide-multi-agent-orchestration-analysis)

---

### 3. MetaGPT
*"First AI Software Company"*

**Architecture:**
- SOP-encoded workflows (Code = SOP(Team))
- 5 defined roles: PM, Architect, Project Manager, Engineer, QA
- Assembly-line paradigm with structured outputs

**Key Innovation:**
```
User Prompt
    ↓
[Product Manager] → Requirements Doc
    ↓
[Architect] → Design Artifacts + Flowcharts
    ↓
[Project Manager] → Task Breakdown
    ↓
[Engineer] → Code Implementation
    ↓
[QA Engineer] → Testing + Validation
```

**What to Steal:**
- ✅ Structured outputs per role (not just free text)
- ✅ Intermediate artifacts for verification
- ✅ Assembly-line task dependencies

**What We Do Better:**
- Our agents are general-purpose (can adapt)
- Our system supports runtime task creation
- Our Linear integration provides external oversight

**Gap to Close:**
- Define output schemas per agent role
- Require structured handoff documents

**Sources:** [MetaGPT GitHub](https://github.com/FoundationAgents/MetaGPT), [MetaGPT Paper](https://arxiv.org/abs/2308.00352), [IBM Overview](https://www.ibm.com/think/topics/metagpt)

---

### 4. SuperAGI
*"Dev-first autonomous AI agent framework"*

**Architecture:**
- Autonomous agents with continuous execution
- Multi-vector database support (Pinecone, Weaviate, Redis)
- Web UI for monitoring + action console

**Key Features:**
- ✅ Parallel multi-agent execution
- ✅ Performance telemetry
- ✅ Tool marketplace
- ✅ Memory persistence across tasks

**What to Steal:**
- ✅ Performance telemetry dashboard
- ✅ Agent permission controls via UI
- ✅ Tool marketplace concept

**What We Do Better:**
- Our Convex real-time beats their polling
- Our Linear integration is production-grade
- Our CEO dashboard is more actionable

**Gap to Close:**
- Add agent performance metrics to dashboard
- Build tool/skill marketplace

**Sources:** [SuperAGI GitHub](https://github.com/TransformerOptimus/SuperAGI), [SuperAGI Docs](https://superagi.com/docs/)

---

### 5. AutoGPT
*"The OG autonomous agent"*

**Status:** Largely obsolete for production use in 2026

**Historical Contribution:**
- Pioneered autonomous agent loops
- Proved LLMs can decompose and execute tasks
- Inspired entire agent framework ecosystem

**Why We're Better:**
- AutoGPT was a demo, not production software
- No proper task queue or coordination
- No multi-agent support
- No real-time monitoring

**Don't Copy:** Autonomous loops without oversight = disaster

---

## EVOX Advantage Analysis

### What We Already Have (Competitors Don't)

| Feature | EVOX | CrewAI | LangGraph | MetaGPT | SuperAGI |
|---------|------|--------|-----------|---------|----------|
| Real-time dashboard | ✅ | ❌ | ❌ | ❌ | ⚠️ basic |
| Linear integration | ✅ | ❌ | ❌ | ❌ | ❌ |
| CEO-level visibility | ✅ | ❌ | ❌ | ❌ | ❌ |
| Priority override (P0) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Human-in-the-loop | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ |
| Git activity tracking | ✅ | ❌ | ❌ | ✅ | ❌ |
| Cost tracking per task | ✅ | ❌ | ❌ | ❌ | ❌ |

### Gaps to Close (Priority Order)

1. **P0: Conditional Dispatch Routing**
   - Implement: If task fails → route to different agent or escalate
   - Steal from: LangGraph's conditional edges
   - Effort: 2-3 days

2. **P0: Vector Memory for Agents**
   - Implement: ChromaDB or similar for semantic search in agent memory
   - Steal from: CrewAI's layered memory
   - Effort: 3-5 days

3. **P1: Structured Output Schemas**
   - Implement: Define JSON schemas for each agent role's output
   - Steal from: MetaGPT's intermediate artifacts
   - Effort: 1-2 days

4. **P1: Agent Performance Telemetry**
   - Implement: Latency, success rate, cost per task graphs
   - Steal from: SuperAGI's telemetry
   - Already have: performanceMetrics table, just need UI

5. **P2: Tool/Skill Marketplace**
   - Implement: Shareable tools between agents
   - Steal from: SuperAGI's marketplace
   - Effort: 1-2 weeks

---

## Recommendations

### Immediate Actions (This Week)

1. **Add conditional routing to dispatch system**
   - When dispatch fails, auto-route to fallback agent
   - Implement in `convex/dispatches.ts`

2. **Enhance agent memory with embeddings**
   - Use Convex's vector search or external ChromaDB
   - Store semantic embeddings of agent learnings

3. **Define output schemas per role**
   - Sam: API response format
   - Leo: Component props interface
   - Quinn: Test result format
   - Max: Ticket format

### Medium-Term (This Month)

1. Add performance telemetry graphs to CEO Dashboard
2. Implement tool sharing between agents
3. Build agent skill progression system

### Long-Term Vision

**EVOX North Star:** Agents that work like senior engineers — proactive, self-sufficient, high-quality output, 24/7.

**Differentiation:** Unlike generic frameworks, EVOX is:
- **Opinionated**: Built for software development workflows
- **Visible**: CEO can see everything in real-time
- **Integrated**: Linear, GitHub, Vercel — not just LLM wrappers
- **Human-centric**: Designed for oversight, not replacement

---

## Summary

| Framework | Best At | Worst At | Steal This |
|-----------|---------|----------|------------|
| **CrewAI** | Role-based collaboration | Real-time visibility | Memory architecture |
| **LangGraph** | Complex workflows | Simplicity | Conditional routing |
| **MetaGPT** | Structured outputs | Flexibility | Output schemas |
| **SuperAGI** | Parallel execution | Integration depth | Telemetry UI |
| **AutoGPT** | Historical significance | Everything else | Nothing |

**Bottom Line:** EVOX is already ahead in visibility and integration. Close the memory and routing gaps, and we'll be best-in-class.

---

*Last updated: 2026-02-05 by COLE*
*Next review: 2026-02-12*
