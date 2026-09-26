# API contract

The EPOCH API listens on `http://127.0.0.1:3000` (set `PORT` and `HOST` to change it). Request and response bodies are JSON. Invalid bodies return `400` with Zod details, missing records `404`, state conflicts (for example an illegal workflow transition) `409` with the valid transitions.

CORS allows `http://localhost:5173` by default; set `CORS_ORIGIN` (comma-separated) to change it. In development the console calls the API through Vite's proxy, so it never needs CORS; with `EPOCH_CONSOLE_DIR` set, the API serves the built console itself.

## Public demo mode

A hosted instance runs with `EPOCH_PUBLIC_DEMO=1` (the container image sets it). Reads work as documented below. Writes are limited to the steps a visitor needs to finish the story:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/simulations/remediate` | Adopt a measured future |
| POST | `/api/workflows/:id/run-to-approval` | Run the remediation workflow's specialists and verification up to the gate |
| POST | `/api/v1/workflows/:id/decision` | Approve or reject at the gate |
| POST | `/api/demo/showcase` | Restore the showcase (at most once a minute) |

Every other write answers `403`, including every route that accepts a patch, a file path or evidence text: a patch applied to a worktree runs as code when its tests execute. Allowed writes run one at a time; a concurrent one, or any write while the showcase is being prepared, gets `429`.

The showcase is the moment a reviewer chooses a future: M-1042 and the three AI changes recorded, INC-3312 open, futures A and B measured. `GET /api/health` reports `demo: { mode, showcase, restoresAfterIdleMinutes }`, where `showcase` is `building`, `ready` or `failed`. A changed demo restores itself after 20 minutes without activity.

## Console endpoints (`/api/v1`)

These return exactly the view models the console renders (`src/console/types`), so the console can switch from mock data to live data without changing components.

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/v1/workflows/active` | `Workflow`: the newest open workflow, else the newest finished one. `404` before any workflow ran. |
| GET | `/api/v1/workflows` | `Workflow[]` (most recent first) |
| GET | `/api/v1/workflows/:id` | `Workflow` |
| POST | `/api/v1/workflows` | Start a workflow from the console. Body `{ requirement, author?, auto? }`; `auto` (default true) runs EPOCH's specialists and verification up to the gate. |
| POST | `/api/v1/workflows/:id/decision` | Body `{ decision: "APPROVED" \| "REJECTED", rationale?, actor? }`. Returns `{ workflow, mutation }`. |
| GET | `/api/v1/trajectory/snapshots` | `TrajectorySnapshot[]`, one per epoch |
| GET | `/api/v1/trajectory/drift-findings?activeOnly=true` | `DriftFinding[]` (plus `status`, `resolvedBy`) |
| GET | `/api/v1/trajectory/graph?recent=6` | `{ nodes: GraphNodeData[], edges: GraphEdgeData[] }` laid out for the evolution graph |
| GET | `/api/v1/trajectory/trend?limit=12` | `[{ epochLabel, score, threshold, coupling }]` for the integrity chart |
| GET | `/api/v1/mutations?epochStart&epochEnd&component` | `Mutation[]` |
| GET | `/api/v1/mutations/:id` | `Mutation` with `diffPreview` |
| GET | `/api/v1/incidents` | `Incident[]` |
| GET | `/api/v1/invariants` | `Invariant[]` with per-epoch trend |
| GET | `/api/v1/simulations?divergenceMutationId` | `CounterfactualScenario[]` (plus `simulationId`, `scenarioId`, `status`, `measured`, `recommended`, `changedFiles`, `selected`). `projectedTimeDays` carries the number of changed files: EPOCH does not estimate calendar time. |
| POST | `/api/v1/simulations/remediate` | Body `{ scenarioId: "<simulationId>:<scenarioId>", author?, dryRun? }`. Applies the future's diff and opens a remediation workflow. |
| GET | `/api/v1/activity?limit=30` | `ActivityEvent[]`, newest first |
| GET | `/api/v1/stream` | Server-Sent Events, see below |

Mappings worth knowing:

