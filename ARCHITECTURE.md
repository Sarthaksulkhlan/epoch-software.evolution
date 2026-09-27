# EPOCH architecture

> AI can change your software one task at a time. EPOCH makes sure you do not lose the system in the process.

Version 0.4.0. This document describes the system as built. Decisions and their rationale are in [DECISIONS.md](DECISIONS.md).

## 1. Overview

| Layer | Question | Responsibilities |
| --- | --- | --- |
| **WEAVE** (lifecycle) | What are we doing now? | Events, context bundles, plans, specialist agents, verification, the approval gate, replay |
| **EPOCH** (evolution) | What has the system become? | Mutations, structural scans, invariants, trajectory, drift, epochs, incidents, causal archaeology, evolution debt |
| **Futures** | What could it become? | Counterfactual worktrees measured like real changes, adoption through a governed workflow |
| **IBM Bob** (execution) | How is the work done? | Plans and implements changes, runs specialists from subagents, explores futures, all through EPOCH-MCP |

The central idea: **a change can be locally correct while the system's trajectory gets worse.** EPOCH records every approved change as a mutation, measures the system after it, and reasons over the sequence.

## 2. Why this problem

Frontier coding agents do much worse on long-horizon evolution than on isolated tasks (sources in [docs/RESEARCH_NOTES.md](docs/RESEARCH_NOTES.md)):

| Benchmark | Isolated | Long-horizon |
| --- | --- | --- |
| SWE-EVO (v1, 2025), GPT-5 with OpenHands | 65% (SWE-Bench Verified) | 21% |
| EvoClaw, now SWE-Milestone (2026), overall scores | >80% | ≤38% |
| RoadmapBench (2026), strongest model | — | 39.1% (Claude Opus 4.7) |

What is missing is not code generation but memory of what the system has become and a way to steer it. EPOCH provides that layer and lets Bob use it.

## 3. System map

```text
 IBM Bob IDE ──stdio MCP──► EPOCH-MCP (src/api/mcp) ──HTTP──┐
                                                            ▼
 ┌──────────────────────────────── EPOCH API (src/api) ────────────────────────────────┐
 │  REST /api · console adapter /api/v1 · SSE /api/stream, /api/v1/stream · hooks       │
 ├───────────────────────────────┬──────────────────────────────┬──────────────────────┤
 │ WEAVE (src/core/weave)        │ EPOCH (src/core/epoch)       │ Futures              │
 │ workflow-engine (FSM + log)   │ mutation-engine              │ (src/core/futures)   │
 │ context-builder               │ invariant-store              │ simulator            │
 │ task-graph · agent-runner     │ trajectory · epoch-detector  │ sandbox/worktrees    │
 │ verification · approval-gate  │ incidents · debt-model       │                      │
 │ pipeline · replay             │ history · evidence-writer    │                      │
 ├───────────────────────────────┴──────────────────────────────┴──────────────────────┤
 │ Specialists (src/agents): context · historian · security · qa · evolution ·         │
 │ incident · synthesis                                                                 │
 │ Graph (src/graph): scanner · drift patterns · causal archaeologist · export          │
 │ Sandbox (src/sandbox): git without a shell · sample repo · test and probe runners   │
 │ Store (src/store): SQLite via better-sqlite3, rows parsed through Zod               │
 └──────────────────────────────────────────────────────────────────────────────────────┘
                                   │
               watched system: .epoch/sample-repo (a git repo)
               source of truth:  packages/sample-app
```

The console (`src/console`, React 19 + Vite) reads `/api/v1` and subscribes to `/api/v1/stream`.

## 4. The watched system

`packages/sample-app` is a small payments service: dispute API, order service, ledger with an archive, archival job, reconciler, webhooks and a card vault. It carries:

- `invariants.json`: four machine-checkable invariants, one runtime probe and one consistency check.
- `history/baseline.json`: the seeded epoch E-0 (M-1020 to M-1041).
- `history/patches/`: three safe-looking AI changes (M-1051, M-1077, M-1084).
- `history/scripted/M-1042.patch` and `history/futures/`: fallbacks for the changes Bob makes live.

`pnpm demo-reset` copies the service into `.epoch/sample-repo`, a separate git repository with `core.autocrlf=false`, and seeds the database from the baseline history. EPOCH, Bob, the replay and the futures change that copy, never the platform repository.

## 5. WEAVE: the lifecycle

