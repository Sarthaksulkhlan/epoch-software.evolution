# EPOCH

**The AI-native control and intelligence plane for software that never stops changing.**

> *AI can change your software one task at a time. EPOCH makes sure you do not lose the system in the process.*

---

[![IBM Bob 2.0 Hackathon](https://img.shields.io/badge/IBM%20Bob%202.0-Hackathon%20Submission-0062FF?style=flat-square)](https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-339933?style=flat-square)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

---

## What Is EPOCH?

Modern coding agents — including IBM Bob — are remarkably good at individual tasks. They can implement features, fix bugs, and modernize code at extraordinary speed.

The unresolved problem is **long-horizon coherence**: dozens of locally-correct changes accumulate into architectural drift, semantic conflicts, hidden dependencies, and new failure modes. Research confirms this is a frontier-level gap:

| Benchmark | Isolated task | Long-horizon evolution | Gap |
|---|---|---|---|
| SWE-EVO (2025) | ~65% | ~21% | −44pp |
| EvoClaw (2026) | >80% | ≤38% | −42pp |
| RoadmapBench (2026) | — | 39.1% (Claude Opus 4.7) | frontier still fails |

EPOCH solves this by treating the **system trajectory** — not the individual change — as a first-class engineering object.

---

## The Platform: Three Layers, One System

```
┌─────────────────────────────────────────────────────────┐
│                    EPOCH PLATFORM                       │
│                                                         │
│  EVOLUTION PLANE (EPOCH)                                │
│  What has the system become? What could it become?      │
│  mutation graph · trajectory · drift · causal ancestry  │
│  phase detection · counterfactual futures               │
│            ▲ mutations        │ new workflows            │
│  LIFECYCLE PLANE (WEAVE)                                │
│  What are we doing now?                                 │
│  events · context · plan · agents · evidence · gates    │
│            ▲ tasks            │ results                  │
│  EXECUTION FABRIC (IBM Bob 2.0)                         │
│  How do we perform the work?                            │
│  Plan · Agent · subagents · parallel · background       │
│  rollback · workflows · MCP · hooks                     │
└─────────────────────────────────────────────────────────┘
```

**WEAVE** is the lifecycle control plane: it turns requirements, commits, pull requests, and incidents into stateful, evidence-producing workflows.

**EPOCH** is the longitudinal intelligence layer: it records every workflow as a system mutation, models trajectories, detects drift and phase changes, and reconstructs how the current state emerged.

**IBM Bob 2.0** is the execution fabric: it plans, delegates, implements, validates, and rolls back — with full awareness of the system's evolutionary history via the EPOCH-MCP integration.

---

## The Signature Insight

```
A change can be correct.
A system can still be getting worse.
```

The evolution graph makes this visible: click any mutation to see the workflow that created it. Click any incident to trace the mutation ancestry. Drag the time axis to compare two system states.

---

## Quick Start

> **Requirements:** Node.js 22 LTS, pnpm 9+, IBM Bob IDE (v2.0.2+), Git

```bash
# Clone
git clone https://github.com/vighriday/epoch-software-evolution.git
cd epoch-software-evolution

# Install all workspace dependencies
pnpm install

# Seed the database with the sample payment app history (25 mutations)
pnpm seed

# Start API server (port 3000) + EPOCH-MCP server (port 3001) + console (port 5173)
pnpm dev
```

Open `http://localhost:5173` to see the console.

### Run the golden demo

```bash
# Reset to a clean demo state at any time
pnpm demo-reset

# Then open Bob IDE, load the feature-lifecycle workflow
# .bob/workflows/feature-lifecycle.yaml
```

See [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md) for the full scripted walkthrough.

---

## IBM Bob Integration

EPOCH uses **every major Bob 2.0 capability** — not as a peripheral tool but as the execution substrate of the entire platform:

| Bob capability | How EPOCH uses it |
|---|---|
| **Plan mode** | Converts each event + context bundle into a lifecycle plan and task DAG |
| **Agent mode** | Implements proposed mutations on the codebase inside sandbox branches |
| **Subagents** | Each specialist (Security, QA, Historian, Evolution Analyst) runs as a spawned subagent |
| **Parallel execution** | Security + QA + Historian run concurrently on every workflow |
| **Background tasks** | Trajectory analysis and counterfactual simulations run while the console stays interactive |
| **Document understanding** | Reads PRDs, ADRs, incident reports, and this PDF as context |
| **Rollback** | Experiment on counterfactual branches; restore on failure |
| **Reusable workflows** | Feature-lifecycle and incident-remediation paths packaged as Bob workflows |
| **MCP tools** | EPOCH-MCP exposes 5 tools: Bob queries mutation history before every change |
| **Hooks** | `PostFileSave` triggers drift check; `PostTaskExec` commits mutation record |

All Bob sessions are logged to `.bob/sessions/` with purpose and outcome — see [docs/BOB_SESSIONS.md](docs/BOB_SESSIONS.md).

---

## Console: Four Lenses

| Lens | URL | Question answered |
|---|---|---|
| **CURRENT** | `/` | What is happening right now? |
| **HISTORY** | `/history` | How did we get here? |
| **TRAJECTORY** | `/trajectory` | What is the system becoming? |
| **FUTURES** | `/futures` | What could happen next? |

The **TRAJECTORY** lens is the signature view: a time-aware, interactive graph of components, mutations, incidents, invariants, and epoch boundaries — built with React Flow.

---

## Project Structure

```
epoch/
├── ARCHITECTURE.md      ← authoritative system architecture (20 sections)
├── DECISIONS.md         ← 25 Architecture Decision Records
├── CHANGELOG.md         ← version history
│
├── src/
│   ├── core/weave/      ← lifecycle control plane (FSM, context, approval gate)
│   ├── core/epoch/      ← evolution intelligence (mutations, trajectory, drift)
│   ├── agents/          ← 8 specialist agent implementations
│   ├── graph/           ← evolution graph (mutations, drift, causal, simulation)
│   ├── console/         ← React 18 four-lens UI
│   ├── api/             ← Hono REST + SSE + EPOCH-MCP server
│   ├── store/           ← SQLite persistence
│   └── sandbox/         ← Git branch isolation manager
│
├── packages/
│   └── sample-app/      ← seeded payment app (25-mutation demo history)
│
├── .bob/
│   ├── workflows/       ← Bob reusable workflow definitions
│   ├── skills/          ← Bob custom skill definitions
│   └── sessions/        ← Bob session logs (judge evidence)
│
└── docs/
    ├── DEMO_GUIDE.md    ← timestamped golden demo script
    ├── BOB_SESSIONS.md  ← IBM Bob usage log
    ├── DATA_MODEL.md    ← entity schemas + ER diagram
    ├── AGENTS.md        ← multi-agent contracts
    └── RESEARCH_NOTES.md← academic + IBM source citations
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Language | TypeScript 5.5 | Single language across all layers; first-class Bob context |
| Runtime | Node.js 22 LTS | Zero additional runtime setup |
| Backend | Hono | Lightweight, first-class TypeScript, built-in SSE |
| Frontend | React 18 + Vite | Fast HMR; zero config |
| Graph UI | React Flow | Purpose-built interactive graph; custom node types |
| Charts | Recharts | React-native, free, zero config |
| Persistence | SQLite (better-sqlite3) | Zero infrastructure; recursive CTEs for graph traversal |
| Validation | Zod | Single source of truth for types + runtime validation |
| Styling | Tailwind CSS | Zero-build-cost; "mission control" aesthetic |
| Testing | Vitest | ESM-native; Jest-compatible API |
| Monorepo | pnpm workspaces | Fast installs; clean package isolation |

Zero Docker. Zero cloud services. Zero credentials required. `pnpm install && pnpm dev`.

---

## Scripts

```bash
pnpm dev          # Start API + MCP server + console concurrently
pnpm build        # Build all packages
pnpm test         # Run all tests (single pass)
pnpm typecheck    # tsc --noEmit across all packages
pnpm seed         # Seed database with 25-mutation sample app history
pnpm demo-reset   # Wipe and re-seed database (< 5 seconds)
pnpm migrate      # Run pending database migrations
```

---

## Key Documentation

| Document | Contents |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full system architecture: layers, components, data flows, SQL schema, API, console design |
| [DECISIONS.md](DECISIONS.md) | 25 ADRs: every technology and design choice with rationale and alternatives considered |
| [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md) | Timestamped golden demo script; judge Q&A preparation; clean-run instructions |
| [docs/BOB_SESSIONS.md](docs/BOB_SESSIONS.md) | Complete IBM Bob session log with tool calls, outcomes, and evidence |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | All 12 entity types: fields, constraints, relationships, ER diagram |
| [docs/AGENTS.md](docs/AGENTS.md) | 8 specialist agent contracts: inputs, outputs, guardrails, communication pattern |
| [docs/RESEARCH_NOTES.md](docs/RESEARCH_NOTES.md) | 9 cited sources backing every benchmark claim and positioning statement |
| [CHANGELOG.md](CHANGELOG.md) | Complete version history with all additions and changes |

---

## Why This Wins

EPOCH is not another AI coding assistant. The positioning is precise:

> **WEAVE** is the execution/control plane.  
> **EPOCH** is the longitudinal intelligence layer.  
> **Bob** is the execution fabric.  
> **The product is the combination** — and nothing else on the market does what the combination does.

| Judging criterion | EPOCH's answer |
|---|---|
| **Tool usage & depth of adoption (30%)** | Bob is the execution substrate: Plan, Agent, subagents, parallel work, background tasks, documents, rollback, workflows, MCP, and hooks — all used in the single golden demo path |
| **Innovation & use case relevance (30%)** | The central object is the evolving software trajectory, not the individual code change — a genuinely new abstraction built on top of Bob's capabilities |
| **Functionality & technical execution (30%)** | `pnpm demo-reset && pnpm dev` → full golden demo in under 5 minutes; deterministic, replayable, evidence-backed |
| **Presentation & clarity (10%)** | A 4-lens mission-control console with a visual evolution graph; story arc from "locally correct" to "globally worse" to "corrected trajectory" |

---

## Hackathon Submission

- **Event:** IBM Bob 2.0 Hackathon — lablab.ai  
- **Build window:** September 25–27, 2026 (48 hours)  
- **Team:** vighriday  
- **Category:** AI-assisted software development  

---

## License

MIT — see [LICENSE](LICENSE)
