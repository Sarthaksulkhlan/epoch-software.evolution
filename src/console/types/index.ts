/**
 * EPOCH — AI-Native Software Evolution Control Plane
 * Shared Type Definitions and Contracts
 *
 * NOTE: These types establish the frontend contracts.
 * They are designed for easy reconciliation with backend Zod schemas.
 */

export type LifecycleState = 
  | 'INTAKE' 
  | 'PLANNING' 
  | 'IMPLEMENTATION' 
  | 'VERIFICATION' 
  | 'APPROVAL_GATE' 
  | 'DEPLOYED' 
  | 'HALTED';

export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';

export type InvariantStatus = 'HOLDING' | 'WEAKENED' | 'VIOLATED';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SpecialistRole = 
  | 'ARCHITECT' 
  | 'CODE_SYNTHESIZER' 
  | 'VERIFICATION_ORACLE' 
  | 'INVARIANT_SENTINEL' 
  | 'DRIFT_ANALYST';

export interface SpecialistTask {
  id: string;
  role: SpecialistRole;
  agentName: string;
  action: string;
  status: TaskStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  evidenceProducedCount: number;
}

export interface CodeDiff {
  filename: string;
  additions: number;
  deletions: number;
  hunks: string[];
}

export interface EvidenceItem {
  id: string;
  taskId?: string;
  type: 'TEST_RESULTS' | 'CODE_DIFF' | 'ARCHITECTURE_OBSERVATION' | 'RUNTIME_FINDING' | 'INVARIANT_CHECK';
  title: string;
  summary: string;
  timestamp: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'INFO';
  diff?: CodeDiff;
  details?: Record<string, unknown>;
  metrics?: { label: string; value: string | number }[];
}

export interface DecisionGate {
  id: string;
  workflowId: string;
  title: string;
  requirement: string;
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    summary: string;
    affectedInvariants: string[];
  };
  requiredEvidenceIds: string[];
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONDITIONALLY_APPROVED';
  decidedAt?: string;
  decidedBy?: string;
  rationale?: string;
}

export interface Workflow {
  id: string;
  projectId: string;
  projectName: string;
  repo: string;
  branch: string;
  requirementTitle: string;
  requirementDescription: string;
  state: LifecycleState;
  initiatedAt: string;
  completedSteps: number;
  totalSteps: number;
  tasks: SpecialistTask[];
  evidence: EvidenceItem[];
  decisionGate: DecisionGate;
}

export interface Mutation {
  id: string;
  title: string;
  intent: string;
  timestamp: string;
  epoch: number;
  author: string; // e.g. "IBM Bob 2.0 (Synth-4)" or "Human / PR #1042"
  commitHash: string;
  status: 'COMMITTED' | 'PROPOSED' | 'REVERTED';
  touchedComponents: string[];
  immediateOutcome: {
    unitTests: 'PASS' | 'FAIL';
    integrationTests: 'PASS' | 'FAIL';
    summary: string;
  };
  structuralConsequences: {
    summary: string;
    driftContribution: 'NONE' | 'LOW' | 'MODERATE' | 'SIGNIFICANT' | 'CRITICAL';
    weakenedInvariantIds: string[];
  };
  downstreamMutationIds: string[];
  candidateCausalChain: string[];
  relatedIncidentIds: string[];
  evidenceIds: string[];
  diffPreview?: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  timestamp: string;
  epoch: number;
  affectedComponents: string[];
  blastRadiusSummary: string;
  earliestPlausibleContributingMutationId: string;
  candidateCausalChain: string[];
  status: 'ACTIVE' | 'MITIGATED' | 'RESOLVED';
  invariantsViolated: string[];
}

export interface Invariant {
  id: string;
  name: string;
  category: 'BOUNDARY' | 'DATA_FLOW' | 'TEMPORAL' | 'SECURITY';
  description: string;
  status: InvariantStatus;
  lastCheckedEpoch: number;
  historicalTrend: { epoch: number; score: number }[]; // 0..100
  violationMessage?: string;
  responsibleComponents: string[];
}

export interface DriftFinding {
  id: string;
  title: string;
  severity: 'WARNING' | 'CRITICAL';
  detectedEpoch: number;
  detectedAt: string;
  boundaryName: string;
  sourceComponent: string;
  targetComponent: string;
  whyExplanation: string;
  earliestPlausibleMutationId: string;
  candidateCausalChain: string[];
  violatedInvariantId: string;
  integrityScore: number; // 0..100
  /** Live API only: 'open' or 'resolved', and the mutation that resolved it. */
  status?: string;
  resolvedBy?: string | null;
}

export interface TrajectorySnapshot {
  epoch: number;
  label: string;
  timestamp: string;
  boundaryIntegrityScore: number;
  activeDriftCount: number;
  mutations: string[];
  invariants: { id: string; status: InvariantStatus }[];
}

export interface CounterfactualScenario {
  id: string;
  divergenceMutationId: string;
  title: string;
  strategyName: string;
  description: string;
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  projectedBoundaryIntegrity: number; // 0..100
  projectedIncidentRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  projectedTimeDays: number;
  invariantOutcomes: {
    invariantId: string;
    invariantName: string;
    projectedStatus: InvariantStatus;
    rationale: string;
  }[];
  tradeoffs: {
    pros: string[];
    cons: string[];
  };
  projectedEvidence: {
    title: string;
    type: string;
    finding: string;
  }[];
  /** Live API only (GET /api/v1/simulations). `id` is "<simulationId>:<scenarioId>". */
  simulationId?: string;
  scenarioId?: string;
  status?: string;
  measured?: boolean;
  recommended?: boolean;
  changedFiles?: string[];
  selected?: boolean;
  /** Present on the adopted scenario: the remediation workflow opened by futuresSimulator.select. */
  remediationWorkflowId?: string;
}

export interface GraphNodeData {
  id: string;
  type: 'MutationNode' | 'IncidentNode' | 'InvariantNode' | 'EpochBoundaryNode';
  label: string;
  sublabel?: string;
  epoch: number;
  status?: string;
  severity?: string;
  x: number;
  y: number;
  isCausalChain?: boolean;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  isCausal?: boolean;
  style?: 'default' | 'critical' | 'warning' | 'success' | 'dashed';
}

/** GET /api/v1/trajectory/trend: one point per recorded mutation. */
export interface IntegrityTrendPoint {
  epochLabel: string;
  score: number;
  threshold: number;
  coupling: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  actor: string;
  category: 'MUTATION' | 'INVARIANT' | 'DECISION' | 'SPECIALIST' | 'DRIFT';
  message: string;
  relatedEntityId?: string;
  severity?: 'INFO' | 'WARN' | 'CRITICAL' | 'SUCCESS';
}
