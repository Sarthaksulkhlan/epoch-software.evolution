# Data model

The Zod schemas in `src/shared/schema/` are the source of truth; TypeScript types are inferred from them and every row read from SQLite is parsed through them. This page is the readable companion.

```text
Event ──TRIGGERS──► Workflow ──► Task ──► Evidence
                       │   └──► Decision
                       └──PRODUCES──► Mutation ──TOUCHES──► Component
                                        │  ├──FOLLOWS──► Mutation
                                        │  ├──WEAKENS──► Invariant
                                        │  ├──SPAWNED──► Mutation (adopted future)
                                        │  └──REMEDIATES──► Incident
                                        └── TrajectoryPoint (with the scan behind it)
Incident ──CAUSED_BY──► Mutation (candidate, weighted)
Epoch ──BOUNDARY──► Epoch
DriftFinding · Simulation (futures)
```

## Identifiers

| Entity | Format | Example |
| --- | --- | --- |
| Event | `evt_` + nanoid | `evt_x1…` |
| Workflow | `wf_` + nanoid | `wf_HOHQN23n47ql` |
| Task, evidence, decision, edge, simulation, artifact | `task_`, `ev_`, `dec_`, `edge_`, `sim_`, `art_` + nanoid | |
| Mutation | `M-` + sequence | `M-1042` |
| Epoch | `E-` + sequence | `E-1` |
| Incident | `INC-` + sequence from 3312 | `INC-3312` |
| Drift finding | `DRIFT-` + sequence from 401 | `DRIFT-402` |
| Invariant | from `invariants.json` | `INV-BOUND-04` |

## Entities

### Event

`event_id`, `type` (`requirement.created` · `commit.pushed` · `pr.opened` · `pr.merged` · `release.triggered` · `incident.detected` · `workflow.manual`), `source`, `timestamp`, `repo?`, `branch?`, `payload` (requirement text, author, requested mutation id, simulation id). Immutable.

### Workflow

`workflow_id`, `trigger_event_id`, `kind` (`feature` · `incident` · `remediation` · `replay` · `seed`), `title?`, `status` (`PENDING` · `CONTEXT_LOADING` · `PLANNING` · `DELEGATING` · `EXECUTING` · `VERIFYING` · `AWAITING_APPROVAL` · `COMPLETED` · `REJECTED`), `current_stage?`, `created_at`, `completed_at?`, `context_ref?` (saved context bundle), `plan_ref?` (saved plan), `mutation_id?`.

### WorkflowEvent (transition log)

`id`, `workflow_id`, `from_status`, `to_status`, `stage?`, `actor`, `timestamp`. Every transition is recorded; replay reads this log.

### Task

