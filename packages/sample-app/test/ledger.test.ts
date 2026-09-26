import { test } from 'node:test';
import assert from 'node:assert/strict';
import { archiveSettledBefore, getSettlement, recordSettlement, trialBalance } from '../src/ledger/ledger-service.js';

test('every settlement posts equal debits and credits', () => {
  recordSettlement('ord-a', 1000, 0);
  recordSettlement('ord-b', 2550, 3);
  const { debitCents, creditCents } = trialBalance();
  assert.equal(debitCents, creditCents);
  assert.equal(debitCents, 3550);
});

test('archived settlements stay reachable through the ledger service', () => {
  recordSettlement('ord-c', 700, 1);
  assert.equal(archiveSettledBefore(5) >= 1, true);
  assert.equal(getSettlement('ord-c')?.amountCents, 700);
});

test('rejects non-positive settlement amounts', () => {
  assert.throws(() => recordSettlement('ord-d', 0, 1));
});
