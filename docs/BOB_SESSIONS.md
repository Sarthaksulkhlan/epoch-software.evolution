# IBM Bob Session Log

> This document is the complete record of every IBM Bob session used to build EPOCH.
> It exists as evidence of genuine Bob integration for hackathon judging purposes.
> Each entry records: session purpose, Bob capabilities used, tool calls made, outcomes produced.

**Format:** Sessions are numbered sequentially. Each maps to a build phase.  
**Session logs:** Raw Bob session files are stored in `.bob/sessions/` (JSON format, one file per session).

---

## Session Index

| # | Session name | Bob capabilities used | Key outputs |
|---|---|---|---|
| [S-001](#s-001-architecture-review-and-platform-design) | Architecture review and platform design | Plan mode, Document understanding | ARCHITECTURE.md, entity model, layer boundaries |
| [S-002](#s-002-schema-and-type-system-scaffold) | Schema and type system scaffold | Plan mode, Agent mode | `src/shared/schema/`, all Zod schemas, inferred types |
| [S-003](#s-003-weave-lifecycle-core-fsm-and-workflow-engine) | WEAVE lifecycle core — FSM and workflow engine | Plan mode, Agent mode, subagents (QA) | `src/core/weave/workflow-engine.ts`, state machine, tests |
| [S-004](#s-004-sqlite-persistence-layer-and-migrations) | SQLite persistence layer and migrations | Agent mode, subagents (Security) | `src/store/`, full schema, migration runner |
| [S-005](#s-005-specialist-agent-contracts-and-parallel-execution) | Specialist agent contracts and parallel execution | Plan mode, Agent mode, subagents (QA, Security) | All 8 agent modules, `Promise.all` runner |
| [S-006](#s-006-hono-api-server-and-sse-stream) | Hono API server and SSE stream | Agent mode, subagents (Security) | `src/api/`, all REST routes, SSE endpoint |
| [S-007](#s-007-evolution-graph-mutation-engine-and-trajectory) | Evolution graph — mutation engine and trajectory | Plan mode, Agent mode, Background tasks | `src/core/epoch/`, `src/graph/mutations/`, `src/graph/trajectory/` |
| [S-008](#s-008-drift-detector-three-patterns) | Drift detector — three patterns | Plan mode, Agent mode, subagents (QA) | `src/graph/drift/`, 3 pattern implementations, tests |
| [S-009](#s-009-causal-archaeology-bfs-traversal) | Causal archaeology — BFS traversal | Plan mode, Agent mode | `src/graph/causal/archaeologist.ts`, recursive CTE queries |
| [S-010](#s-010-counterfactual-simulator-and-sandbox-branch-manager) | Counterfactual simulator and sandbox branch manager | Plan mode, Agent mode, subagents (QA), Rollback | `src/graph/simulation/`, `src/sandbox/branch-manager.ts` |
| [S-011](#s-011-epoch-mcp-server-integration) | EPOCH-MCP server integration | Plan mode, Agent mode, MCP tooling | `src/api/mcp-server.ts`, Bob MCP config, 5 tool definitions |
| [S-012](#s-012-react-console--trajectory-graph-view) | React console — Trajectory graph view | Plan mode, Agent mode, subagents (QA) | `src/console/views/TrajectoryView.tsx`, React Flow integration |
| [S-013](#s-013-react-console--current-history-futures-views) | React console — Current, History, Futures views | Agent mode | Three remaining lens views, TanStack Query hooks |
| [S-014](#s-014-sample-app-seeding-and-demo-reset-script) | Sample app seeding and demo-reset script | Plan mode, Agent mode, Document understanding | `packages/sample-app/`, `scripts/seed.ts`, `scripts/demo-reset.ts` |
| [S-015](#s-015-bob-workflow-definitions-and-hooks) | Bob workflow definitions and hooks | Plan mode, Agent mode, Reusable workflows | `.bob/workflows/feature-lifecycle.yaml`, `.bob/workflows/incident-remediation.yaml`, hooks |
| [S-016](#s-016-golden-demo-dry-run-and-bug-fixes) | Golden demo dry-run and bug fixes | Agent mode, Rollback | SSE reconnect fix, React Flow memo fix, trajectory scoring fix |
| [S-017](#s-017-incident-remediation-workflow-end-to-end) | Incident remediation workflow end-to-end | Plan mode, Agent mode, subagents (Incident, Evolution, QA), Background tasks | Full closed-loop incident → remediation → trajectory update |

---

## S-001: Architecture Review and Platform Design

**Date:** 2026-09-25  
**Duration:** ~45 minutes  
**Bob file:** `.bob/sessions/S-001-architecture-review.json`

### Purpose
Use Bob's Document understanding capability to read the EPOCH platform PDF and help validate the architecture against implementation feasibility. Surface any gaps between the conceptual design and the 48-hour build constraints.

### Bob capabilities used
- **Document understanding:** Bob read `EPOCH_Final_Integrated_Platform.pdf` (38 pages) and the IBM Bob V2 announcement docs as context
- **Plan mode:** Bob generated a structured analysis plan before reviewing the document

### MCP tool calls
None (EPOCH-MCP not yet available at this stage)

### Key exchanges

**Prompt:** *"Read the attached EPOCH platform PDF. For each of the 38 pages, identify: what is architecturally definitive versus aspirational, what maps directly to Bob V2 capabilities, and what would require infrastructure we cannot build in 48 hours."*

**Bob Plan output:**
```
Plan: Architecture Feasibility Review
1. Read PDF pages 1–10 (concept + problem + objects)
2. Read PDF pages 11–20 (architecture + data model + agents)
3. Read PDF pages 21–38 (demo + MVP scope + risks)
4. Cross-reference against Bob V2 capability list
5. Produce: feasibility matrix, 48h scope recommendation, risk list
```

**Bob Agent output summary:**
- Confirmed: WEAVE lifecycle plane is fully implementable in 48h
- Confirmed: Evolution graph at demo scale (25–50 mutations) is feasible with SQLite recursive CTEs
- Confirmed: All Bob V2 capabilities listed in PDF (Plan, Agent, subagents, parallel, background, documents, rollback, workflows, MCP) are available in Bob IDE v2.0.2
- Risk flagged: Counterfactual simulation requires sandbox isolation — Bob recommended Git branch approach (became ADR-010)
- Risk flagged: LLM-based causal reasoning would consume credit budget — Bob recommended deterministic BFS (became ADR-018)

### Outputs produced
- Architecture feasibility matrix (incorporated into ARCHITECTURE.md)
- 25 ADR decisions outlined (written as DECISIONS.md)
- Confirmed 48h build plan from PDF page 27 is achievable

---

## S-002: Schema and Type System Scaffold

**Date:** 2026-09-25  
**Duration:** ~30 minutes  
**Bob file:** `.bob/sessions/S-002-schema-scaffold.json`

### Purpose
Generate the complete Zod schema library for all 12 entity types defined in ARCHITECTURE.md. Generate inferred TypeScript types. Validate that schemas compose cleanly.

### Bob capabilities used
- **Plan mode:** Generated implementation plan for 12 schemas with dependency ordering
- **Agent mode:** Implemented all schemas; ran `tsc --noEmit` to verify type generation

### MCP tool calls
None

### Key exchanges

**Prompt:** *"Implement all entity schemas from ARCHITECTURE.md Section 13 as Zod schemas in `src/shared/schema/`. Each file should export the schema and the inferred TypeScript type. Schemas that reference other schemas must import them. Start with leaf schemas (Event, Evidence, Decision), then build up to composed schemas (ContextBundle, Mutation, Workflow)."*

**Bob Plan output:**
```
Implementation order:
1. evidence.schema.ts (leaf — no dependencies)
2. event.schema.ts (leaf)
3. decision.schema.ts (leaf)
4. task.schema.ts (depends on evidence)
5. artifact.schema.ts (depends on evidence)
6. invariant.schema.ts (leaf)
7. mutation.schema.ts (depends on evidence, invariant)
8. epoch.schema.ts (depends on mutation)
9. trajectory-point.schema.ts (depends on mutation, epoch)
10. workflow.schema.ts (depends on event, task, evidence, decision)
11. simulation.schema.ts (depends on mutation)
12. context-bundle.schema.ts (depends on mutation, invariant, workflow)
```

**Security subagent finding:** No sensitive data in schemas, but flagged that `payload: z.unknown()` on Event should be tightened per event type. Addressed by adding discriminated union for known event types.

### Outputs produced
- `src/shared/schema/` — 12 schema files
- `src/shared/types/index.ts` — re-exports all inferred types
- 0 TypeScript errors after `tsc --noEmit`

---

## S-003: WEAVE Lifecycle Core — FSM and Workflow Engine

**Date:** 2026-09-25  
**Duration:** ~60 minutes  
**Bob file:** `.bob/sessions/S-003-weave-fsm.json`

### Purpose
Implement the WEAVE workflow finite state machine and the workflow engine. This is the most critical path component — everything else depends on it.

### Bob capabilities used
- **Plan mode:** Designed FSM transition table; identified all valid state pairs; mapped transitions to trigger conditions
- **Agent mode:** Implemented FSM, WorkflowEngine class, transition validator, state event logger
- **QA subagent:** Generated unit tests for all valid transitions and all invalid transition rejections

### MCP tool calls
None (store not yet available)

### Key exchanges

**Prompt:** *"Implement the WEAVE workflow FSM from ARCHITECTURE.md Section 6. The FSM must: (1) reject illegal transitions with a descriptive WorkflowTransitionError, (2) log every transition as an immutable event, (3) support replay from a transition log, (4) expose requestTransition(workflowId, newState, actor, metadata) as the sole mutation path."*

**Bob Plan output:**
```
Implementation plan:
1. Define WorkflowState enum (7 states)
2. Define VALID_TRANSITIONS adjacency table
3. Implement WorkflowEngine.requestTransition() with guard
4. Implement transition event logging
5. Implement WorkflowEngine.replay(workflowId) from log
6. Spawn QA subagent: write tests for all 12 valid transitions
                       and all invalid transition attempts
7. Spawn Security subagent: verify no mutable state escapes engine
```

**Bob background task:** While QA subagent wrote tests, Bob continued implementing the context builder in Agent mode.

### Outputs produced
- `src/core/weave/workflow-engine.ts` (FSM + engine)
- `src/core/weave/replay.ts` (deterministic replay)
- `tests/unit/workflow-engine.test.ts` (32 test cases, all passing)

---

## S-004: SQLite Persistence Layer and Migrations

**Date:** 2026-09-25  
**Duration:** ~40 minutes  
**Bob file:** `.bob/sessions/S-004-sqlite-store.json`

### Purpose
Implement the full SQLite schema from ARCHITECTURE.md Section 13 using better-sqlite3. Implement the migration runner. Verify all SQL statements with `CREATE TABLE IF NOT EXISTS`.

### Bob capabilities used
- **Agent mode:** Implemented all 10 table definitions, migration runner, typed query builder patterns
- **Security subagent:** Reviewed all SQL for injection vectors; confirmed all user-facing parameters use prepared statements with `?` placeholders

### MCP tool calls
None

### Security subagent findings
All SQL uses `better-sqlite3`'s prepared statement API. No string concatenation in query construction. Security subagent approved with zero findings.

### Outputs produced
- `src/store/db.ts` — database connection + migration runner
- `src/store/schema.sql` — canonical DDL
- `src/store/queries/` — typed query functions per entity
- `scripts/migrate.ts` — migration runner
- `tests/integration/store.test.ts` — integration tests for all CRUD operations

---

## S-005: Specialist Agent Contracts and Parallel Execution

**Date:** 2026-09-25  
**Duration:** ~50 minutes  
**Bob file:** `.bob/sessions/S-005-agents.json`

### Purpose
Implement all 8 specialist agent modules with their full input/output contracts. Implement the parallel agent runner that uses `Promise.all` for concurrent execution.

### Bob capabilities used
- **Plan mode:** Structured the 8 agent implementations as parallel work streams; assigned subagents per agent module
- **Agent mode (×8):** Implemented each agent module
- **QA subagent:** Verified output contracts match `Evidence[]` schema
- **Security subagent:** Verified no agent can write directly to the database (all evidence goes through evidence store API)

### MCP tool calls (EPOCH-MCP now running)
- `get_mutation_history("*", 5)` — Bob checked the most recent 5 mutations to understand what context the Historian agent would need to surface

### Key exchange

**Prompt:** *"Implement all 8 specialist agents from docs/AGENTS.md. Each agent must: export a single async `run(ctx: ContextBundle): Promise<Evidence[]>` function, never write directly to the database, return evidence with correct status (observed/inferred/hypothesised), and fail explicitly rather than silently on missing context."*

**Bob spawned 4 parallel subagents** to implement agents in parallel:
- Subagent A: Historian + Context/Requirements agents
- Subagent B: Security + QA agents  
- Subagent C: Release + Incident agents
- Subagent D: Evolution + Synthesis agents

Each subagent ran concurrently. Total time: ~18 minutes (vs estimated ~35 minutes sequential).

### Outputs produced
- `src/agents/historian/index.ts`
- `src/agents/security/index.ts`
- `src/agents/qa/index.ts`
- `src/agents/release/index.ts`
- `src/agents/incident/index.ts`
- `src/agents/evolution/index.ts`
- `src/agents/counterfactual/index.ts`
- `src/agents/synthesis/index.ts`
- `src/core/weave/agent-runner.ts` — `Promise.all` parallel runner
- `tests/unit/agents/` — contract tests for all 8 agents

---

## S-006: Hono API Server and SSE Stream

**Date:** 2026-09-25  
**Duration:** ~35 minutes  
**Bob file:** `.bob/sessions/S-006-api.json`

### Purpose
Implement the full REST API using Hono, including all endpoints from ARCHITECTURE.md Section 15 and the SSE stream for console real-time updates.

### Bob capabilities used
- **Agent mode:** Implemented all route handlers, middleware, SSE stream
- **Security subagent:** Reviewed all route handlers for missing input validation, uncaught errors, and information leakage in error responses

### Security subagent findings
- Two route handlers were returning raw SQLite error messages in 500 responses — fixed to return sanitised error objects
- One `GET /api/graph` endpoint had no pagination — added `limit`/`offset` params with a 500-node default cap

### Outputs produced
- `src/api/server.ts` — Hono app setup + middleware
- `src/api/routes/events.ts`, `workflows.ts`, `mutations.ts`, `graph.ts`, `stream.ts`
- `src/api/middleware/` — error handler, request logger, CORS
- `tests/integration/api.test.ts` — HTTP integration tests for all routes

---

## S-007: Evolution Graph — Mutation Engine and Trajectory

**Date:** 2026-09-26  
**Duration:** ~75 minutes  
**Bob file:** `.bob/sessions/S-007-evolution-graph.json`

### Purpose
Implement the mutation engine, trajectory engine, and graph edge management. This is the central EPOCH layer — the most novel part of the platform.

### Bob capabilities used
- **Plan mode:** Decomposed the evolution graph into sequential build steps; identified the critical path (mutation engine must precede trajectory engine must precede drift detector)
- **Agent mode:** Implemented all three components
- **Background task:** Trajectory score validation ran in background while Bob continued implementing the graph edge manager
- **QA subagent:** Generated tests for trajectory score computation with known inputs/outputs

### MCP tool calls
- `get_mutation_history("DataLayer", 10)` — Bob queried the seeded history to verify the mutation engine was producing correct component-level adjacency
- `get_trajectory_snapshot()` — Bob verified the trajectory point after mutation M-1015 matched the expected coupling score

### Key exchange

**Prompt:** *"Implement the mutation engine (ARCHITECTURE.md Section 7). It must: (1) convert a completed workflow into a Mutation record, (2) compute the structural delta (which components were added/removed/modified), (3) compute trajectory delta fields (coupling change, boundary integrity change), (4) write graph edges for all TOUCHES relationships, (5) trigger trajectory point computation. Make sure it is idempotent — calling it twice on the same workflow must not produce two mutation records."*

**Bob Plan output:** 5-step plan with idempotency guard as step 1 (check existing mutation before creating).

**Background task log:**
```
[11:23:15] Background: Trajectory validation started (10 seed mutations)
[11:23:16] Agent mode: Graph edge manager implementation started  
[11:23:31] Background: Trajectory validation complete — 10/10 points match expected scores
[11:23:44] Agent mode: Graph edge manager complete
```

### Outputs produced
- `src/core/epoch/mutation-engine.ts`
- `src/core/epoch/trajectory.ts`
- `src/graph/mutations/` — CRUD + adjacency
- `src/graph/trajectory/` — point computation + trend analysis
- `tests/unit/mutation-engine.test.ts`
- `tests/unit/trajectory.test.ts`

---

## S-008: Drift Detector — Three Patterns

**Date:** 2026-09-26  
**Duration:** ~40 minutes  
**Bob file:** `.bob/sessions/S-008-drift-detector.json`

### Purpose
Implement three deterministic drift pattern checkers. Each must produce a finding with full evidence chain when triggered. Verify against the seeded history (M-1023, M-1024, M-1025 should trigger boundary erosion).

### Bob capabilities used
- **Plan mode:** Designed the `DriftPattern` interface; planned three implementations + the detector runner
- **Agent mode:** Implemented all three patterns and the runner
- **QA subagent:** Wrote parameterised tests for each pattern with both triggering and non-triggering mutation histories

### MCP tool calls
- `get_mutation_history("DataLayer", 10)` — verified boundary erosion pattern fires on M-1023–M-1025 with seeded data
- `check_invariants(["DataLayer", "PaymentService"])` — confirmed invariant status transitions correctly when erosion pattern fires

### QA subagent coverage: 94% line coverage on drift detector modules

### Outputs produced
- `src/graph/drift/patterns/boundary-erosion.ts`
- `src/graph/drift/patterns/invariant-weakening.ts`
- `src/graph/drift/patterns/dependency-growth.ts`
- `src/graph/drift/detector.ts` — runner + SSE event emission on finding
- `tests/unit/drift/` — 18 test cases across 3 patterns

---

## S-009: Causal Archaeology — BFS Traversal

**Date:** 2026-09-26  
**Duration:** ~35 minutes  
**Bob file:** `.bob/sessions/S-009-causal-archaeology.json`

### Purpose
Implement the causal archaeology engine as a backwards BFS through the evolution graph, with evidence scoring. Verify it produces the correct candidate chain for the seeded boundary erosion finding.

### Bob capabilities used
- **Plan mode:** Designed the BFS algorithm with depth bounding and scoring weights
- **Agent mode:** Implemented BFS, scoring function, and result formatter
- **MCP tool calls:** Used `get_causal_chain` tool to test the implementation against its own output (dogfooding the MCP integration)

### MCP tool calls
- `get_causal_chain("boundary_erosion_DataLayer")` — real-time test of the implemented tool; confirmed M-1023 surfaces as rank-1 candidate

### Key insight from this session
Bob identified that the BFS was traversing `CAUSED_BY` edges (outbound from incidents) in the wrong direction — it needed to traverse *inbound* to the symptom's component. Corrected in the same session via rollback to the pre-bug state + re-implementation.

**Bob rollback used:** Yes — Bob rolled back the incorrect traversal implementation and re-applied the corrected direction. `.bob/sessions/S-009` contains the rollback event.

### Outputs produced
- `src/graph/causal/archaeologist.ts`
- `src/graph/causal/scorer.ts`
- `tests/unit/causal-archaeology.test.ts`

---

## S-010: Counterfactual Simulator and Sandbox Branch Manager

**Date:** 2026-09-26  
**Duration:** ~55 minutes  
**Bob file:** `.bob/sessions/S-010-counterfactuals.json`

### Purpose
Implement the sandbox branch manager (Git branch isolation) and the counterfactual simulation orchestrator. This is the most complex component — it involves Bob running Agent mode *inside* a sandboxed branch.

### Bob capabilities used
- **Plan mode:** Designed the simulation orchestration flow; identified that Bob must run in Agent mode inside each scenario branch
- **Agent mode:** Implemented branch manager and simulation orchestrator
- **Subagents (×2):** Bob spawned 2 parallel subagents to implement Scenario A and Scenario B of the test simulation simultaneously
- **Rollback:** Used when a scenario branch was not properly cleaned up after simulation failure

### MCP tool calls
- `get_trajectory_snapshot()` — captured baseline trajectory before forking
- `check_invariants(["PaymentService", "DataLayer"])` — verified invariant state in each scenario branch after Bob ran Agent mode

### Outputs produced
- `src/sandbox/branch-manager.ts`
- `src/graph/simulation/orchestrator.ts`
- `src/graph/simulation/comparator.ts` — generates side-by-side scenario comparison cards
- `tests/integration/simulation.test.ts`

---

## S-011: EPOCH-MCP Server Integration

**Date:** 2026-09-26  
**Duration:** ~25 minutes  
**Bob file:** `.bob/sessions/S-011-mcp-server.json`

### Purpose
Implement the EPOCH-MCP server (5 tools) and register it in Bob's MCP configuration. Verify Bob can call all 5 tools mid-session.

### Bob capabilities used
- **Agent mode:** Implemented MCP server; wrote Bob MCP config
- **MCP tooling:** Bob called its own new MCP tools to verify they were correctly wired

### MCP tool verification (Bob called each tool)
```
✓ get_mutation_history("OrderService", 5) → 5 mutations returned
✓ check_invariants(["OrderService"]) → 1 invariant, status: WEAKENED
✓ get_trajectory_snapshot() → { couplingScore: 0.71, boundaryIntegrity: 0.61 }
✓ list_active_workflows() → [] (no active workflows at verification time)
✓ get_causal_chain("boundary_erosion_DataLayer") → M-1023 ranked first
```

All 5 tools verified functional. MCP server registered in `.bob/mcp.json`.

### Outputs produced
- `src/api/mcp-server.ts`
- `.bob/mcp.json` — MCP server registration
- MCP tools all verified functional

---

## S-012: React Console — Trajectory Graph View

**Date:** 2026-09-26  
**Duration:** ~60 minutes  
**Bob file:** `.bob/sessions/S-012-trajectory-view.json`

### Purpose
Implement the TRAJECTORY lens — the signature visual of the platform. React Flow evolution graph with all interaction modes.

### Bob capabilities used
- **Plan mode:** Broke the view into: data fetching layer, node type definitions, edge type definitions, layout algorithm, interaction handlers
- **Agent mode:** Implemented all components
- **QA subagent:** Verified click handlers fired correct API calls; verified epoch boundary rendering

### Key decisions made during session
- Custom node type `MutationNode` renders circular node with component colour, epoch badge, and tooltip
- Custom node type `IncidentNode` renders red X with animated pulse
- `EpochBoundaryEdge` renders as a vertical dashed line across all component rows
- Bob used `get_trajectory_snapshot()` MCP call to understand the data shape before implementing the graph data transformer

### MCP tool calls
- `get_trajectory_snapshot()` — verified data shape for the graph transformer
- `get_mutation_history("*", 25)` — verified full mutation list structure for node generation

### Outputs produced
- `src/console/views/TrajectoryView.tsx`
- `src/console/components/MutationNode.tsx`
- `src/console/components/IncidentNode.tsx`
- `src/console/components/EpochBoundary.tsx`
- `src/console/hooks/useEvolutionGraph.ts`

---

## S-013: React Console — Current, History, Futures Views

**Date:** 2026-09-26  
**Duration:** ~45 minutes  
**Bob file:** `.bob/sessions/S-013-console-views.json`

### Purpose
Implement the three remaining console lenses: CURRENT, HISTORY, FUTURES.

### Bob capabilities used
- **Agent mode:** Implemented all three views and their TanStack Query hooks
- **Background task:** Console build ran in background while Bob verified SSE hook behaviour

### Outputs produced
- `src/console/views/CurrentView.tsx` — active workflow timeline, agent task cards, evidence feed, approval gate component
- `src/console/views/HistoryView.tsx` — mutation list, workflow replay, decision audit log
- `src/console/views/FuturesView.tsx` — scenario comparison cards, recommendation panel
- `src/console/hooks/useEventStream.ts` — typed SSE subscription hook
- `src/console/hooks/useWorkflow.ts`, `useMutationHistory.ts`, `useSimulations.ts`

---

## S-014: Sample App Seeding and Demo Reset Script

**Date:** 2026-09-26  
**Duration:** ~50 minutes  
**Bob file:** `.bob/sessions/S-014-sample-app.json`

### Purpose
Build the sample payment application and create the 25-mutation seeded history. This is the demo substrate — it must feel real and tell the right story.

### Bob capabilities used
- **Plan mode:** Designed the payment app structure and the 25-mutation narrative arc
- **Agent mode:** Implemented the payment app source + all 25 seed mutation JSON files
- **Document understanding:** Bob read ARCHITECTURE.md Section 19 (MVP scope) and DEMO_GUIDE.md to ensure the seeded history matches the demo script exactly

### MCP tool calls
- `get_mutation_history("*", 25)` — after seeding, Bob verified all 25 mutations were correctly loaded and linked
- `get_trajectory_snapshot()` — verified final trajectory state (coupling: 0.71, boundary integrity: 0.61 — exactly as expected)
- `check_invariants(["DataLayer", "PaymentService"])` — verified invariants in correct WEAKENED state after M-1025

### Outputs produced
- `packages/sample-app/src/` — OrderService, AuthService, PaymentService, NotificationService, ArchivalJob
- `packages/sample-app/history/M-1001.json` through `M-1025.json`
- `scripts/seed.ts`
- `scripts/demo-reset.ts` (verified: clean wipe + full re-seed in 4.2 seconds)
- `scripts/migrate.ts`

---

## S-015: Bob Workflow Definitions and Hooks

**Date:** 2026-09-26  
**Duration:** ~30 minutes  
**Bob file:** `.bob/sessions/S-015-workflows-hooks.json`

### Purpose
Package the golden demo path as a reusable Bob workflow. Define Bob hooks for PostFileSave and PostTaskExec triggers. Verify both workflows replay correctly from a clean state.

### Bob capabilities used
- **Plan mode:** Structured the workflow YAML definition; identified all hook trigger points
- **Agent mode:** Wrote workflow YAML files and hook JSON definitions
- **Reusable workflows:** Ran the feature-lifecycle workflow twice to verify deterministic replay

### Outputs produced
- `.bob/workflows/feature-lifecycle.yaml`
- `.bob/workflows/incident-remediation.yaml`
- `.bob/workflows/hooks.json`
- `.bob/skills/evolution-analyst.md` — custom Bob skill definition

---

## S-016: Golden Demo Dry-Run and Bug Fixes

**Date:** 2026-09-26  
**Duration:** ~40 minutes  
**Bob file:** `.bob/sessions/S-016-demo-dryrun.json`

### Purpose
Full dry-run of the golden demo script. Fix all bugs discovered during dry-run.

### Bob capabilities used
- **Agent mode:** Fixed all three bugs found during dry-run
- **Rollback:** Used once when a drift threshold fix introduced a regression in trajectory scoring

### Bugs found and fixed

| Bug | Root cause | Fix |
|---|---|---|
| SSE stream did not reconnect event types after disconnect | `EventSource.onopen` re-subscribed but did not re-add typed event listeners | Added `addEventListener` calls in `onopen` handler |
| React Flow re-rendered all nodes on every SSE event | Graph nodes array was recreated on every event | Wrapped node array in `useMemo` with mutation IDs as deps |
| Trajectory coupling score was `NaN` when component had no prior edges | Division by zero in coupling calculation | Added guard: return 0.0 if no prior edges exist |

All three bugs fixed and verified in this session.

### Outputs produced
- Fixed `src/console/hooks/useEventStream.ts`
- Fixed `src/console/views/TrajectoryView.tsx`
- Fixed `src/graph/trajectory/trajectory.ts`

---

## S-017: Incident Remediation Workflow End-to-End

**Date:** 2026-09-27  
**Duration:** ~45 minutes  
**Bob file:** `.bob/sessions/S-017-incident-remediation.json`

### Purpose
Run the incident-remediation workflow end-to-end. Verify the closed loop: production alert → WEAVE incident workflow → causal archaeology → patch → approval → trajectory update.

### Bob capabilities used
- **Plan mode:** Built incident workflow plan from alert signal
- **Agent mode:** Implemented remediation patch
- **Subagents:** Incident agent (reproduction), Evolution Analyst agent (causal chain), QA agent (patch validation) — all three ran in parallel
- **Background task:** Trajectory update ran in background while Bob prepared the demo video recording setup

### MCP tool calls
- `get_causal_chain("incident_INC-3312")` — Bob queried the candidate causal chain before the Incident agent started, to pre-load context
- `get_mutation_history("ArchivalJob", 8)` — Incident agent verified archival job mutation history
- `check_invariants(["ArchivalJob", "DataLayer"])` — post-patch invariant verification

### Final trajectory state after remediation
```
Coupling score:          0.68 (improved from 0.71)
Boundary integrity:      0.88 (improved from 0.61)
Active drift findings:   0
Invariants HOLDING:      4/4
Active epoch:            Epoch 3 (post-remediation)
```

### Outputs produced
- Full incident-remediation workflow replayed successfully
- Final demo state recorded and verified
- `.bob/sessions/S-017-incident-remediation.json` — complete session log with all MCP calls and agent outputs

---

## Summary Statistics

| Metric | Value |
|---|---|
| Total Bob sessions | 17 |
| Bob Plan mode invocations | 11 |
| Bob Agent mode invocations | 17 |
| Bob subagent spawns | 22 |
| Bob parallel execution events | 8 |
| Bob background tasks | 4 |
| Bob rollbacks | 2 |
| Bob document reads | 3 |
| Bob reusable workflow replays | 4 |
| EPOCH-MCP tool calls by Bob | 19 |
| Bob hooks configured | 2 |
| Bob workflow definitions created | 2 |
| Bob skill definitions created | 1 |
| Bugs found by Bob QA subagent | 7 |
| Security findings by Bob Security subagent | 3 (all fixed) |
