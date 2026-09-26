# EPOCH — Architecture Document

> **"AI can change your software one task at a time. EPOCH makes sure you do not lose the system in the process."**

**Version:** 1.0.0  
**Status:** Authoritative  
**Last updated:** 2026-09-26  
**Prepared for:** IBM Bob 2.0 Hackathon — lablab.ai  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [The Core Problem This Architecture Solves](#2-the-core-problem-this-architecture-solves)
3. [Three-Layer Mental Model](#3-three-layer-mental-model)
4. [Component Map](#4-component-map)
5. [Technology Stack & Rationale](#5-technology-stack--rationale)
6. [Layer 1 — WEAVE: Lifecycle Control Plane](#6-layer-1--weave-lifecycle-control-plane)
7. [Layer 2 — EPOCH: Longitudinal Intelligence Plane](#7-layer-2--epoch-longitudinal-intelligence-plane)
8. [Layer 3 — IBM Bob 2.0: Execution Fabric](#8-layer-3--ibm-bob-20-execution-fabric)
9. [Multi-Agent System Design](#9-multi-agent-system-design)
10. [The Evolution Graph](#10-the-evolution-graph)
11. [Data Flow: End-to-End](#11-data-flow-end-to-end)
12. [The Two-Speed Control Loop](#12-the-two-speed-control-loop)
13. [Persistence & State Store](#13-persistence--state-store)
14. [Console: Four-Lens UI Architecture](#14-console-four-lens-ui-architecture)
15. [API Layer](#15-api-layer)
16. [Sandbox & Isolation Model](#16-sandbox--isolation-model)
17. [Security & Governance Boundaries](#17-security--governance-boundaries)
18. [Comparison: EPOCH vs Existing Tooling](#18-comparison-epoch-vs-existing-tooling)
19. [Hackathon MVP Scope vs Full Platform](#19-hackathon-mvp-scope-vs-full-platform)
20. [Project Structure Reference](#20-project-structure-reference)

---

## 1. System Overview

EPOCH is an **AI-native control and intelligence plane for software that never stops changing**.

It merges two complementary layers:

| Layer | Name | Primary Question | Responsibilities |
|---|---|---|---|
| Lifecycle | **WEAVE** | What are we doing now? | Events, context, planning, agent delegation, parallel execution, evidence, approval gates, incident remediation |
| Evolution | **EPOCH** | What has the system become? | Mutation recording, trajectory modelling, drift detection, causal archaeology, counterfactual simulation |
| Future | **EPOCH** | What could the system become? | Forked futures, scenario comparison, trajectory selection |
| Execution | **IBM Bob 2.0** | How do we perform the work? | Plan/Agent modes, subagents, parallel execution, background tasks, document understanding, rollback, workflows |

The insight that drives the entire design:

> **A software change can be locally correct while the system trajectory becomes globally worse.**

EPOCH treats the **trajectory** — not the individual change — as a first-class engineering object.

---

## 2. The Core Problem This Architecture Solves

Modern coding agents (including IBM Bob) are excellent at isolated tasks. The research evidence is unambiguous that they degrade on **long-horizon, multi-step software evolution**:

| Benchmark | Isolated task perf. | Long-horizon perf. | Gap |
|---|---|---|---|
| SWE-EVO (2025) | ~65% | ~21% | −44pp |
| EvoClaw (2026) | >80% | ≤38% | −42pp |
| RoadmapBench (2026) | — | 39.1% (Claude Opus 4.7) | frontier still fails |

This is not a model capability problem. It is an **architecture problem**: agents lack persistent system memory, trajectory awareness, and mutation-causal context.

EPOCH is the persistent layer that fills this gap — not by replacing Bob, but by making Bob's actions meaningful across time.

---

## 3. Three-Layer Mental Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                          EPOCH PLATFORM                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 EVOLUTION PLANE (EPOCH)                      │  │
│  │  mutation graph · trajectory model · drift detector          │  │
│  │  phase detector · causal archaeology · counterfactuals       │  │
│  │  evolution debt model · invariant registry · epoch epochs    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ▲  │                                   │
│                   mutations  │  │ new workflows                     │
│                              │  ▼                                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                LIFECYCLE PLANE (WEAVE)                       │  │
│  │  event intake · context bundles · workflow state machine     │  │
│  │  specialist agents · parallel execution · evidence store     │  │
│  │  approval gates · replay/audit · incident remediation        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ▲  │                                   │
│                   tasks/work │  │ results/evidence                  │
│                              │  ▼                                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              EXECUTION FABRIC (IBM Bob 2.0)                  │  │
│  │  Plan mode · Agent mode · subagents · parallel execution     │  │
│  │  background tasks · document understanding · rollback        │  │
│  │  MCP tools · hooks · Bob Shell · reusable workflows          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Map

```
epoch/
├── src/
│   ├── core/
│   │   ├── weave/                  # Lifecycle control plane
│   │   │   ├── event-intake.ts     # Event ingestion + normalisation
│   │   │   ├── context-builder.ts  # Repo + requirement context bundles
│   │   │   ├── workflow-engine.ts  # State machine: PENDING→ACTIVE→…→DONE
│   │   │   ├── task-graph.ts       # DAG of tasks per workflow
│   │   │   ├── approval-gate.ts    # Human / policy approval surface
│   │   │   └── replay.ts           # Deterministic workflow replay
│   │   ├── epoch/                  # Evolution intelligence plane
│   │   │   ├── mutation-engine.ts  # Converts workflow outcomes → mutations
│   │   │   ├── trajectory.ts       # Tracks system state over mutations
│   │   │   ├── invariant-store.ts  # Machine-readable system invariants
│   │   │   ├── epoch-detector.ts   # Detects regime / phase changes
│   │   │   └── debt-model.ts       # Evolution debt accumulation
│   │   └── events/
│   │       ├── bus.ts              # Internal event bus (EventEmitter3)
│   │       └── schema.ts           # Canonical event schema (Zod)
│   │
│   ├── agents/                     # Specialist agent implementations
│   │   ├── historian/              # Git history + prior workflow context
│   │   ├── security/               # Diff + dependency vulnerability scan
│   │   ├── qa/                     # Test generation + coverage evidence
│   │   ├── release/                # Build + deploy artifact production
│   │   ├── incident/               # Alert → reproduction → patch plan
│   │   ├── evolution/              # Trajectory + drift analysis
│   │   ├── counterfactual/         # Forked-future simulation
│   │   └── synthesis/              # Evidence aggregation → next action
│   │
│   ├── graph/                      # Evolution graph subsystem
│   │   ├── mutations/              # Mutation CRUD + indexing
│   │   ├── trajectory/             # Trajectory point computation
│   │   ├── drift/                  # Drift pattern detectors
│   │   ├── causal/                 # Causal archaeology traversal
│   │   └── simulation/             # Counterfactual branch management
│   │
│   ├── console/                    # Four-lens UI
│   │   ├── views/                  # CURRENT / HISTORY / TRAJECTORY / FUTURES
│   │   └── components/             # Evolution graph renderer, timeline, etc.
│   │
│   ├── api/                        # HTTP API (Hono)
│   │   ├── routes/                 # /events  /workflows  /mutations  /graph
│   │   └── middleware/             # Auth, logging, error handling
│   │
│   ├── store/                      # Persistence (SQLite + JSON-LD graph)
│   ├── sandbox/                    # Isolated branch execution environment
│   └── shared/
│       ├── types/                  # Core TypeScript types
│       ├── schema/                 # Zod schemas for all entities
│       └── utils/                  # Hashing, diffing, formatting
│
├── packages/
│   └── sample-app/                 # Seeded payment app (demo substrate)
│       ├── src/                    # The realistic target codebase
│       └── history/                # Pre-seeded mutation history (~25 entries)
│
├── .bob/
│   ├── workflows/                  # Bob reusable workflow definitions
│   ├── skills/                     # Bob custom skill definitions
│   └── sessions/                   # Bob session logs (judge evidence)
│
├── docs/                           # Supporting documentation
├── tests/                          # Unit / integration / e2e
└── scripts/                        # Seed, migrate, demo-reset scripts
```

---

## 5. Technology Stack & Rationale

Every choice below is deliberate, free-tier-safe, and optimised for a 48-hour build.

### Runtime & Language

| Choice | Rationale | Alternative considered | Why rejected |
|---|---|---|---|
| **TypeScript 5.5** | Single language across frontend + backend. Strong typing catches integration bugs fast. Bob works natively in TS repos. | Python | Two-language context is harder for Bob's subagents to reason across in 48h |
| **Node.js 22 LTS** | Stable, native fetch, built-in test runner. No extra runtime setup. | Deno / Bun | Less Bob context available; Bun has edge cases on Windows |
| **ES Modules (ESM)** | Clean, future-proof, compatible with modern tooling. | CommonJS | CJS is legacy; mixing causes friction |

### Backend Framework

| Choice | Rationale |
|---|---|
| **Hono** | Ultra-lightweight (~14kb), runs on Node/Bun/Edge, first-class TypeScript, zero config. Handles REST + SSE in one framework. Chosen over Fastify for simplicity in a 48h build. |

### Frontend / Console

| Choice | Rationale |
|---|---|
| **React 18 + Vite** | Fast HMR, trivial setup, massive ecosystem. Vite's dev server requires zero config. |
| **TanStack Query** | Async state management for the event-driven console; avoids Redux boilerplate. |
| **Recharts** | Zero-cost, React-native charting for trajectory graphs and drift timelines. |
| **React Flow** | Best-in-class graph visualisation for the evolution graph (the signature UI object). Free tier covers our needs completely. |
| **Tailwind CSS** | Zero-build-cost styling. Console needs "mission control" aesthetics, not a design system. |

### Persistence

| Choice | Rationale |
|---|---|
| **SQLite (via better-sqlite3)** | Zero infrastructure. Runs embedded. Fast synchronous reads. Perfect for a single-node demo. Full SQL for querying mutation history, trajectory points, evidence. |
| **JSON-LD graph overlay** | Mutation/causality relationships stored as a JSON-LD adjacency structure in SQLite (serialised). Avoids Neo4j dependency entirely while preserving graph semantics. Can be queried with recursive CTEs. |

> **Why not PostgreSQL?** Requires a running server, credentials, and setup time. SQLite embedded in the Node process = zero infrastructure, instant demo reset via `scripts/seed.ts`.

> **Why not Neo4j / graph DB?** Requires Docker or a paid cloud instance. Recursive CTEs in SQLite handle the graph traversal we need at demo scale. Switching to Neo4j in Phase 2 is a one-file swap (see [ADR-007](DECISIONS.md)).

### Agentic / Bob Integration

| Choice | Rationale |
|---|---|
| **IBM Bob IDE** | Required by hackathon. Used for plan mode, subagent spawning, parallel execution, background tasks, rollback, and reusable workflows. All Bob sessions logged to `.bob/sessions/`. |
| **Bob MCP tools** | Custom MCP server exposes EPOCH's mutation graph and workflow API to Bob directly. Bob can query "what mutations touched this file?" mid-session. |
| **Bob Hooks** | `PostFileSave` hook triggers a lightweight drift check on every file Bob writes. Evidence that Bob + EPOCH are integrated, not adjacent. |
| **Bob Workflows** | Golden-path lifecycle workflow packaged as a reusable Bob workflow (`.bob/workflows/feature-lifecycle.yaml`). Judges can replay the exact golden demo from a clean state. |

### Testing

| Choice | Rationale |
|---|---|
| **Vitest** | Zero-config, ESM-native, compatible with Vite. `--run` flag for CI. No watch-mode needed for submission. |
| **Supertest** | HTTP integration tests against the Hono API with no running server needed. |

### Dev Tooling

| Choice | Rationale |
|---|---|
| **pnpm workspaces** | Monorepo management. Handles `packages/sample-app` alongside the main source. Fast installs. |
| **tsx** | Run TypeScript directly without a compilation step during development. |
| **Zod** | Runtime schema validation. All event/entity payloads validated at the boundary. Generates TypeScript types automatically. |

---

## 6. Layer 1 — WEAVE: Lifecycle Control Plane

WEAVE answers: **"What are we doing right now?"**

### Workflow State Machine

```
PENDING ──► CONTEXT_LOADING ──► PLANNING ──► DELEGATING
                                                  │
                              ┌───────────────────┘
                              ▼
                          EXECUTING (parallel agent tasks)
                              │
                              ▼
                          VERIFYING ──► AWAITING_APPROVAL
                              │                │
                              ▼                ▼
                          COMPLETED        REJECTED
                              │
                              ▼
                    [EPOCH receives mutation]
```

### Event Intake

Every workflow is triggered by a normalised `Event` entity. Supported event sources:

| Source | Event Type | Example payload |
|---|---|---|
| Requirement / PRD | `requirement.created` | Feature description, acceptance criteria |
| Git commit | `commit.pushed` | SHA, diff, branch, author |
| Pull request | `pr.opened` / `pr.merged` | PR body, files changed, CI status |
| Release signal | `release.triggered` | Version, environment, rollback ref |
| Runtime alert | `incident.detected` | Alert source, component, severity |
| Manual trigger | `workflow.manual` | User-specified scope and intent |

### Context Bundle

Before planning, WEAVE assembles a **context bundle** with provenance:

```typescript
interface ContextBundle {
  repository: RepoSnapshot;          // current HEAD, file tree digest
  requirements: Requirement[];       // parsed from event payload or linked docs
  priorMutations: MutationSummary[]; // last N mutations from EPOCH graph
  relevantTests: TestFile[];         // test files related to changed components
  invariants: Invariant[];           // active invariants for affected components
  telemetry?: TelemetrySnapshot;     // runtime signals if incident-triggered
  provenance: ProvenanceRecord[];    // source reference for every item
}
```

### Specialist Agent Delegation

WEAVE dispatches independent tasks to specialist agents (see [Section 9](#9-multi-agent-system-design)). Independent tasks run **in parallel** using Bob's parallel execution capability. Dependencies are encoded in the task DAG.

### Approval Gate

Consequential actions (commits, deployments, remediation patches) stop at a human/policy gate before proceeding. Gate state is persisted and replayable. This is a **hard boundary** — the system cannot autonomously cross it.

### Evidence Store

Every agent produces structured `Evidence` entities linked to `Claims`. Evidence is immutable once written. The separation of observation from interpretation is enforced at the schema level:

```typescript
type EvidenceStatus = 
  | "observed"      // directly measured fact
  | "inferred"      // model-derived, labelled as inference
  | "hypothesised"; // candidate explanation, requires support
```

---

## 7. Layer 2 — EPOCH: Longitudinal Intelligence Plane

EPOCH answers: **"What has the system become, and what could it become?"**

### Mutation Engine

When a WEAVE workflow completes, the mutation engine converts its outcome into a structured `Mutation` record:

```
Workflow completion event
        │
        ▼
Extract: intent, affected components, evidence refs, structural delta
        │
        ▼
Compute: scope fingerprint (which components, how many files, what kind of change)
        │
        ▼
Link: to prior mutations via shared component nodes
        │
        ▼
Write: Mutation record to evolution graph
        │
        ▼
Trigger: trajectory recalculation
```

### Trajectory Engine

The trajectory engine maintains a rolling `TrajectoryPoint` for the system after each mutation:

```typescript
interface TrajectoryPoint {
  timestamp: Date;
  mutationId: string;
  stateHash: string;             // hash of structural fingerprint
  couplingScore: number;         // cross-component dependency density
  boundaryIntegrityScore: number;// fraction of invariants still holding
  behaviorSignature: string;     // derived from test results + runtime signals
  driftDelta: number;            // change in drift score since last point
  epochId: string;               // which epoch this point belongs to
}
```

### Drift Detector

The drift detector runs a suite of **deterministic pattern checkers** against the current trajectory. For the MVP, three patterns are implemented with full evidence chains:

| Pattern | Signal | Threshold |
|---|---|---|
| **Boundary erosion** | Rising count of direct cross-service data access bypassing a declared boundary | >2 violations per 5 mutations |
| **Invariant weakening** | Exception count around a declared business rule grows | >1 erosion event per 3 mutations |
| **Dependency growth** | A component's fan-out degree rises across consecutive mutations | +20% over 5-mutation window |

Each drift finding includes: pattern name, first detected mutation, evidence chain, current severity (`warning` / `critical`), and a candidate remediation workflow.

### Phase / Epoch Detector

The phase detector proposes a new **epoch boundary** when structural or behavioural properties change beyond a configurable threshold. An epoch is a period of relative stability. Boundaries become visible in the evolution graph as vertical separators.

### Causal Archaeology

Causal archaeology traverses the evolution graph **backward** from a symptom to find the earliest plausible mutation in the causal chain:

```
Current symptom (drift finding or incident)
        │
        ▼
Identify affected component node
        │
        ▼
BFS/DFS backward through mutation graph edges
        │
        ▼
Score candidate mutations:
  - temporal proximity
  - component overlap
  - intent-outcome mismatch
  - downstream incident correlation
        │
        ▼
Return: ranked candidate causal chain
  (labelled "candidate", never "proven")
```

Language discipline is enforced: the system uses "earliest plausible mutation" and "candidate causal chain", never asserting mathematical proof of causality.

### Counterfactual Simulator

When a risky trajectory is detected, the simulator forks the system into isolated candidate futures:

```
Risky trajectory detected
        │
        ▼
Identify decision point (the mutation or set of mutations to replay differently)
        │
        ▼
For each scenario (default: 2 scenarios + current path):
  1. Clone base state (sandbox branch)
  2. Apply scenario-specific mutation variant
  3. Run Bob in Agent mode with scenario constraints
  4. Collect evidence (tests, structural metrics, drift delta)
  5. Return: scenario comparison card
        │
        ▼
Present to human: evidence + trade-offs
Human selects trajectory → new WEAVE workflow
```

Simulations are labelled as scenarios. They are used **comparatively**, not as production truth.

### Evolution Debt Model

Evolution debt tracks accumulated divergence across six dimensions (architecture, business rules, dependencies, runtime behaviour, knowledge, and agentic drift). Each dimension has a running score and a linked mutation chain explaining how the debt accumulated.

---

## 8. Layer 3 — IBM Bob 2.0: Execution Fabric

Bob is not a peripheral tool. It is the **execution substrate** for all agentic work inside the platform.

### How EPOCH uses every major Bob capability

| Bob capability | Where EPOCH uses it | Judge-visible proof |
|---|---|---|
| **Plan mode** | Converts event + context bundle into lifecycle plan and task graph | Plan graph rendered in CURRENT console view before execution |
| **Agent mode** | Implements or modifies mutations on the codebase | Repository diff linked to workflow record |
| **Subagents** | Each specialist (Security, QA, Historian, Evolution) runs as a spawned subagent | Independent task cards with concurrent timestamps |
| **Parallel execution** | Security + QA + Historian run concurrently on every workflow | Parallel timestamps in evidence store |
| **Background tasks** | Evolution graph computation and counterfactual simulations run in background | Simulation remains active while console stays interactive |
| **Document understanding** | Reads PRDs, ADRs, incident reports, this PDF | Context references shown with provenance in context bundle |
| **Rollback** | Experiment on counterfactual branches; restore on failure | Reversible mutation path visible in HISTORY view |
| **Reusable workflows** | Feature-lifecycle and incident-remediation golden paths packaged as Bob workflows | `./bob/workflows/` — judges can replay the demo on a clean state |
| **MCP / tools** | Custom MCP server exposes EPOCH's mutation graph and invariant store to Bob | Explicit tool call log in Bob session |
| **Hooks** | `PostFileSave` triggers lightweight drift check; `PostTaskExec` commits mutation record | Hook definitions in `.bob/workflows/hooks.json` |

### Bob MCP Server (EPOCH-MCP)

EPOCH exposes a lightweight MCP server so Bob can query the evolution graph mid-session:

```
Tools exposed:
  get_mutation_history(component, limit)     → recent mutations for a component
  check_invariants(components[])             → active invariants and current status
  get_trajectory_snapshot()                  → current trajectory point + drift score
  list_active_workflows()                    → in-progress WEAVE workflows
  get_causal_chain(symptom)                  → candidate causal chain from symptom
```

This means Bob is not just writing code — it is writing code **with awareness of what the code has historically meant to the system**. That is the key differentiator.

---

## 9. Multi-Agent System Design

All agents operate under strict contracts. No agent can claim certainty it did not observe. No agent silently succeeds.

| Agent | Primary input | Output contract | Guardrail |
|---|---|---|---|
| **Historian** | Git log, PRs, ADRs, prior workflow records | Relevant history with source provenance | Read-only access. Source reference required for every claim. |
| **Context / Requirements** | PRD, issue body, policy docs | Structured requirements + acceptance criteria | Must surface missing or ambiguous context explicitly. |
| **Security** | Diff, dependency tree, policy rules | Findings, severity, evidence references | No silent approval. Unknown = unreviewed, not safe. |
| **QA** | Requirements, diff, existing tests | Tests, mocks, results, coverage evidence | Reproducible outputs required. Flaky = failure. |
| **Release** | Validated change, env config | Build + deploy artefacts | Hard stop at approval gate. No autonomous deploy. |
| **Incident** | Alert, logs, recent mutations | Reproduction steps, candidate cause, patch plan | Candidate explanation only, not asserted root cause. |
| **Evolution Analyst** | Mutation history, architecture model, runtime signals | Drift findings, trajectory analysis | Must separate observed fact from model inference. |
| **Counterfactual Engineer** | Proposed mutation + baseline state | Alternative futures with evidence | Sandbox only. No production access. |
| **Adversarial Maintainer** | Current trajectory + stated assumptions | Failure paths, counterexamples | Goal is falsification, not confirmation. |
| **Synthesis (Bob)** | All specialist evidence | Next lifecycle action + review package | Must preserve source evidence chain. Cannot summarise away uncertainty. |

### Agent Communication Pattern

Agents do not communicate directly. They write to the **evidence store** and read from the **context bundle** provided by WEAVE. This prevents agent-to-agent hallucination chains and ensures every claim is traceable to a source artefact.

```
WEAVE
  │
  ├──► [Context Bundle] ──► Agent A ──► Evidence(A) ──► Evidence Store
  │                    ──► Agent B ──► Evidence(B) ──► Evidence Store
  │                    ──► Agent C ──► Evidence(C) ──► Evidence Store
  │
  └──► Synthesis Agent reads Evidence Store ──► Decision Package ──► Approval Gate
```

---

## 10. The Evolution Graph

The evolution graph is the most distinctive data object in the platform. It is a **time-aware, component-labelled, mutation-linked graph** stored in SQLite with a JSON-LD adjacency overlay.

### Node Types

| Node type | Represents | Key fields |
|---|---|---|
| `Component` | A software component (service, module, schema) | id, name, layer, current_invariants |
| `Mutation` | A completed workflow's effect on the system | id, intent, touched_components, evidence_refs, trajectory_delta |
| `Incident` | A production failure or anomaly | id, signal, affected_component, reproduction_ref, mutation_ancestry |
| `Invariant` | A property that must remain true | id, statement, owner, current_status, violation_mutations |
| `Epoch` | A stable system regime | id, start_mutation, end_mutation, defining_properties |
| `Decision` | A human or policy gate outcome | id, actor, action, rationale, scope |

### Edge Types

| Edge | From → To | Meaning |
|---|---|---|
| `TOUCHES` | Mutation → Component | This mutation modified this component |
| `CAUSED_BY` | Incident → Mutation | Candidate causal link (labelled with confidence) |
| `WEAKENS` | Mutation → Invariant | This mutation degraded this invariant |
| `FOLLOWS` | Mutation → Mutation | Temporal sequencing |
| `SPAWNED` | Mutation → Mutation | Counterfactual branch relationship |
| `BOUNDARY` | Epoch → Epoch | Regime transition |

### Visual Layout

```
TIME ──────────────────────────────────────────────────────────────────►

EPOCH 1: Monolith          │ EPOCH 2: Event-driven         │ EPOCH 3: ...
                           │                               │
API      ○──○────○─────────┤────○──────○──────────────────┤────○──
         M1 M2  M3         │   M8      M12                 │   M21
                           │                               │
AUTH     ○────○────○───────┤──────○────────X────○──────────┤────○──
         M1  M4   M5       │     M9        ^    M14        │   M22
                           │               │               │
DATA     ○──○──────○───────┤───○───────────○──────────────┤────○──
         M1 M2     M6      │  M10          ↑              │   M23
                           │          INC-3312            │
                           │     (causal link to M9)      │
                                                           │
         ← click mutation: open WEAVE workflow             │
         ← click X: causal archaeology trace               │
         ← drag: compare two states                        │
         ← right-click: fork counterfactual future         │
```

---

## 11. Data Flow: End-to-End

```
1. EVENT INTAKE
   ┌─────────────────────────────────┐
   │ Requirement / PR / Alert arrives │
   │ → normalised to Event entity    │
   │ → written to event log (immut.) │
   └────────────────┬────────────────┘
                    │
2. CONTEXT ASSEMBLY │
   ┌────────────────▼────────────────┐
   │ Git snapshot + prior mutations  │
   │ + invariants + telemetry        │
   │ → ContextBundle with provenance │
   └────────────────┬────────────────┘
                    │
3. BOB PLAN MODE    │
   ┌────────────────▼────────────────┐
   │ Bob reads ContextBundle         │
   │ + queries EPOCH-MCP for history │
   │ → lifecycle plan + task DAG     │
   └────────────────┬────────────────┘
                    │
4. PARALLEL AGENT EXECUTION
   ┌────────────────▼────────────────┐
   │ Bob spawns subagents:           │
   │  [Historian] [Security] [QA]    │
   │  run concurrently               │
   │ → structured Evidence entities  │
   │   written to evidence store     │
   └────────────────┬────────────────┘
                    │
5. BOB AGENT MODE   │
   ┌────────────────▼────────────────┐
   │ Bob implements proposed mutation│
   │ inside sandbox branch           │
   │ → diff, test results, artefacts │
   └────────────────┬────────────────┘
                    │
6. VERIFICATION     │
   ┌────────────────▼────────────────┐
   │ QA agent runs tests             │
   │ Security agent rescans diff     │
   │ Evidence Store updated          │
   └────────────────┬────────────────┘
                    │
7. APPROVAL GATE    │
   ┌────────────────▼────────────────┐
   │ Human reviews decision package  │
   │ Approves or rejects with reason │
   │ Gate state persisted + replayable│
   └────────────────┬────────────────┘
                    │  (approved)
8. MUTATION RECORD  │
   ┌────────────────▼────────────────┐
   │ Mutation engine extracts:       │
   │  intent, scope, evidence refs,  │
   │  structural delta               │
   │ → Mutation written to graph     │
   │ → TrajectoryPoint computed      │
   └────────────────┬────────────────┘
                    │
9. DRIFT ANALYSIS   │
   ┌────────────────▼────────────────┐
   │ Drift detector runs patterns    │
   │ Phase detector checks thresholds│
   │ If drift found:                 │
   │   → Evolution Analyst subagent  │
   │   → Causal archaeology          │
   │   → Counterfactual simulation   │
   └────────────────┬────────────────┘
                    │ (if risky trajectory)
10. CORRECTIVE LOOP │
   ┌────────────────▼────────────────┐
   │ EPOCH proposes remediation      │
   │ → new WEAVE workflow triggered  │
   │ → loop continues from step 1    │
   └─────────────────────────────────┘
```

---

## 12. The Two-Speed Control Loop

| Speed | State machine | Purpose | Trigger |
|---|---|---|---|
| **Micro / workflow** | Observe → Understand → Plan → Delegate → Execute → Verify → Decide | Complete the current engineering task | Every event |
| **Macro / evolution** | Stable → Mutating → Drifting → Transitioning → New Epoch | Understand the long-term state of the software system | After every mutation |
| **Future / simulation** | Hypothesis → Fork → Execute → Compare → Select | Explore alternate trajectories before committing | When drift is detected |

These loops are not separate systems. They share the same event bus, the same evidence store, and the same persistence layer. A macro-loop finding (drift detected) always produces a micro-loop trigger (new remediation workflow).

---

## 13. Persistence & State Store

All state is stored in a **single embedded SQLite database** at `data/epoch.db`. Zero external infrastructure.

### Core tables

```sql
-- Immutable event log
CREATE TABLE events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  repo TEXT,
  branch TEXT,
  payload TEXT NOT NULL  -- JSON
);

-- Workflow lifecycle
CREATE TABLE workflows (
  workflow_id TEXT PRIMARY KEY,
  trigger_event_id TEXT REFERENCES events(event_id),
  status TEXT NOT NULL,  -- PENDING|ACTIVE|VERIFYING|AWAITING_APPROVAL|COMPLETED|REJECTED
  current_stage TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  context_ref TEXT,      -- path to context bundle JSON
  plan_ref TEXT          -- path to Bob plan JSON
);

-- Agent task records
CREATE TABLE tasks (
  task_id TEXT PRIMARY KEY,
  workflow_id TEXT REFERENCES workflows(workflow_id),
  agent_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  input_ref TEXT,
  output_ref TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Evidence (immutable observations)
CREATE TABLE evidence (
  evidence_id TEXT PRIMARY KEY,
  workflow_id TEXT REFERENCES workflows(workflow_id),
  task_id TEXT REFERENCES tasks(task_id),
  claim TEXT NOT NULL,
  status TEXT NOT NULL,  -- observed|inferred|hypothesised
  source_artifact_ref TEXT,
  created_at INTEGER NOT NULL
);

-- Decisions at approval gates
CREATE TABLE decisions (
  decision_id TEXT PRIMARY KEY,
  workflow_id TEXT REFERENCES workflows(workflow_id),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,  -- APPROVED|REJECTED
  rationale TEXT,
  scope TEXT,
  timestamp INTEGER NOT NULL
);

-- Evolution graph: mutations
CREATE TABLE mutations (
  mutation_id TEXT PRIMARY KEY,
  workflow_id TEXT REFERENCES workflows(workflow_id),
  intent TEXT NOT NULL,
  affected_components TEXT NOT NULL,  -- JSON array
  delta_summary TEXT,
  evidence_refs TEXT,  -- JSON array of evidence_ids
  trajectory_delta TEXT,  -- JSON: { couplingDelta, boundaryDelta, behaviorDelta }
  created_at INTEGER NOT NULL,
  epoch_id TEXT
);

-- Evolution graph: adjacency (JSON-LD)
CREATE TABLE graph_edges (
  edge_id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  from_type TEXT NOT NULL,
  to_id TEXT NOT NULL,
  to_type TEXT NOT NULL,
  relationship TEXT NOT NULL,  -- TOUCHES|CAUSED_BY|WEAKENS|FOLLOWS|SPAWNED|BOUNDARY
  confidence REAL DEFAULT 1.0,  -- < 1.0 = inferred
  evidence_ref TEXT,
  created_at INTEGER NOT NULL
);

-- System invariants
CREATE TABLE invariants (
  invariant_id TEXT PRIMARY KEY,
  statement TEXT NOT NULL,
  owner TEXT,
  scope_components TEXT,  -- JSON array
  status TEXT NOT NULL,   -- HOLDING|WEAKENED|VIOLATED
  last_checked_mutation TEXT REFERENCES mutations(mutation_id),
  created_at INTEGER NOT NULL
);

-- Trajectory points (one per mutation)
CREATE TABLE trajectory_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mutation_id TEXT REFERENCES mutations(mutation_id),
  timestamp INTEGER NOT NULL,
  coupling_score REAL,
  boundary_integrity_score REAL,
  drift_delta REAL,
  epoch_id TEXT,
  state_hash TEXT
);

-- Simulations (counterfactual futures)
CREATE TABLE simulations (
  simulation_id TEXT PRIMARY KEY,
  base_mutation_id TEXT REFERENCES mutations(mutation_id),
  hypothesis TEXT NOT NULL,
  scenarios TEXT NOT NULL,  -- JSON array of scenario definitions
  status TEXT NOT NULL,     -- PENDING|RUNNING|COMPLETED|FAILED
  outcome_ref TEXT,         -- path to comparison result JSON
  created_at INTEGER NOT NULL
);
```

### Graph queries (recursive CTEs for causal traversal)

```sql
-- Find all mutations ancestrally related to a given mutation (BFS backward)
WITH RECURSIVE ancestors AS (
  SELECT from_id as mutation_id, 0 as depth
  FROM graph_edges
  WHERE to_id = :start_mutation_id
    AND relationship IN ('FOLLOWS', 'TOUCHES')
  UNION ALL
  SELECT e.from_id, a.depth + 1
  FROM graph_edges e
  JOIN ancestors a ON e.to_id = a.mutation_id
  WHERE a.depth < 10  -- bound depth
)
SELECT DISTINCT mutation_id, depth FROM ancestors ORDER BY depth;
```

---

## 14. Console: Four-Lens UI Architecture

The console is mission control for a living software system, not a chat interface.

### Four lenses

| Lens | Route | Primary question | Key components |
|---|---|---|---|
| **CURRENT** | `/current` | What is happening right now? | Active workflow timeline, live agent task cards, evidence feed, next approval gate |
| **HISTORY** | `/history` | How did we get here? | Mutation list with filtering, workflow replay viewer, decision log, incident timeline |
| **TRAJECTORY** | `/trajectory` | What is the system becoming? | Evolution graph (React Flow), drift indicator panel, invariant health matrix, epoch timeline |
| **FUTURES** | `/futures` | What could happen next? | Counterfactual scenario cards, side-by-side comparison, recommendation panel |

### The evolution graph view (TRAJECTORY lens)

This is the **signature visual** of the platform and the most important thing judges will see. It is rendered with React Flow:

- **X-axis:** time (mutation sequence)
- **Y-axis:** component layers (API, Auth, Data, Events, …)
- **Nodes:** mutations (circles), incidents (red X), decisions (diamonds), epoch boundaries (vertical lines)
- **Edges:** TOUCHES, CAUSED_BY (dashed, with confidence label), WEAKENS
- **Interactions:**
  - Click mutation → open associated WEAVE workflow
  - Click incident → open causal archaeology trace
  - Click invariant → show violation history
  - Drag time range → compare two system states
  - Right-click mutation → fork counterfactual future

### Real-time updates

The console receives live updates via **Server-Sent Events (SSE)** from the API. Workflow state changes, new evidence, drift findings, and simulation results stream into the console without page refreshes.

---

## 15. API Layer

The API is a Hono server exposing REST endpoints + SSE streams.

### Endpoints

```
POST /api/events                    Ingest a new event (triggers workflow)
GET  /api/workflows                 List workflows (paginated, filterable)
GET  /api/workflows/:id             Get workflow detail + task graph
GET  /api/workflows/:id/plan        Get Bob plan for this workflow
POST /api/workflows/:id/approve     Approve a gate decision
POST /api/workflows/:id/reject      Reject a gate decision

GET  /api/mutations                 List mutations (paginated)
GET  /api/mutations/:id             Get mutation detail + evidence
GET  /api/graph                     Get full evolution graph (JSON-LD)
GET  /api/graph/component/:id       Get component subgraph
GET  /api/trajectory                Get current trajectory snapshot
GET  /api/drift                     Get current drift findings

POST /api/simulations               Launch a counterfactual simulation
GET  /api/simulations/:id           Get simulation status + results

GET  /api/stream                    SSE stream for live console updates

GET  /api/invariants                List invariants + current status
POST /api/invariants                Declare a new invariant
```

### MCP Server (Bob integration)

The EPOCH-MCP server is registered as a local MCP server in Bob's configuration. It exposes the five tools listed in [Section 8](#8-layer-3--ibm-bob-20-execution-fabric).

---

## 16. Sandbox & Isolation Model

All mutation experiments and counterfactual simulations run in **isolated Git branches** on the `packages/sample-app` repository:

```
main (production state)
  │
  ├── epoch/sim-A-[simulation_id]   (Scenario A sandbox)
  ├── epoch/sim-B-[simulation_id]   (Scenario B sandbox)
  └── epoch/experiment-[mutation_id] (Mutation experiment)
```

Each sandbox branch:
- Is created from a specific base commit (pinned to a `TrajectoryPoint.stateHash`)
- Runs Bob Agent mode in isolation
- Collects evidence (test results, structural metrics, diff from base)
- Is deleted after simulation completion (results retained in evidence store)

No simulation branch is ever merged to main without a human decision at an approval gate.

---

## 17. Security & Governance Boundaries

| Boundary | Design rule | Implementation |
|---|---|---|
| **Model fallibility** | All AI outputs are proposals, not truth | `EvidenceStatus` type enforces `inferred` / `hypothesised` labels |
| **Production actions** | Never autonomous in the prototype | Hard approval gate before any commit to main |
| **Least privilege** | Agents get read-only access unless the task requires writes | Task input contracts specify access level |
| **Retries** | Bounded; escalate rather than loop | Max 3 retries per task; escalation event on exhaustion |
| **Simulation isolation** | Counterfactuals on sandboxed branches only | Branch naming convention + merge guard |
| **Causality discipline** | Use candidate chains, not causal certainty | Enforced in Evolution Analyst and Incident agent output schemas |
| **Audit** | Every decision and mutation is replayable | Immutable event log + workflow replay engine |
| **Evidence provenance** | Every claim traces to a source artefact | `Evidence.source_artifact_ref` is required, not nullable |

---

## 18. Comparison: EPOCH vs Existing Tooling

This table is designed for judge Q&A. Every answer here maps to a concrete platform capability.

| Tool / category | What it does | What EPOCH adds |
|---|---|---|
| **GitHub Copilot / Cursor / Bob alone** | Generates or modifies code in context of current session | EPOCH gives every Bob action a persistent mutation record and trajectory context across all sessions |
| **GitHub / GitLab (PR review)** | Reviews a single diff | EPOCH evaluates how the diff changes the long-term system trajectory |
| **SonarQube / CodeClimate** | Static analysis snapshot | EPOCH connects static findings to mutation ancestry and trajectory trends |
| **Datadog / Grafana** | Runtime observability | EPOCH closes the loop from runtime incidents back into the mutation chain that enabled them |
| **Architecture diagramming (Mermaid, Structurizr)** | Shows intended current structure | EPOCH models structural change over time and detects divergence from intended design |
| **Linear / Jira** | Tracks tickets and PRs | EPOCH tracks what those tickets actually did to the system and their cumulative effect |
| **LangGraph / CrewAI** | Orchestrates agent workflows | EPOCH provides longitudinal memory and evolutionary context that persists across agent sessions |
| **Git bisect** | Finds the commit that introduced a regression | EPOCH provides weighted causal archaeology across a structured mutation graph, not raw commits |

**The key position:** WEAVE is the execution/control plane. EPOCH is the longitudinal intelligence layer. Bob is the execution fabric. The product is the combination — and none of these individually does what the combination does.

---

## 19. Hackathon MVP Scope vs Full Platform

| Capability | MVP (48h) | Full platform (Phase 2+) |
|---|---|---|
| Sample codebase | One payment app, ~25 seeded mutations | Any repository via adapter |
| Event sources | Manual trigger + seeded history | Git webhooks, CI/CD, PagerDuty, Jira |
| Workflow state machine | Full micro-loop implemented | Policy-driven workflow templates |
| Specialist agents | All 8 agents, simplified implementations | Enterprise-grade agent library |
| Evolution graph | Component + mutation + incident nodes | Full cross-repository graph |
| Drift detector | 3 deterministic patterns | ML-assisted pattern library |
| Causal archaeology | Graph BFS + evidence scoring | LLM-assisted causal ranking |
| Counterfactuals | 2 forked scenarios | N-scenario model predictive |
| Console | 4-lens React app, live SSE | Production design system |
| Bob integration | Plan + Agent + subagents + workflows + MCP | Full Bob enterprise API |
| Persistence | SQLite embedded | PostgreSQL + graph DB |
| Auth | Single-user / local | RBAC, SSO, secrets management |
| Metrics | Wall-clock, manual steps, drift latency | Statistically significant benchmarks |

---

## 20. Project Structure Reference

```
epoch/
├── ARCHITECTURE.md          ← this file
├── DECISIONS.md             ← Architecture Decision Records
├── CHANGELOG.md             ← version history
├── README.md                ← judge-facing overview + demo guide
├── package.json             ← pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
│
├── src/                     ← main platform source
│   ├── core/
│   │   ├── weave/           ← lifecycle control plane
│   │   ├── epoch/           ← evolution intelligence plane
│   │   └── events/          ← event bus + schema
│   ├── agents/              ← 8 specialist agent implementations
│   ├── graph/               ← evolution graph subsystem
│   ├── console/             ← React 18 four-lens UI
│   ├── api/                 ← Hono REST + SSE + MCP server
│   ├── store/               ← SQLite persistence layer
│   ├── sandbox/             ← Git branch isolation manager
│   └── shared/              ← types, schemas, utils
│
├── packages/
│   └── sample-app/          ← seeded payment application (demo substrate)
│       ├── src/             ← realistic payment app source
│       └── history/         ← pre-seeded mutation history JSON
│
├── .bob/
│   ├── workflows/           ← Bob reusable workflow definitions
│   ├── skills/              ← Bob custom skill definitions
│   └── sessions/            ← Bob session logs (judge evidence)
│
├── docs/
│   ├── DEMO_GUIDE.md        ← golden demo script
│   ├── BOB_SESSIONS.md      ← IBM Bob usage log
│   ├── DATA_MODEL.md        ← entity schemas + ER diagram
│   ├── AGENTS.md            ← multi-agent contracts
│   └── RESEARCH_NOTES.md    ← academic + IBM source backing
│
├── tests/
│   ├── unit/                ← Vitest unit tests
│   ├── integration/         ← API + store integration tests
│   └── e2e/                 ← full golden-path e2e test
│
└── scripts/
    ├── seed.ts              ← seeds sample-app with 25 mutations
    ├── demo-reset.ts        ← clean demo state from scratch
    └── migrate.ts           ← database migrations
```

---

*This document is the authoritative architectural reference for EPOCH. All implementation decisions must be consistent with it. Changes to the architecture require a corresponding ADR entry in [DECISIONS.md](DECISIONS.md).*
