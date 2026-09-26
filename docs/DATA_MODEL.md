# EPOCH — Data Model Reference

> Complete entity reference for all 12 domain objects in the EPOCH platform.
> Zod schemas are the source of truth: `src/shared/schema/`.
> This document is the human-readable companion.

---

## Entity Relationship Overview

```
Event ──triggers──► Workflow ──produces──► Task ──produces──► Artifact
                        │                     │
                        │                     └──produces──► Evidence
                        │                                        │
                        └──produces──► Decision                  │
                        │                                        │
                        └──produces──► Mutation ◄────links───────┘
                                          │
                              ┌───────────┼───────────┐
                              ▼           ▼           ▼
                          Invariant    Epoch    TrajectoryPoint
                                          │
                                          └──produces──► Simulation
```

---

## 1. Event

The immutable trigger record for every lifecycle workflow.

| Field | Type | Required | Description |
|---|---|---|---|
| `event_id` | `string` (UUID v4) | ✓ | Globally unique event identifier |
| `type` | `EventType` enum | ✓ | One of 6 event source types |
| `source` | `string` | ✓ | Human-readable origin (e.g., "GitHub webhook", "manual") |
| `timestamp` | `number` (Unix ms) | ✓ | When the event occurred |
| `repo` | `string` | ✗ | Repository identifier (org/repo format) |
| `branch` | `string` | ✗ | Git branch name if applicable |
| `payload` | `EventPayload` (discriminated union) | ✓ | Type-specific payload |

**EventType enum:**
```typescript
type EventType =
  | "requirement.created"
  | "commit.pushed"
  | "pr.opened"
  | "pr.merged"
  | "release.triggered"
  | "incident.detected"
  | "workflow.manual";
```

**Constraints:**
- `event_id` is assigned at intake, never user-provided
- `timestamp` is the source event time, not the intake time (separate `ingested_at` stored separately)
- Events are immutable once written — no UPDATE or DELETE on the events table

---

## 2. Workflow

The stateful lifecycle identity for a unit of engineering work.

| Field | Type | Required | Description |
|---|---|---|---|
| `workflow_id` | `string` (UUID v4) | ✓ | Globally unique workflow identifier |
| `trigger_event_id` | `string` (FK → Event) | ✓ | The event that triggered this workflow |
| `status` | `WorkflowStatus` enum | ✓ | Current FSM state |
| `current_stage` | `string` | ✗ | Human-readable stage label within current status |
| `created_at` | `number` (Unix ms) | ✓ | Workflow creation time |
| `completed_at` | `number` (Unix ms) | ✗ | Completion time (set when status reaches COMPLETED or REJECTED) |
| `context_ref` | `string` | ✗ | File path to the assembled ContextBundle JSON |
| `plan_ref` | `string` | ✗ | File path to the Bob Plan JSON output |
| `mutation_id` | `string` (FK → Mutation) | ✗ | Set when the workflow produces a mutation |

**WorkflowStatus enum:**
```typescript
type WorkflowStatus =
  | "PENDING"
  | "CONTEXT_LOADING"
  | "PLANNING"
  | "DELEGATING"
  | "EXECUTING"
  | "VERIFYING"
  | "AWAITING_APPROVAL"
  | "COMPLETED"
  | "REJECTED";
```

**FSM transition table:**
```
PENDING           → CONTEXT_LOADING
CONTEXT_LOADING   → PLANNING | REJECTED
PLANNING          → DELEGATING | REJECTED
DELEGATING        → EXECUTING
EXECUTING         → VERIFYING
VERIFYING         → AWAITING_APPROVAL | EXECUTING (retry)
AWAITING_APPROVAL → COMPLETED | REJECTED
```

---

## 3. Task

A unit of specialist agent work within a workflow.

| Field | Type | Required | Description |
|---|---|---|---|
| `task_id` | `string` (UUID v4) | ✓ | Globally unique task identifier |
| `workflow_id` | `string` (FK → Workflow) | ✓ | Parent workflow |
| `agent_type` | `AgentType` enum | ✓ | Which specialist agent runs this task |
| `status` | `TaskStatus` enum | ✓ | Current task state |
| `dependencies` | `string[]` | ✓ | Task IDs that must complete before this one starts |
| `started_at` | `number` (Unix ms) | ✗ | Task start time |
| `completed_at` | `number` (Unix ms) | ✗ | Task completion time |
| `input_ref` | `string` | ✗ | File path to task input JSON |
| `output_ref` | `string` | ✗ | File path to task output JSON |
| `retry_count` | `number` | ✓ (default 0) | Number of retry attempts |

