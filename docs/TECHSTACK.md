# EPOCH — Technology Stack Reference

> Complete reference for every technology used in the EPOCH platform.
> Includes version, purpose, why it was chosen, and how it is used.
> Cross-references the relevant ADR for every non-trivial decision.

**Last updated:** 2026-09-26  
**See also:** [DECISIONS.md](../DECISIONS.md) for the full rationale behind each choice.

---

## Quick Reference Table

| Category | Technology | Version | ADR |
|---|---|---|---|
| Language | TypeScript | 5.5.4 | ADR-001 |
| Runtime | Node.js | 22 LTS | ADR-001 |
| Module system | ESM (ES Modules) | native | ADR-001 |
| Backend framework | Hono | 4.7.9 | ADR-004 |
| Backend runner | @hono/node-server | 1.13.7 | ADR-004 |
| Frontend framework | React | 18.3.x | ADR-017 |
| Frontend build | Vite | 6.3.5 | ADR-017 |
| Graph visualisation | React Flow | 12.x | ADR-005 |
| Charts / timelines | Recharts | 2.x | — |
| Styling | Tailwind CSS | 3.x | — |
| Async state (UI) | TanStack Query | 5.x | — |
| Routing (UI) | React Router | 6.x | — |
| Real-time updates | Server-Sent Events (SSE) | native | ADR-006 |
| Persistence | SQLite via better-sqlite3 | 11.9.1 | ADR-002 |
| Graph model | JSON-LD adjacency (SQLite rows) | — | ADR-003 |
| Schema validation | Zod | 3.24.3 | ADR-008 |
| Monorepo | pnpm workspaces | 9.x | ADR-007 |
| TypeScript runner | tsx | 4.19.3 | ADR-001 |
| Test runner | Vitest | 3.1.4 | ADR-024 |
| HTTP test client | Supertest | 7.x | ADR-024 |
| Event bus | EventEmitter3 | 5.0.1 | — |
| ID generation | nanoid | 5.0.9 | — |
| Process concurrency | concurrently | 9.1.2 | — |
| Linter | ESLint | 9.26.0 | — |
| Formatter | Prettier | 3.5.3 | — |
| AI execution fabric | IBM Bob IDE | 2.0.2+ | ADR-009, ADR-020 |
| Bob integration | MCP (Model Context Protocol) | v1 | ADR-009 |
| Bob automation | Bob Hooks | v1 | ADR-020 |

---

## Runtime & Language

### TypeScript 5.5.4

