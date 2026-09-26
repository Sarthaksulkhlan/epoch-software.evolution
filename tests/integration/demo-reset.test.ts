import { afterAll, describe, expect, it } from 'vitest';
import { isolate } from '../helpers/isolated.js';
import { resetDemo } from '../../src/demo/seed.js';
import { epochs, invariants, mutations, trajectory } from '../../src/store/index.js';

const env = isolate('reset');
afterAll(() => env.cleanup());

function fingerprint() {
  return {
    mutations: mutations.listMutations({ order: 'asc' }).map(m => [m.mutation_id, m.created_at, m.epoch_id, m.affected_components.join(',')]),
    points: trajectory.listTrajectoryPoints().map(p => [p.mutation_id, p.state_hash, p.coupling_score, p.boundary_integrity_score]),
    invariants: invariants.listInvariants().map(i => [i.invariant_id, i.status])
  };
}

describe('pnpm demo-reset', () => {
  it('seeds epoch E-0 with 22 mutations and every invariant holding', async () => {
    const summary = await resetDemo();
    expect(summary.mutations).toBe(22);
    expect(summary.testsFailed).toBe(0);
    expect(mutations.countMutations()).toBe(22);
    expect(epochs.listEpochs().map(e => [e.epoch_id, e.status])).toEqual([['E-0', 'current']]);
    expect(invariants.listInvariants().every(i => i.status === 'HOLDING')).toBe(true);
    expect(trajectory.getLatestTrajectoryPoint()).toMatchObject({ mutation_id: 'M-1041', boundary_integrity_score: 1 });
  });

  it('produces an identical history on every run (clean rerun from a fixed seed)', async () => {
    await resetDemo();
    const first = fingerprint();
    await resetDemo();
    expect(fingerprint()).toEqual(first);
  });
});
