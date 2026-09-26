import { DriftFinding, TrajectorySnapshot } from '../../types';

export const mockDriftFindings: DriftFinding[] = [
  {
    id: 'DRIFT-409',
    title: 'Cross-Domain Database Join on Ledger Partitions',
    severity: 'CRITICAL',
    detectedEpoch: 3,
    detectedAt: '2026-09-25T19:45:00Z',
    boundaryName: 'Order/Dispute Boundary <-> Ledger Isolation Wall',
    sourceComponent: 'Dispute Gateway',
    targetComponent: 'Ledger DB',
    whyExplanation: 'When chargeback eligibility was extended to 30 days in M-1042, the retention script (archive_settlements.sql) was left untouched at 15 days. Subsequently, to query older settlement states, M-1051 bypassed OrderService RPC and M-1077 introduced direct table queries against raw ledger partitions. When the nightly archival cron runs, it purges day-16 to day-30 rows, creating fatal data drift and triggering INC-3312.',
    earliestPlausibleMutationId: 'M-1042',
    candidateCausalChain: ['M-1042', 'M-1051', 'M-1077'],
    violatedInvariantId: 'INV-BOUND-04',
    integrityScore: 40
  },
  {
    id: 'DRIFT-382',
    title: 'Temporal Window Desynchronization in Settlement Archival',
    severity: 'CRITICAL',
    detectedEpoch: 2,
    detectedAt: '2026-09-25T04:10:00Z',
    boundaryName: 'Temporal Retention Policy vs Public SLA',
    sourceComponent: 'Payment API',
    targetComponent: 'Archival Job',
    whyExplanation: 'Earliest plausible contributing mutation M-1042 modified the public-facing SLA window without updating the asynchronous archival cleanup daemon. The daemon continuously invalidates transactions eligible for customer dispute.',
    earliestPlausibleMutationId: 'M-1042',
    candidateCausalChain: ['M-1042'],
    violatedInvariantId: 'INV-TIME-02',
    integrityScore: 45
  }
];

export const mockTrajectorySnapshots: TrajectorySnapshot[] = [
  {
    epoch: 0,
    label: 'Baseline (v3.3.0)',
    timestamp: '2026-09-20T00:00:00Z',
    boundaryIntegrityScore: 98,
    activeDriftCount: 0,
    mutations: ['M-0988'],
    invariants: [
      { id: 'INV-BOUND-04', status: 'HOLDING' },
      { id: 'INV-TIME-02', status: 'HOLDING' },
      { id: 'INV-DATA-01', status: 'HOLDING' },
      { id: 'INV-SEC-09', status: 'HOLDING' }
    ]
  },
  {
    epoch: 1,
    label: 'Epoch 1: Eligibility Extension (M-1042)',
    timestamp: '2026-09-24T14:30:00Z',
    boundaryIntegrityScore: 82,
    activeDriftCount: 1,
    mutations: ['M-1042'],
    invariants: [
      { id: 'INV-BOUND-04', status: 'WEAKENED' },
      { id: 'INV-TIME-02', status: 'WEAKENED' },
      { id: 'INV-DATA-01', status: 'HOLDING' },
      { id: 'INV-SEC-09', status: 'HOLDING' }
    ]
  },
  {
    epoch: 2,
    label: 'Epoch 2: Query Bypass Hotfix (M-1051)',
    timestamp: '2026-09-25T04:00:00Z',
    boundaryIntegrityScore: 61,
    activeDriftCount: 1,
    mutations: ['M-1051'],
    invariants: [
      { id: 'INV-BOUND-04', status: 'WEAKENED' },
      { id: 'INV-TIME-02', status: 'VIOLATED' },
      { id: 'INV-DATA-01', status: 'HOLDING' },
      { id: 'INV-SEC-09', status: 'HOLDING' }
    ]
  },
  {
    epoch: 3,
    label: 'Epoch 3: Direct Ledger Join & Incident (M-1077)',
    timestamp: '2026-09-25T20:00:00Z',
    boundaryIntegrityScore: 40,
    activeDriftCount: 2,
    mutations: ['M-1077', 'M-1084'],
    invariants: [
      { id: 'INV-BOUND-04', status: 'VIOLATED' },
      { id: 'INV-TIME-02', status: 'VIOLATED' },
      { id: 'INV-DATA-01', status: 'HOLDING' },
      { id: 'INV-SEC-09', status: 'HOLDING' }
    ]
  },
  {
    epoch: 4,
    label: 'Epoch 4 (Now): Inactive Breach & Proposed Fix',
    timestamp: '2026-09-26T06:45:00Z',
    boundaryIntegrityScore: 40,
    activeDriftCount: 2,
    mutations: ['M-1090'],
    invariants: [
      { id: 'INV-BOUND-04', status: 'WEAKENED' },
      { id: 'INV-TIME-02', status: 'VIOLATED' },
      { id: 'INV-DATA-01', status: 'HOLDING' },
      { id: 'INV-SEC-09', status: 'HOLDING' }
    ]
  }
];