- Workflow state: `PENDING`, `CONTEXT_LOADING` → `INTAKE`; `PLANNING`, `DELEGATING` → `PLANNING`; `EXECUTING` → `IMPLEMENTATION`; `VERIFYING` → `VERIFICATION`; `AWAITING_APPROVAL` → `APPROVAL_GATE`; `COMPLETED` → `DEPLOYED` (the change is recorded; EPOCH never deploys); `REJECTED` → `HALTED`.
- Epoch numbers: `E-0`, `E-1`, … map to `0`, `1`, …
- Scores are percentages (0–100) in `/api/v1` and fractions (0–1) in `/api`.

### Console event stream (`GET /api/v1/stream`)

| Event | Data |
| --- | --- |
| `epoch.activity` | `ActivityEvent` for the activity feed (every notable platform event) |
| `epoch.task` | `SpecialistTask` when a specialist starts, completes or fails |
| `epoch.mutation` | `Mutation` when a mutation is recorded |
| `epoch.drift` | `DriftFinding` when a finding opens, escalates or resolves |
| `epoch.invariant` | `Invariant` when an invariant changes status |
| `epoch.workflow` | `{ workflowId, type }` when a workflow moves, requests approval or gets a decision (refetch the workflow) |
| `ping` | keep-alive every 25 s |