`task_id`, `workflow_id`, `agent_type` (`context` · `historian` · `security` · `qa` · `evolution` · `incident` · `synthesis` · `scanner` · `bob` · …), `status` (`PENDING` · `RUNNING` · `COMPLETED` · `FAILED` · `SKIPPED`), `dependencies[]`, `started_at?`, `completed_at?`, `input_ref?` (phase, or Bob's subagent name), `output_ref?`, `retry_count` (at most 3).

### Evidence

`evidence_id`, `workflow_id`, `task_id`, `claim`, `status` (`observed` · `inferred` · `hypothesised`), `source_artifact_ref` (required: scan, test, probe, code or record reference), `finding_severity?` (`info` · `low` · `medium` · `high` · `critical`), `created_at`. Never updated.

### Artifact

`artifact_id`, `type` (`test_result`, `diff`, …), `source_task_id`, `content_ref`, `hash` (SHA-256), `created_at`, `mime_type?`. Verification results are stored as artifacts.

### Decision

`decision_id`, `workflow_id`, `actor` (a person, or a named policy such as `policy: auto-merge (tests green)`), `action` (`APPROVED` · `REJECTED`), `rationale?`, `scope?`, `timestamp`.

### Mutation

`mutation_id`, `workflow_id`, `intent`, `affected_components[]`, `delta_summary?`, `evidence_refs[]` (at least one observed record), `trajectory_delta` (`couplingDelta`, `boundaryIntegrityDelta`, `behaviorDelta`, `invariantChanges[]`), `epoch_id`, `created_at`, `commit_sha?` (commit in the sample repository), `author?`, `compensates_mutation_id?`. Immutable: undoing a mutation records a new, compensating one.

### Invariant

`invariant_id`, `statement`, `owner?`, `scope_components[]`, `status` (`HOLDING` · `WEAKENED` · `VIOLATED`), `last_checked_mutation_id?`, `violation_mutations[]`, `created_at`. Statuses change only from scanner results. Rule, name and category come from the watched repository's `invariants.json`.

### Epoch

`epoch_id`, `name`, `start_mutation_id`, `end_mutation_id?`, `defining_properties[]` (the conditions that held), `boundary_evidence[]` (the mutation window), `status` (`proposed` · `confirmed` · `current`), `created_at`.

### TrajectoryPoint

`id`, `mutation_id`, `timestamp`, `coupling_score` (0–1: cross-component edges ÷ n(n−1)), `boundary_integrity_score` (0–1: mean invariant score, HOLDING 1 · WEAKENED 0.5 · VIOLATED 0), `drift_delta` (coupling change minus integrity change), `epoch_id`, `state_hash` (SHA-256 of files, module edges and constants). The full scan is stored with the point.

### DriftFinding

`finding_id`, `pattern` (`boundary_erosion` · `invariant_weakening` · `dependency_growth`), `severity` (`warning` · `critical`), `title`, `summary`, `invariant_id?`, `components[]`, `mutation_ids[]`, `evidence_refs[]`, `earliest_plausible_mutation_id?`, `measurement` (`metric`, `value`, `threshold`, `window`), `status` (`open` · `resolved`), `detected_at`, `detected_by_mutation_id`, `resolved_by_mutation_id?`.

### Incident

`incident_id`, `signal`, `severity`, `affected_component`, `detected_at`, `reproduction_ref?` (`probe:<id>@<mutation>`), `candidate_mutations[]?`, `remediation_workflow_id?`, `status` (`detected` · `investigating` · `remediation_in_progress` · `resolved` · `wont_fix`). Incidents open and resolve from probe results.

### Simulation (futures)

`simulation_id`, `base_mutation_id`, `base_state_hash`, `hypothesis`, `scenarios[]`, `status` (`PENDING` · `RUNNING` · `COMPLETED` · `FAILED` · `ABANDONED`), `outcome_ref?`, `selected_scenario_id?`, `created_at`, `completed_at?`.

Scenario: `scenario_id`, `label`, `description`, `branch_name`, `worktree_path?`, `status`, `changes[]` (files), `diff?`, `invariant_outcomes[]`, `tests_passed?`, `tests_failed?`, `probes_failed[]?`, `coupling_score_after?`, `boundary_integrity_after?`, `test_pass_rate?`, `trajectory_delta?`.

## Graph edges

| Relationship | From → To | Meaning | Confidence |
| --- | --- | --- | --- |
| `TRIGGERS` | event → workflow | the event started the workflow | 1.0 |
| `PRODUCES` | workflow → mutation | the approved workflow became this mutation | 1.0 |
| `TOUCHES` | mutation → component | the mutation changed this component | 1.0 |
| `FOLLOWS` | mutation → mutation | sequence | 1.0 |
| `WEAKENS` | mutation → invariant | the scan measured a degradation after this mutation | 1.0 |
| `CAUSED_BY` | incident → mutation | candidate cause, weighted by the archaeologist's score | 0.1–0.95 |
| `REMEDIATES` | mutation → incident | the incident's probe passes after this mutation | 1.0 |
| `SPAWNED` | mutation → mutation | the mutation adopted a future forked from the base | 1.0 |
| `BOUNDARY` | epoch → epoch | regime change | 0.9 |

Edges below 1.0 are inferences and are drawn dashed in the console.

## Context bundle

Saved per workflow under `.epoch/context/<workflow>.json`: `workflow_id`, `assembled_at`, `repository` (repo, branch, HEAD commit, file-tree digest, relevant files), `requirements[]` (statement, acceptance criteria, source), `prior_mutations[]`, `invariants[]`, `telemetry?` (probe error rate, open incident alerts), and a `provenance[]` record for every item.
