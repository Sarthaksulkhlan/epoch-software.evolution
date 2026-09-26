# Changelog

All notable changes to EPOCH are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Features planned post-hackathon MVP:
- RBAC + identity management (Phase 2)
- PostgreSQL adapter swap (Phase 2)
- Cross-repository evolution graph (Phase 3)
- ML-assisted drift pattern detection (Phase 3)
- Organization-wide evolution maps (Platform phase)

---

## [0.3.0] — 2026-09-27 — Hackathon Submission

### Added
- **Counterfactual simulator** — forks current system into 2 isolated scenario branches; Bob runs Agent mode in each; side-by-side scenario comparison in FUTURES lens
- **Closed-loop remediation** — selected counterfactual future triggers a new WEAVE workflow automatically; trajectory recalculates after remediation completes
- **FUTURES lens** — scenario comparison cards with evidence delta, coupling score delta, invariant impact; recommendation panel surfaces lowest-risk trajectory
- **Golden demo video** — recorded 4m30s walkthrough covering all four lenses; uploaded to project README
- **Bob workflow: incident-remediation** — packaged `.bob/workflows/incident-remediation.yaml`; replayable from clean state
- **`scripts/demo-reset.ts`** — single command to wipe and re-seed `epoch.db` in under 5 seconds
- **EPOCH-MCP: `get_causal_chain` tool** — Bob can query candidate causal chains from any symptom description mid-session
- **Epoch boundary confirmation UI** — proposed boundaries shown as dashed lines in TRAJECTORY lens; one-click confirmation via approval gate pattern
- **Evolution debt dashboard** — six-dimension debt model visualised in TRAJECTORY lens sidebar
- **`docs/DEMO_GUIDE.md`** — timestamped golden demo script with judge Q&A preparation
- **`docs/BOB_SESSIONS.md`** — complete log of all IBM Bob sessions with purpose and outcome
- **`docs/RESEARCH_NOTES.md`** — full citation set for all benchmark claims

### Changed
- Drift detector thresholds tuned against seeded history; boundary erosion threshold lowered to 2 violations per 5-mutation window for clearer demo signal
- Causal archaeology BFS depth limit increased from 8 to 10 hops
- TRAJECTORY lens evolution graph: epoch boundaries now labelled with regime name
- Approval gate UI redesigned as full-screen overlay with evidence summary panel

### Fixed
- Trajectory point computation produced incorrect coupling score when a mutation touched a component with no prior edges
- SSE stream reconnect handler was not re-subscribing to all event types after reconnect
- React Flow graph re-rendered entire node set on every SSE event; now uses node-level memo

---

## [0.2.0] — 2026-09-26 — Evolution Intelligence Layer

### Added
- **EPOCH evolution plane** — core longitudinal intelligence layer operational
- **Mutation engine** (`src/core/epoch/mutation-engine.ts`) — converts completed WEAVE workflows into structured Mutation records with intent, scope, evidence refs, and trajectory delta
- **Trajectory engine** (`src/core/epoch/trajectory.ts`) — computes TrajectoryPoint after every mutation: coupling score, boundary integrity score, drift delta, epoch ID, state hash
- **Drift detector** (`src/graph/drift/`) — three deterministic patterns: boundary erosion, invariant weakening, dependency growth; each produces findings with full evidence chain
- **Phase / epoch detector** (`src/core/epoch/epoch-detector.ts`) — proposes epoch boundaries when 2+ of 4 structural conditions are met across a 5-mutation window
- **Causal archaeology** (`src/graph/causal/archaeologist.ts`) — backwards BFS through evolution graph with evidence scoring; returns ranked candidate causal chains labelled `hypothesised`
- **Evolution graph** (`src/graph/`) — component, mutation, incident, invariant, epoch, decision node types; TOUCHES, CAUSED_BY, WEAKENS, FOLLOWS, SPAWNED, BOUNDARY edge types
- **TRAJECTORY lens** (`src/console/views/TrajectoryView.tsx`) — React Flow evolution graph with time axis, component rows, mutation nodes, incident markers, epoch boundaries; full interaction model (click, drag, right-click fork)
- **HISTORY lens** (`src/console/views/HistoryView.tsx`) — mutation list with filtering, workflow replay viewer, decision audit log
- **Invariant store** (`src/core/epoch/invariant-store.ts`) — machine-readable invariant registry; status tracked per mutation
- **Evolution debt model** (`src/core/epoch/debt-model.ts`) — six-dimension accumulation tracker
- **EPOCH-MCP server** (`src/api/mcp-server.ts`) — five tools exposed to Bob: `get_mutation_history`, `check_invariants`, `get_trajectory_snapshot`, `list_active_workflows`, `get_causal_chain`
- **Sample app seeded history** (`packages/sample-app/history/`) — 25 seed mutations (M-1001 through M-1025); M-1023/1024/1025 introduce boundary erosion drift
- **`scripts/seed.ts`** — processes seed mutations in order, computes trajectory points and graph edges
- **Bob workflow: feature-lifecycle** (`.bob/workflows/feature-lifecycle.yaml`) — full golden path packaged as reusable Bob workflow
- **Bob hooks** (`.bob/workflows/hooks.json`) — `PostFileSave` triggers lightweight drift check; `PostTaskExec` commits mutation record

