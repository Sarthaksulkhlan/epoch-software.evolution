import type { CounterfactualScenario } from '../../types';

export const mockScenarios: CounterfactualScenario[] = [
  {
    id: 'SCENARIO-A',
    divergenceMutationId: 'M-1042',
    title: 'Path A: Continue Current Direct-Access Path',
    strategyName: 'Status Quo & Opportunistic Hotfixes',
    description: 'Keep existing direct partition queries from M-1051 and M-1077. Patch the archival SQL script with an ad-hoc 30-day exemption condition without decoupling services.',
    implementationEffort: 'LOW',
    projectedBoundaryIntegrity: 32,
    projectedIncidentRisk: 'HIGH',
    projectedTimeDays: 0.5,
    invariantOutcomes: [
      {
        invariantId: 'INV-BOUND-04',
        invariantName: 'Order & Ledger Boundary Isolation',
        projectedStatus: 'VIOLATED',
        rationale: 'Direct database coupling becomes permanent convention; subsequent changes will bypass domain APIs.'
      },
      {
        invariantId: 'INV-TIME-02',
        invariantName: 'Dispute Eligibility ≤ Ledger Archival Retention',
        projectedStatus: 'WEAKENED',
        rationale: 'Ad-hoc WHERE condition prevents immediate purge, but lacks architectural enforcement on schema evolutions.'
      },
      {
        invariantId: 'INV-DATA-01',
        invariantName: 'Double-Entry Ledger Balancing Guarantee',
        projectedStatus: 'HOLDING',
        rationale: 'Underlying ledger double-entry mathematics remain mathematically balanced.'
      }
    ],
    tradeoffs: {
      pros: [
        'Zero API refactoring required',
        'Can be deployed in under 2 hours via SQL migration',
        'Immediately unfreezes current 142 blocked dispute records'
      ],
      cons: [
        'Severe long-term architectural drift across payment boundary',
        'High probability of recurring data loss incidents during next schema migration',
        'Violates microservice autonomy; locks Dispute and Ledger deployments together'
      ]
    },
    projectedEvidence: [
      {
        title: 'Coupling Metric Simulation',
        type: 'DRIFT_PROJECTION',
        finding: 'Cross-service coupling index escalates from 28% to 68% over next 60 days.'
      },
      {
        title: 'Failure Cascade Risk',
        type: 'RISK_MATRIX',
        finding: 'Estimated 3.4 incidents/quarter attributed to partition lock contention during peak settlement hours.'
      }
    ]
  },
  {
    id: 'SCENARIO-B',
    divergenceMutationId: 'M-1042',
    title: 'Path B: Re-architect Boundary with Domain Events (Recommended)',
    strategyName: 'Event-Driven Dispute Projection Service',
    description: 'Revert direct queries in M-1051 and M-1077. Introduce an asynchronous SettlementSnapshot projection in Dispute Service fed via Kafka/EventBus, and configure Archival Job with 45-day retention policy (30d SLA + 15d dispute review grace).',
    implementationEffort: 'MEDIUM',
    projectedBoundaryIntegrity: 94,
    projectedIncidentRisk: 'LOW',
    projectedTimeDays: 2.0,
    invariantOutcomes: [
      {
        invariantId: 'INV-BOUND-04',
        invariantName: 'Order & Ledger Boundary Isolation',
        projectedStatus: 'HOLDING',
        rationale: 'Complete decoupling; Dispute Service queries its local read-optimized projection without database joins.'
      },
      {
        invariantId: 'INV-TIME-02',
        invariantName: 'Dispute Eligibility ≤ Ledger Archival Retention',
        projectedStatus: 'HOLDING',
        rationale: 'Enforces invariant in deployment pipeline: CI fails if archival retention < dispute window + 15 days.'
      },
      {
        invariantId: 'INV-DATA-01',
        invariantName: 'Double-Entry Ledger Balancing Guarantee',
        projectedStatus: 'HOLDING',
        rationale: 'Ledger remains pure immutable append-only journal.'
      }
    ],
    tradeoffs: {
      pros: [
        'Completely resolves root cause of INC-3312 and eliminates candidate causal chain',
        'Restores boundary integrity to 94%',
        'Dispute Service reads scale horizontally without touching ledger read replicas'
      ],
      cons: [
        'Requires 2 days of engineering time for event consumer implementation',
        'Requires initial historical projection backfill for active settlements (approx 40 min run)'
      ]
    },
    projectedEvidence: [
      {
        title: 'Architectural Verification',
        type: 'INVARIANT_SENTINEL',
        finding: 'All 4 invariants verified HOLDING in simulated sandbox with zero direct DB linkages.'
      },
      {
        title: 'Contract Test Matrix',
        type: 'REGRESSION_SIMULATION',
        finding: '100% of 128 dispute integration scenarios pass with sub-25ms response times.'
      }
    ]
  },
  {
    id: 'SCENARIO-C',
    divergenceMutationId: 'M-1042',
    title: 'Path C: Introduce Read-Only Compatibility Facade',
    strategyName: 'Temporal Data Facade & Dual-Index',
    description: 'Implement an internal Ledger RPC facade that exposes historical settlement queries up to 35 days, utilizing a cold-storage parquet index while preserving primary database isolation.',
    implementationEffort: 'MEDIUM',
    projectedBoundaryIntegrity: 78,
    projectedIncidentRisk: 'LOW',
    projectedTimeDays: 1.5,
    invariantOutcomes: [
      {
        invariantId: 'INV-BOUND-04',
        invariantName: 'Order & Ledger Boundary Isolation',
        projectedStatus: 'HOLDING',
        rationale: 'Eliminates SQL joins; access mediated via typed gRPC interface.'
      },
      {
        invariantId: 'INV-TIME-02',
        invariantName: 'Dispute Eligibility ≤ Ledger Archival Retention',
        projectedStatus: 'HOLDING',
        rationale: 'Cold storage index extends queryability without blocking database partition purges.'
      },
      {
        invariantId: 'INV-DATA-01',
        invariantName: 'Double-Entry Ledger Balancing Guarantee',
        projectedStatus: 'HOLDING',
        rationale: 'Primary ledger schema remains untouched.'
      }
    ],
    tradeoffs: {
      pros: [
        'Does not require building new event projection pipelines',
        'Provides backwards-compatible read interface for any legacy service',
        'Protects database partitions from high-concurrency table scans'
      ],
      cons: [
        'Cold-storage parquet reads have 150ms-300ms p95 latency for day-20+ disputes',
        'Adds another infrastructure component (cold storage indexer) to monitor'
      ]
    },
    projectedEvidence: [
      {
        title: 'Latency Profile',
        type: 'BENCHMARK',
        finding: 'Warm records (<15d) query at 14ms; cold records (16-30d) query at 210ms.'
      },
      {
        title: 'Drift Score Impact',
        type: 'TRAJECTORY_SIMULATION',
        finding: 'Boundary integrity rebounds to 78%, clearing critical drift threshold.'
      }
    ]
  }
];