**AgentType enum:**
```typescript
type AgentType =
  | "historian"
  | "context"
  | "security"
  | "qa"
  | "release"
  | "incident"
  | "evolution"
  | "counterfactual"
  | "adversarial"
  | "synthesis";
```

**TaskStatus enum:**
```typescript
type TaskStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";
```

**Constraints:**
- `retry_count` maximum is 3 (configured). On exhaustion, task status transitions to `FAILED` and an escalation event is emitted.
- Tasks with empty `dependencies` array are eligible for parallel execution immediately.

---

## 4. Artifact

A traceable output produced by an agent task.

| Field | Type | Required | Description |
|---|---|---|---|
| `artifact_id` | `string` (UUID v4) | ✓ | Globally unique artifact identifier |
| `type` | `ArtifactType` enum | ✓ | Type of artifact |
| `source_task_id` | `string` (FK → Task) | ✓ | Task that produced this artifact |
| `content_ref` | `string` | ✓ | File path to artifact content |
| `hash` | `string` (SHA-256) | ✓ | Content hash for integrity verification |
| `created_at` | `number` (Unix ms) | ✓ | Creation time |
| `mime_type` | `string` | ✗ | MIME type of artifact content |

**ArtifactType enum:**
```typescript
type ArtifactType =
  | "diff"
  | "test_result"
  | "security_scan"
  | "dependency_graph"
  | "runtime_trace"
  | "deployment_manifest"
  | "reproduction_script"
  | "plan_json"
  | "context_bundle";
```

---

## 5. Evidence

An observable artifact supporting (or refuting) a claim about the system. Immutable once written.

| Field | Type | Required | Description |
|---|---|---|---|
| `evidence_id` | `string` (UUID v4) | ✓ | Globally unique evidence identifier |
| `workflow_id` | `string` (FK → Workflow) | ✓ | Workflow in which this evidence was produced |
| `task_id` | `string` (FK → Task) | ✓ | Task that produced this evidence |
| `claim` | `string` | ✓ | Human-readable statement being evidenced |
| `status` | `EvidenceStatus` enum | ✓ | Epistemic status of this evidence |
| `source_artifact_ref` | `string` | ✓ | Reference to the Artifact that supports this claim (NOT nullable) |
| `finding_severity` | `FindingSeverity` | ✗ | For security/QA findings |
| `created_at` | `number` (Unix ms) | ✓ | Creation time |

**EvidenceStatus enum (ADR-011):**
```typescript
type EvidenceStatus =
  | "observed"      // directly measured, reproducible fact
  | "inferred"      // model-derived from observed facts, explicitly labelled
  | "hypothesised"; // candidate explanation, requires further support
```

**FindingSeverity enum:**
```typescript
type FindingSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";
```

**Constraints:**
- `source_artifact_ref` is NOT NULL. An evidence record without a traceable source artefact is invalid.
- `status` cannot be upgraded by a subsequent agent (e.g., from `hypothesised` to `observed`) without a new evidence record referencing an observation artefact.
- Evidence is never updated or deleted — corrections are new evidence records.

---

## 6. Decision

A human or policy gate outcome. The accountability record.

| Field | Type | Required | Description |
|---|---|---|---|
| `decision_id` | `string` (UUID v4) | ✓ | Globally unique decision identifier |
| `workflow_id` | `string` (FK → Workflow) | ✓ | Workflow at whose gate this decision was made |
| `actor` | `string` | ✓ | Human identifier or policy name |
| `action` | `DecisionAction` enum | ✓ | What was decided |
| `rationale` | `string` | ✗ | Free-text explanation |
| `scope` | `string` | ✗ | What the decision applied to |
| `timestamp` | `number` (Unix ms) | ✓ | Decision time |

**DecisionAction enum:**
```typescript
type DecisionAction = "APPROVED" | "REJECTED";
```

**Constraints:**
- Decisions are immutable. An approval cannot be undone — a new rejection workflow must be created.
- `actor` must be non-empty. Anonymous decisions are not permitted.

---

## 7. Mutation

The first-class domain object representing a meaningful change to the system. Produced by the mutation engine from a completed workflow.

| Field | Type | Required | Description |
|---|---|---|---|
| `mutation_id` | `string` (e.g., "M-1042") | ✓ | Human-readable sequential identifier |
| `workflow_id` | `string` (FK → Workflow) | ✓ | Workflow that produced this mutation |
| `intent` | `string` | ✓ | What was asked/intended |
| `affected_components` | `string[]` | ✓ | Component IDs touched by this mutation |
| `delta_summary` | `string` | ✗ | Human-readable summary of what changed |
| `evidence_refs` | `string[]` | ✓ | Evidence IDs supporting this mutation |
| `trajectory_delta` | `TrajectoryDelta` | ✓ | How this mutation moved the trajectory |
| `epoch_id` | `string` (FK → Epoch) | ✓ | Which epoch this mutation belongs to |
| `created_at` | `number` (Unix ms) | ✓ | Creation time |

