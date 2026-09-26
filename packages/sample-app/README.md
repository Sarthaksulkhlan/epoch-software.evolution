# EPOCH Sample Payment Application

This is the demo substrate for EPOCH — a realistic payment/e-commerce application
with a pre-seeded history of 25 mutations.

## Purpose

The sample app exists to make the "locally correct, globally worse" thesis tangible.
It is not a production application. It is a carefully constructed demo vehicle.

## Application Structure

```
src/
├── OrderService.ts          # Order lifecycle management
├── AuthService.ts           # Authentication and authorization
├── PaymentService.ts        # Payment processing + chargeback logic
├── NotificationService.ts   # Customer notifications
└── ArchivalJob.ts           # Data archival + retention policies
```

## Declared Invariants (active in the demo)

1. **I-001:** All customer payment data access must route through `PaymentService`
2. **I-002:** Chargeback eligibility window must be consistent across API, PaymentService, and ArchivalJob
3. **I-003:** Customer notification must be sent for every status transition
4. **I-004:** All auth decisions must be logged with actor, action, and timestamp

## Mutation History

| Range | Description | Trajectory effect |
|---|---|---|
| M-1001–M-1010 | Baseline establishment: core payment flow | Epoch 1: healthy monolith |
| M-1011–M-1015 | Event-driven refactor | Epoch 1→2 transition |
| M-1016–M-1022 | Feature additions: international payments, retry logic | Epoch 2: stable |
| M-1023–M-1025 | Three changes introducing boundary erosion | Drift begins |

## Seeded Drift

Mutations M-1023, M-1024, and M-1025 each introduced a direct DataLayer access
bypassing the PaymentService boundary. Each change:
- Passed all its own tests ✓
- Looked locally correct ✓
- But collectively eroded Invariant I-001 ✗

This is the "locally correct, globally worse" thesis made concrete.

## Resetting

```bash
# From repo root:
pnpm demo-reset
```

This wipes `epoch.db` and re-seeds it with the 25 mutation history from `history/`.
The sample app source code in `src/` is not modified by the reset — only the database.
