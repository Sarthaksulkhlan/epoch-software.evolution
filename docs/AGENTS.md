# EPOCH — Multi-Agent System Design

> Complete specification of all specialist agents in the EPOCH platform.
> Every agent has a defined contract: inputs, outputs, guardrails, and communication pattern.

**Core principle (ADR-014):** Agents communicate through the evidence store, not directly. Each agent reads from the ContextBundle and writes Evidence records. No agent calls another agent. The synthesis agent reads the complete evidence store at the end.

---

## Agent Communication Pattern

```
                         ContextBundle
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    [Historian]          [Security]              [QA]        ← run concurrently
          │                   │                   │
          ▼                   ▼                   ▼
     Evidence(H)         Evidence(S)         Evidence(Q)
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                         Evidence Store
                              │
                              ▼
                    [Synthesis / Bob]
                              │
                              ▼
                    Decision Package → Approval Gate
```

**Why agents cannot talk to each other:**
- Prevents hallucination amplification chains
- Every claim remains traceable to exactly one source agent
- Enables true parallelism (no coordination needed)
- Makes the evidence store the complete, auditable record

---

## Agent 1: Historian

**Purpose:** Surface relevant prior history to inform the current workflow. Context memory.

### Contract

```typescript
interface HistorianInput {
  context: ContextBundle;
  query: {
    components: string[];     // which components are relevant
    lookback_mutations: number; // how many prior mutations to consider (default: 10)
    include_incidents: boolean;
    include_adrs: boolean;
  };
}

interface HistorianOutput {
  evidence: Evidence[];
  // Evidence claims produced:
  // - "Component X was last modified in mutation M-NNNN with intent: [intent]"   → status: observed
  // - "Invariant Y has been weakened twice in the last 5 mutations"               → status: observed
  // - "Prior incident INC-XXXX was traced to a change in this component"          → status: inferred
  // - "ADR-NNN established the boundary that this change affects"                 → status: observed
}
```

### Guardrails
- **Read-only access.** Historian never writes to the codebase or database.
- **Source reference required.** Every claim must cite a mutation ID, incident ID, or document reference.
- **Cannot assert causality.** "Component X was changed before the incident" — observed. "Component X caused the incident" — not the Historian's claim to make; that is causal archaeology.
- **Must surface missing context explicitly.** If relevant history is not available (e.g., the component has no prior mutations), the Historian returns `Evidence` with claim "No prior mutation history found for component X" — `status: observed`.

### Bob integration
The Historian agent uses Bob's document understanding capability to read ADRs, PRDs, and incident reports referenced in the ContextBundle. It uses the `get_mutation_history` MCP tool to query EPOCH's evolution graph before running its analysis.

---

## Agent 2: Context / Requirements

**Purpose:** Parse and structure the triggering requirement or event into machine-readable acceptance criteria.

### Contract

```typescript
interface ContextAgentInput {
  context: ContextBundle;
  raw_requirement: string;  // from event payload
}

interface ContextAgentOutput {
  evidence: Evidence[];
  // Evidence claims produced:
  // - "Requirement parsed: [structured requirement statement]"          → status: observed
  // - "Acceptance criteria identified: [list]"                         → status: observed
  // - "Ambiguity detected: [description of ambiguous aspect]"          → status: observed
  // - "Missing context: [what information is needed but not provided]" → status: observed
}
```

### Guardrails
- **Must surface all ambiguity.** A requirement with conflicting acceptance criteria, undefined scope, or missing stakeholder constraints must produce an `observed` evidence record flagging the ambiguity. The workflow does not proceed past planning until ambiguity is resolved.
- **Cannot invent requirements.** If the requirement is silent on something (e.g., migration strategy for existing data), the agent flags it as missing context, not as resolved.

---

## Agent 3: Security

**Purpose:** Analyse the proposed change for security vulnerabilities, dependency risks, and policy violations.

### Contract

