import type { ContextBundle } from '../shared/schema/context-bundle.schema.js';
import type { EvidenceStatus, FindingSeverity } from '../shared/schema/evidence.schema.js';
import type { AgentType } from '../shared/schema/task.schema.js';
import type { WorkflowKind } from '../shared/schema/workflow.schema.js';
import type { RepoSpec } from '../graph/scanner/spec.js';
import type { ScanResult } from '../graph/scanner/scanner.js';
import type { ScanDiff } from '../graph/scanner/diff.js';
import type { PatternOutcome } from '../graph/drift/patterns.js';
import type { ProbeResult, TestRun } from '../sandbox/runner.js';

/** Results of checking the working tree before a change is approved. */
export interface Verification {
  tests: TestRun;
  probes: ProbeResult[];
  /** Scan of the working tree, i.e. the system as it would be after approval. */
  scan: ScanResult;
  /** HEAD → working tree. */
  diff: ScanDiff;
  /** Drift findings that approving would raise or escalate. */
  driftPreview: PatternOutcome[];
  changedFiles: string[];
  withinEnvelope: boolean;
}

export type AgentPhase = 'analysis' | 'verification';

export interface AgentContext {
  workflowId: string;
  taskId: string;
  kind: WorkflowKind;
  phase: AgentPhase;
  requirement: string;
  bundle: ContextBundle;
  repoPath: string;
  spec: RepoSpec;
  /** Scan recorded with the latest mutation (the system as it is). */
  headScan: ScanResult | undefined;
  /** Unified diff of the working tree against HEAD. */
  diff: string;
  verification?: Verification | undefined;
}

/**
 * One claim an agent makes. `observed` claims must be measurements; anything
 * derived is `inferred`, and candidate explanations are `hypothesised` (ADR-011).
 */
export interface AgentClaim {
  claim: string;
  status: EvidenceStatus;
  sourceRef: string;
  severity?: FindingSeverity;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AgentResult {
  agent: AgentType;
  claims: AgentClaim[];
  summary: string;
  riskLevel: RiskLevel;
}

export interface Agent {
  readonly type: AgentType;
  /** One line shown on the console's agent card. */
  readonly role: string;
  run(ctx: AgentContext): Promise<AgentResult>;
}

export function observed(claim: string, sourceRef: string, severity?: FindingSeverity): AgentClaim {
  return severity ? { claim, status: 'observed', sourceRef, severity } : { claim, status: 'observed', sourceRef };
}

export function inferred(claim: string, sourceRef: string, severity?: FindingSeverity): AgentClaim {
  return severity ? { claim, status: 'inferred', sourceRef, severity } : { claim, status: 'inferred', sourceRef };
}

export function hypothesised(claim: string, sourceRef: string, severity?: FindingSeverity): AgentClaim {
  return severity ? { claim, status: 'hypothesised', sourceRef, severity } : { claim, status: 'hypothesised', sourceRef };
}

const RISK_ORDER: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

export function maxRisk(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>((max, level) => (RISK_ORDER.indexOf(level) > RISK_ORDER.indexOf(max) ? level : max), 'low');
}

export function riskFromClaims(claims: AgentClaim[]): RiskLevel {
  if (claims.some(c => c.severity === 'critical')) return 'critical';
  if (claims.some(c => c.severity === 'high')) return 'high';
  if (claims.some(c => c.severity === 'medium')) return 'medium';
  return 'low';
}
