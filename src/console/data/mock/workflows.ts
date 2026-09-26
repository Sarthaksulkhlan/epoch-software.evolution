import type { Workflow, EvidenceItem, SpecialistTask, DecisionGate } from '../../types';

export const mockEvidence: EvidenceItem[] = [
  {
    id: 'EVID-801',
    taskId: 'TASK-201',
    type: 'TEST_RESULTS',
    title: 'Dispute Window Regression Suite',
    summary: '42/42 integration test suites passed. Chargeback window extension verified for 30-day window.',
    timestamp: '2026-09-26T06:15:20Z',
    status: 'PASS',
    metrics: [
      { label: 'Suites Passed', value: '42/42' },
      { label: 'Coverage', value: '94.2%' },
      { label: 'Latency (p95)', value: '18ms' }
    ]
  },
  {
    id: 'EVID-802',
    taskId: 'TASK-202',
    type: 'CODE_DIFF',
    title: 'Dispute Eligibility Controller & Service',
    summary: 'Modified eligibility calculation from 15 to 30 calendar days across checkout and settlement modules.',
    timestamp: '2026-09-26T06:22:11Z',
    status: 'INFO',
    diff: {
      filename: 'services/dispute/src/eligibility/ruleEngine.ts',
      additions: 14,
      deletions: 3,
      hunks: [
        '@@ -28,7 +28,18 @@ export function evaluateChargebackEligibility(order: Order): EligibilityResult {',
        '-  const MAX_DISPUTE_WINDOW_DAYS = 15;',
        '+  // RFC-882: Extend chargeback eligibility window from 15 to 30 days',
        '+  const MAX_DISPUTE_WINDOW_DAYS = 30;',
        '   const daysSinceSettlement = differenceInDays(now(), order.settledAt);',
        '+  ',
        '+  // WARNING: Archival cron job assumes immutable settlements after 15 days',
        '+  if (daysSinceSettlement <= MAX_DISPUTE_WINDOW_DAYS) {',
        '+    return { eligible: true, windowDays: MAX_DISPUTE_WINDOW_DAYS };',
        '+  }'
      ]
    }
  },
  {
    id: 'EVID-803',
    taskId: 'TASK-203',
    type: 'ARCHITECTURE_OBSERVATION',
    title: 'Cross-Domain Ledger Coupling Observation',
    summary: 'Synthesizer introduced direct query from Order Service into Ledger DB partitions to verify dispute settlements.',
    timestamp: '2026-09-26T06:31:05Z',
    status: 'WARN',
    metrics: [
      { label: 'Boundary Invariant', value: 'INV-BOUND-04' },
      { label: 'Coupling Type', value: 'Shared Table Direct Join' },
      { label: 'Drift Impact', value: 'Moderate (+18%)' }
    ]
  },
  {
    id: 'EVID-804',
    taskId: 'TASK-204',
    type: 'RUNTIME_FINDING',
    title: 'Settlement Archival Retention Mismatch',
    summary: 'Nightly partition purge script (jobs/archive_settlements.sql) still configures RETENTION_DAYS = 15.',
    timestamp: '2026-09-26T06:38:40Z',
    status: 'FAIL',
    metrics: [
      { label: 'Archival Retention', value: '15 Days (Stale)' },
      { label: 'Dispute Eligibility', value: '30 Days (Active)' },
      { label: 'Temporal Divergence', value: '15 Days Gap' }
    ]
  },
  {
    id: 'EVID-805',
    taskId: 'TASK-204',
    type: 'INVARIANT_CHECK',
    title: 'Invariant Sentinel Audit: INV-BOUND-04',
    summary: 'Status downgraded from HOLDING to WEAKENED. Archival cron job will purge ledger records while dispute remains open.',
    timestamp: '2026-09-26T06:42:15Z',
    status: 'WARN',
    metrics: [
      { label: 'Invariant ID', value: 'INV-BOUND-04' },
      { label: 'Current State', value: 'WEAKENED' },
      { label: 'Downstream Risk', value: 'INC-3312 Incident Precursor' }
    ]
  }
];

