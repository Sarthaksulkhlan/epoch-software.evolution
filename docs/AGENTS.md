# Specialist agents

EPOCH's specialists are deterministic: they measure the watched system and the evolution graph, and label every claim `observed`, `inferred` or `hypothesised` (ADR-011). They never call each other; each reads the workflow's context bundle and writes evidence (ADR-014). IBM Bob supplies the reasoning and the implementation, and adds its own claims next to theirs.

## Contract

`src/agents/contracts.ts`

```ts
interface AgentContext {
  workflowId: string;
  taskId: string;
  kind: 'feature' | 'incident' | 'remediation' | 'replay';
  phase: 'analysis' | 'verification';
  requirement: string;
  bundle: ContextBundle;       // requirement, relevant files, prior mutations, invariants, provenance
  repoPath: string;            // the watched repository (.epoch/sample-repo)
  spec: RepoSpec;              // its invariants.json
  headScan?: ScanResult;       // the system as recorded at the latest mutation
  diff: string;                // working tree against HEAD
  verification?: Verification; // tests, probes, working-tree scan, drift preview (verification phase)
}

interface AgentClaim { claim: string; status: 'observed' | 'inferred' | 'hypothesised'; sourceRef: string; severity?: FindingSeverity }
interface AgentResult { agent: AgentType; claims: AgentClaim[]; summary: string; riskLevel: 'low' | 'medium' | 'high' | 'critical' }
```

The runner (`src/core/weave/agent-runner.ts`) persists each claim as an evidence record under the agent's task, retries a failing agent up to three times and records a failure as evidence rather than dropping it.

## The specialists

| Agent | Measures (observed) | Infers or hypothesises | Guardrail |
| --- | --- | --- | --- |
| **Context / Requirements** | The requirement and acceptance criteria; policy constants whose name and value match it (touchpoints, customer-facing or internal); constants with the same value the requirement is silent about | "No constant matched; the change may live in logic" | Surfaces missing context as an open question; never adds scope |
| **Historian** | Prior mutations touching the components, invariant history, open drift findings and incidents in scope | Recorded candidate causal chains | Read-only; every claim cites a record id |
| **Security** | Secrets and card-number literals in added lines; added imports of modules a boundary invariant reserves | — | Always reports, including "nothing found"; unknown is never safe |
| **QA** | Test results per file; consistency checks (receipt copy against policy); runtime probes in verification | Which tests plausibly exercise each acceptance criterion | Runs the tests; never reports simulated results |
| **Evolution Analyst** | The recent trajectory; open findings; in verification, the before/after scores, invariant transitions and new dependencies if the change is approved | Findings approving would raise; whether the trajectory stays in the envelope; rule consequences of the requirement | Separates measurement from projection |
| **Incident** | Probe results (reproduction) and open incidents | Most proximate candidate (inferred); earliest plausible mutation (hypothesised) | Never asserts a root cause |
| **Synthesis** | Evidence counts by status | Recommendation, measured improvements, questions needing a human | Risk reflects what the change does, not pre-existing problems; never upgrades a claim |

The **scanner** is not an agent but writes evidence the same way: the structural scan after each mutation and the verification of the working tree before approval.

## Which specialists run

| Workflow kind | In parallel | Then |
| --- | --- | --- |
| feature | context, historian, security, qa | evolution → synthesis |
| incident | historian, incident, evolution | security, qa → synthesis |
| remediation | historian, security, qa, evolution | synthesis |
| replay | security, qa | evolution → synthesis |

At `request_approval`, security, QA and the evolution analyst run again in the verification phase against the working tree, followed by synthesis.

## Working with IBM Bob

Bob runs specialists through EPOCH-MCP's `run_specialist` tool, typically from parallel subagents (Historian, Security and QA at once), and records its own claims with `record_evidence` under a named subagent. A specialist run by name consumes its planned task, so the task graph in the console stays complete. Bob's claims follow the same labelling rules: `observed` only for what Bob measured.

## Not implemented as agents

- **Counterfactual Engineer**: futures are handled by the futures simulator (`src/core/futures`), with Bob implementing each future in its worktree.
- **Release** and **Adversarial Maintainer**: out of scope for this prototype.
