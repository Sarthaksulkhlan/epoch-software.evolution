import { Mutation, Incident, Invariant } from '../../types';

export const mockMutations: Mutation[] = [
  {
    id: 'M-1042',
    title: 'Extend chargeback eligibility from 15 to 30 days',
    intent: 'Update dispute controller and order checkout to permit chargeback requests up to 30 days post-settlement.',
    timestamp: '2026-09-24T14:18:22Z',
    epoch: 1,
    author: 'IBM Bob 2.0 (Synth-Core)',
    commitHash: '7f9c2a1',
    status: 'COMMITTED',
    touchedComponents: ['Payment API', 'Order Service', 'Ledger DB', 'Archival Job'],
    immediateOutcome: {
      unitTests: 'PASS',
      integrationTests: 'PASS',
      summary: 'All 42 API and dispute unit tests passed without regression. Chargeback intake endpoint accepted 28-day old test orders.'
    },
    structuralConsequences: {
      summary: 'Archival partition cleanup job (archive_settlements.sql) retained the hardcoded 15-day retention policy, decoupling data lifecycle from dispute window.',
      driftContribution: 'MODERATE',
      weakenedInvariantIds: ['INV-BOUND-04', 'INV-TIME-02']
    },
    downstreamMutationIds: ['M-1051', 'M-1077'],
    candidateCausalChain: ['M-1042', 'M-1051', 'M-1077'],
    relatedIncidentIds: ['INC-3312'],
    evidenceIds: ['EVID-802', 'EVID-804', 'EVID-805'],
    diffPreview: `// services/dispute/src/eligibility/ruleEngine.ts
- const MAX_DISPUTE_WINDOW_DAYS = 15;
+ const MAX_DISPUTE_WINDOW_DAYS = 30;
// NOTE: Archival cron job was not updated concurrently`
  },
  {
    id: 'M-1051',
    title: 'Bypass OrderService for 30d dispute window',
    intent: 'Resolve latency spike on 30d historical queries by reading order status directly from internal cache tables.',
    timestamp: '2026-09-25T03:40:10Z',
    epoch: 2,
    author: 'IBM Bob 2.0 (FastTrack)',
    commitHash: '8b4d91e',
    status: 'COMMITTED',
    touchedComponents: ['Order Service', 'Ledger DB', 'Dispute Gateway'],
    immediateOutcome: {
      unitTests: 'PASS',
      integrationTests: 'PASS',
      summary: 'Order query latency dropped from 180ms to 24ms. Local sanity checks successful.'
    },
    structuralConsequences: {
      summary: 'Direct table coupling introduced between dispute gateway and order internal tables, subverting domain event bus.',
      driftContribution: 'SIGNIFICANT',
      weakenedInvariantIds: ['INV-BOUND-04']
    },
    downstreamMutationIds: ['M-1077'],
    candidateCausalChain: ['M-1042', 'M-1051', 'M-1077'],
    relatedIncidentIds: ['INC-3312'],
    evidenceIds: ['EVID-803'],
    diffPreview: `// services/dispute/src/gateway/orderGateway.ts
- const order = await orderServiceRpc.getOrder(orderId);
+ // Direct DB query bypasses RPC serialization overhead
+ const order = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);`
  },
  {
    id: 'M-1077',
    title: 'Direct SQL query on raw ledger for settlement reconciliation',
    intent: 'Enable dispute reconciler to query settled ledger amounts for disputes older than 15 days.',
    timestamp: '2026-09-25T19:22:50Z',
    epoch: 3,
    author: 'Human / Hotfix PR #1077',
    commitHash: '3e11fa0',
    status: 'COMMITTED',
    touchedComponents: ['Ledger DB', 'Dispute Gateway', 'Archival Job'],
    immediateOutcome: {
      unitTests: 'PASS',
      integrationTests: 'PASS',
      summary: 'Reconciliation script successfully fetched dispute records for day 16 to 29.'
    },
    structuralConsequences: {
      summary: 'Cross-boundary direct database join violated encapsulation; queries execute against partitions slated for immediate nightly purge.',
      driftContribution: 'CRITICAL',
      weakenedInvariantIds: ['INV-BOUND-04', 'INV-TIME-02']
    },
    downstreamMutationIds: [],
    candidateCausalChain: ['M-1042', 'M-1051', 'M-1077'],
    relatedIncidentIds: ['INC-3312'],
    evidenceIds: ['EVID-804'],
    diffPreview: `// services/dispute/src/jobs/reconcileSettlements.ts
+ // Direct partition join to cross-reference archived settlements
+ const staleSettlements = await rawLedgerDb.query(
+   'SELECT * FROM ledger_settlements WHERE order_id = $1 AND settlement_date > NOW() - INTERVAL 30 DAY'
+ );`
  },
  {
    id: 'M-1084',
    title: 'Add dispute telemetry metrics and webhook dispatch',
    intent: 'Expose webhook notifications to merchant portal whenever dispute state transitions.',
    timestamp: '2026-09-26T01:10:00Z',
    epoch: 3,
    author: 'IBM Bob 2.0 (WebhookWorker)',
    commitHash: '5a2c918',
    status: 'COMMITTED',
    touchedComponents: ['Payment API', 'Webhook Dispatcher'],
    immediateOutcome: {
      unitTests: 'PASS',
      integrationTests: 'PASS',
      summary: 'Webhook payload schema validated and retry backoff tests passing.'
    },
    structuralConsequences: {
      summary: 'Isolated operational enhancement with zero boundary drift.',
      driftContribution: 'NONE',
      weakenedInvariantIds: []
    },
    downstreamMutationIds: [],
    candidateCausalChain: [],
    relatedIncidentIds: [],
    evidenceIds: []
  },
  {
    id: 'M-1090',
    title: 'Proposed: Reconcile Archival Job Retention with 30-Day Window',
    intent: 'Update partition retention schedule and decouple ledger verification via event stream.',
    timestamp: '2026-09-26T06:40:00Z',
    epoch: 4,
    author: 'EPOCH Remediation Advisor',
    commitHash: 'c701bd2',
    status: 'PROPOSED',
    touchedComponents: ['Archival Job', 'Ledger DB', 'Event Bus'],
    immediateOutcome: {
      unitTests: 'PASS',
      integrationTests: 'PASS',
      summary: 'Simulated dry-run preserves partitions 0..30 while maintaining bounded ledger tables.'
    },
    structuralConsequences: {
      summary: 'Restores INV-TIME-02 and eliminates INC-3312 causal preconditions.',
      driftContribution: 'NONE',
      weakenedInvariantIds: []
    },
    downstreamMutationIds: [],
    candidateCausalChain: [],
    relatedIncidentIds: [],
    evidenceIds: ['EVID-805']
  }
];

