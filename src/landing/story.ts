// The demo story told on the landing page. Every figure comes from EPOCH's own
// measurements of the sample payments service (see the README's story table and
// docs/BOB_SESSIONS.md); nothing here is invented for the page.

export type LayerId = 'M-1041' | 'M-1042' | 'M-1051' | 'M-1077' | 'M-1084' | 'M-1085';

export interface StoryLayer {
  id: LayerId;
  /** Short plain-language name shown inside the layer. */
  title: string;
  /** Who made the change. */
  by: string;
  /** Boundary score after the change, 0 to 1. */
  boundary: number;
  /** A few words for the layer's right edge in EPOCH's view. */
  flag: string;
  /** What EPOCH recorded, in plain words. */
  epochSaw: string;
  /** Incident opened at this change, if any. */
  incident?: string;
}

/** Oldest first. The strata draw them bottom to top. */
export const LAYERS: StoryLayer[] = [
  {
    id: 'M-1041',
    title: 'Starting point',
    by: 'Seeded history',
    boundary: 1,
    flag: '4 rules holding',
    epochSaw: 'All four rules hold and every service stays inside its own boundary.'
  },
  {
    id: 'M-1042',
    title: 'Chargeback window 15 to 30 days',
    by: 'IBM Bob',
    boundary: 0.875,
    flag: 'Rule weakened',
    epochSaw:
      'Warned at review: customers can now dispute for 30 days, but the ledger still archives records after 15. The business approved it anyway.'
  },
  {
    id: 'M-1051',
    title: 'Latency hotfix',
    by: 'AI agent',
    boundary: 0.75,
    flag: 'Boundary weakened',
    epochSaw: 'Disputes now read order status straight from the order store, reaching into another service’s data.'
  },
  {
    id: 'M-1077',
    title: 'Speed-up in the reconciler',
    by: 'AI agent',
    boundary: 0.5,
    flag: '2 rules broken',
    incident: 'INC-3312',
    epochSaw:
      'Both rules broken. A dispute filed on day 20 can no longer find its settlement, so the customer’s money stays frozen. Incident INC-3312 opens.'
  },
  {
    id: 'M-1084',
    title: 'Merchant webhook added',
    by: 'AI agent',
    boundary: 0.5,
    flag: 'More coupling',
    epochSaw: 'Services now depend on each other more. The incident is still open.'
  },
  {
    id: 'M-1085',
    title: 'Fix B, approved by a person',
    by: 'IBM Bob, then a person',
    boundary: 1,
    flag: 'Fixed',
    epochSaw:
      'The reconciler goes back through the order and ledger services, and records are kept for 35 days. INC-3312 is resolved and the score is back to 1.00.'
  }
];

export const TESTS_PER_CHANGE = 11;

export interface Future {
  key: 'A' | 'B';
  name: string;
  plan: string;
  boundary: number;
  buildSeconds: number;
  recommended: boolean;
}

export const FUTURES: Future[] = [
  {
    key: 'A',
    name: 'Keep the current design',
    plan: 'Raise ledger retention from 15 to 30 days and leave the shortcuts in place.',
    boundary: 0.75,
    buildSeconds: 46,
    recommended: false
  },
  {
    key: 'B',
    name: 'Restore the boundary',
    plan: 'Route the reconciler back through the order and ledger services and keep records for 35 days.',
    boundary: 1,
    buildSeconds: 60,
    recommended: true
  }
];

/** Wall time for both futures, built at once by two Bob subagents. */
export const FUTURES_WALL_SECONDS = 72;