```typescript
interface SecurityAgentInput {
  context: ContextBundle;
  diff: string;                    // proposed code diff
  dependency_manifest: string;     // package.json or equivalent
  policy_rules: PolicyRule[];      // active security policies
}

interface SecurityAgentOutput {
  evidence: Evidence[];
  // Evidence claims produced:
  // - "Dependency X@Y has known CVE-NNNN with severity: [severity]"  → status: observed
  // - "Pattern matching SQL injection risk found in [file:line]"      → status: observed
  // - "No hardcoded secrets detected in diff"                         → status: observed
  // - "Auth boundary bypassed in [file]: [description]"              → status: observed
  // - "Dependency X updated from Y to Z — changelog review needed"   → status: inferred
}
```

### Guardrails
- **No silent approval.** The Security agent always produces at least one evidence record. "No findings" is an explicit observed claim — it cannot be implied by an empty evidence list.
- **Unknown ≠ safe.** If the agent cannot scan a dependency (e.g., private registry), it produces `status: observed` evidence that the dependency could not be scanned — not an implicit clearance.
- **Cannot approve production deployment.** Security evidence feeds into the approval gate, but the Security agent does not itself approve.
- **Severity is mandatory for findings.** Every security finding must carry a `FindingSeverity` value.

---

## Agent 4: QA

**Purpose:** Assess test coverage, generate missing tests, and produce evidence of correctness.

### Contract

```typescript
interface QAAgentInput {
  context: ContextBundle;
  diff: string;
  existing_tests: TestFile[];
  acceptance_criteria: string[];  // from Context/Requirements agent output
}

interface QAAgentOutput {
  evidence: Evidence[];
  generated_tests?: TestFile[];   // new tests created by this agent
  // Evidence claims produced:
  // - "N of M acceptance criteria have corresponding test coverage"   → status: observed
  // - "Tests run: X passed, Y failed, Z skipped"                     → status: observed
  // - "Test coverage for modified files: N%"                         → status: observed
  // - "Acceptance criterion [C] has no test coverage"                → status: observed
  // - "Flaky test detected in [test name]: [failure pattern]"        → status: observed
}
```

### Guardrails
- **Reproducible outputs required.** If a test was flaky during this run, it must be flagged as flaky — not treated as passing or failing.
- **Generated tests must be committed.** If the QA agent creates new tests, they are committed as part of the mutation. Test files are not discarded after the workflow.
- **Coverage percentage is informational, not a gate.** Coverage numbers are evidence; the gate decision belongs to the human.
- **Cannot mark untested criteria as passing.** An acceptance criterion without a test is "untested" — `status: observed`. It is never "implicitly passing."

---

## Agent 5: Release

**Purpose:** Build, package, and validate deployment artefacts for a validated change.

### Contract

```typescript
interface ReleaseAgentInput {
  context: ContextBundle;
  validated_diff: string;          // diff approved by Security + QA
  environment_config: EnvConfig;   // target environment specification
  rollback_ref: string;            // git ref to rollback to if deploy fails
}

interface ReleaseAgentOutput {
  evidence: Evidence[];
  artifacts?: Artifact[];          // build/deploy artefacts
  // Evidence claims produced:
  // - "Build succeeded: [build ID, timestamp]"                      → status: observed
  // - "Docker image built: [digest]"                                → status: observed
  // - "Smoke tests passed on staging environment"                   → status: observed
  // - "Rollback ref verified reachable: [ref]"                      → status: observed
  // - "Environment config diff from last deployment: [changes]"    → status: observed
}
```

### Guardrails
- **Hard stop at approval gate.** The Release agent prepares artefacts and evidence but never deploys to production. The `POST /api/workflows/:id/approve` endpoint must be called first.
- **Rollback reference is mandatory.** No artefact is produced without a verified rollback reference. If the rollback ref is not resolvable, the agent returns an error evidence record.
- **Environment config changes are flagged.** Any difference between the expected environment config and the actual current config produces an evidence record.

---

## Agent 6: Incident

**Purpose:** Reproduce a production incident, identify its observable characteristics, and propose a patch plan.

### Contract

