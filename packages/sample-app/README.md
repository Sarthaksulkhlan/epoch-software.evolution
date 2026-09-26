# EPOCH sample payments service

The system EPOCH watches during the demo. It is small on purpose: seven modules, eleven tests and one runtime probe, so every number EPOCH shows can be traced to a line of code.

## Modules

| Component | File | Owns |
| --- | --- | --- |
| api | `src/api/disputes.ts` | Customer dispute endpoint and `CHARGEBACK_WINDOW_DAYS` |
| orders | `src/orders/order-service.ts`, `order-store.ts` | Checkout, receipts (`DISPUTE_WINDOW_NOTICE_DAYS`), the order table |
| ledger | `src/ledger/ledger-service.ts`, `db.ts` | Settlements, archive-aware lookups, trial balance |
| disputes | `src/disputes/reconciler.ts` | Holding funds for a disputed settlement |
| archival | `src/archival/archival-job.ts` | Nightly archival after `LEDGER_RETENTION_DAYS` |
| notifications | `src/notifications/webhooks.ts` | Merchant webhooks (recorded, never sent) |
| vault | `src/vault/card-vault.ts`, `pan-store.ts` | Card tokenisation; the only holder of card numbers |

## Invariants

Declared in `invariants.json` as machine-checkable rules. EPOCH evaluates them against the code at every mutation.

| Id | Rule |
| --- | --- |
| INV-BOUND-04 | `src/orders/order-store.ts` and `src/ledger/db.ts` are imported only from inside their own module (1 violation = WEAKENED, 2 = VIOLATED) |
| INV-TIME-02 | `CHARGEBACK_WINDOW_DAYS` ≤ `LEDGER_RETENTION_DAYS`; VIOLATED when it fails and the ledger table is also read outside `src/ledger/` |
| INV-DATA-01 | `test/ledger.test.ts` passes (double-entry balance) |
| INV-SEC-09 | `src/vault/pan-store.ts` is imported only by `src/vault/card-vault.ts` |

The runtime probe `scenarios/late-dispute-after-archival.ts` settles an order on day 0, archives on day 16 and disputes on day 20. It fails when a dispute is accepted but the settlement can no longer be found; that failure becomes incident INC-3312.

## History

- `history/baseline.json`: the seeded epoch E-0 history (M-1020 to M-1041). These are demo fixtures describing how the baseline came to be.
- `history/scripted/M-1042.patch`: the 15 → 30 day chargeback change. In the live demo Bob makes this change; the patch is the fallback used by tests and `pnpm demo:replay --with-feature`.
- `history/patches/M-1051.patch`, `M-1077.patch`, `M-1084.patch`: safe-looking AI changes replayed by `pnpm demo:replay`. Each one passes all eleven tests.
- `history/futures/A-extend-retention.patch`, `B-restore-boundary.patch`: the two counterfactual futures, used by tests and as a fallback when Bob does not write them live.

| State | Tests | Probe | INV-BOUND-04 | INV-TIME-02 |
| --- | --- | --- | --- | --- |
| Baseline | 11/11 | pass (dispute rejected by the 15-day policy) | HOLDING | HOLDING |
| + M-1042 | 11/11 | pass | HOLDING | WEAKENED |
| + M-1051 | 11/11 | pass | WEAKENED | WEAKENED |
| + M-1077 | 11/11 | **fail** (settlement frozen) | VIOLATED | VIOLATED |
| + M-1084 | 11/11 | fail | VIOLATED | VIOLATED |
| Future A | 11/11 | pass | VIOLATED | HOLDING |
| Future B | 11/11 | pass | HOLDING | HOLDING |

## Commands

```bash
pnpm --filter @epoch/sample-app test      # node:test via tsx
pnpm --filter @epoch/sample-app probes    # runtime probe, prints JSON
pnpm --filter @epoch/sample-app typecheck
```

EPOCH never edits this folder at runtime. `pnpm demo-reset` copies it to `.epoch/sample-repo`, a separate git repository that Bob, the replay script and the futures work in.
