# EPOCH — Architecture Decision Records (ADR)

> This document logs every significant architectural decision made for the EPOCH platform.
> Each record follows the format: **Status → Context → Decision → Rationale → Alternatives Considered → Consequences**.
> ADRs are immutable once accepted. Superseding decisions reference the ADR they replace.

**Format version:** [MADR 3.0](https://adr.github.io/madr/)  
**Last updated:** 2026-09-26  

---

## Index

| # | Title | Status | Date |
| --- | --- | --- | --- |
| [ADR-001](#adr-001-typescript-as-the-single-platform-language) | TypeScript as the single platform language | Accepted | 2026-09-25 |
| [ADR-002](#adr-002-sqlite-as-the-primary-persistence-layer) | SQLite as the primary persistence layer | Accepted | 2026-09-25 |
| [ADR-003](#adr-003-json-ld-adjacency-overlay-for-the-evolution-graph) | JSON-LD adjacency overlay for the evolution graph | Accepted | 2026-09-25 |
| [ADR-004](#adr-004-hono-as-the-backend-api-framework) | Hono as the backend API framework | Accepted | 2026-09-25 |
| [ADR-005](#adr-005-react-flow-for-evolution-graph-visualisation) | React Flow for evolution graph visualisation | Superseded by ADR-028 | 2026-09-25 |
| [ADR-006](#adr-006-server-sent-events-sse-for-console-real-time-updates) | Server-Sent Events (SSE) for console real-time updates | Accepted | 2026-09-25 |
| [ADR-007](#adr-007-pnpm-workspaces-as-the-monorepo-strategy) | pnpm workspaces as the monorepo strategy | Accepted | 2026-09-25 |
| [ADR-008](#adr-008-zod-for-runtime-schema-validation) | Zod for runtime schema validation | Accepted | 2026-09-25 |
| [ADR-009](#adr-009-ibm-bob-mcp-server-for-evolution-graph-access) | IBM Bob MCP server for evolution graph access | Amended by ADR-026 | 2026-09-25 |
| [ADR-010](#adr-010-git-branch-isolation-for-sandbox-and-counterfactuals) | Git branch isolation for sandbox and counterfactuals | Amended by ADR-027 | 2026-09-25 |
| [ADR-011](#adr-011-evidence-status-taxonomy-to-enforce-epistemic-discipline) | Evidence status taxonomy to enforce epistemic discipline | Accepted | 2026-09-25 |
| [ADR-012](#adr-012-weave-workflow-as-a-finite-state-machine) | WEAVE workflow as a finite state machine | Accepted | 2026-09-25 |
| [ADR-013](#adr-013-mutation-as-a-first-class-domain-object) | Mutation as a first-class domain object | Accepted | 2026-09-25 |
| [ADR-014](#adr-014-agents-communicate-through-the-evidence-store-not-directly) | Agents communicate through the evidence store, not directly | Accepted | 2026-09-25 |
| [ADR-015](#adr-015-deterministic-drift-patterns-for-the-mvp-not-ml) | Deterministic drift patterns for the MVP, not ML | Accepted | 2026-09-25 |
| [ADR-016](#adr-016-seeded-sample-application-as-the-demo-substrate) | Seeded sample application as the demo substrate | Amended by ADR-027 | 2026-09-25 |
| [ADR-017](#adr-017-four-lens-console-architecture) | Four-lens console architecture | Accepted (stack amended by ADR-028) | 2026-09-25 |
| [ADR-018](#adr-018-causal-archaeology-uses-graph-bfs-not-llm-assertion) | Causal archaeology uses graph BFS, not LLM assertion | Accepted | 2026-09-25 |
| [ADR-019](#adr-019-no-autonomous-production-actions--hard-approval-gate) | No autonomous production actions — hard approval gate | Accepted | 2026-09-25 |
| [ADR-020](#adr-020-bob-workflows-packaged-for-deterministic-demo-replay) | Bob workflows packaged for deterministic demo replay | Superseded by ADR-026 | 2026-09-26 |
| [ADR-021](#adr-021-two-speed-control-loop-micro-and-macro) | Two-speed control loop: micro and macro | Accepted, amended | 2026-09-26 |
| [ADR-022](#adr-022-trajectory-point-computed-after-every-mutation) | Trajectory point computed after every mutation | Accepted | 2026-09-26 |
| [ADR-023](#adr-023-epoch-boundary-as-a-structural-regime-change) | Epoch boundary as a structural regime change | Accepted | 2026-09-26 |
| [ADR-024](#adr-024-vitest-for-testing-not-jest) | Vitest for testing, not Jest | Accepted | 2026-09-26 |
| [ADR-025](#adr-025-no-docker-no-external-services-for-the-hackathon-build) | No Docker, no external services for the hackathon build | Accepted | 2026-09-26 |
| [ADR-026](#adr-026-bob-drives-epoch-through-mcp) | Bob drives EPOCH through MCP | Accepted | 2026-09-27 |
| [ADR-027](#adr-027-observations-come-from-a-structural-scanner-over-a-separate-sample-repository) | Observations come from a structural scanner over a separate sample repository | Accepted | 2026-09-27 |
| [ADR-028](#adr-028-console-stack-as-built) | Console stack as built | Accepted | 2026-09-27 |
| [ADR-029](#adr-029-a-hosted-demo-runs-in-a-guarded-public-mode) | A hosted demo runs in a guarded public mode | Accepted | 2026-09-27 |

---

## ADR-001: TypeScript as the single platform language

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

The platform spans backend API, frontend console, agentic orchestration logic, graph computation, and database access. Using multiple languages would fragment Bob's ability to reason across the codebase during Plan and Agent mode sessions — a direct liability in a hackathon where Bob needs to navigate the entire repo confidently.

### Decision

All source code is TypeScript 5.5 targeting ESM modules on Node.js 22 LTS. The frontend uses React 18 compiled via Vite. No Python, no Go, no mixed-language services.

### Rationale

- **Bob context quality:** A TypeScript monorepo gives Bob consistent type information across every file it touches. Cross-language repos fragment Bob's context bundle.
- **Type safety at boundaries:** Zod schemas generate TypeScript types automatically. This eliminates an entire class of runtime bugs at the event intake and agent output boundaries.
- **Single `tsconfig.base.json`:** One compiler configuration, inherited by all packages. No per-service build configuration drift.
- **Ecosystem:** React, Hono, better-sqlite3, React Flow, TanStack Query, Zod — all first-class TypeScript.
- **Hackathon velocity:** A single language means no context-switching, no polyglot toolchain debugging, no time wasted on FFI or inter-service serialisation mismatches.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Python backend + React frontend | Bob's subagents would need to context-switch. Python type inference is weaker. Django/FastAPI setup is slower for a 48h build. |
| Go backend | Stronger performance, but no meaningful performance requirement exists for a demo. Go generics are less expressive for the type-safe event/entity patterns needed. |
| Node.js plain JavaScript | No type safety. ADR-008 (Zod) depends on TypeScript type generation. |

### Consequences

- All contributors must be TypeScript-comfortable.
- `tsx` is used for direct TypeScript execution during development, removing the explicit compile step.
- `tsc --noEmit` is run as a typecheck gate before submission.

---

## ADR-002: SQLite as the primary persistence layer

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

The platform needs persistent storage for events, workflows, tasks, evidence, mutations, trajectory points, and graph adjacency data. The hackathon build runs on a single developer machine. Zero external infrastructure is a hard constraint (see ADR-025).

### Decision

Use SQLite via `better-sqlite3` (synchronous, fast, embedded). Single database file at `data/epoch.db`. All queries are SQL with recursive CTEs for graph traversal. Schema managed via `scripts/migrate.ts`.

### Rationale

- **Zero infrastructure:** No database server to start, credential to manage, or connection to debug. `npm run dev` works on any machine with Node installed.
- **Demo reset:** `scripts/demo-reset.ts` deletes and rebuilds `epoch.db` with seeded data in under 5 seconds. This is critical for live demo reliability.
- **Performance at demo scale:** better-sqlite3 is the fastest Node SQLite driver. For 25–50 mutations and a few hundred events (demo scale), response times are in single-digit milliseconds.
- **Recursive CTEs:** SQLite 3.35+ supports `WITH RECURSIVE` queries. This covers all graph traversal patterns needed for causal archaeology and trajectory queries without a graph database.
- **Synchronous API:** better-sqlite3's synchronous API removes Promise chains from the hot path, simplifying agent task handlers.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| PostgreSQL | Requires a running server. Docker adds setup complexity and potential failure points during a live demo. |
| Neo4j | Graph query language (Cypher) is expressive, but Neo4j requires Docker or a paid cloud account. Recursive CTEs are sufficient at demo scale. |
| Redis | Appropriate for caching, not as primary store. No persistent graph model. |
| Turso (SQLite edge) | Introduces a cloud dependency and network latency. Local SQLite is strictly more reliable for a demo. |
| PGlite (in-process Postgres) | Too new, less stable, poor Windows support. |

### Consequences

- Phase 2 migration path: swap `better-sqlite3` adapter for `pg` or `@neondatabase/serverless` with minimal query changes (CTEs are portable).
- All schema changes require a migration script entry in `scripts/migrate.ts`.
- Graph adjacency is stored as structured rows in `graph_edges` (see ADR-003), not as a dedicated graph engine.

---

## ADR-003: JSON-LD adjacency overlay for the evolution graph

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

The evolution graph is the core data structure of EPOCH. It connects mutations, components, incidents, invariants, and decisions across time. A pure relational model struggles to express arbitrary graph traversal naturally, but a dedicated graph database introduces infrastructure (see ADR-002).

### Decision

Store graph relationships as typed rows in the `graph_edges` table (from_id, from_type, to_id, to_type, relationship, confidence, evidence_ref). Use recursive CTEs for traversal. Export graph state as JSON-LD for the console and Bob MCP tools. Do not embed a graph database engine.

### Rationale

- **Structured rows are query-friendly:** `SELECT * FROM graph_edges WHERE from_id = :mutation_id AND relationship = 'TOUCHES'` is simple, fast, and debuggable.
- **JSON-LD for interoperability:** The `GET /api/graph` endpoint returns the graph as JSON-LD. This is the format React Flow consumes for rendering and the format Bob can read as a document.
- **Confidence scoring on edges:** The `confidence REAL` column (0.0–1.0) allows inferred causal links to be weighted differently from observed structural links. This is not possible in most graph databases without custom properties.
- **Recursive CTEs cover the traversal patterns needed:**
  - Ancestor traversal (causal archaeology)
  - Component subgraph extraction
  - Epoch boundary detection
  - Mutation impact radius

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Neo4j AuraDB free tier | Requires cloud account registration. Edge in a demo with a network dependency is unacceptable. |
| DGraph | Complex setup, steep learning curve, overkill for demo scale. |
| LevelGraph (embedded) | Less well-maintained, less Bob context. |
| Pure adjacency list in JSON file | Not queryable. Cannot do recursive traversal or JOIN with workflow/evidence data. |

### Consequences

- Graph export to React Flow requires a mapping step (`graph_edges` rows → React Flow node/edge format). This is a thin `src/graph/exporter.ts` module.
- At enterprise scale (thousands of mutations), query performance degrades. Phase 2 adds a dedicated graph store. Migration is isolated to `src/store/`.

---

## ADR-004: Hono as the backend API framework

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

The platform needs an HTTP API serving REST endpoints and SSE streams. The API must be lightweight, TypeScript-native, and runnable with a single `node` command with no external runtime setup.

### Decision

Use [Hono](https://hono.dev) as the HTTP framework. Run it on Node.js via `@hono/node-server`. No Express, no Fastify.

### Rationale

- **Minimal footprint:** Hono core is ~14kb. No middleware jungle to configure.
- **First-class TypeScript:** Route handlers are typed end-to-end. Request/response types flow through without casting.
- **SSE built-in:** Hono has a first-class `streamSSE` helper. The console's real-time feed requires SSE; Hono eliminates a separate WebSocket library.
- **CORS, logger, error handler** — all available as lightweight built-in middleware.
- **RPC client generation:** Hono can generate a typed RPC client from route definitions. The console can import `HonoClient` and get typed fetch calls with no manual type duplication.
- **Familiar router API:** Express-like `.get()`, `.post()` syntax. Low learning curve for Bob when authoring new routes.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Express | Good, but lacks first-class TypeScript typing, no built-in SSE helpers, larger middleware surface. |
| Fastify | More performant than needed for demo. Schema plugin (`fastify-type-provider-zod`) adds complexity. |
| tRPC | Excellent type safety, but the console needs a plain HTTP API for the MCP server and for anyone inspecting it with curl. tRPC's protocol is opaque. |
| Next.js API routes | Frontend/backend coupling. Creates a monolith that is harder for Bob to decompose into subagents. |

### Consequences

- API and console are separate processes (`src/api/` and `src/console/`). They communicate over localhost during development and via environment-configured URL in production.
- SSE stream endpoint (`GET /api/stream`) uses Hono's `streamSSE` helper. Console subscribes on mount.

---

## ADR-005: React Flow for evolution graph visualisation

**Status:** Superseded by ADR-028  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

The evolution graph is the **signature visual object** of EPOCH. A reviewer must be able to see, at a glance, how mutations accumulate across components over time, where incidents occurred, where drift is detected, and where epoch boundaries fall. This visual is what makes the "locally correct, globally worse" thesis viscerally legible.

### Decision

Use [React Flow](https://reactflow.dev) (free tier, MIT licensed for non-commercial use; open-source license adequate for hackathon) for the evolution graph renderer in the TRAJECTORY lens.

### Rationale

- **Purpose-built for interactive graphs:** React Flow handles node/edge rendering, zoom/pan, selection, custom node types, and edge routing out of the box.
- **Custom node types:** Each mutation node, incident marker, epoch boundary, and invariant badge is a custom React component. React Flow's `nodeTypes` prop makes this straightforward.
- **Interaction model:** Click-to-open, drag-to-compare, right-click-to-fork — all achievable with React Flow's event system without custom canvas code.
- **Performance at demo scale:** React Flow handles 50–200 nodes comfortably without virtualisation. Demo scale (25–50 mutations) is well within this.
- **Minimap + controls:** Built-in minimap and zoom controls make the graph navigable without extra implementation.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| D3.js | Maximum flexibility, but requires implementing node rendering, drag, zoom, and selection from scratch. Time budget does not support this in 48h. |
| Cytoscape.js | Powerful graph library, but less React-native. Integration with React state requires extra wrapping. |
| Mermaid.js | Static diagram generation only. No interactivity. Cannot support click-to-open mutation or drag-to-compare. |
| Recharts | Time-series charts only. Cannot represent a component×time graph with arbitrary topology. |
| vis.js | jQuery-era API. Poor TypeScript support. |

### Consequences

- Graph data from `GET /api/graph` must be transformed to React Flow's `{ nodes, edges }` format before rendering. This transformation lives in `src/console/views/TrajectoryView.tsx`.
- Epoch boundary lines are implemented as React Flow custom edge groups or background lanes, not as standard edges.

---

## ADR-006: Server-Sent Events (SSE) for console real-time updates

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

The CURRENT lens must show live workflow progress: agent tasks completing, evidence arriving, approval gates opening. Without real-time updates, the console looks like a static report rather than a mission-control system.

### Decision

Use Server-Sent Events (SSE) via a single `GET /api/stream` endpoint. The console subscribes once on mount and receives all platform events as a typed event stream.

### Rationale

- **Unidirectional suits the use case:** The console only needs to receive updates from the server, not send them. SSE is exactly right for this pattern.
- **No additional library:** SSE is built into browsers and into Hono (`streamSSE`). No Socket.io, no ws package, no handshake protocol.
- **Automatic reconnect:** Browsers automatically reconnect SSE streams on disconnect. This is critical for demo reliability — a brief network hiccup does not kill the console feed.
- **HTTP/1.1 compatible:** SSE works over standard HTTP, through proxies and firewalls, without protocol upgrades.
- **Event types:** Each SSE event carries a typed `event` field (`workflow.updated`, `evidence.created`, `drift.detected`, etc.). The console can subscribe to specific types via `addEventListener`.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| WebSockets | Bidirectional protocol is overkill for a unidirectional feed. Requires a WebSocket server. More complex reconnection handling. |
| Polling | Creates unnecessary load, introduces latency, and looks choppy in a live demo. |
| Long-polling | Complex server-side implementation. Held connections compete with regular API requests. |

### Consequences

- The SSE connection is a single multiplexed stream. All workflow events, evidence events, and drift events flow through one endpoint.
- Console uses `EventSource` API with a typed wrapper (`src/console/hooks/useEventStream.ts`).

---

## ADR-007: pnpm workspaces as the monorepo strategy

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

The platform has two distinct packages: the main EPOCH platform (`src/`) and the sample payment application (`packages/sample-app/`). The sample app needs its own dependencies (e.g., a payment SDK, an ORM) independent of the platform. Bob needs to navigate both without confusion.

### Decision

Use pnpm workspaces. Root `package.json` declares the workspace. `pnpm-workspace.yaml` lists the packages. Platform scripts (`seed`, `demo-reset`, `dev`) run from the root.

### Rationale

- **Isolation:** `packages/sample-app` has its own `package.json` and `node_modules`. Its dependencies do not pollute the platform namespace.
- **Shared types:** A future `packages/shared` package can export common types consumed by both the platform and the sample app.
- **pnpm speed:** pnpm's content-addressable store makes installs significantly faster than npm in a fresh environment.
- **Bob compatibility:** pnpm workspaces use a standard `package.json` workspace convention. Bob can read and reason about the workspace layout without special configuration.
- **Single lock file:** `pnpm-lock.yaml` at root ensures reproducible installs across machines.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| npm workspaces | Slower installs. pnpm is strictly better for the same semantic. |
| Turborepo | Excellent for large monorepos, but adds a build orchestration layer we do not need in 48h. |
| Nx | Same overhead as Turborepo. Introduces generator/executor concepts that complicate Bob's view of the project. |
| Separate repositories | Eliminates code sharing and makes the Bob session context fragmented. |

### Consequences

- Root `package.json` must declare `"workspaces": ["packages/*"]`.
- Running `pnpm install` at root installs all workspace dependencies.
- Scripts that must run in a specific package use `pnpm --filter <package-name> <script>`.

---

## ADR-008: Zod for runtime schema validation

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

Every event entering the platform, every agent output, every API request body, and every entity written to the database must be validated at runtime. TypeScript types are erased at runtime; they provide no protection against malformed agent outputs or unexpected event payloads.

### Decision

Use [Zod](https://zod.dev) for all runtime schema validation. All canonical entity shapes are defined as Zod schemas in `src/shared/schema/`. TypeScript types are derived from Zod schemas via `z.infer<>`. No manual interface/type duplication.

### Rationale

- **Single source of truth:** The Zod schema IS the type definition. Defining `interface Event` separately and then writing a validator separately is double work with guaranteed drift.
- **Composable:** Zod schemas compose cleanly (`.extend()`, `.pick()`, `.omit()`). The `ContextBundle` schema composes `RepoSnapshot`, `Requirement[]`, `MutationSummary[]` — all reusing their own schemas.
- **Parse, don't validate:** `schema.parse(input)` throws with a detailed error message on failure. `schema.safeParse(input)` returns a discriminated union. Both patterns are idiomatic.
- **Error messages:** Zod's error messages are human-readable. When an agent returns a malformed output, the validation error is descriptive enough to debug without printf-debugging.
- **API integration:** Hono's `zValidator` middleware validates request bodies against a Zod schema before the handler runs. This eliminates boilerplate guard code in route handlers.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Joi | JavaScript-first, verbose, weaker TypeScript integration. Type inference is not as clean as Zod. |
| Yup | Similar to Joi. Async-first design adds complexity to synchronous validation paths. |
| io-ts | Highly principled (uses fp-ts), but steep learning curve. Verbose codec definitions. |
| Manual validation | Unmaintainable at the entity count EPOCH has. |
| ArkType | Excellent TypeScript-native alternative, but less ecosystem adoption. Less Bob context. |

### Consequences

- All `src/shared/schema/*.ts` files export both the Zod schema and the inferred TypeScript type.
- The pattern is: `export const MutationSchema = z.object({...})` followed by `export type Mutation = z.infer<typeof MutationSchema>`.
- Zod validation errors are caught at the API boundary and returned as `400 Bad Request` with the Zod error detail in the response body.

---

## ADR-009: IBM Bob MCP server for evolution graph access

**Status:** Amended by ADR-026 (stdio transport, write tools, no approve tool)  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

IBM Bob operates within individual sessions. Without access to EPOCH's evolution graph, Bob makes decisions based only on the current file state — it cannot know what a component has historically done, what invariants apply to it, or what trajectory the system is on. This limits Bob to isolated coding and contradicts EPOCH's thesis.

### Decision

Implement `EPOCH-MCP`: a local MCP server that Bob can call mid-session. Registered in Bob's MCP configuration as `epoch-evolution`. Exposes five tools covering mutation history, invariant status, trajectory snapshot, active workflows, and causal chain queries.

### Rationale

- **Bob with memory:** When Bob is about to modify `OrderService`, it can call `get_mutation_history("OrderService", 10)` and learn that this component has been touched 7 times in the last 3 weeks, with an invariant currently in WEAKENED status. This is qualitatively different from Bob reading the file alone.
- **Visibility:** Every MCP tool call appears in Bob's session log, so Bob consulting EPOCH's history before acting is visible in the exported task history.
- **Low implementation cost:** The MCP server is a thin HTTP server (Hono) that queries the SQLite database and returns JSON. All five tools are simple read queries. No new infrastructure.
- **Closed loop:** Bob reads from EPOCH and writes back through the same MCP server (workflows, plans, evidence), so every step Bob takes is recorded and appears on the console's stream.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Bob reads context files directly | Bob can read files, but it cannot query "what mutations touched this component across all workflows?" from static files. Dynamic query is required. |
| Pass context in the prompt | Works for small contexts. Does not scale to "show me all mutations touching this component in the last 30 days." Context windows have limits. |
| No Bob integration beyond IDE usage | Bob would change the system without its history, which is the problem EPOCH exists to solve. |

### Consequences

- `EPOCH-MCP` server runs on `localhost:3001` alongside the main API (`localhost:3000`).
- Bob's MCP config (`.bob/mcp.json`) registers `epoch-evolution` pointing to `localhost:3001`.
- MCP tools are read-only. Bob cannot write to the evolution graph directly — all mutations flow through `POST /api/events`.

---

## ADR-010: Git branch isolation for sandbox and counterfactuals

**Status:** Amended by ADR-027 (worktrees of a separate sample repository)  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

Counterfactual simulations require applying alternative mutations to the codebase and observing their effects. These experiments must not contaminate the main codebase state. A robust isolation model is needed.

### Decision

Use Git branches for all experimental work. Each simulation scenario and mutation experiment gets a dedicated branch named `epoch/sim-[scenario]-[simulation_id]` or `epoch/experiment-[mutation_id]`. Branches are created from the exact commit corresponding to the base `TrajectoryPoint.stateHash`. Bob runs Agent mode inside these branches. Branches are deleted after evidence collection; results remain in the evidence store.

### Rationale

- **Zero-cost isolation:** Git branches are free, fast, and already in the toolchain. No container orchestration, no VM provisioning.
- **Deterministic base state:** Branching from a commit pinned to a `stateHash` guarantees the simulation starts from the exact system state at the decision point, not from an approximated copy.
- **Bob-native:** Bob already understands Git branches. Running `git checkout -b epoch/sim-A-001` and then running Bob in Agent mode is the most natural workflow for Bob, minimising the chance of unexpected behaviour.
- **Clean merge path:** If the selected counterfactual scenario is approved, the branch is merged via the approval gate. No special merge logic needed.
- **Auditability:** Branch creation, modification, and deletion are all recorded in the mutation record and simulation entity.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Filesystem snapshots / copy | Does not integrate with Git. Bob cannot use its built-in Git awareness. |
| Docker containers per simulation | Requires Docker. Violates ADR-025. |
| In-memory AST manipulation | Cannot run real tests against a simulated state. Evidence quality is low. |
| Separate repository clones | Slow to set up. Consumes significant disk space for multiple simulations. |

### Consequences

- `src/sandbox/branch-manager.ts` manages branch lifecycle (create, switch, delete).
- A maximum of 3 active simulation branches at once prevents uncontrolled disk growth.
- All simulation branches follow the `epoch/` prefix naming convention to distinguish them from feature branches.

---

## ADR-011: Evidence status taxonomy to enforce epistemic discipline

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

The EPOCH platform makes claims about causality, drift, and system trajectories. These claims are derived from AI agents that can be wrong. A system that confidently presents AI inferences as facts will mislead users and undermine trust. The research notes and the concept explicitly require causal language discipline.

### Decision

All `Evidence` entities carry a mandatory `status` field with three possible values:
- `"observed"` — a directly measured, reproducible fact (a test passed, a file was changed, a metric threshold was crossed)
- `"inferred"` — a model-derived conclusion from observed facts, explicitly labelled as such
- `"hypothesised"` — a candidate explanation requiring further support, explicitly speculative

This status is enforced at the Zod schema level. It cannot be omitted. It propagates to the UI.

### Rationale

- **Trust:** Users who see `[inferred]` next to a causal claim understand they are looking at a model's best guess, not a measurement. This is more useful than false confidence.
- **Defensibility:** To the question "can you really prove causality?" the answer is: "No. The system produces candidate causal chains ranked by evidence, explicitly labelled as inferred. Consequential decisions remain at human gates."
- **Agent discipline:** Agent output schemas include the evidence status for every claim they return. An agent cannot return `status: "observed"` for a claim it derived analytically.
- **Legal/enterprise readiness:** In regulated environments, the distinction between observed measurement and model inference is not a nice-to-have — it is a compliance requirement.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| No status field; present all evidence equally | Actively misleading. Undermines the platform's credibility. |
| Confidence score (0.0–1.0) instead | Useful for ranking, but less communicative to humans. A score of 0.73 does not tell you whether the claim is measured or speculated. Kept as an additional field on graph edges (ADR-003) but not a replacement. |
| Boolean `isObserved` flag | Binary. Does not distinguish "analytically inferred from observations" from "speculative hypothesis." |

### Consequences

- UI renders evidence with a coloured badge: `observed` (green), `inferred` (amber), `hypothesised` (grey/dashed).
- Bob's synthesis agent is instructed to never upgrade an `inferred` claim to `observed` without a corresponding measurement artefact.
- Causal archaeology results are always `hypothesised` or `inferred`, never `observed`.

---

## ADR-012: WEAVE workflow as a finite state machine

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

Workflows have complex lifecycle transitions. A requirement can move from planning to execution, then back to re-planning if new information arrives, then to an approval gate, then to completion or rejection. Without a formal state machine, this logic becomes spaghetti conditionals.

### Decision

Model every WEAVE workflow as a strict finite state machine (FSM) with the following states and transitions:

```text
PENDING → CONTEXT_LOADING → PLANNING → DELEGATING → EXECUTING ⇄ VERIFYING
                                                        ▲            │
                                          changes requested          ▼
                                                        └── AWAITING_APPROVAL → COMPLETED → [mutation recorded]

Any open state → REJECTED
```

Illegal transitions are rejected at the engine level. State transitions are logged as immutable events.

### Rationale

- **Correctness:** An FSM makes illegal states unrepresentable. A workflow cannot jump from `PENDING` to `COMPLETED` without passing through execution and verification.
- **Replayability:** Because every state transition is a logged event, a workflow can be replayed deterministically from any checkpoint. This is the basis of the `replay.ts` module.
- **Debuggability:** When something goes wrong, the state log shows exactly where the workflow diverged from the happy path.
- **Approval gate integration:** The `AWAITING_APPROVAL` state is a natural pause point. The workflow cannot advance until a human or policy decision is recorded.
- **Bob compatibility:** Bob's Plan mode output maps directly to state transitions. Bob says "begin execution of task T-003" → WEAVE transitions `DELEGATING → EXECUTING` for that task.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Ad hoc status flags | `isStarted`, `isComplete`, `isApproved` — combination explosions, impossible to reason about. |
| XState | Excellent FSM library. Rejected for 48h scope: XState's visualiser and actor model add learning overhead that does not improve the demo. A hand-rolled FSM is transparent and debuggable. |
| Temporal.io workflows | Production-grade durable workflow engine. Requires a Temporal server. Violates ADR-025. |

### Consequences

- `src/core/weave/workflow-engine.ts` implements the FSM with explicit transition tables.
- Invalid transitions throw `WorkflowTransitionError` with current state, attempted transition, and valid transitions listed.
- All transitions are written to the `workflow_events` sub-table for replay.

---

## ADR-013: Mutation as a first-class domain object

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

The fundamental insight of EPOCH is that a commit/PR/task is an event, but a **mutation** is a consequence — a structured record of what the system became as a result of that event. Without this distinction, EPOCH collapses into a fancier GitHub Activity feed.

### Decision

Define `Mutation` as a first-class domain object, distinct from a Git commit. A mutation is computed by the mutation engine from a completed workflow. It captures: intent (what was asked), affected components (what was touched), evidence refs (what was observed), structural delta (what changed architecturally), and trajectory delta (how the trajectory moved).

### Rationale

- **Semantic richness:** A commit captures text changes. A mutation captures intent, scope, evidence, and downstream consequences. These are qualitatively different levels of abstraction.
- **Longitudinal links:** Mutations can be linked to other mutations (`FOLLOWS`, `SPAWNED`), to incidents (`CAUSED_BY`), and to invariants (`WEAKENS`). Raw commits cannot carry these semantic edges without external annotation.
- **The demo thesis:** The golden demo is structured around mutations, not commits. "M-1042 changes refund semantics" is a more meaningful unit for trajectory analysis than "commit abc123."
- **Evolution graph foundation:** Every node in the evolution graph is anchored to a mutation. The graph would not exist without this abstraction.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Use Git commits directly | Commits are raw text diffs. They have no agent evidence, no intent field, no invariant links. EPOCH would be a Git diff viewer. |
| Use PRs as the primary unit | PRs are better than commits but still lack evidence chains and trajectory deltas. Also, not every workflow produces a PR. |
| Use JIRA/Linear tickets | External dependency. Tickets track intent but not execution evidence or structural impact. |

### Consequences

- The mutation engine (`src/core/epoch/mutation-engine.ts`) is a critical path component. It must run after every workflow completion.
- Mutations are immutable once written. Amendments are represented as new mutations referencing the original.
- The sample app's pre-seeded history is represented as 25 seed mutations (not raw commits), created by `scripts/seed.ts`.

---

## ADR-014: Agents communicate through the evidence store, not directly

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

A multi-agent system where agents call each other directly is a hallucination amplifier: Agent A's incorrect output becomes Agent B's unquestioned input. This is the "telephone game" failure mode. EPOCH cannot afford this, especially for causal and security claims.

### Decision

Agents are strictly isolated. They read from the **context bundle** (provided by WEAVE) and write to the **evidence store**. They do not call each other. The synthesis agent reads the complete evidence store at the end of parallel execution. WEAVE orchestrates the sequence.

### Rationale

- **Provenance isolation:** Every claim in the evidence store has exactly one agent as its source. When a claim is disputed, it is traceable without ambiguity.
- **Prevents hallucination chains:** The Security agent cannot accidentally confirm a false claim made by the Historian agent, because it never reads the Historian's output — only the context bundle.
- **Parallelism:** Because agents are isolated, Security, QA, and Historian can run concurrently (Bob's parallel execution) without coordination logic. They share no mutable state.
- **Auditability:** The evidence store is the complete audit trail of how every conclusion was reached. Each claim has a `source_artifact_ref` linking to the artefact that supports it.
- **Synthesis quality:** The synthesis agent reads a complete, structured set of independent claims. It is composing a picture from evidence, not amplifying a chain of hearsay.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Direct agent-to-agent calls | Hallucination amplification. Source provenance becomes untraceable. |
| Shared memory / blackboard | Agents can read each other's partial outputs. Similar problems to direct calls, with worse timing guarantees. |
| Message queue (each agent publishes) | Overengineered for 48h. Introduces ordering complexity. Evidence store achieves the same goal with simpler mechanics. |

### Consequences

- Each agent implementation exports a single async function: `run(contextBundle: ContextBundle): Promise<Evidence[]>`.
- The agent runner in `src/core/weave/workflow-engine.ts` calls all independent agents in parallel via `Promise.all`.
- WEAVE enforces that no agent handler receives another agent's output as input.

---

## ADR-015: Deterministic drift patterns for the MVP, not ML

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

Drift detection could be implemented with a trained ML model, an LLM-based analysis, or hand-coded deterministic pattern checkers. The choice has significant implications for demo reliability and credibility.

### Decision

Implement three deterministic drift pattern checkers for the MVP:
1. **Boundary erosion:** count of direct cross-service data access violations per mutation window
2. **Invariant weakening:** exception accumulation around a declared business rule
3. **Dependency growth:** fan-out degree increase per component over a mutation window

Each checker produces a finding with full evidence: which mutations triggered the pattern, what the threshold is, what the current measurement is.

### Rationale

- **Demo reliability:** A deterministic checker produces the same result on every demo run. An ML model could behave unpredictably on the seeded data. A live demo is not the place to debug an ML model.
- **Explainability:** When someone asks "why did EPOCH flag this as drift?" the answer is a precise, auditable calculation: "3 direct DB accesses were recorded in the last 5 mutations, against a threshold of 2." This is defensible. An ML confidence score is not.
- **Speed:** Deterministic checkers run in milliseconds. No inference call, no model loading.
- **Sufficient for the thesis:** The demo does not need to detect every possible drift pattern. It needs to detect the seeded drift patterns convincingly. Three well-implemented patterns are more impressive than ten poorly-implemented ones.
- **Phase 2 path:** Each pattern is a pure function over the recent mutation history (`(history, spec) => PatternOutcome[]`). Adding an ML-assisted or LLM-assisted pattern later is one more function.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| LLM-based drift analysis | Slower, non-deterministic, credit-consuming (Bob credits are limited), and harder to explain. |
| Pre-trained ML classifier | Requires training data we do not have. Risk of false positives on the seeded demo data. |
| Architectural fitness functions (like ArchUnit) | Excellent approach, but language-specific (mostly JVM ecosystem). Our TypeScript codebase would need a custom implementation anyway. |

### Consequences

- `src/graph/drift/patterns.ts` implements the three patterns as pure functions over a five-mutation window: boundary erosion (a warning at the invariant's first violation, critical at two), invariant weakening (a non-boundary invariant below HOLDING) and dependency growth (fan-out up by two or more within the window).
- `src/graph/drift/detector.ts` runs them after each mutation, opens, escalates and resolves findings (`DRIFT-401` onwards) and records each as observed evidence with its measurement and threshold.

---

## ADR-016: Seeded sample application as the demo substrate

**Status:** Amended by ADR-027 (22 seeded mutations plus replayable changes)  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

The demo requires a realistic software system with a pre-existing history of mutations, including some that have introduced the "locally correct, globally worse" trajectory. Building this in real time during the demo is impossible.

### Decision

Create a purpose-built sample payment/e-commerce application in `packages/sample-app/` with:
- Realistic source code (Order Service, Auth Service, Payment Service, Notification Service, Archival Job)
- Pre-seeded history of 25 mutations, including 3 that introduce the seeded drift
- A `history/` directory containing JSON seed files that `scripts/seed.ts` loads into `epoch.db`
- A `scripts/demo-reset.ts` that wipes and re-seeds the database in under 5 seconds

### Rationale

- **Demo control:** The demo runs against a known codebase in a known state, not a random repository.
- **Thesis illustration:** The seeded mutations are crafted to illustrate "locally correct, globally worse." Each of the 3 drift-inducing mutations passes its own tests. Only the trajectory view reveals the problem.
- **Reliability:** A seeded demo cannot fail due to a real-world codebase behaving unexpectedly.
- **Repeatability:** Anyone can re-run the demo: `pnpm demo-reset && pnpm dev`.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Use a real open-source codebase (e.g., a popular npm package) | Uncontrollable. Drift patterns may not exist or may be in unexpected places. Demo flow cannot be scripted. |
| Build the demo live from scratch | Impossible in the demo time window. Also, would not show trajectory history. |
| Use a synthetic codebase with no real structure | A codebase without structure gives drift nothing to erode. A realistic payment domain makes the demo believable and the business value legible. |

### Consequences

- `packages/sample-app/history/` contains 25 JSON files, one per seed mutation, named `M-1001.json` through `M-1025.json`.
- The first 22 mutations establish a healthy baseline. Mutations M-1023, M-1024, M-1025 introduce boundary erosion.
- `scripts/seed.ts` processes these files in order, computing trajectory points and graph edges as it goes.

---

## ADR-017: Four-lens console architecture

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

The console must surface four fundamentally different questions: what is happening now, how did we get here, what is the system becoming, and what could happen next. A single-view dashboard would either be overwhelming or would force the viewer to hunt for the key insight.

### Decision

Structure the console as four named lenses with distinct routes: CURRENT (`/`), HISTORY (`/history`), TRAJECTORY (`/trajectory`), FUTURES (`/futures`). Each lens is a full-screen view with its own primary visualisation. The global navigation shows which lens is active and provides one-click access to the others.

### Rationale

- **Matches the platform's three-layer architecture:** CURRENT maps to WEAVE. HISTORY and TRAJECTORY map to EPOCH. FUTURES maps to the simulation layer.
- **Demo scripted around lens transitions:** The golden demo (DEMO_GUIDE.md) walks through each lens in sequence. Each lens transition reinforces the platform's thesis at a deeper level.
- **Cognitive load management:** A viewer watching a 4-minute demo cannot process 4 information spaces simultaneously. Separating them into sequential reveals is good UX and good storytelling.
- **"Mission control" aesthetic:** Four distinct lenses feel like panels in a mission control room, reinforcing the "living system" framing.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Single scrollable dashboard | Everything visible but nothing prominent. The evolution graph would compete with the workflow list for attention. |
| Tab-based UI within a single view | Less impactful than full-screen lens transitions. Loses the "spatial" distinction between present/past/future. |
| Separate browser tabs | Poor UX. No shared navigation state. Demo flow becomes fragile. |

### Consequences

- `src/console/views/` contains `CurrentView.tsx`, `HistoryView.tsx`, `TrajectoryView.tsx`, `FuturesView.tsx`.
- React Router handles navigation between lenses.
- Each lens has a dedicated TanStack Query hook for its data fetching (`useCurrentWorkflow`, `useMutationHistory`, `useTrajectory`, `useSimulations`).

---

## ADR-018: Causal archaeology uses graph BFS, not LLM assertion

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

Causal archaeology must trace a current symptom (drift finding or incident) back through the mutation graph to identify the earliest plausible responsible mutation. This could be done by asking an LLM "why did this happen?" or by traversing the graph algorithmically.

### Decision

Implement causal archaeology as a **backwards BFS** through the `graph_edges` table, following `FOLLOWS`, `TOUCHES`, and `WEAKENS` edges from the symptom's affected component. Score candidate mutations by: temporal proximity, component overlap, intent-outcome mismatch, and downstream incident correlation. Return the ranked chain with `status: "hypothesised"`.

### Rationale

- **Reproducibility:** The same symptom always produces the same candidate chain on the same data. An LLM would produce different chains on different runs, which is unacceptable for an audit trail.
- **Explainability:** Every candidate mutation in the chain can point to the graph edges that selected it. "M-1018 is ranked #1 because it TOUCHES OrderService and its trajectory delta shows +0.3 boundary erosion" is a complete explanation. An LLM's reasoning is opaque.
- **Speed:** Graph BFS in SQLite is millisecond-fast. LLM inference adds 2–10 seconds per query.
- **Bob credits:** Every LLM call consumes Bob credits. Causal archaeology can run dozens of times during a session. Using BFS protects the credit budget for impactful Bob Plan/Agent work.
- **Honest framing:** Results are explicitly labelled `hypothesised`. The BFS scoring makes the hypothesis construction transparent and auditable.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| LLM-based causal reasoning | Non-deterministic, credit-consuming, opaque. Cannot be audited. Produces plausible-sounding but unverifiable chains. |
| Pure temporal proximity | "The most recent mutation is the cause" — too naive. Misses structural relationships. |
| Static analysis dependency tracing | Captures static dependencies but not dynamic behaviour or runtime evidence. Misses the mutation history dimension. |

### Consequences

- `src/graph/causal/archaeologist.ts` implements the BFS traversal and scoring.
- The scoring weights (temporal, structural, behavioral) are configurable constants.
- All results carry `status: "hypothesised"` unless specific reproduction evidence exists.

---

## ADR-019: No autonomous production actions — hard approval gate

**Status:** Accepted  
**Date:** 2026-09-25  
**Deciders:** Platform team  

### Context

EPOCH coordinates AI agents that can modify code, run tests, and deploy software. Without a hard boundary, the system could autonomously push changes to production — a risk that would disqualify it in any enterprise context.

### Decision

All consequential actions (commits to main, deployments, merging simulation branches) require explicit human approval through the approval gate. The gate is a hard stop in the workflow FSM (`AWAITING_APPROVAL` state). It cannot be bypassed by any agent, including Bob. The console renders the gate as a prominent, blocking UI element.

### Rationale

- **Enterprise trust:** The platform is designed for enterprise contexts where autonomous production changes are a compliance violation. Building this boundary in at the prototype stage signals maturity.
- **Demo clarity:** The approval gate is a visible moment that shows human oversight is designed in, not bolted on. It is a feature, not a limitation.
- **AI output quality:** Even the best agents make mistakes. An approval gate is the circuit breaker that prevents a confident but wrong agent output from causing irreversible harm.
- **ADR-011 consistency:** If evidence is labelled `inferred` or `hypothesised`, consequential action based on that evidence should require human confirmation.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Policy-based automatic approval | Reasonable for Phase 2 (low-risk changes auto-approved by policy). Not appropriate for a prototype where policy rules are not yet mature. |
| No approval gate | Unacceptable. Autonomous production actions are a red flag for any enterprise evaluator. |
| Per-agent approval gates | Too granular. Approval fatigue would make the console unusable. One gate per workflow is the right granularity. |

### Consequences

- `src/core/weave/approval-gate.ts` exposes `requestApproval(workflowId)` and `recordDecision(workflowId, actor, action, rationale)`.
- `POST /api/workflows/:id/approve` and `POST /api/workflows/:id/reject` are the only API endpoints that advance past the gate.
- The CURRENT lens renders an `ApprovalGate` component as a fullscreen-overlay call-to-action when a workflow is in `AWAITING_APPROVAL` state.

---

## ADR-020: Bob workflows packaged for deterministic demo replay

**Status:** Superseded by ADR-026 (Bob V2 does not yet support authoring custom workflows)  
**Date:** 2026-09-26  
**Deciders:** Platform team  

### Context

Reviewers may want to verify the demo independently or explore the platform later. A demo that only works when the original developer walks through it live is fragile. Replayable, reproducible demonstrations are stronger evidence.

### Decision

Package the golden demo path as a reusable Bob workflow in `.bob/workflows/feature-lifecycle.yaml`. The workflow encodes the complete sequence: event intake → context bundle → Bob Plan → parallel agents → Bob Agent execution → verification → approval gate → mutation recording → drift check. `pnpm demo-reset && pnpm dev` then running the workflow replicates the full demo from a clean state.

### Rationale

- **Reproducibility:** A packaged Bob workflow that others can replay is stronger evidence than a video alone.
- **Bob capability showcase:** Reusable workflows are listed as a Bob V2 capability.
- **Demo insurance:** If the live demo hits an unexpected state, the presenter can `demo-reset` and rerun the workflow in under 2 minutes.
- **Bob session log:** Running the workflow generates a Bob session log in `.bob/sessions/`. This becomes evidence of genuine Bob integration.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Video-only demo | Not replayable. Nobody else can run it. |
| Shell script for demo steps | Does not demonstrate Bob workflow capability. |
| Manual demo walk-through only | Fragile. Non-reproducible. |

### Consequences

- `.bob/workflows/feature-lifecycle.yaml` defines the complete golden path workflow.
- `.bob/workflows/incident-remediation.yaml` defines the incident response workflow (second demo scenario).
- `scripts/demo-reset.ts` is the single command to return to a known-good demo state.

---

## ADR-021: Two-speed control loop: micro and macro

**Status:** Accepted, amended (the macro loop runs in-process after each mutation)  
**Date:** 2026-09-26  
**Deciders:** Platform team  

### Context

The platform operates at two fundamentally different time scales: the speed of an individual engineering task (minutes to hours) and the speed of system evolution (weeks to months). Conflating these into a single loop produces either an overwhelmed user or an under-informed evolution model.

### Decision

Implement two explicit control loops sharing the same infrastructure but operating at different cadences:
- **Micro loop:** triggered by every event, runs the WEAVE lifecycle to completion, produces a mutation
- **Macro loop:** triggered after every mutation, runs trajectory recalculation, drift detection, and phase detection; may produce new micro-loop triggers

### Rationale

- **Cadence alignment:** A developer does not want to wait for trajectory recalculation before their next task starts. Running the macro loop asynchronously (as a Bob background task) decouples the two speeds.
- **Bob background tasks:** The macro loop is a natural use case for Bob's background task capability. It runs while the developer continues working on the next task, surfacing findings when complete.
- **Composability:** Findings from the macro loop (drift detected) become inputs to the micro loop (new remediation workflow triggered). The two loops feed each other, creating the closed system the thesis describes.

### Consequences

- As built, the macro loop runs in-process right after each mutation is recorded (`src/core/epoch/mutation-engine.ts`): scan, invariants, trajectory point, drift patterns, epoch detection and incident reconciliation, serialized through one queue. It takes well under a second on the sample service, so a Bob background task was not needed.
- The SSE stream delivers macro-loop findings (drift, invariant changes, epoch proposals, incidents) to the console in real time.
- A finding feeds the micro loop through a workflow: an incident or remediation workflow started from the console or by Bob.

---

## ADR-022: Trajectory point computed after every mutation

**Status:** Accepted  
**Date:** 2026-09-26  
**Deciders:** Platform team  

### Context

The trajectory engine needs sufficient data resolution to detect drift. Computing trajectory points only at certain intervals (e.g., weekly) would miss the gradual accumulation pattern that EPOCH is designed to surface.

### Decision

Compute and persist one `TrajectoryPoint` after every mutation. Each point records: coupling score, boundary integrity score, drift delta, epoch ID, and state hash. The trajectory view renders all points as a time series.

### Rationale

- **Resolution:** Drift is a gradual process. A trajectory point per mutation means drift is detectable as soon as it begins, not after it has already caused an incident.
- **Demo accuracy:** The seeded demo has 25 mutations. 25 trajectory points provide clear visible trend lines in the TRAJECTORY lens. Fewer points would make the drift hard to see visually.
- **Cheap computation:** At demo scale (25–50 mutations), computing one trajectory point is a millisecond operation. No performance concern.

### Consequences

- `trajectory_points` table grows linearly with mutation count.
- At enterprise scale (thousands of mutations), a sliding window or downsampling strategy is needed. Noted as Phase 2 concern.

---

## ADR-023: Epoch boundary as a structural regime change

**Status:** Accepted  
**Date:** 2026-09-26  
**Deciders:** Platform team  

### Context

EPOCH introduces "epochs" as named periods of relative stability. The platform must decide when a new epoch begins. This threshold is a heuristic — there is no mathematically correct answer.

### Decision

Propose a new epoch boundary when two or more of the following conditions are met across a 5-mutation window:
1. Boundary integrity score drops by more than 0.3
2. Three or more new cross-component dependency edges appear
3. A behavioural change is detected (new test failure pattern or runtime metric shift)
4. An invariant transitions from `HOLDING` to `VIOLATED`

Epoch boundaries are **proposals**, not automatic commits. A human confirms or rejects the proposed boundary via the approval gate pattern.

### Rationale

- **Avoids false positives:** Requiring 2 of 4 conditions prevents a single noisy mutation from triggering a new epoch incorrectly.
- **Human confirmation:** The platform proposes; the human decides. This is consistent with ADR-019 and ADR-011.
- **Configurable:** All four thresholds are configurable constants in `src/core/epoch/epoch-detector.ts`. They can be tuned for different codebases.

### Consequences

- `src/core/epoch/epoch-detector.ts` implements the four-condition check after each trajectory point computation.
- The TRAJECTORY lens shows proposed epoch boundaries as dashed vertical lines until confirmed.
- Confirmed epoch boundaries are solid vertical lines with a label.

---

## ADR-024: Vitest for testing, not Jest

**Status:** Accepted  
**Date:** 2026-09-26  
**Deciders:** Platform team  

### Context

The platform requires a test runner for unit tests (individual modules), integration tests (API + database), and a golden-path e2e test. The test runner must be ESM-native and TypeScript-compatible without a separate Babel transform.

### Decision

Use [Vitest](https://vitest.dev). Run with `--run` flag for single-pass execution (no watch mode required for submission).

### Rationale

- **ESM-native:** Vitest is built for ESM. No `transform: { moduleNameMapper }` configuration required. Works out of the box with `type: "module"` in `package.json`.
- **Vite config reuse:** Vitest shares the Vite configuration. The console and the tests share the same TypeScript paths and aliases.
- **Speed:** Vitest's parallel test runner is significantly faster than Jest for TypeScript projects.
- **Compatibility:** Vitest's API is Jest-compatible (`describe`, `it`, `expect`, `vi.mock`). Bob, which has been trained on Jest, writes Vitest-compatible tests without adjustment.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Jest | CJS-first. ESM support requires `--experimental-vm-modules` and `babel-jest`. Configuration overhead is significant for a 48h build. |
| Node.js built-in test runner | Too minimal. No mocking, no coverage, no snapshot testing. |
| Mocha | Requires separate assertion library and coverage tool. More configuration than Vitest. |

### Consequences

- `vitest.config.ts` at root configures test environment.
- Tests use `.test.ts` extension throughout.
- `pnpm test` runs `vitest --run` for a single pass.

---

## ADR-025: No Docker, no external services for the hackathon build

**Status:** Accepted  
**Date:** 2026-09-26  
**Deciders:** Platform team  

### Context

The hackathon build must work on any reviewer's machine with a single `pnpm install && pnpm dev` command. External service dependencies (databases, message queues, cloud APIs) create failure modes that cannot be controlled during a live demo or evaluation.

### Decision

Zero external infrastructure for the MVP. All persistence is SQLite embedded in the process (ADR-002). No Docker. No cloud APIs beyond IBM Bob IDE (which runs locally). No Redis, no Kafka, no PostgreSQL, no Neo4j.

### Rationale

- **Demo reliability:** Every external dependency is a potential failure point. `pnpm install && pnpm dev` must work on the first try, on any machine, without credentials.
- **Reproducibility:** Reviewers may want to run the project themselves. The simpler the setup, the higher the chance they actually do.
- **48-hour scope:** Infrastructure debugging consumes time that should go into platform features.
- **Phase 2 path:** Every infrastructure choice (SQLite → PostgreSQL, embedded BFS → Neo4j, local Bob → Bob API) has a clear Phase 2 migration path documented in the relevant ADR.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Docker Compose with all services | Adds 30–60 minutes of setup debugging risk. Docker not guaranteed on reviewers' machines. |
| Cloud-hosted database | Network dependency during demo. Credential management. Free tier limits. |
| Serverless functions (Vercel/Netlify) | Cold starts. Deploy step during demo. Network dependency. |

### Consequences

- The hard constraint "no external infrastructure" is documented here and in README.md.
- `pnpm install` must complete successfully with no environment variables required.
- `pnpm dev` starts both the API server and the console Vite dev server concurrently.

---

## ADR-026: Bob drives EPOCH through MCP

**Status:** Accepted
**Date:** 2026-09-27
**Deciders:** Platform team
**Supersedes:** ADR-020 · **Amends:** ADR-009

### Context

ADR-020 assumed Bob could replay a custom workflow definition, and ADR-009 described a read-only MCP server on an HTTP port. Bob V2 ships curated workflows but not yet authoring of custom ones, and Bob IDE has no API a server can call. The first EPOCH-MCP was a plain REST service that no MCP client could connect to.

### Decision

EPOCH never calls Bob. Bob calls EPOCH. EPOCH-MCP is a stdio MCP server built on the official SDK and registered in `.bob/mcp.json`. It is a thin client of the EPOCH API, so every action reaches the console's event stream. It exposes read tools (history, invariants, causal chains, workflow status, decision packages) and write tools that drive the WEAVE lifecycle (`start_workflow`, `record_plan`, `run_specialist`, `record_evidence`, `request_approval`) and futures (`fork_futures`, `evaluate_future`). It has no approve tool.

### Rationale

- Bob's strengths (planning, implementation, subagents, parallel work) are used where they matter, while EPOCH keeps memory, measurement and governance.
- Going through the API keeps a single writer and a single event stream.
- Bob's own confirmation of write tools plus the console's approval gate make the human boundary visible twice.

### Consequences

- The API must run for EPOCH-MCP to work; the tools say so when it does not.
- The golden path can also run without Bob (`pnpm demo:replay`, `pnpm demo:futures`) for tests and as a fallback.

---

## ADR-027: Observations come from a structural scanner over a separate sample repository

**Status:** Accepted
**Date:** 2026-09-27
**Deciders:** Platform team
**Amends:** ADR-010, ADR-016

### Context

The first implementation derived trajectory deltas and invariant statuses from numbers supplied with each mutation, so "observed" evidence was not observed. Sandbox branches were created with `git checkout -b` inside a directory that was not its own repository, which switched the platform repository's branch, and git commands were built as shell strings.

### Decision

- A deterministic scanner reads the watched repository's imports and policy constants and evaluates the rules in its `invariants.json`. Tests and runtime probes run in child processes. These are the only sources of `observed` evidence about the system.
- `packages/sample-app` is copied into `.epoch/sample-repo`, a separate git repository. Futures are git worktrees of it. Git runs through `execFile` with validated identifiers.
- The seeded history is 22 mutations (M-1020 to M-1041) scanned against the baseline code; the drift story comes from real changes (M-1042 live or scripted, then M-1051, M-1077, M-1084), each measured when it lands.
- Drift thresholds are tuned to the watched service: boundary erosion warns at one bypassing import and is critical at two; dependency growth warns at +2 fan-out within five mutations.

### Consequences

- Every number in the demo can be traced to code, a test or a probe.
- `pnpm demo-reset` is deterministic and tested.
- The scanner understands TypeScript imports and numeric constants, which is enough for the watched service and not a general semantic analysis.

---

## ADR-028: Console stack as built

**Status:** Accepted
**Date:** 2026-09-27
**Deciders:** Platform team
**Supersedes:** ADR-005 · **Amends:** ADR-017

### Decision

The console uses React 19, Vite, Tailwind CSS 4, React Router 7, Recharts and a custom SVG evolution graph instead of React Flow. It reads the `/api/v1` adapter, whose responses match the console's own view-model types, and subscribes to `/api/v1/stream`.

### Rationale

The four-lens design of ADR-017 holds. A custom SVG graph gave the time-and-lane layout the Trajectory view needed without a graph library, and an adapter on the API side let the console keep its types unchanged.

---

## ADR-029: A hosted demo runs in a guarded public mode

**Status:** Accepted
**Date:** 2026-09-27
**Deciders:** Platform team
**Relates to:** ADR-019, ADR-025, ADR-027

### Context

Reviewers need a link they can open without installing anything. EPOCH is not a static site: it keeps SQLite state, drives git in a sample repository and runs that repository's tests and probes in child processes. Several routes accept a patch or evidence text, and a patch applied to a worktree becomes code the moment its tests run. Exposing the full API publicly would let anyone run code on the host.

### Decision

Host EPOCH as one container in which the API also serves the built console. With `EPOCH_PUBLIC_DEMO=1`:

- Reads are open. Writes are limited to adopting a measured future, running its remediation to the approval gate, deciding, and restoring the showcase. Everything else answers 403.
- Allowed writes run one at a time (429 otherwise), and a restore is allowed at most once a minute.
- The instance opens on the showcase: the demo replayed to the moment a reviewer chooses a future. It is built once when the image is built, saved as a snapshot of the database and working directory, and restored in about a second at boot, on request, and after 20 idle minutes.

### Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Static console with recorded data | Nothing a visitor does would reach the engine. |
| Full API behind accounts | Accounts and quotas are out of scope for the prototype; the 403 list is simpler to audit. |
| Serverless functions | SQLite files, git worktrees and child processes need a long-lived process with a filesystem. |

### Consequences

- The approval gate stays a person's decision (ADR-019); in the hosted demo that person is the visitor.
- Hosting needs Node and git only; `render.yaml` describes the service and CI builds the image on every push.
- Anything that would let a visitor submit code stays local, where Bob drives the full lifecycle through EPOCH-MCP.

---

*All decisions are final for the hackathon MVP unless a superseding ADR is added. Phase 2 migration paths are documented within each ADR but do not constitute accepted decisions.*