### 5.1 State machine

```text
PENDING → CONTEXT_LOADING → PLANNING → DELEGATING → EXECUTING → VERIFYING → AWAITING_APPROVAL → COMPLETED
                                                        ▲            │               │
                                                        └── retry ───┘               └─ changes requested → EXECUTING
 any open state → REJECTED (abort or rejection)
```

Every transition is written to `workflow_events` with its actor and stage and emitted on the event bus. `replayWorkflow` rebuilds a workflow's full history (event, transitions, tasks, evidence, decisions, mutation, plan) from the store; nothing is held in memory.

Workflow kinds: `feature`, `incident`, `remediation`, `replay`, and `seed` for the seeded history.

### 5.2 Context bundle

`context-builder` assembles, for each workflow: the requirement (first sentence as the statement, the rest as acceptance criteria), the sample repo's branch, HEAD and file-tree digest, the files that mention the requirement's keywords, prior mutations touching those components, invariants in scope, telemetry from probes and open incidents, and a provenance record for every item. The bundle is saved under `.epoch/context/` and referenced from the workflow.

### 5.3 Plan and specialists

`record_plan` stores Bob's plan text with the specialist task graph for the workflow kind (`task-graph.ts`):

| Kind | Layer 1 (parallel) | Then |
| --- | --- | --- |
| feature | context, historian, security, qa | evolution → synthesis |
| incident | historian, incident, evolution | security, qa → synthesis |
| remediation | historian, security, qa, evolution | synthesis |
| replay | security, qa | evolution → synthesis |

`agent-runner` runs each layer concurrently, persists every claim as evidence under its task, retries a failing agent up to three times and records the failure as evidence instead of dropping it. A specialist called by name (for example from a Bob subagent through `run_specialist`) consumes its planned task.

### 5.4 Verification and the approval gate

`request_approval` moves the workflow to VERIFYING and runs `verification.ts` on the working tree: the sample service's tests (one `node:test` process per file), its runtime probes, a structural scan of the system as it would be, and the drift patterns over the history plus that preview. Security, QA and the evolution analyst then run in the verification phase and synthesis writes a recommendation.

