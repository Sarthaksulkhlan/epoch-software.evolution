# EPOCH — Team Structure & Collaboration Guide

**Team:** Hriday + Sarthak  
**Hackathon:** IBM Bob 2.0 — lablab.ai, September 25–27, 2026  

---

## The Problem We Need to Solve

This is a **IBM Bob hackathon**. The single biggest judging criterion is:

> **Tool Usage & Depth of Adoption (30%):** Did the team actually build with IBM Bob as a core part of their workflow, not just bolt it on at the end?

Sarthak is handling the frontend. If Sarthak builds the UI using a tool other than Bob — Cursor, Copilot, v0, Lovable, plain VS Code — **that 30% is at risk**. Every line of frontend code that Bob didn't touch is a gap judges can find.

The solution is not to stop Sarthak from using his preferred tools. The solution is to **make Bob the mandatory integration layer** for the frontend's connection to the platform — the part judges will actually look at in the session logs.

---

## Responsibility Split

### Hriday — Platform Core

Everything that isn't the React UI.

| Area | Scope |
|---|---|
| **WEAVE lifecycle engine** | `src/core/weave/` — FSM, context builder, task graph, approval gate, replay |
| **EPOCH evolution layer** | `src/core/epoch/` — mutation engine, trajectory, invariant store, epoch detector, debt model |
| **All specialist agents** | `src/agents/` — all 8 agent implementations |
| **Evolution graph** | `src/graph/` — mutations, trajectory, drift, causal, simulation |
| **API server** | `src/api/` — Hono REST + SSE + EPOCH-MCP server |
| **Persistence** | `src/store/` — SQLite schema, queries, migrations |
| **Sandbox** | `src/sandbox/` — Git branch isolation |
| **Shared types/schemas** | `src/shared/` — all Zod schemas and types |
| **Sample app + seeding** | `packages/sample-app/`, `scripts/` |
| **Bob workflows & MCP** | `.bob/` — all workflow definitions, hooks, MCP config |
| **All Bob sessions** | `.bob/sessions/` — session logs for judging evidence |

**Tool:** IBM Bob IDE — exclusively. Every task goes through Bob Plan/Agent mode.

---

### Sarthak — Frontend Console

The four-lens React UI.

| Area | Scope |
|---|---|
| **CURRENT lens** | `src/console/views/CurrentView.tsx` — active workflow, agent task cards, evidence feed, approval gate |
| **HISTORY lens** | `src/console/views/HistoryView.tsx` — mutation list, workflow replay, decision log |
| **TRAJECTORY lens** | `src/console/views/TrajectoryView.tsx` — **the evolution graph** (React Flow) — this is the hero UI |
| **FUTURES lens** | `src/console/views/FuturesView.tsx` — scenario comparison cards |
| **Shared UI components** | `src/console/components/` — MutationNode, IncidentNode, EpochBoundary, ApprovalGate |
| **Data hooks** | `src/console/hooks/` — TanStack Query hooks + SSE subscription hook |
| **Routing** | React Router setup in `src/console/App.tsx` |
| **Styling** | Tailwind — dark mission-control aesthetic |
| **Console Vite config** | `src/console/vite.config.ts` |

---

## The Bob Strategy for the Frontend

**This is the critical part.**

Sarthak can use whatever tools help him move fast. But IBM Bob **must be involved** in the following frontend tasks — because these are what judges see in the session logs and what makes the submission credible.

### The 4 things Bob must do on the frontend (non-negotiable)

#### 1. Bob builds the evolution graph component (TrajectoryView)

This is the **signature visual** of the entire platform. It is what every judge will stare at longest. Bob must build the React Flow integration for this view.

**Why:** The evolution graph queries EPOCH's MCP server (`get_trajectory_snapshot`, `get_mutation_history`) to get its data. Bob writing this component means Bob is **querying its own evolution graph** to build the UI that displays it. That is the most powerful judge moment possible — Bob using EPOCH-MCP to build EPOCH's UI.

**Session to log:** S-012 (already defined in `docs/BOB_SESSIONS.md`).

**How:** Hriday opens Bob, loads the EPOCH-MCP server, then hands Sarthak a working `TrajectoryView` stub. Sarthak polishes the visual design.

#### 2. Bob wires all API calls in the data hooks