**What it is:** Strongly-typed superset of JavaScript that compiles to plain JS.  
**Why here:** Single language across backend, frontend, agents, graph, and scripts. Bob operates with full type context across the entire repo. See [ADR-001](../DECISIONS.md#adr-001-typescript-as-the-single-platform-language).  
**Where used:** Every `.ts` and `.tsx` file in the project.  
**Key config:** `tsconfig.base.json` — strict mode, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`.  
**Notable:** `verbatimModuleSyntax: true` ensures import/export statements are not transformed, preserving ESM semantics.

### Node.js 22 LTS

**What it is:** JavaScript runtime.  
**Why here:** Stable LTS with native `fetch`, native `crypto.randomUUID()`, and strong ESM support. No Deno/Bun edge cases on Windows.  
**Where used:** API server, MCP server, scripts, tests.  
**Minimum version:** 22.0.0 (enforced in `package.json` `engines` field).

### ESM (ES Modules)

**What it is:** Native JavaScript module system (`import`/`export`).  
**Why here:** `"type": "module"` in `package.json`. All files use ESM. No CommonJS `require()`.  
**Why not CJS:** CJS is legacy. Mixing CJS and ESM produces obscure errors. Vitest and Vite are ESM-first.  
**Key implication:** All relative imports need explicit file extensions (`.js` extension used even for `.ts` source files — Node.js ESM convention).

---

## Backend

### Hono 4.7.9

**What it is:** Ultra-lightweight (~14kb) web framework for TypeScript.  
**Why here:** First-class TypeScript typing end-to-end, built-in SSE via `streamSSE`, zero config, runs on `@hono/node-server` for local dev. See [ADR-004](../DECISIONS.md#adr-004-hono-as-the-backend-api-framework).  
**Where used:** `src/api/server.ts` — all REST routes + SSE stream.  
**Key features used:**
- `zValidator` middleware for request body validation against Zod schemas
- `streamSSE` for the `GET /api/stream` real-time console feed
- `cors()`, `logger()` built-in middleware
- Typed `HonoClient` for console data-fetching

**Endpoint overview:**
```
POST /api/events
GET  /api/workflows, GET /api/workflows/:id
POST /api/workflows/:id/approve, /reject
GET  /api/mutations, GET /api/mutations/:id
GET  /api/graph, GET /api/graph/component/:id
GET  /api/trajectory, GET /api/drift
POST /api/simulations, GET /api/simulations/:id
GET  /api/stream          ← SSE
GET  /api/invariants, POST /api/invariants
GET  /api/health
```

### @hono/node-server 1.13.7

**What it is:** Node.js adapter for Hono.  
**Why here:** Hono core is runtime-agnostic; this adapter runs it on Node's `http` module without any additional server setup.  
**Where used:** `src/api/server.ts` — `serve(app, { port: 3000 })`.

### tsx 4.19.3

**What it is:** TypeScript execution engine. Runs `.ts` files directly without a compilation step.  
**Why here:** `tsx watch src/api/server.ts` starts the dev server with hot-reload. No `tsc` build step needed during development.  
**Where used:** All `pnpm dev` scripts. `scripts/*.ts` execution.

### EventEmitter3 5.0.1

**What it is:** High-performance EventEmitter implementation.  
**Why here:** Internal event bus connecting the WEAVE state machine, mutation engine, drift detector, and SSE stream. When a mutation is committed, the bus emits `mutation.committed` → drift detector runs → SSE stream pushes to console.  
**Where used:** `src/core/events/bus.ts`.

### nanoid 5.0.9

**What it is:** Tiny, secure URL-friendly unique string ID generator.  
**Why here:** Generates all `event_id`, `workflow_id`, `task_id`, `evidence_id`, `artifact_id` values. Shorter and URL-safe compared to raw UUID v4 while remaining collision-resistant.  
**Where used:** `src/shared/utils/id.ts`.

---

## Persistence

### better-sqlite3 11.9.1

**What it is:** Synchronous SQLite driver for Node.js. The fastest Node.js SQLite library.  
**Why here:** Zero external infrastructure. Embedded in the Node process. Synchronous API simplifies agent task handlers. See [ADR-002](../DECISIONS.md#adr-002-sqlite-as-the-primary-persistence-layer).  
**Where used:** `src/store/db.ts` — single connection to `data/epoch.db`.  
**Key patterns:**
```typescript
// Prepared statement (all queries — no string concatenation)
const stmt = db.prepare('SELECT * FROM mutations WHERE mutation_id = ?');
const mutation = stmt.get(mutationId);

// Recursive CTE for graph traversal (causal archaeology)
const ancestors = db.prepare(`
  WITH RECURSIVE ancestors AS (
    SELECT from_id as mutation_id, 0 as depth FROM graph_edges
    WHERE to_id = ? AND relationship IN ('FOLLOWS', 'TOUCHES')
    UNION ALL
    SELECT e.from_id, a.depth + 1 FROM graph_edges e
    JOIN ancestors a ON e.to_id = a.mutation_id WHERE a.depth < 10
  ) SELECT DISTINCT mutation_id, depth FROM ancestors ORDER BY depth
`);
```
**Database file:** `data/epoch.db` (gitignored — recreated by `pnpm seed` / `pnpm demo-reset`).

### JSON-LD adjacency overlay

**What it is:** Not a separate library — a design pattern implemented in the `graph_edges` table.  
**Why here:** Represents the evolution graph's node-edge structure using SQL rows with a `relationship` type column and a `confidence` score. No graph database required. Recursive CTEs handle traversal. See [ADR-003](../DECISIONS.md#adr-003-json-ld-adjacency-overlay-for-the-evolution-graph).  
**Export format:** `GET /api/graph` returns the graph as JSON-LD, directly consumable by React Flow and by Bob's document understanding.

---

## Schema & Validation

### Zod 3.24.3

**What it is:** TypeScript-first schema validation library.  
**Why here:** Single source of truth — Zod schema IS the TypeScript type. `z.infer<typeof Schema>` generates the type automatically. See [ADR-008](../DECISIONS.md#adr-008-zod-for-runtime-schema-validation).  
**Where used:** `src/shared/schema/` — 12 entity schemas. Hono `zValidator` middleware on all POST/PUT routes.  
**Pattern used throughout the codebase:**
```typescript
// src/shared/schema/mutation.schema.ts
export const MutationSchema = z.object({
  mutation_id: z.string().min(1),
  workflow_id: z.string().uuid(),
  intent: z.string().min(1),
  affected_components: z.array(z.string()).min(1),
  evidence_refs: z.array(z.string()).min(1),
  trajectory_delta: TrajectoryDeltaSchema,
  epoch_id: z.string(),
  created_at: z.number().int().positive(),
});

export type Mutation = z.infer<typeof MutationSchema>;
// No separate interface needed. Schema IS the type.
```

---

## Frontend / Console

### React 18.3.x

**What it is:** UI component library.  
**Why here:** Industry standard. Huge ecosystem. First-class TypeScript. Vite plugin works zero-config.  
**Where used:** `src/console/` — entire four-lens console UI.  
**Key React 18 features used:** `useDeferredValue` for large graph rendering, `useTransition` for lens navigation, `Suspense` for data-loading states.

### Vite 6.3.5

**What it is:** Frontend build tool and dev server.  
**Why here:** Near-instant HMR, zero config for React + TypeScript, ESM-native, works with Vitest config sharing.  
**Where used:** `src/console/` — `vite dev` for development, `vite build` for production.  
**Config:** `src/console/vite.config.ts` — uses `@vitejs/plugin-react`.

### React Flow 12.x

**What it is:** React library for building interactive node-edge graphs.  
**Why here:** The evolution graph is the signature visual of EPOCH. React Flow handles node rendering, zoom/pan, selection, custom node types, and edge routing. See [ADR-005](../DECISIONS.md#adr-005-react-flow-for-evolution-graph-visualisation).  
**Where used:** `src/console/views/TrajectoryView.tsx`.  
**Custom node types implemented:**
- `MutationNode` — circular node with component colour coding, epoch badge, mutation ID tooltip
- `IncidentNode` — red X with animated pulse ring
- `EpochBoundaryNode` — vertical separator with epoch label
- `InvariantNode` — hexagonal badge with HOLDING/WEAKENED/VIOLATED colour coding

### Recharts 2.x

**What it is:** React charting library built on D3.  
**Why here:** Zero-config React-native charts for trajectory time-series (coupling score, boundary integrity score over mutations). Free, no external service.  
**Where used:** `src/console/views/TrajectoryView.tsx` — drift trend lines. `src/console/views/HistoryView.tsx` — mutation frequency chart.

### Tailwind CSS 3.x

**What it is:** Utility-first CSS framework.  
**Why here:** No design system setup needed. "Mission control" dark-mode aesthetic achievable with utility classes in hours. Zero build-time CSS extraction cost with Vite.  
**Design language used:** Dark background (`gray-950`), component colour rows (distinct hue per service layer), amber/red for drift/violations, green for healthy states.

### TanStack Query 5.x

**What it is:** Async state management for React. Previously known as React Query.  
**Why here:** Handles loading/error/stale states for all API calls without Redux boilerplate. `useQuery` for data, `useMutation` for approve/reject actions at the gate. Perfect fit for the event-driven console.  
**Where used:** `src/console/hooks/` — one custom hook per lens view.

### React Router 6.x

**What it is:** Client-side routing for React.  
**Why here:** The four-lens console uses `/`, `/history`, `/trajectory`, `/futures` routes. React Router handles navigation and lens transitions with no page reload.  
**Where used:** `src/console/App.tsx` — `<Routes>` definition.

### Server-Sent Events (SSE)

**What it is:** Browser-native protocol for unidirectional server→client event streams.  
**Why here:** The console needs live updates (workflow progress, drift alerts, new mutations) without polling. SSE is simpler than WebSockets for a unidirectional feed and auto-reconnects on disconnect. See [ADR-006](../DECISIONS.md#adr-006-server-sent-events-sse-for-console-real-time-updates).  
**Server side:** `GET /api/stream` via Hono's `streamSSE`.  
**Client side:** `src/console/hooks/useEventStream.ts` — typed `EventSource` wrapper.  
**Event types streamed:**
```
workflow.created    workflow.updated    workflow.completed
task.started        task.completed      task.failed
evidence.created    drift.detected      mutation.committed
simulation.started  simulation.completed  epoch.proposed
```

---

## Testing

### Vitest 3.1.4

**What it is:** ESM-native test runner compatible with Vite config.  
**Why here:** Zero config for ESM + TypeScript. Jest-compatible API (Bob writes Vitest-compatible tests naturally). Shares path aliases with Vite. See [ADR-024](../DECISIONS.md#adr-024-vitest-for-testing-not-jest).  
**Where used:** `tests/unit/`, `tests/integration/`, `tests/e2e/`.  
**Run:** `pnpm test` → `vitest --run` (single pass, no watch mode for submission).

**Test structure:**
```
tests/
├── unit/
│   ├── workflow-engine.test.ts    # FSM transitions + replay
│   ├── mutation-engine.test.ts    # mutation record creation
│   ├── trajectory.test.ts         # score computation
│   ├── causal-archaeology.test.ts # BFS traversal
│   ├── drift/
│   │   ├── boundary-erosion.test.ts
│   │   ├── invariant-weakening.test.ts
│   │   └── dependency-growth.test.ts
│   └── agents/
│       └── [agent].test.ts        # contract tests for each agent
├── integration/
│   ├── api.test.ts                # HTTP integration tests (all routes)
│   └── store.test.ts              # SQLite CRUD + recursive CTE queries
└── e2e/
    └── golden-path.test.ts        # full workflow → mutation → drift → simulation
```

### Supertest (via vitest)

**What it is:** HTTP assertion library for testing API routes without a running server.  
**Why here:** `tests/integration/api.test.ts` tests all 14 API routes against the Hono app directly, without starting a real server.  
**Where used:** `tests/integration/api.test.ts`.

---

## Monorepo & Tooling

### pnpm workspaces 9.x

**What it is:** Package manager with native monorepo support.  
**Why here:** Manages `packages/sample-app` as an isolated workspace alongside the main platform. Fast installs via content-addressable store. See [ADR-007](../DECISIONS.md#adr-007-pnpm-workspaces-as-the-monorepo-strategy).  
**Workspace config:** `pnpm-workspace.yaml` — declares `"."` and `"packages/*"`.  
**Key commands:**
```bash
pnpm install                          # installs all workspaces
pnpm --filter @epoch/sample-app build # run a script in a specific package
```

### concurrently 9.1.2

**What it is:** Runs multiple npm scripts concurrently in one terminal.  
**Why here:** `pnpm dev` starts three processes (API server, MCP server, Vite console) in one command with colour-coded labels. Essential for the demo quick-start.  
**Config in `package.json`:**
```json
"dev": "concurrently --names \"API,MCP,UI\" --prefix-colors \"blue,cyan,green\" \"pnpm api:dev\" \"pnpm mcp:dev\" \"pnpm console:dev\""
```

### ESLint 9.26.0

**What it is:** JavaScript/TypeScript linter.  
**Why here:** Catches common errors, enforces import ordering, flags unused variables. Bob-written code passes the linter.  
**Where used:** `pnpm lint` — `src/` only.

### Prettier 3.5.3

**What it is:** Opinionated code formatter.  
**Why here:** Consistent formatting across Bob-written and human-written code. No style debates.  
**Where used:** `pnpm format` — `src/`, `docs/`, `scripts/`.

---

## IBM Bob Integration Stack

### IBM Bob IDE v2.0.2+

**What it is:** The AI-native development partner that serves as EPOCH's execution fabric.  
**Why here:** Required by the hackathon. Used as the execution substrate for all agentic work — not bolted on at the end. See [ADR-009](../DECISIONS.md#adr-009-ibm-bob-mcp-server-for-evolution-graph-access), [ADR-020](../DECISIONS.md#adr-020-bob-workflows-packaged-for-deterministic-demo-replay).  
**Minimum version:** v2.0.2 (v1.x and v2.0.0 are deprecated as of September 30, 2026 — see IBM Bob docs).  
**Capabilities used:** Plan mode, Agent mode, subagents, parallel execution, background tasks, document understanding, rollback, reusable workflows, MCP tools, hooks.

### MCP (Model Context Protocol) — EPOCH-MCP Server

**What it is:** Protocol for exposing tools to AI agents.  
**Why here:** EPOCH exposes a custom MCP server (`src/api/mcp-server.ts`) on port 3001. Bob queries EPOCH's evolution graph mid-session via 5 MCP tools. This creates the genuine bidirectional Bob ↔ EPOCH integration that judges will see in the session logs.  
**Registration:** `.bob/mcp.json` — `epoch-evolution` server pointing to `localhost:3001`.  
**Tools exposed:**
```
get_mutation_history(component, limit)
check_invariants(components[])
get_trajectory_snapshot()
list_active_workflows()
get_causal_chain(symptom)
```

### Bob Hooks (v1)

**What it is:** Event-driven automation that fires Bob agent/command actions on IDE events.  
**Why here:** Integrates Bob into the developer's normal save/task cycle without requiring manual invocation. `.bob/workflows/hooks.json` defines three hooks.  
**Hooks configured:**
| Hook | Trigger | Action |
|---|---|---|
| EPOCH Drift Check on Save | `PostFileSave` on `packages/sample-app/src/**/*.ts` | Calls `/api/graph/check-drift` for the saved component |
| EPOCH Mutation Record on Task Complete | `PostTaskExec` | Posts `task.completed` event to the API |
| EPOCH Session Context Loader | `SessionStart` | Loads current trajectory snapshot as Bob session context |

### Bob Reusable Workflows

**What it is:** Packaged, repeatable Bob workflow definitions in YAML.  
**Why here:** The golden demo is packaged as `.bob/workflows/feature-lifecycle.yaml`. Any judge can replay the exact demo from a clean state using this workflow. See [ADR-020](../DECISIONS.md#adr-020-bob-workflows-packaged-for-deterministic-demo-replay).  
**Workflows defined:**
- `feature-lifecycle.yaml` — full WEAVE golden path (8 steps, 2 parallel agent groups, 1 approval gate)
- `incident-remediation.yaml` — incident → causal archaeology → patch → trajectory recovery

---

## What Was Explicitly Rejected

These technologies were considered and rejected. Details are in the referenced ADRs.

| Technology | Why rejected | ADR |
|---|---|---|
| Docker / containers | Violates zero-infrastructure constraint; demo failure risk | ADR-025 |
| PostgreSQL | Requires running server; same capability from SQLite at demo scale | ADR-002 |
| Neo4j / graph database | Requires Docker or paid cloud; recursive CTEs sufficient | ADR-003 |
| Express | No first-class TypeScript typing; no built-in SSE | ADR-004 |
| tRPC | Opaque protocol; judges can't inspect raw HTTP calls | ADR-004 |
| WebSockets | Bidirectional overkill for unidirectional console feed | ADR-006 |
| Python backend | Fragments Bob's codebase context; two-language overhead | ADR-001 |
| Jest | CJS-first; ESM support requires Babel transform | ADR-024 |
| Redux | Boilerplate overhead not justified at console scale | — |
| D3.js | Custom canvas implementation not feasible in 48h | ADR-005 |
| LLM-based drift detection | Non-deterministic, credit-consuming, hard to explain | ADR-015 |
| Temporal.io | Requires Temporal server; overkill for MVP | ADR-012 |
| Turborepo / Nx | Build orchestration overhead not needed in 48h | ADR-007 |