### Changed
- API server port standardised to 3000; MCP server on 3001
- SQLite schema extended with `trajectory_points`, `simulations`, `graph_edges` tables
- Evidence store schema adds `status` field (`observed` | `inferred` | `hypothesised`) — ADR-011

### Fixed
- Workflow FSM rejected valid `VERIFYING → AWAITING_APPROVAL` transition when no evidence was `observed` (only `inferred`)
- Context builder included stale invariants from completed epochs; now filters by active epoch ID

---

## [0.1.0] — 2026-09-25 — WEAVE Lifecycle Control Plane

### Added
- **Project scaffold** — pnpm workspace monorepo; TypeScript 5.5 ESM; Node 22 LTS
- **`ARCHITECTURE.md`** — authoritative architecture document; 20 sections
- **`DECISIONS.md`** — 25 Architecture Decision Records
- **Directory structure** — `src/`, `docs/`, `.bob/`, `packages/sample-app/`, `scripts/`, `tests/`
- **Event intake** (`src/core/events/`) — normalised event schema (Zod); immutable event log; six event source types
- **Context builder** (`src/core/weave/context-builder.ts`) — assembles ContextBundle with repo snapshot, requirements, prior mutations, invariants, telemetry, and provenance
- **Workflow engine** (`src/core/weave/workflow-engine.ts`) — FSM implementation; 7 states; transition validation; state event log; replayable from any checkpoint
- **Task graph** (`src/core/weave/task-graph.ts`) — DAG of specialist agent tasks per workflow; dependency resolution; parallel-ready task set computation
- **Approval gate** (`src/core/weave/approval-gate.ts`) — hard stop at AWAITING_APPROVAL; decision persistence; immutable decision log
- **Replay engine** (`src/core/weave/replay.ts`) — deterministic workflow replay from event log
- **All 8 specialist agents** (stubs with full contracts):
  - `src/agents/historian/` — git history + prior workflow context
  - `src/agents/security/` — diff + dependency scan
  - `src/agents/qa/` — test generation + coverage evidence
  - `src/agents/release/` — build + deploy artefacts
  - `src/agents/incident/` — alert → reproduction → patch plan
  - `src/agents/evolution/` — trajectory + drift analysis
  - `src/agents/counterfactual/` — forked future simulation
  - `src/agents/synthesis/` — evidence aggregation → next action
- **Hono API server** (`src/api/`) — REST endpoints for events, workflows, mutations, graph; SSE stream
- **SQLite persistence** (`src/store/`) — `better-sqlite3`; full schema from ARCHITECTURE.md; migration script
- **Sandbox branch manager** (`src/sandbox/branch-manager.ts`) — Git branch isolation for experiments
- **Shared types + schemas** (`src/shared/`) — Zod schemas for all 12 entity types; TypeScript types inferred
- **CURRENT lens** (`src/console/views/CurrentView.tsx`) — active workflow timeline; live agent task cards; evidence feed; approval gate component
- **React 18 + Vite console** skeleton — four-lens routing; TanStack Query; Tailwind; SSE hook
- **Sample payment app** (`packages/sample-app/src/`) — OrderService, AuthService, PaymentService, NotificationService, ArchivalJob
- **`scripts/migrate.ts`** — SQLite schema migration runner
- **`package.json`**, **`pnpm-workspace.yaml`**, **`tsconfig.base.json`** — root project configuration
- **`.bob/sessions/`** directory — Bob session log storage
- **`docs/DATA_MODEL.md`** — complete entity reference with ER diagram
- **`docs/AGENTS.md`** — multi-agent contracts and communication pattern
- **`docs/RESEARCH_NOTES.md`** — full research backing with six cited sources

### Architecture decisions recorded
- ADR-001 through ADR-025 (see DECISIONS.md)

---

## [0.0.1] — 2026-09-25 — Concept

### Added
- `EPOCH_Final_Integrated_Platform.pdf` — 38-page platform dossier defining the WEAVE+EPOCH+Bob integrated concept
- Initial repository created at `github.com/vighriday/epoch-software-evolution`

---

[Unreleased]: https://github.com/vighriday/epoch-software-evolution/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/vighriday/epoch-software-evolution/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/vighriday/epoch-software-evolution/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/vighriday/epoch-software-evolution/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/vighriday/epoch-software-evolution/releases/tag/v0.0.1
