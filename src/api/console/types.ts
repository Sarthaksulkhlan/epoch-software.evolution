/**
 * The console's view-model contract, mirrored from the epoch-frontend branch
 * (src/console/types/index.ts). The /api/v1 adapter returns exactly these shapes
 * so the console can swap its mock data for live data without UI changes.
 */

export type LifecycleState = 'INTAKE' | 'PLANNING' | 'IMPLEMENTATION' | 'VERIFICATION' | 'APPROVAL_GATE' | 'DEPLOYED' | 'HALTED';
export type ConsoleTaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
export type ConsoleInvariantStatus = 'HOLDING' | 'WEAKENED' | 'VIOLATED';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SpecialistRole = 'ARCHITECT' | 'CODE_SYNTHESIZER' | 'VERIFICATION_ORACLE' | 'INVARIANT_SENTINEL' | 'DRIFT_ANALYST';

export interface SpecialistTask {
  id: string;
  role: SpecialistRole;
  agentName: string;
  action: string;
  status: ConsoleTaskStatus;
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
  riskAssessment: { level: 'LOW' | 'MEDIUM' | 'HIGH'; summary: string; affectedInvariants: string[] };
  requiredEvidenceIds: string[];
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONDITIONALLY_APPROVED';
  decidedAt?: string;
  decidedBy?: string;
  rationale?: string;
}

export interface ConsoleWorkflow {
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

export interface ConsoleMutation {
  id: string;
  title: string;
  intent: string;
  timestamp: string;
  epoch: number;
  author: string;
  commitHash: string;
  status: 'COMMITTED' | 'PROPOSED' | 'REVERTED';
  touchedComponents: string[];
  immediateOutcome: { unitTests: 'PASS' | 'FAIL'; integrationTests: 'PASS' | 'FAIL'; summary: string };
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

export interface ConsoleIncident {
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

export interface ConsoleInvariant {
  id: string;
  name: string;
  category: 'BOUNDARY' | 'DATA_FLOW' | 'TEMPORAL' | 'SECURITY';
  description: string;
  status: ConsoleInvariantStatus;
  lastCheckedEpoch: number;
  historicalTrend: { epoch: number; score: number }[];
  violationMessage?: string;
  responsibleComponents: string[];
}

export interface ConsoleDriftFinding {
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
  integrityScore: number;
}

export interface TrajectorySnapshot {
  epoch: number;
  label: string;
  timestamp: string;
  boundaryIntegrityScore: number;
  activeDriftCount: number;
  mutations: string[];
  invariants: { id: string; status: ConsoleInvariantStatus }[];
}

export interface CounterfactualScenario {
  id: string;
  divergenceMutationId: string;
  title: string;
  strategyName: string;
  description: string;
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  projectedBoundaryIntegrity: number;
  projectedIncidentRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  /** EPOCH does not estimate calendar time: this carries the number of changed files. */
  projectedTimeDays: number;
  invariantOutcomes: { invariantId: string; invariantName: string; projectedStatus: ConsoleInvariantStatus; rationale: string }[];
  tradeoffs: { pros: string[]; cons: string[] };
  projectedEvidence: { title: string; type: string; finding: string }[];
  /** Present on the adopted scenario: the remediation workflow opened by futuresSimulator.select. */
  remediationWorkflowId?: string;
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
  style?: 'default' | 'critical' | 'warning' | 'success';
}