Reconnect with the standard `Last-Event-ID` header (the browser's `EventSource` does this) to receive missed events.

## Platform endpoints (`/api`)

| Area | Endpoints |
| --- | --- |
| System | `GET /api/health`, `GET /api/metrics`, `GET /api/repo/status`, `GET /api/repo/diff`, `POST /api/repo/discard` |
| Demo | `POST /api/demo/reset`, `POST /api/demo/replay { with_feature? }`, `POST /api/demo/futures`, `POST /api/demo/showcase` (reset, replay and measure futures in one step) |
| Events | `POST /api/events`, `GET /api/events`, `GET /api/events/:id` |
| Workflows | `POST /api/workflows { requirement, title?, kind?, author?, auto? }`, `GET /api/workflows`, `GET /api/workflows/active`, `GET /api/workflows/:id` (full replay: transitions, tasks, evidence, decisions, mutation, plan, timeline), `GET /api/workflows/:id/context`, `POST /api/workflows/:id/plan { actor, plan? }`, `POST /api/workflows/:id/run`, `POST /api/workflows/:id/run-to-approval`, `POST /api/workflows/:id/specialists/:agent`, `POST /api/workflows/:id/evidence { claim, status, source_ref, severity?, agent? }`, `POST /api/workflows/:id/transition`, `POST /api/workflows/:id/request-approval`, `GET /api/workflows/:id/decision-package`, `POST /api/workflows/:id/approve`, `POST /api/workflows/:id/reject`, `POST /api/workflows/:id/request-changes`, `GET /api/workflows/:id/diff` |
| Mutations | `GET /api/mutations`, `GET /api/mutations/:id`, `GET /api/mutations/:id/evidence`, `GET /api/mutations/:id/ancestry`, `POST /api/mutations/:id/compensate { actor }` |
| Graph and drift | `GET /api/graph?workflows=true`, `GET /api/graph/node/:id`, `GET /api/graph/causal-chain?finding=\|incident=\|invariant=\|mutation=\|symptom=`, `POST /api/graph/check-drift`, `GET /api/drift?status=open`, `GET /api/drift/:id` |
| Trajectory | `GET /api/trajectory/snapshot`, `GET /api/trajectory/timeseries`, `GET /api/trajectory/envelope`, `GET /api/trajectory/epochs`, `POST /api/trajectory/epochs/:id/confirm { actor }`, `GET /api/trajectory/debt`, `GET /api/trajectory/velocity`, `GET /api/trajectory/inflections`, `GET /api/trajectory/projection` |
| Invariants and incidents | `GET /api/invariants`, `GET /api/invariants/:id`, `POST /api/invariants`, `GET /api/incidents`, `GET /api/incidents/:id`, `POST /api/incidents/:id/status`, `POST /api/incidents/:id/workflow` |
| Futures | `POST /api/simulations { hypothesis, base_mutation_id?, scenarios[], evaluate? }`, `GET /api/simulations`, `GET /api/simulations/:id`, `POST /api/simulations/:id/evaluate`, `POST /api/simulations/:id/scenarios/:scenario/evaluate`, `POST /api/simulations/:id/select { scenario_id, actor }`, `POST /api/simulations/:id/cleanup` |
| Bob hooks | `POST /api/hooks/file-changed { file?, tool? }`, `GET /api/hooks/session-context`, `POST /api/hooks/bob-activity { event, detail? }` |
| Stream | `GET /api/stream`: every platform event, named by its type (`workflow.updated`, `mutation.committed`, `drift.detected`, …) |

### Workflow lifecycle for an implementer (IBM Bob)

```text
POST /api/workflows                     → PLANNING, context bundle assembled
POST /api/workflows/:id/plan            → EXECUTING, specialist task graph created
POST /api/workflows/:id/specialists/:a  → run context | historian | security | qa | evolution | incident | synthesis
POST /api/workflows/:id/evidence        → record your own claims (observed | inferred | hypothesised)
   … edit files in the sample repo (GET /api/repo/status gives the path) …
POST /api/workflows/:id/request-approval → VERIFYING → AWAITING_APPROVAL with the decision package
   … a person approves or rejects in the console …
GET  /api/workflows/:id                 → COMPLETED with the recorded mutation
```

## Configuration

EPOCH reads these environment variables (it does not load `.env` files). All are optional.

| Variable | Default | Effect |
| --- | --- | --- |
| `PORT`, `HOST` | `3000`, `127.0.0.1` | Where the API listens |
| `CORS_ORIGIN` | `http://localhost:5173,…` | Browser origins allowed to call the API |
| `EPOCH_DB_PATH` | `data/epoch.db` | SQLite database file |
| `EPOCH_WORK_DIR` | `.epoch` | Sample repository copy, futures worktrees, context bundles, plans |
| `EPOCH_SAMPLE_REPO` | `$EPOCH_WORK_DIR/sample-repo` | The watched repository |
| `EPOCH_CONSOLE_DIR` | unset | Serve the built console (`pnpm build` writes `dist/`) from the API |
| `EPOCH_PUBLIC_DEMO` | unset | `1` turns on public demo mode |
| `EPOCH_SHOWCASE_SNAPSHOT` | unset | Directory where the showcase is saved and restored from |
| `EPOCH_DEMO_RESTORE_MINUTES` | `20` | Idle minutes before a changed public demo restores itself |
| `EPOCH_TEST_CONCURRENCY` | CPU count | Test and probe processes allowed at once |
| `EPOCH_API_URL` | `http://127.0.0.1:3000` | API that EPOCH-MCP and the scripts talk to; also the Vite proxy target |
| `EPOCH_MCP_AUTHOR` | `IBM Bob` | Author recorded for workflows started through EPOCH-MCP |

## EPOCH-MCP tools

`src/api/mcp/mcp-server.ts`, stdio transport, registered in `.bob/mcp.json`. It calls the API at `EPOCH_API_URL` (default `http://127.0.0.1:3000`), so the API must be running.

| Tool | Kind | Purpose |
| --- | --- | --- |
| `get_trajectory_snapshot` | read | Boundary integrity, coupling, envelope, open findings, epoch, invariant statuses |
| `get_mutation_history` | read | Recent mutations, optionally for one component |
| `get_mutation` | read | One mutation with evidence, related records and diff |
| `check_invariants` | read | Invariant statuses and scanner details, optionally for components |
| `get_causal_chain` | read | Candidate causal chain for a finding, incident, invariant, mutation or free-text symptom |
| `list_drift_findings` | read | Drift findings with severity and measurements |
| `list_active_workflows` | read | Open workflows |
| `get_workflow_status` | read | Status, valid transitions, tasks, decision, mutation |
| `get_context_bundle` | read | The workflow's context bundle |
| `get_decision_package` | read | What the reviewer sees at the gate |
| `get_repo_status` | read | Path of the watched repository and its uncommitted changes |
| `get_simulation` | read | Futures with their measurements and the recommended one |
| `start_workflow` | write | Record a requirement and open a workflow |
| `record_plan` | write | Store the plan and create the specialist task graph |
| `run_specialist` | write | Run one deterministic specialist and record its claims |
| `record_evidence` | write | Record Bob's own claim |
| `request_approval` | write | Verify the working tree and open the approval gate |
| `start_incident_workflow` | write | Open an incident workflow |
| `fork_futures` | write | Create worktrees for one to three futures |
| `evaluate_future` | write | Measure one future |

There is no approve tool on purpose: approval is a human decision (ADR-019).
