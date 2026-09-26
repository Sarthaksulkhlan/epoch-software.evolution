import type { ActivityEvent } from '../../types';

export const mockInitialEvents: ActivityEvent[] = [
  {
    id: 'EVT-109',
    timestamp: 'Just now',
    actor: 'EPOCH Sentinel',
    category: 'DRIFT',
    message: 'Candidate causal chain identified: M-1042 -> M-1051 -> M-1077 -> INC-3312',
    relatedEntityId: 'INC-3312',
    severity: 'CRITICAL'
  },
  {
    id: 'EVT-108',
    timestamp: '2m ago',
    actor: 'WEAVE Test Oracle',
    category: 'SPECIALIST',
    message: 'Completed verification regression matrix: 42/42 tests pass locally',
    relatedEntityId: 'WF-9041',
    severity: 'INFO'
  },
  {
    id: 'EVT-107',
    timestamp: '6m ago',
    actor: 'EPOCH Sentinel',
    category: 'INVARIANT',
    message: 'Invariant INV-BOUND-04 status downgraded from HOLDING to WEAKENED',
    relatedEntityId: 'INV-BOUND-04',
    severity: 'WARN'
  },
  {
    id: 'EVT-106',
    timestamp: '11m ago',
    actor: 'IBM Bob 2.0 (Synth-Core)',
    category: 'MUTATION',
    message: 'Generated pull request branch feat/extend-chargeback-window-30d',
    relatedEntityId: 'M-1042',
    severity: 'INFO'
  },
  {
    id: 'EVT-105',
    timestamp: '18m ago',
    actor: 'WEAVE Lifecycle Plane',
    category: 'DECISION',
    message: 'Approval Gate GATE-774 created; pending human architectural review',
    relatedEntityId: 'GATE-774',
    severity: 'WARN'
  }
];

export const mockStreamingEventsQueue: Omit<ActivityEvent, 'id' | 'timestamp'>[] = [
  {
    actor: 'EPOCH Trajectory Modeler',
    category: 'DRIFT',
    message: 'Simulated counterfactual Path B: boundary integrity projected at 94%',
    relatedEntityId: 'SCENARIO-B',
    severity: 'SUCCESS'
  },
  {
    actor: 'EPOCH Sentinel',
    category: 'INVARIANT',
    message: 'Archival partition check confirms 142 records flagged for premature purge',
    relatedEntityId: 'INV-TIME-02',
    severity: 'CRITICAL'
  },
  {
    actor: 'IBM Bob 2.0 (Synth-Core)',
    category: 'SPECIALIST',
    message: 'Remediation draft patch ready: Event-driven settlement projection adapter',
    relatedEntityId: 'M-1090',
    severity: 'INFO'
  },
  {
    actor: 'WEAVE Policy Guard',
    category: 'DECISION',
    message: 'Automated release halted: Invariant violation threshold exceeded (INV-BOUND-04)',
    relatedEntityId: 'GATE-774',
    severity: 'WARN'
  }
];