The TanStack Query hooks in `src/console/hooks/` are the connection layer between the UI and the platform. These are straightforward but must be Bob-generated to show integration depth.

**Session to log:** S-013 (already defined).

**How:** Bob generates all `useWorkflow`, `useMutationHistory`, `useTrajectory`, `useSimulations`, and `useEventStream` hooks in a single Agent mode session. Sarthak imports and uses them in his components.

#### 3. Bob implements the ApprovalGate component

The approval gate is the most consequential UI moment in the demo — the full-screen overlay where the judge makes the decision. It must be well-built and it must come from Bob.

**How:** One short Bob Agent mode session. `src/console/components/ApprovalGate.tsx`. Bob already knows the workflow approval API endpoint from the MCP server context.

#### 4. Bob does the SSE hook + real-time integration

The `useEventStream` hook is what makes the console feel alive. Bob writing this is a natural fit — Bob knows the event types from the schema (`src/shared/schema/`) and the SSE endpoint definition.

---

## What Sarthak Can Build With His Preferred Tools

Everything that is purely visual and not connected to the EPOCH data layer:

- Layout, spacing, colour palette, Tailwind classes
- The static structure of HistoryView and CurrentView (skeleton/shell only)
- Individual card components that receive props (not the data fetching)
- Animations, transitions between lenses
- The timeline visual in HistoryView (once data shape is known)
- Mobile responsiveness (if time permits)

**The rule:** If a component fetches data from EPOCH's API or renders EPOCH's domain objects, Bob touches it. If a component is purely presentational (receives props, renders UI), Sarthak owns it completely.

---

## Handoff Protocol

### Hriday → Sarthak

Hriday provides Sarthak with:

1. **`src/shared/types/index.ts`** — all TypeScript types. Sarthak imports these for prop types.
2. **`src/console/hooks/`** — all data hooks (Bob-generated). Sarthak imports and uses these.
3. **`src/api/server.ts`** — the live API running at `localhost:3000`. Sarthak develops against this.
4. **`src/console/views/TrajectoryView.tsx`** — the evolution graph (Bob-built skeleton). Sarthak styles it.

### Sarthak → Hriday

Sarthak provides Hriday with:

1. Finished component implementations in `src/console/views/` and `src/console/components/`
2. `src/console/vite.config.ts` — final build config
3. Any new Tailwind utility classes or custom CSS

---

## Git Workflow

```
main
├── hriday/platform-core     ← Hriday's working branch
└── sarthak/console-ui       ← Sarthak's working branch
```

**Merge strategy:**
1. Hriday merges `platform-core` → `main` first (the API must be running before UI work)
2. Sarthak branches from updated `main` after the API is stable
3. Final integration merge: Sarthak's `console-ui` → `main` before demo

**Conflict zone to watch:** `src/console/` is Sarthak's territory. `src/` (everything else) is Hriday's. Overlap only happens at the hook boundary (`src/console/hooks/`) — coordinate before touching those files.

---

## Timeline Suggestion (48h window)

| Time | Hriday | Sarthak |
|---|---|---|
| 0–8h | WEAVE FSM + schema + store + API skeleton | Vite + React + Tailwind setup; static shell of all 4 lenses |
| 8–16h | Agents + parallel runner + EPOCH evolution layer | CURRENT and HISTORY lens visual structure (static) |
| 16–24h | Evolution graph + mutation engine + trajectory | Receive hooks from Hriday; wire CURRENT and HISTORY |
| 24–32h | Drift + causal + simulation + MCP server | Bob builds TrajectoryView (React Flow) — Sarthak styles it |
| 32–38h | Sample app seeding + demo-reset + Bob workflows | FUTURES lens + ApprovalGate (Bob-built, Sarthak-styled) |
| 38–44h | Bob session clean runs + S-016 dry run | Final polish, animations, responsiveness |
| 44–48h | README final, video recording | Video walk-through support |

---

## The One Rule That Covers Everything

> **If judges open `.bob/sessions/` and see Bob's fingerprints on the evolution graph, the hooks, and the approval gate — we score full marks on the 30% Bob criterion.**

Bob does not need to have written every `<div>`. Bob needs to have written the parts that matter — the parts that connect EPOCH's intelligence layer to the interface judges interact with during the demo.

Sarthak owning the visual design is a feature, not a problem. A beautiful UI with Bob-backed data integration is better than an ugly UI that Bob wrote every line of.