export const mockTasks: SpecialistTask[] = [
  {
    id: 'TASK-201',
    role: 'ARCHITECT',
    agentName: 'IBM Bob 2.0 (PlanSpec)',
    action: 'Decomposed requirement: extend dispute eligibility window & mapped affected boundaries',
    status: 'COMPLETED',
    startedAt: '2026-09-26T06:05:00Z',
    completedAt: '2026-09-26T06:12:10Z',
    durationMs: 430000,
    evidenceProducedCount: 1
  },
  {
    id: 'TASK-202',
    role: 'CODE_SYNTHESIZER',
    agentName: 'IBM Bob 2.0 (Synth-Core)',
    action: 'Implemented 30-day chargeback calculation in DisputeController & OrderService',
    status: 'COMPLETED',
    startedAt: '2026-09-26T06:12:15Z',
    completedAt: '2026-09-26T06:23:45Z',
    durationMs: 690000,
    evidenceProducedCount: 1
  },
  {
    id: 'TASK-203',
    role: 'VERIFICATION_ORACLE',
    agentName: 'WEAVE Test Oracle',
    action: 'Executed contract tests, dispute edge-cases, and regression test matrix',
    status: 'COMPLETED',
    startedAt: '2026-09-26T06:24:00Z',
    completedAt: '2026-09-26T06:32:00Z',
    durationMs: 480000,
    evidenceProducedCount: 1
  },
  {
    id: 'TASK-204',
    role: 'INVARIANT_SENTINEL',
    agentName: 'EPOCH Sentinel',
    action: 'Scanned static boundary constraints & temporal data consistency across domains',
    status: 'COMPLETED',
    startedAt: '2026-09-26T06:32:10Z',
    completedAt: '2026-09-26T06:43:00Z',
    durationMs: 650000,
    evidenceProducedCount: 2
  },
  {
    id: 'TASK-205',
    role: 'DRIFT_ANALYST',
    agentName: 'EPOCH Trajectory Modeler',
    action: 'Synthesizing divergence impact on archival jobs & historical incident correlation',
    status: 'RUNNING',
    startedAt: '2026-09-26T06:43:10Z',
    durationMs: 340000,
    evidenceProducedCount: 0
  }
];

export const mockDecisionGate: DecisionGate = {
  id: 'GATE-774',
  workflowId: 'WF-9041',
  title: 'Production Promotion Gate: 30-Day Chargeback Window Expansion',
  requirement: 'Extend chargeback eligibility from 15 days to 30 days across Hyperion checkout, dispute, and ledger infrastructure.',
  riskAssessment: {
    level: 'HIGH',
    summary: 'Locally tests pass, but architectural sentinel identified a temporal invariant mismatch: the ledger archival job will purge settlement partitions after 15 days, resulting in orphaned 30-day dispute resolutions.',
    affectedInvariants: ['INV-BOUND-04', 'INV-TIME-02']
  },
  requiredEvidenceIds: ['EVID-801', 'EVID-802', 'EVID-803', 'EVID-804', 'EVID-805'],
  status: 'PENDING_REVIEW'
};

export const mockActiveWorkflow: Workflow = {
  id: 'WF-9041',
  projectId: 'PRJ-HYPERION',
  projectName: 'Hyperion Commerce Engine (v3.4.1)',
  repo: 'hyperion-core/payment-lifecycle',
  branch: 'feat/extend-chargeback-window-30d',
  requirementTitle: 'Extend chargeback eligibility from 15 days to 30 days',
  requirementDescription: 'Regulatory compliance update requiring merchant customers to submit and process disputed transactions up to 30 days post-settlement without API rejection.',
  state: 'APPROVAL_GATE',
  initiatedAt: '2026-09-26T06:04:12Z',
  completedSteps: 4,
  totalSteps: 5,
  tasks: mockTasks,
  evidence: mockEvidence,
  decisionGate: mockDecisionGate
};
