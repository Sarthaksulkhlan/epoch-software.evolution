import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastFour, tokenize } from '../src/vault/card-vault.js';

test('tokens expose only the last four digits', () => {
  const token = tokenize('4242 4242 4242 4242');
  assert.equal(lastFour(token), '4242');
  assert.doesNotMatch(token, /424242424242/);
});

test('rejects card numbers that are too short', () => {
  assert.throws(() => tokenize('1234'));
});