export const mockIncidents: Incident[] = [
  {
    id: 'INC-3312',
    title: 'Premature Ledger Archival during 30d dispute resolution — $420k frozen settlements',
    severity: 'CRITICAL',
    timestamp: '2026-09-26T04:12:00Z',
    epoch: 3,
    affectedComponents: ['Ledger DB', 'Archival Job', 'Order Service', 'Payment API'],
    blastRadiusSummary: '142 active merchant chargeback disputes failed settlement resolution because underlying ledger partition rows older than 15 days were purged by nightly archival cron.',
    earliestPlausibleContributingMutationId: 'M-1042',
    candidateCausalChain: ['M-1042', 'M-1051', 'M-1077', 'INC-3312'],
    status: 'ACTIVE',
    invariantsViolated: ['INV-BOUND-04', 'INV-TIME-02']
  },
  {
    id: 'INC-3180',
    title: 'Webhook retry cascade during third-party gateway throttle',
    severity: 'LOW',
    timestamp: '2026-09-23T11:05:00Z',
    epoch: 0,
    affectedComponents: ['Webhook Dispatcher'],
    blastRadiusSummary: 'Transient queue backlog of 3,100 events for 12 minutes during external payment processor maintenance window.',
    earliestPlausibleContributingMutationId: 'M-0988',
    candidateCausalChain: ['M-0988'],
    status: 'RESOLVED',
    invariantsViolated: []
  }
];

export const mockInvariants: Invariant[] = [
  {
    id: 'INV-BOUND-04',
    name: 'Order & Ledger Boundary Isolation',
    category: 'BOUNDARY',
    description: 'Order and Dispute services must never execute direct SQL queries or joins against Ledger DB internal tables; all verification must pass through versioned domain events.',
    status: 'WEAKENED',
    lastCheckedEpoch: 4,
    historicalTrend: [
      { epoch: 0, score: 98 },
      { epoch: 1, score: 82 },
      { epoch: 2, score: 61 },
      { epoch: 3, score: 44 },
      { epoch: 4, score: 40 }
    ],
    violationMessage: 'Direct table query detected in hotfix commit 8b4d91e (M-1051) and partition join in 3e11fa0 (M-1077).',
    responsibleComponents: ['Order Service', 'Dispute Gateway', 'Ledger DB']
  },
  {
    id: 'INV-TIME-02',
    name: 'Dispute Eligibility ≤ Ledger Archival Retention',
    category: 'TEMPORAL',
    description: 'Chargeback eligibility window (T_eligibility) must be strictly bounded by ledger retention threshold (T_retention >= T_eligibility + 7 days margin).',
    status: 'VIOLATED',
    lastCheckedEpoch: 4,
    historicalTrend: [
      { epoch: 0, score: 100 },
      { epoch: 1, score: 45 },
      { epoch: 2, score: 45 },
      { epoch: 3, score: 10 },
      { epoch: 4, score: 10 }
    ],
    violationMessage: 'T_eligibility = 30 days while T_retention = 15 days. Gap of 15 days causes unresolvable dispute data loss.',
    responsibleComponents: ['Archival Job', 'Payment API', 'Ledger DB']
  },
  {
    id: 'INV-DATA-01',
    name: 'Double-Entry Ledger Balancing Guarantee',
    category: 'DATA_FLOW',
    description: 'Every credit mutation must have corresponding debit verification in the immutable append-only ledger transaction journal.',
    status: 'HOLDING',
    lastCheckedEpoch: 4,
    historicalTrend: [
      { epoch: 0, score: 100 },
      { epoch: 1, score: 100 },
      { epoch: 2, score: 99 },
      { epoch: 3, score: 99 },
      { epoch: 4, score: 99 }
    ],
    responsibleComponents: ['Ledger DB', 'Payment API']
  },
  {
    id: 'INV-SEC-09',
    name: 'PCI-DSS Tokenized Settlement Vault Perimeter',
    category: 'SECURITY',
    description: 'No raw PAN or CVV payload may be retained across dispute gateway memory or secondary cache indices.',
    status: 'HOLDING',
    lastCheckedEpoch: 4,
    historicalTrend: [
      { epoch: 0, score: 100 },
      { epoch: 1, score: 100 },
      { epoch: 2, score: 100 },
      { epoch: 3, score: 100 },
      { epoch: 4, score: 100 }
    ],
    responsibleComponents: ['Payment API', 'Dispute Gateway']
  }
];
