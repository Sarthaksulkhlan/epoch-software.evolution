# EPOCH

[![CI](https://github.com/vighriday/epoch-software-evolution/actions/workflows/ci.yml/badge.svg)](https://github.com/vighriday/epoch-software-evolution/actions/workflows/ci.yml)

**The control and intelligence plane for software that never stops changing.**

> AI can change your software one task at a time. EPOCH makes sure you do not lose the system in the process.

Coding agents are good at individual tasks. What they lose is the system: dozens of changes that each pass their own tests can still erode a boundary, break a business rule, or set up an incident nobody traces back. EPOCH treats the **trajectory** of a system, not the individual change, as the thing to engineer.

- **WEAVE** runs each change as a governed workflow: requirement → context bundle → plan → specialist agents in parallel → verification → human approval.
- **EPOCH** records every approved change as a **mutation**, measures the system after it, and watches the trajectory: drift, invariants, epochs, incidents, and a candidate causal chain back through history.
- **Futures** fork the system into isolated worktrees so alternative fixes can be measured before one is adopted.
- **IBM Bob** is the execution fabric. Bob drives WEAVE through the EPOCH-MCP server and implements the changes; the approval gate stays human.

> **A change can be correct. A system can still be getting worse.**

---

## What you can see it do

The repository ships a small payments service (`packages/sample-app`) with a seeded history. Running the demo shows the whole loop on real code:

1. **M-1042** extends the chargeback window from 15 to 30 days. All 11 tests pass. Before approval, EPOCH's verification already shows that invariant `INV-TIME-02` (a settlement must stay reachable while it can be disputed) would weaken, because ledger retention is still 15 days.
2. Three safe-looking AI changes follow (**M-1051**, **M-1077**, **M-1084**). Each passes every test. Together they bypass the order and ledger services, and a runtime probe starts failing: a dispute on day 20 can no longer find its settlement. EPOCH opens **INC-3312**, raises boundary-erosion and invariant-weakening findings, and proposes a new epoch.
3. Causal archaeology traces INC-3312 back through **M-1077 → M-1051 → M-1042**, naming M-1042 as the earliest plausible mutation (labelled *hypothesised*) and M-1077 as the most proximate (*inferred*, because the probe flipped right after it).
4. Two futures are forked and measured in isolated worktrees: **A** only extends retention (the probe passes, but the boundary stays violated, integrity 0.75); **B** restores the boundary and aligns retention (every invariant holds, integrity 1.0).
5. Adopting B runs through the same governed workflow. Approval records **M-1085**, resolves INC-3312 and the findings, and the trajectory is back inside its envelope.

Every number above comes from the scanner, the tests or the probe. Nothing in the story is typed in by hand.

## Quick start

Requirements: Node.js 22+, pnpm 9+, Git. No database server, Docker or credentials.

```bash
pnpm install
pnpm demo-reset          # fresh database + sample repo, seeded epoch E-0 (22 mutations)
pnpm dev                 # API on http://127.0.0.1:3000, console on http://127.0.0.1:5173
```

Then, in a second terminal (or from IBM Bob, see below):

```bash
pnpm demo:replay --with-feature   # M-1042, then the three AI changes → drift, INC-3312, epoch E-1
pnpm demo:futures                 # fork and measure futures A and B from the latest mutation
```

Adopt a future from the console's Futures view, or with `POST /api/v1/simulations/remediate`. The full walkthrough is in [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md).

Other commands:

```bash
pnpm test          # 38 tests: unit, integration and the golden path end to end
pnpm typecheck     # strict TypeScript for the platform, the console and the sample app
pnpm api           # API only
pnpm build         # build the console into dist/
pnpm mcp           # EPOCH-MCP on stdio (IBM Bob starts it from .bob/mcp.json)
```

### Hosted demo

The `Dockerfile` packages EPOCH as one service: the API serves the built console on the same port and runs in a guarded public mode. It opens on the moment a reviewer chooses a future, lets a visitor adopt one and approve it, keeps every other write closed, and restores itself after 20 idle minutes.

```bash
docker build -t epoch . && docker run --rm -p 8080:8080 epoch   # http://localhost:8080
```

`render.yaml` deploys the same image on Render (New → Blueprint → this repository).

## How IBM Bob fits

EPOCH does not call Bob. Bob calls EPOCH: the lifecycle is driven from Bob IDE through **EPOCH-MCP**, a stdio MCP server registered in [`.bob/mcp.json`](.bob/mcp.json). Its 20 tools give Bob the system's memory and let it run a governed workflow:

| Step | EPOCH-MCP tools |
| --- | --- |
| Learn the system's history before changing it | `get_trajectory_snapshot`, `get_mutation_history`, `check_invariants`, `get_causal_chain`, `list_drift_findings` |
| Open and plan a workflow | `start_workflow`, `get_context_bundle`, `record_plan` |
| Run specialists (Historian, Security, QA, …) in parallel from subagents | `run_specialist`, `record_evidence` |
| Implement the change in the sample repo, then verify | `get_repo_status`, `request_approval`, `get_decision_package`, `get_workflow_status` |
| Explore alternative fixes | `fork_futures`, `evaluate_future`, `get_simulation`, `start_incident_workflow` |

There is deliberately no approve tool. A person decides at the approval gate in the console. EPOCH also exposes hook endpoints (`/api/hooks/*`) so Bob's file edits show up on the console's live stream with a structural preview. Exported Bob task sessions are kept in [`bob_sessions/`](bob_sessions/).

## Architecture

```text
            IBM Bob IDE ── stdio MCP ──► EPOCH-MCP ── HTTP ──►┐
            (plans, implements,                               │
             runs subagents)                                  ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ EPOCH API (Hono)                                                       │
 │  WEAVE   events → context → plan → specialists → verify → approval gate │
 │  EPOCH   mutation engine → scanner → invariants → trajectory → drift    │
 │          → epochs → incidents → causal archaeology → debt               │
 │  FUTURES git worktrees of the sample repo, measured the same way        │
 │  SQLite (better-sqlite3) · evolution graph as typed edges               │
 └───────────────────┬────────────────────────────────────────────────────┘
                     │ REST + Server-Sent Events (/api, /api/v1)
                     ▼
        Console (React 19 + Vite): Current · History · Trajectory · Futures
```

- **Measured, not asserted.** A deterministic scanner reads the watched repo's imports and policy constants and evaluates the machine-checkable rules in `invariants.json`. Tests and runtime probes run in child processes. Those results are the only source of `observed` evidence.
- **Evidence discipline.** Every claim is labelled `observed`, `inferred` or `hypothesised` (ADR-011). Causal chains are candidates ranked by evidence, never proof (ADR-018).
- **Governed changes.** Workflows follow a strict state machine with a persisted transition log. Nothing reaches the evolution graph without a recorded human or policy decision.
- **Isolation.** The sample service is copied into its own git repository under `.epoch/`; futures are git worktrees of it. EPOCH never switches its own branch.

Details: [ARCHITECTURE.md](ARCHITECTURE.md) and the decision records in [DECISIONS.md](DECISIONS.md).

## Repository layout

```text
src/
  api/          Hono server, REST routes, /api/v1 console adapter, SSE, EPOCH-MCP server
  core/weave/   workflow state machine, context builder, task graph, agent runner, verification, approval gate
  core/epoch/   mutation engine, invariants, trajectory, epochs, incidents, evolution debt
  core/futures/ counterfactual futures
  agents/       context, historian, security, QA, evolution analyst, incident, synthesis
  graph/        scanner, drift patterns, causal archaeology, graph export, trajectory analytics
  sandbox/      git (no shell), sample repo, worktrees, test and probe runners
  store/        SQLite schema and typed queries
  console/      the four-lens console
packages/sample-app/   the watched payments service, its invariants, history and replayable changes
scripts/        demo-reset, seed, demo:replay, demo:futures, showcase:snapshot, migrate
tests/          unit, integration and end-to-end tests
.bob/           IBM Bob configuration (MCP server registration)
```

## Documentation

| Document | Contents |
| --- | --- |
| [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md) | Run the demo yourself, step by step |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | REST, `/api/v1` console endpoints, SSE events and EPOCH-MCP tools |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Layers, data flow, persistence, the scanner, futures, Bob integration |
| [DECISIONS.md](DECISIONS.md) | Architecture decision records |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Entities, tables and graph edges |
| [docs/AGENTS.md](docs/AGENTS.md) | Specialist agents, their contracts and guardrails |
| [docs/TECHSTACK.md](docs/TECHSTACK.md) | Technologies and why |
| [docs/RESEARCH_NOTES.md](docs/RESEARCH_NOTES.md) | Sources behind the problem statement |
| [docs/BOB_SESSIONS.md](docs/BOB_SESSIONS.md) | Index of exported IBM Bob sessions |
| [packages/sample-app/README.md](packages/sample-app/README.md) | The watched service, its invariants and history |

## Limits

EPOCH is a hackathon prototype built around one watched service. The scanner understands TypeScript imports and numeric policy constants; causal chains are ranked hypotheses; futures are measured scenarios, not production predictions. The evolution debt scores are interpretations and are labelled as such.

## Team and license

Built for the IBM Bob 2.0 hackathon on lablab.ai by Hriday and Sarthak Sulkhlan. MIT licensed, see [LICENSE](LICENSE).