**TrajectoryDelta:**
```typescript
interface TrajectoryDelta {
  couplingDelta: number;           // change in cross-component coupling score
  boundaryIntegrityDelta: number;  // change in boundary integrity score
  behaviorDelta: number;           // change in behavioral signature similarity
  invariantChanges: Array<{
    invariant_id: string;
    previousStatus: InvariantStatus;
    newStatus: InvariantStatus;
  }>;
}
```

**Constraints:**
- Mutations are immutable once written. An amendment creates a new mutation that references the original.
- `mutation_id` follows sequential `M-NNNN` format for human readability in the console.
- `evidence_refs` must contain at least one `observed` evidence record.

---

## 8. Invariant

A property that should remain true across evolution. The anchor point for drift detection.

| Field | Type | Required | Description |
|---|---|---|---|
| `invariant_id` | `string` (UUID v4) | ✓ | Globally unique invariant identifier |
| `statement` | `string` | ✓ | Human-readable invariant statement |
| `owner` | `string` | ✗ | Team or person responsible |
| `scope_components` | `string[]` | ✓ | Component IDs this invariant applies to |
| `status` | `InvariantStatus` enum | ✓ | Current holding status |
| `last_checked_mutation_id` | `string` (FK → Mutation) | ✗ | Most recent mutation at which status was evaluated |
| `violation_mutations` | `string[]` | ✓ | Mutation IDs that weakened or violated this invariant |
| `created_at` | `number` (Unix ms) | ✓ | When the invariant was declared |

**InvariantStatus enum:**
```typescript
type InvariantStatus =
  | "HOLDING"   // invariant is satisfied
  | "WEAKENED"  // partially eroded but not fully violated
  | "VIOLATED"; // clearly broken
```

---

## 9. Epoch

A named period of relative structural/behavioral stability in the system.

| Field | Type | Required | Description |
|---|---|---|---|
| `epoch_id` | `string` (e.g., "E-001") | ✓ | Human-readable sequential identifier |
| `name` | `string` | ✓ | Human-readable epoch name |
| `start_mutation_id` | `string` (FK → Mutation) | ✓ | First mutation of this epoch |
| `end_mutation_id` | `string` (FK → Mutation) | ✗ | Last mutation (null if current) |
| `defining_properties` | `string[]` | ✓ | What makes this epoch structurally distinct |
| `boundary_evidence` | `string[]` | ✓ | Evidence IDs supporting the boundary detection |
| `status` | `EpochStatus` enum | ✓ | Whether this boundary is proposed or confirmed |
| `created_at` | `number` (Unix ms) | ✓ | When this epoch was detected/declared |

**EpochStatus enum:**
```typescript
type EpochStatus =
  | "proposed"   // detector suggested a boundary, awaiting human confirmation
  | "confirmed"  // human confirmed this epoch boundary
  | "current";   // the active epoch (no end_mutation_id)
```

---

## 10. TrajectoryPoint

The system's measured state at a specific moment in its evolution. One per mutation.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `number` (auto-increment) | ✓ | Sequential integer ID |
| `mutation_id` | `string` (FK → Mutation) | ✓ | The mutation that triggered this measurement |
| `timestamp` | `number` (Unix ms) | ✓ | When this point was computed |
| `coupling_score` | `number` (0.0–1.0) | ✓ | Cross-component dependency density. Higher = more coupled. |
| `boundary_integrity_score` | `number` (0.0–1.0) | ✓ | Fraction of declared invariants currently HOLDING. |
| `drift_delta` | `number` | ✓ | Change in combined drift score since previous point. Negative = improving. |
| `epoch_id` | `string` (FK → Epoch) | ✓ | Which epoch this point belongs to |
| `state_hash` | `string` (SHA-256) | ✓ | Hash of the structural fingerprint at this point. Used to pin sandbox base states. |

**Score interpretation:**
- `coupling_score` of 0.0 = fully decoupled (ideal); 1.0 = every component depends on every other (worst)
- `boundary_integrity_score` of 1.0 = all invariants HOLDING; 0.0 = all violated

---

## 11. Incident

A production failure or anomaly that re-enters the engineering context.