```typescript
interface IncidentAgentInput {
  context: ContextBundle;
  incident: Incident;
  recent_mutations: Mutation[];    // last N mutations (from EPOCH-MCP)
  logs: string;                    // relevant log excerpts
  telemetry: TelemetrySnapshot;
}

interface IncidentAgentOutput {
  evidence: Evidence[];
  reproduction_script?: string;   // steps to reproduce
  patch_plan?: string;            // proposed remediation approach
  // Evidence claims produced:
  // - "Incident reproduced in sandbox: [steps]"                     → status: observed
  // - "Error occurs after mutation M-NNNN was applied"              → status: observed
  // - "Component X exhibits unexpected behavior: [description]"     → status: observed
  // - "M-NNNN is the earliest plausible mutation related to this"   → status: hypothesised
  // - "Patch plan: [approach, estimated scope]"                     → status: inferred
}
```

### Guardrails
- **Candidate explanation, not asserted root cause.** The Incident agent may say "M-NNNN is the earliest plausible mutation related to this symptom" — `status: hypothesised`. It never says "M-NNNN caused this incident" without reproduction evidence.
- **Reproduction is required before causal claims.** If the incident cannot be reproduced, the causal chain remains `hypothesised`. No causal claim is `inferred` without reproduction.
- **Patch plan is a proposal.** The patch plan goes through the full WEAVE lifecycle with its own approval gate — it is not self-executing.

---

## Agent 7: Evolution Analyst

**Purpose:** Analyse the system's trajectory across recent mutations. Identify drift, invariant changes, and behavioral shifts.

### Contract

```typescript
interface EvolutionAnalystInput {
  context: ContextBundle;
  trajectory_points: TrajectoryPoint[];  // recent N trajectory points
  drift_findings: DriftFinding[];        // from the drift detector
  mutation_history: Mutation[];          // recent mutations with their deltas
}

interface EvolutionAnalystOutput {
  evidence: Evidence[];
  // Evidence claims produced:
  // - "Boundary integrity has declined from 0.95 to 0.61 over 3 mutations"  → status: observed
  // - "Coupling score trend is increasing at +0.04 per mutation"             → status: observed
  // - "Invariant I-003 has been weakened by mutations M-1023, M-1024"        → status: observed
  // - "The system may be approaching an epoch boundary"                      → status: inferred
  // - "Direct DataLayer access pattern first appeared in M-1023"             → status: observed
}
```

### Guardrails
- **Must separate observation from inference.** Measured trajectory values are `observed`. Trend projections and interpretations of what trends mean are `inferred`.
- **Cannot claim architectural intent.** "The architecture was intended to route all DataLayer access through PaymentService" — this is an invariant claim, not the Evolution Analyst's to assert. It can reference a declared invariant.
- **Evolution debt dimensions are reported, not scored.** The analyst reports observable symptoms per dimension — it does not compute an opinionated "health score" that implies a judgment.

### Bob integration
The Evolution Analyst uses Bob's background task capability to run trajectory analysis asynchronously while the developer continues other work. Results stream to the console via SSE when complete.

---

## Agent 8: Counterfactual Engineer

**Purpose:** Run isolated experiments to compare alternative mutation strategies.

### Contract

```typescript
interface CounterfactualInput {
  context: ContextBundle;
  base_mutation_id: string;         // decision point to fork from
  base_state_hash: string;          // git state hash for sandbox
  scenarios: ScenarioDefinition[];  // what to test in each branch
}

interface CounterfactualOutput {
  evidence: Evidence[];
  simulation_results: SimulationResult[];
  // Evidence claims produced per scenario:
  // - "Scenario A trajectory delta: coupling +0.04, boundary -0.12"  → status: observed
  // - "Scenario B trajectory delta: coupling -0.01, boundary +0.22"  → status: observed
  // - "All tests pass in Scenario A"                                  → status: observed
  // - "Scenario B requires 3 additional file changes"                 → status: observed
  // - "Scenario B presents lower long-term coupling risk"             → status: inferred
}
```

### Guardrails
- **Sandbox only.** The Counterfactual Engineer operates exclusively on sandboxed Git branches (ADR-010). It never touches `main` or any non-`epoch/` prefixed branch.
- **Simulations are scenarios, not predictions.** Results are labelled as "what happened in this isolated experiment" — never as "what will happen in production."
- **No autonomous branch merge.** The selected scenario branch is never merged by this agent. Merge happens via the approval gate after human selection.
- **Clean up on failure.** If a simulation fails, the agent removes the sandbox branch and produces a failure evidence record. No dangling branches.

