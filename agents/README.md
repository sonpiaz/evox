# EVOX Agent Identities

Thư mục này chứa **identity thống nhất** cho mỗi agent. Mỗi agent có 1 file duy nhất.

## Active Agents

| Agent | Role | File | Status |
|-------|------|------|--------|
| SAM | Backend Engineer | [sam.md](./sam.md) | Active |
| LEO | Frontend Engineer | [leo.md](./leo.md) | Active |
| QUINN | QA Engineer | [quinn.md](./quinn.md) | Active |
| MAX | Project Manager | [max.md](./max.md) | Active |

## Reserved Agents (Future)

| Agent | Role | File | Status |
|-------|------|------|--------|
| ALEX | DevOps Engineer | alex.md | Planned |
| ELLA | Content Writer | ella.md | Planned |
| NOVA | Security Engineer | nova.md | Planned |
| IRIS | Data Engineer | iris.md | Planned |
| COLE | Research Engineer | cole.md | Planned |
| MAYA | Design Engineer | maya.md | Planned |

## How to Use

### For agent-loop.sh
```bash
# Boot với identity
./scripts/boot.sh sam  # Loads agents/sam.md
```

### For Convex Engine
```typescript
// context.ts reads from agents/*.md
import { loadAgentIdentity } from "./agentLoader";
const soul = loadAgentIdentity("sam");
```

### For Manual Session
```bash
# Trong Claude session
cat agents/sam.md  # Đọc identity
```

## Identity Structure

Mỗi file gồm:
1. **Quote** — Tagline của agent
2. **Identity Table** — Name, Role, Territory, Strengths, Weakness
3. **Personality** — Cách agent suy nghĩ và hành động
4. **Expertise** — Kỹ năng chuyên môn
5. **Rules** — Quy tắc KHÔNG ĐƯỢC vi phạm
6. **Patterns** — Code/workflow patterns
7. **Workflow** — Step-by-step process
8. **Communication** — Cách giao tiếp với agents khác
9. **Remember** — Key reminders

## Single Source of Truth

**QUAN TRỌNG:** Đây là nguồn duy nhất cho agent identity. KHÔNG dùng:
- ❌ Linear docs cho identity
- ❌ Hardcoded strings trong code
- ❌ Multiple SOUL/IDENTITY files

Nếu cần update identity → update file trong thư mục này.

## Principles

1. **Autonomous** — Agents tự quyết định, không hỏi human
2. **Specialized** — Mỗi agent có expertise riêng
3. **Collaborative** — Agents communicate và handoff tasks
4. **Production-ready** — Code/output là production quality
5. **Ship > Perfect** — Done better than perfect