| Field | Type | Required | Description |
|---|---|---|---|
| `incident_id` | `string` (e.g., "INC-3312") | ✓ | Human-readable sequential identifier |
| `signal` | `string` | ✓ | Alert title or failure description |
| `severity` | `FindingSeverity` | ✓ | Incident severity |
| `affected_component` | `string` | ✓ | Primary component involved |
| `detected_at` | `number` (Unix ms) | ✓ | When the incident was detected |
| `reproduction_ref` | `string` | ✗ | File path to reproduction script/steps |
| `candidate_mutations` | `string[]` | ✗ | Mutation IDs ranked as candidate causes (from causal archaeology) |
| `remediation_workflow_id` | `string` (FK → Workflow) | ✗ | WEAVE workflow created to remediate this incident |
| `status` | `IncidentStatus` enum | ✓ | Current incident state |

**IncidentStatus enum:**
```typescript
type IncidentStatus =
  | "detected"
  | "investigating"
  | "remediation_in_progress"
  | "resolved"
  | "wont_fix";
```

---

## 12. Simulation

A counterfactual future: an isolated scenario branch with a specific hypothesis.

| Field | Type | Required | Description |
|---|---|---|---|
| `simulation_id` | `string` (UUID v4) | ✓ | Globally unique simulation identifier |
| `base_mutation_id` | `string` (FK → Mutation) | ✓ | The decision point from which scenarios diverge |
| `base_state_hash` | `string` | ✓ | State hash of the base trajectory point (used to create sandbox branches) |
| `hypothesis` | `string` | ✓ | What question this simulation is trying to answer |
| `scenarios` | `Scenario[]` | ✓ | Array of scenario definitions (typically 2) |
| `status` | `SimulationStatus` enum | ✓ | Current simulation state |
| `outcome_ref` | `string` | ✗ | File path to the comparison result JSON |
| `selected_scenario_id` | `string` | ✗ | ID of the scenario selected for adoption |
| `created_at` | `number` (Unix ms) | ✓ | When simulation was launched |
| `completed_at` | `number` (Unix ms) | ✗ | When comparison was complete |

**Scenario:**
```typescript
interface Scenario {
  scenario_id: string;
  label: string;                    // e.g., "A - Keep current plan"
  description: string;
  branch_name: string;              // epoch/sim-A-[simulation_id]
  changes: string[];                // description of what Bob will apply
  trajectory_delta?: TrajectoryDelta; // populated after Bob runs
  evidence_refs?: string[];         // evidence from the scenario run
  coupling_score_after?: number;
  boundary_integrity_after?: number;
  test_pass_rate?: number;
}
```

**SimulationStatus enum:**
```typescript
type SimulationStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "ABANDONED";
```

---

## Graph Edge Types

All relationships between the above entities are stored in the `graph_edges` table.

| Relationship | From type | To type | Meaning | Confidence |
|---|---|---|---|---|
| `TRIGGERS` | Event | Workflow | Event initiated this workflow | 1.0 (always observed) |
| `PRODUCES` | Workflow | Mutation | Workflow created this mutation | 1.0 |
| `TOUCHES` | Mutation | Component | Mutation modified this component | 1.0 |
| `FOLLOWS` | Mutation | Mutation | Temporal sequence (M-N follows M-N-1) | 1.0 |
| `WEAKENS` | Mutation | Invariant | Mutation degraded this invariant | 0.7–1.0 |
| `CAUSED_BY` | Incident | Mutation | Candidate causal link | 0.3–0.9 (inferred) |
| `SPAWNED` | Mutation | Mutation | Counterfactual branch relationship | 1.0 |
| `BOUNDARY` | Epoch | Epoch | Regime transition | 0.8–1.0 |
| `REMEDIATES` | Mutation | Incident | This mutation resolved an incident | 1.0 |

`confidence < 1.0` indicates an inferred relationship. Inferred edges are rendered with dashed lines in the evolution graph.

---

## Context Bundle (Transient)

The ContextBundle is not persisted as a table — it is assembled per workflow and stored as a JSON file referenced by `workflow.context_ref`. It is the full context package handed to Bob's Plan mode and to all specialist agents.

```typescript
interface ContextBundle {
  workflow_id: string;
  assembled_at: number;
  repository: {
    repo: string;
    branch: string;
    head_commit: string;
    file_tree_digest: string;   // SHA-256 of sorted file list
    relevant_files: string[];   // files relevant to the triggering event
  };
  requirements: Array<{
    id: string;
    statement: string;
    acceptance_criteria: string[];
    source: string;             // provenance reference
  }>;
  prior_mutations: MutationSummary[];  // last 10 relevant mutations
  invariants: Invariant[];             // active invariants for affected components
  telemetry?: {
    error_rate: number;
    p99_latency_ms: number;
    recent_alerts: string[];
  };
  provenance: Array<{
    item_id: string;
    source_type: string;
    source_ref: string;
    retrieved_at: number;
  }>;
}
```

Every item in the bundle has a provenance record. Bob can cite provenance when making claims, and the evidence store enforces that claims are traceable to source records.