---

## Agent 9: Adversarial Maintainer

**Purpose:** Attempt to falsify the current plan by finding failure paths, counterexamples, and hidden assumptions.

### Contract

```typescript
interface AdversarialInput {
  context: ContextBundle;
  current_plan: PlanGraph;
  current_trajectory: TrajectoryPoint;
  stated_assumptions: string[];
}

interface AdversarialOutput {
  evidence: Evidence[];
  // Evidence claims produced:
  // - "Assumption [A] is contradicted by mutation M-NNNN"            → status: inferred
  // - "Edge case: [description] is not covered by the plan"          → status: hypothesised
  // - "This change may conflict with [component] under [condition]"  → status: inferred
  // - "No contradicting evidence found for assumption [A]"           → status: observed
}
```

### Guardrails
- **Goal is falsification, not confirmation.** The Adversarial Maintainer is explicitly not trying to validate the plan. It is looking for what is wrong. An empty finding list means it could not find counterexamples — not that the plan is correct.
- **Counterexamples must be specific.** Vague concerns ("this might not scale") without a specific condition or scenario are not valid evidence records.

---

## Agent 10: Synthesis (Bob)

**Purpose:** Read all specialist evidence, compose the decision package, and determine the recommended next lifecycle action.

### Contract

```typescript
interface SynthesisInput {
  context: ContextBundle;
  all_evidence: Evidence[];        // complete evidence store for this workflow
  all_artifacts: Artifact[];       // all artefacts produced
  workflow: Workflow;              // current workflow state
}

interface SynthesisOutput {
  decision_package: DecisionPackage;
  recommended_action: RecommendedAction;
  evidence: Evidence[];           // synthesis-level claims
}

interface DecisionPackage {
  workflow_id: string;
  summary: string;
  evidence_by_agent: Record<AgentType, Evidence[]>;
  open_questions: string[];       // unresolved items that need human judgment
  risk_level: "low" | "medium" | "high" | "critical";
  recommended_action: RecommendedAction;
}

type RecommendedAction =
  | { type: "approve"; rationale: string }
  | { type: "reject"; rationale: string; blocking_findings: string[] }
  | { type: "request_more_context"; missing_items: string[] }
  | { type: "launch_simulation"; hypothesis: string };
```

### Guardrails
- **Must preserve source evidence.** The synthesis agent summarises — it does not replace source evidence. The full evidence chain remains accessible to the human at the approval gate.
- **Cannot upgrade evidence status.** If Security produced `hypothesised` evidence, the Synthesis agent cannot present it as `observed` in the decision package.
- **Cannot summarise away uncertainty.** Open questions and conflicting evidence must be surfaced in the decision package, not resolved by assertion.
- **Recommended action is advisory.** The human at the approval gate may override the recommended action. The system records both the recommendation and the actual decision.

### Bob integration
Synthesis is the natural role for Bob's main session (Plan + Agent modes working with all specialist evidence). Subagent results are aggregated in the Bob session context before the synthesis agent runs. The decision package becomes the content of the approval gate UI.

---

## Agent Parallelism Map

The following table shows which agents can run concurrently per workflow type.

| Workflow type | Parallel group 1 | Parallel group 2 | Sequential final |
|---|---|---|---|
| Feature requirement | Historian, Security, QA, Context | (wait for Group 1) | Evolution Analyst, Synthesis |
| Incident remediation | Historian, Incident, Evolution Analyst | Security, QA (on proposed patch) | Synthesis |
| Counterfactual simulation | Counterfactual A, Counterfactual B | (concurrent scenarios) | Synthesis (comparison) |
| Release | Security (rescan), QA (smoke), Release | (wait for Group 1) | Synthesis |
| Architecture review | Historian, Evolution Analyst, Adversarial | (wait for Group 1) | Synthesis |

Bob's `Promise.all` runner (ADR-014, `src/core/weave/agent-runner.ts`) executes agents in each parallel group concurrently. The task DAG encodes the dependency edges between groups.
