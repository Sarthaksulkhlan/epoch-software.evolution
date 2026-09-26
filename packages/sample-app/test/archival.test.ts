import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEDGER_RETENTION_DAYS, runArchival } from '../src/archival/archival-job.js';
import { getSettlement, recordSettlement } from '../src/ledger/ledger-service.js';

test('archives only settlements older than the retention period', () => {
  recordSettlement('ord-old', 900, 0);
  recordSettlement('ord-new', 900, LEDGER_RETENTION_DAYS);
  const moved = runArchival(LEDGER_RETENTION_DAYS + 1);
  assert.equal(moved, 1);
  assert.equal(getSettlement('ord-old')?.amountCents, 900);
  assert.equal(getSettlement('ord-new')?.amountCents, 900);
});
