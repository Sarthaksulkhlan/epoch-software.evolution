# Demo guide

Run the full EPOCH story on your machine: a locally-correct feature, a series of safe-looking AI changes, drift and an incident, the candidate causal chain, two measured futures, and the remediation that brings the system back inside its envelope.

Everything below uses the payments service in `packages/sample-app`. The numbers you will see come from its tests, its runtime probe and EPOCH's scanner.

## 0. Setup

```bash
pnpm install
pnpm demo-reset
pnpm dev
```

- API: <http://127.0.0.1:3000/api/health>
- Console: <http://localhost:5173>
- Live event stream: <http://127.0.0.1:3000/api/stream>

`pnpm demo-reset` rebuilds the database and the sample repository (`.epoch/sample-repo`) and seeds epoch **E-0**: 22 mutations (M-1020 to M-1041), four invariants holding, boundary integrity 1.00, coupling 0.19. It is deterministic; run it any time to start over. With the API running, the scripts talk to it so the console updates live.

## 1. The chargeback feature (M-1042)

Requirement: *Extend chargeback eligibility from 15 to 30 days. All customer-facing touchpoints must reflect the new window.*

**With IBM Bob:** in Bob IDE with the `epoch` MCP server connected, ask Bob to implement the requirement through EPOCH (`start_workflow` → `record_plan` → `run_specialist` for context, historian, security and QA → edit the files reported by `get_repo_status` → `request_approval`). Approve in the console's Current view.

**Without Bob:** `pnpm demo:replay --with-feature` lands the same change from `history/scripted/M-1042.patch`.

What to look for:

- The context specialist finds two customer-facing touchpoints (`CHARGEBACK_WINDOW_DAYS`, `DISPUTE_WINDOW_NOTICE_DAYS`) and raises an open question: `LEDGER_RETENTION_DAYS` is also 15 and the requirement is silent about it.
- The decision package previews the trajectory before approval: `INV-TIME-02 HOLDING → WEAKENED`, boundary integrity 1.00 → 0.875. All 11 tests pass. The change is locally correct.
- After approval, M-1042 is recorded with its commit, and drift finding `DRIFT-401` (invariant weakening, warning) opens.

## 2. Safe-looking AI changes (M-1051, M-1077, M-1084)

```bash
pnpm demo:replay
```

Each change is merged by the `auto-merge (tests green)` policy, exactly as a busy team would. Each passes all 11 tests.

| Mutation | Change | What EPOCH measures |
| --- | --- | --- |
| M-1051 | The reconciler reads the order table directly | `INV-BOUND-04` WEAKENED, new dependency `disputes → orders`, `DRIFT-402` boundary erosion (warning) |
| M-1077 | The reconciler reads the ledger table directly | `INV-BOUND-04` and `INV-TIME-02` VIOLATED, the late-dispute probe fails, **INC-3312** opens, epoch **E-1** is proposed |
| M-1084 | Dispute telemetry webhooks | `disputes` now depends on three components: `DRIFT-403` dependency growth (warning) |

The trajectory leaves the envelope (boundary integrity 0.50 < 0.80).

## 3. Why? Causal archaeology

Console: open INC-3312 or a drift finding and choose **Why?**. API:

```bash
curl "http://127.0.0.1:3000/api/graph/causal-chain?incident=INC-3312"
```

The candidate causal chain is **M-1042 → M-1051 → M-1077**. M-1042 is the *earliest plausible* mutation (hypothesised: it made the window longer than retention). M-1077 is the *most proximate* (inferred: the probe started failing right after it). The response states that temporal order and structural overlap support the hypothesis without proving it.

## 4. Counterfactual futures

**With IBM Bob:** `fork_futures` creates one worktree per future; Bob implements each (subagents can work in parallel) and calls `evaluate_future`.

**Without Bob:**

```bash
pnpm demo:futures
```

| Future | Change | Measured result |
| --- | --- | --- |
| A · Keep the current path | `LEDGER_RETENTION_DAYS = 30` | Probe passes, 11/11 tests, but `INV-BOUND-04` stays VIOLATED; boundary integrity 0.75 |
| B · Restore the boundary | Reconciler back through OrderService and LedgerService, retention 45 days | Probe passes, 11/11 tests, every invariant holds; boundary integrity 1.00 (recommended) |

## 5. Remediation (M-1085)

Adopt future B in the console's Futures view (or `POST /api/v1/simulations/remediate` with `{"scenarioId": "<simulation>:B"}`). The diff lands in the sample repo and a remediation workflow opens. Run it through the same gate (Bob: `record_plan` → `run_specialist` → `request_approval`; console: approve).

After approval:

- **M-1085** is recorded, with a `SPAWNED` edge from the base mutation and a `REMEDIATES` edge to INC-3312.
- INC-3312 is resolved, DRIFT-401 and DRIFT-402 are resolved, epoch **E-2** (recovery) is proposed.
- Boundary integrity is back to 1.00 and the trajectory is inside the envelope.

## Measurements

`GET /api/metrics` reports what the run actually took: time from requirement to plan and to the approval gate per workflow, specialist parallelism, human decisions, drift detection latency, incident-to-remediation time, causal search time and the number of futures compared.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `M-1042 … is not recorded yet` | Run the feature first (Bob, or `pnpm demo:replay --with-feature`). |
| `The sample repository has uncommitted changes` | Approve or reject the open workflow, or `POST /api/repo/discard` when none is open. |
| The console shows nothing | Check <http://127.0.0.1:3000/api/health> and run `pnpm demo-reset`. |
| Anything else | `pnpm demo-reset` returns to a known state in a few seconds. |