export const mockIntegrityTrendData = [
  { epochLabel: 'E0: Baseline', score: 98, threshold: 75, coupling: 12 },
  { epochLabel: 'E1: M-1042', score: 82, threshold: 75, coupling: 28 },
  { epochLabel: 'E2: M-1051', score: 61, threshold: 75, coupling: 56 },
  { epochLabel: 'E3: M-1077', score: 40, threshold: 75, coupling: 88 },
  { epochLabel: 'E4: Current', score: 40, threshold: 75, coupling: 88 }
];

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
  style?: 'solid' | 'dashed' | 'critical';
}

export const mockGraphNodes: GraphNodeData[] = [
  {
    id: 'epoch-0',
    type: 'EpochBoundaryNode',
    label: 'Epoch 0',
    sublabel: 'Baseline v3.3.0',
    epoch: 0,
    x: 80,
    y: 40
  },
  {
    id: 'epoch-1',
    type: 'EpochBoundaryNode',
    label: 'Epoch 1',
    sublabel: 'Eligibility Extension',
    epoch: 1,
    x: 320,
    y: 40
  },
  {
    id: 'epoch-2',
    type: 'EpochBoundaryNode',
    label: 'Epoch 2',
    sublabel: 'Cache Bypass Hotfix',
    epoch: 2,
    x: 560,
    y: 40
  },
  {
    id: 'epoch-3',
    type: 'EpochBoundaryNode',
    label: 'Epoch 3',
    sublabel: 'Cross-Domain Join',
    epoch: 3,
    x: 800,
    y: 40
  },
  {
    id: 'epoch-4',
    type: 'EpochBoundaryNode',
    label: 'Epoch 4',
    sublabel: 'Current State',
    epoch: 4,
    x: 1040,
    y: 40
  },

  // Invariants
  {
    id: 'INV-BOUND-04',
    type: 'InvariantNode',
    label: 'INV-BOUND-04',
    sublabel: 'Boundary Isolation',
    status: 'WEAKENED',
    epoch: 1,
    x: 320,
    y: 140,
    isCausalChain: true
  },
  {
    id: 'INV-TIME-02',
    type: 'InvariantNode',
    label: 'INV-TIME-02',
    sublabel: 'Retention Window Match',
    status: 'VIOLATED',
    epoch: 2,
    x: 560,
    y: 140,
    isCausalChain: true
  },
  {
    id: 'INV-DATA-01',
    type: 'InvariantNode',
    label: 'INV-DATA-01',
    sublabel: 'Ledger Balance',
    status: 'HOLDING',
    epoch: 0,
    x: 80,
    y: 140
  },

  // Mutations
  {
    id: 'M-1042',
    type: 'MutationNode',
    label: 'M-1042',
    sublabel: 'Payment API / OrderService',
    epoch: 1,
    status: 'COMMITTED',
    x: 320,
    y: 270,
    isCausalChain: true
  },
  {
    id: 'M-1051',
    type: 'MutationNode',
    label: 'M-1051',
    sublabel: 'Dispute Gateway Cache Bypass',
    epoch: 2,
    status: 'COMMITTED',
    x: 560,
    y: 270,
    isCausalChain: true
  },
  {
    id: 'M-1077',
    type: 'MutationNode',
    label: 'M-1077',
    sublabel: 'Direct Ledger SQL Query',
    epoch: 3,
    status: 'COMMITTED',
    x: 800,
    y: 270,
    isCausalChain: true
  },
  {
    id: 'M-1084',
    type: 'MutationNode',
    label: 'M-1084',
    sublabel: 'Dispute Telemetry & Webhook',
    epoch: 3,
    status: 'COMMITTED',
    x: 800,
    y: 390
  },
  {
    id: 'M-1090',
    type: 'MutationNode',
    label: 'M-1090',
    sublabel: 'Proposed: Reconcile Archival Job',
    epoch: 4,
    status: 'PROPOSED',
    x: 1040,
    y: 270
  },

  // Incident
  {
    id: 'INC-3312',
    type: 'IncidentNode',
    label: 'INC-3312',
    sublabel: 'Frozen Disputes ($420k)',
    epoch: 3,
    severity: 'CRITICAL',
    x: 880,
    y: 150,
    isCausalChain: true
  }
];

export const mockGraphEdges: GraphEdgeData[] = [
  {
    id: 'e-1042-1051',
    source: 'M-1042',
    target: 'M-1051',
    label: 'triggers latency fix',
    isCausal: true,
    style: 'critical'
  },
  {
    id: 'e-1051-1077',
    source: 'M-1051',
    target: 'M-1077',
    label: 'demands direct join',
    isCausal: true,
    style: 'critical'
  },
  {
    id: 'e-1077-inc3312',
    source: 'M-1077',
    target: 'INC-3312',
    label: 'triggers data loss',
    isCausal: true,
    style: 'critical'
  },
  {
    id: 'e-1042-inv-bound',
    source: 'M-1042',
    target: 'INV-BOUND-04',
    label: 'weakens',
    isCausal: true,
    style: 'dashed'
  },
  {
    id: 'e-1042-inv-time',
    source: 'M-1042',
    target: 'INV-TIME-02',
    label: 'violates',
    isCausal: true,
    style: 'dashed'
  },
  {
    id: 'e-1077-m1090',
    source: 'M-1077',
    target: 'M-1090',
    label: 'remediated by',
    style: 'solid'
  }
];