The decision package (`approval-gate.ts`) holds: risk scoped to what the change does (pre-existing problems inform the reviewer but do not raise the change's risk), the recommendation, open questions, measured improvements, the trajectory preview (before and after scores, invariant transitions, new dependencies and violations, envelope), the drift preview, changed files, tests and probes.

Approval commits the working tree in the sample repo and hands the workflow to the mutation engine. Rejection discards the working tree. "Request changes" sends it back to EXECUTING.

## 6. EPOCH: the evolution plane

### 6.1 Structural scanner

`src/graph/scanner` reads every `.ts` file under the watched repo's `src/`, parses imports (static, re-export, side-effect, dynamic) and resolves them to files. It derives:

- **Components** (first directory under `src/`) and cross-component dependency edges; **coupling** = edges ÷ n(n−1).
- **Policy constants** named in `invariants.json`.
- **Invariant results** from three rule types: `import-boundary` (which files may import a guarded module; thresholds for WEAKENED and VIOLATED), `constant-order` (one constant must not exceed another, escalating to VIOLATED when a guarded table is read directly), and `test` (a named test file passes; carried forward when tests did not run).
- **Boundary integrity** = mean invariant score (HOLDING 1, WEAKENED 0.5, VIOLATED 0).
- A **state hash** over files, module edges and constants.

`diffScans` reports added and removed edges and violations, invariant transitions, probe changes and coupling, integrity and behaviour deltas. Scans are deterministic.

### 6.2 Mutation engine

`processWorkflowCompletion` (serialised) commits the sample repo, runs tests and probes, scans, and calls `recordMutation`, which in one transaction:

1. Writes observed evidence: the scan summary, each new or removed violation, each invariant transition, new dependencies, tests, probes and failed consistency checks.
2. Evaluates epoch conditions and, when two hold, proposes a new epoch that starts at this mutation.
3. Inserts the mutation (intent, author, commit, affected components, trajectory delta, epoch) and its edges: `PRODUCES` (workflow → mutation), `TOUCHES` (mutation → component), `FOLLOWS` (previous → this), `WEAKENS` (mutation → degraded invariant), `BOUNDARY` (epoch → epoch).
4. Applies the scan to the invariant registry and records the trajectory point with the scan.
5. Runs the drift detector and the incident monitor.

Events (`mutation.committed`, `invariant.changed`, `trajectory.updated`, `drift.*`, `epoch.proposed`, `incident.*`) are emitted after the transaction commits.

Mutations are immutable. `compensate` reverts a mutation's commit in the sample repo and records a new mutation that points to the one it compensates.

### 6.3 Trajectory and envelope

One trajectory point per mutation: coupling, boundary integrity, drift delta (coupling change minus integrity change), epoch and state hash. The intended envelope is boundary integrity ≥ 0.8 and coupling ≤ 0.3. `graph/trajectory/analytics.ts` adds velocity, inflections and a linear projection (labelled inferred).

### 6.4 Drift patterns (ADR-015)

| Pattern | Measurement | Warning | Critical |
| --- | --- | --- | --- |
| Boundary erosion | imports that bypass a guarded module | the invariant's `weakenedAt` (1) | its `violatedAt` (2) |
| Invariant weakening | a non-structural invariant left HOLDING | WEAKENED | VIOLATED |
| Dependency growth | a component's fan-out over the last five mutations | +2 | +3 |

Each finding lists the mutations behind it (for erosion, the mutation that introduced each import) and the evidence ids. The detector keeps one open finding per pattern and subject, escalates it, and resolves it when the pattern no longer holds.

### 6.5 Epochs (ADR-023)

Over the last five mutations of the current epoch, propose a new epoch when two of these hold: boundary integrity moved by more than 0.3, two or more dependency edges were added or removed, a probe or test outcome changed, an invariant entered or left VIOLATED. Proposals start as `proposed`; a person confirms them (`POST /api/trajectory/epochs/:id/confirm`).

### 6.6 Incidents

Runtime probes (`scenarios/` in the watched repo) run with every verification and mutation. A failing probe opens an incident (numbered from INC-3312) with its reproduction reference and candidate causal chain, and `CAUSED_BY` edges to the candidates with confidence equal to their score. A passing probe resolves it and adds a `REMEDIATES` edge from the mutation.

### 6.7 Causal archaeology (ADR-018)

Given a finding, incident, invariant, mutation or free-text symptom, the archaeologist walks back through `FOLLOWS` edges with a recursive CTE (depth ≤ 10), keeps the mutations that degraded an invariant in scope, introduced a violation, or flipped a probe, and scores each:

| Factor | Weight | Meaning |
| --- | --- | --- |
| Temporal | 0.3 | closeness to the symptom |
| Structural | 0.3 | overlap with the symptom's components |
| Intent–outcome mismatch | 0.2 | the change degraded an invariant beyond what it touched |
| Incident correlation | 0.2 | the probe started failing right after it |

It returns the chain in time order, the **earliest plausible** mutation (hypothesised) and the **most proximate** one (inferred when the probe flipped right after it). Every response carries the reminder that temporal order and overlap do not prove causality.

### 6.8 Evolution debt

Six dimensions (architecture, business rules, dependencies, runtime, knowledge, agentic drift), each with a 0–1 score, the indicator behind it and the mutations involved. Scores interpret measurements and are labelled inferred.

## 7. Futures

`fork` creates one to three git worktrees of the sample repo at the base mutation's commit under `.epoch/futures/<simulation>/<scenario>`, at most three simulations at once. Bob implements each future in its worktree (or a patch is applied), and `evaluate` runs the same tests, probes and scanner there. The recommendation ranks futures by failing checks, then boundary integrity, then diff size. `select` applies the chosen future's diff to the sample repo and opens a remediation workflow, which still goes through verification and the approval gate. On approval the mutation gets a `SPAWNED` edge from the base mutation and the worktrees are removed.

## 8. IBM Bob integration

EPOCH-MCP (`src/api/mcp/mcp-server.ts`) is a stdio MCP server built on the official SDK. It is a thin client of the API, so everything Bob does appears on the console's stream. Its 21 tools cover history (`get_mutation_history`, `check_invariants`, `get_causal_chain`, …), the lifecycle (`start_workflow`, `record_plan`, `run_specialist`, `record_evidence`, `request_approval`, `get_workflow_status`), futures (`fork_futures`, `evaluate_future`, `get_simulation`) and the evolution report (`get_evolution_report`). Bob starts it through `scripts/epoch-mcp.mjs`, which resolves everything relative to the repository because MCP hosts spawn servers from their own directory. Read tools are marked read-only and auto-allowed in `.bob/mcp.json`; write tools ask Bob's user for approval. There is no approve tool: the gate is a person in the console.

The intended flow in Bob IDE:

1. Before changing anything, Bob reads the trajectory, the invariants in scope and the relevant history.
2. Bob opens a workflow, plans in Plan mode and records the plan.
3. Subagents run the Historian, Security and QA specialists in parallel and add their own claims.
4. Bob implements the change in the sample repo in Agent mode.
5. Bob requests approval; EPOCH verifies and previews the trajectory; a person decides.
6. When drift appears, Bob traces it, forks futures, implements each in its worktree, and hands the measured options to the reviewer.

Hook endpoints let Bob's editor events reach EPOCH: `POST /api/hooks/file-changed` returns a structural preview of the working tree (for example "INV-TIME-02 would weaken") and puts it on the stream; `GET /api/hooks/session-context` returns a one-paragraph trajectory summary; `POST /api/hooks/bob-activity` records task activity.

## 9. Persistence

One SQLite database (`data/epoch.db`, or `EPOCH_DB_PATH`), WAL mode, foreign keys on. Rows are parsed through the Zod schemas in `src/shared/schema` when read.

| Table | Holds |
| --- | --- |
| `events` | immutable triggers |
| `workflows`, `workflow_events` | lifecycle state and the transition log |
| `tasks`, `evidence`, `artifacts`, `decisions` | specialist work, claims with status and provenance, verification artifacts, gate decisions |
| `mutations`, `trajectory_points` | the evolution record and the scan behind each point |
| `graph_edges` | the evolution graph as typed, weighted edges |
| `invariants`, `epochs`, `drift_findings`, `incidents`, `simulations` | the evolution plane's state |

See [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

## 10. API and streaming

A Hono server bound to 127.0.0.1 with a CORS allowlist. `/api` exposes the platform; `/api/v1` returns the console's view models; `/api/stream` and `/api/v1/stream` are Server-Sent Events with `Last-Event-ID` resume from a 500-event buffer. Errors: 400 validation, 404 missing, 409 state conflicts. Full list: [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

With `EPOCH_CONSOLE_DIR` set, the API also serves the built console, so one process hosts everything; the `Dockerfile` builds that single service. `EPOCH_PUBLIC_DEMO=1` puts a guard in front of every write for a hosted instance (section 12) and prepares the showcase: the demo replayed to the moment a reviewer chooses a future, saved once as a snapshot of the database and working directory and restored in about a second.

## 11. Console

Four lenses: **Current** (active workflow, specialist cards, evidence, approval gate), **History** (mutations, incidents), **Trajectory** (evolution graph, integrity trend, drift findings, invariants) and **Futures** (scenario comparison and remediation). React 19, Vite, Tailwind CSS 4, React Router 7, Recharts and a custom SVG evolution graph.

## 12. Evidence discipline and governance

| Boundary | Rule | Where |
| --- | --- | --- |
| Observation vs inference | `observed` only for measurements; `inferred` for conclusions; `hypothesised` for candidate explanations | agent contracts, scanner, archaeologist |
| Causality | candidate chains ranked by evidence, never proof | causal archaeologist |
| Consequential change | nothing reaches the graph without a recorded decision | approval gate |
| Isolation | experiments in a separate repo and worktrees; git without a shell; validated ids | sandbox |
| Retries | at most three per task, then a recorded failure | agent runner |
| Public exposure | a hosted instance only lets visitors adopt a measured future, run it to the gate, decide and restore the showcase, one action at a time; routes that take patches, files or evidence answer 403 | public demo guard |
| Audit | immutable events, transition log, immutable mutations | store, workflow engine |

## 13. Determinism and tests

`pnpm demo-reset` produces identical mutations, timestamps and state hashes on every run (tested). `pnpm test` runs 38 tests: scanner and rules, drift patterns, the state machine, the API contract, deterministic reset, public demo mode, and the golden path end to end over HTTP. CI runs the typecheck, the tests, the console build and the container build on every push.

## 14. Limits

One watched TypeScript service; the scanner understands imports and numeric constants, not arbitrary semantics. Causal chains are hypotheses. Futures are measured scenarios, not predictions. SQLite and in-process execution are sized for a demo; the store and the sandbox are the seams for a multi-repository deployment.
