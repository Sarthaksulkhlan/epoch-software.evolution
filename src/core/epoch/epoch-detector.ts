import { eventBus } from '../events/bus.js';
import { epochs } from '../../store/index.js';
import type { Epoch } from '../../shared/schema/epoch.schema.js';
import { diffScans } from '../../graph/scanner/diff.js';
import type { ScanResult } from '../../graph/scanner/scanner.js';
import { sequenceOf, type HistoryEntry } from './history.js';

export interface EpochCondition {
  name: string;
  met: boolean;
  evidence: string;
}

export interface EpochEvaluation {
  propose: boolean;
  conditions: EpochCondition[];
  window: string[];
  name?: string;
}

/**
 * ADR-023: propose a new epoch when two of four conditions hold across the
 * last five mutations of the current epoch. Conditions are symmetric, so a
 * repair that restores the architecture is also a regime change.
 */
export class EpochDetector {
  readonly WINDOW = 5;
  readonly BOUNDARY_SHIFT = 0.3;
  readonly EDGE_CHANGES = 2;
  readonly CONDITIONS_REQUIRED = 2;

  /** Create the baseline epoch if the registry is empty. */
  ensureBaseline(id: string, name: string, properties: string[], startMutationId: string, at: number): Epoch {
    const existing = epochs.getEpoch(id);
    if (existing) return existing;
    const epoch: Epoch = {
      epoch_id: id,
      name,
      start_mutation_id: startMutationId,
      defining_properties: properties.length > 0 ? properties : ['baseline'],
      boundary_evidence: [],
      status: 'current',
      created_at: at
    };
    epochs.insertEpoch(epoch);
    return epoch;
  }

  current(): Epoch | undefined {
    return epochs.getLatestEpoch();
  }

  /** Evaluate the conditions for a candidate mutation before it is recorded. */
  evaluate(candidateId: string, candidateScan: ScanResult, history: HistoryEntry[]): EpochEvaluation {
    const epoch = this.current();
    if (!epoch || history.length === 0) return { propose: false, conditions: [], window: [] };

    const startSeq = sequenceOf(epoch.start_mutation_id);
    const inEpoch = history.filter(h => sequenceOf(h.mutation.mutation_id) >= startSeq);
    const tail = inEpoch.slice(-(this.WINDOW - 1));
    if (tail.length === 0) return { propose: false, conditions: [], window: [] };

    const first = tail[0]!;
    const scans = [...tail.map(t => t.scan), candidateScan];
    const window = [...tail.map(t => t.mutation.mutation_id), candidateId];

    const boundaryShift = candidateScan.boundaryIntegrityScore - first.scan.boundaryIntegrityScore;
    let edgeChanges = 0;
    let behaviorChanges = 0;
    const violatedTransitions: string[] = [];
    for (let i = 1; i < scans.length; i++) {
      const d = diffScans(scans[i - 1], scans[i]!);
      edgeChanges += d.addedComponentEdges.length + d.removedComponentEdges.length;
      behaviorChanges += d.probeChanges.filter(p => p.from !== undefined).length;
      const beforeFailed = scans[i - 1]?.tests?.failed ?? 0;
      const afterFailed = scans[i]?.tests?.failed ?? 0;
      if (beforeFailed !== afterFailed) behaviorChanges += 1;
      for (const t of d.invariantTransitions) {
        if (t.from === 'VIOLATED' || t.to === 'VIOLATED') violatedTransitions.push(`${t.invariantId} ${t.from}→${t.to} at ${window[i]}`);
      }
    }

    const conditions: EpochCondition[] = [
      {
        name: 'Boundary integrity shift',
        met: Math.abs(boundaryShift) > this.BOUNDARY_SHIFT,
        evidence: `Boundary integrity moved ${signed(boundaryShift)} since ${window[0]} (threshold ±${this.BOUNDARY_SHIFT})`
      },
      {
        name: 'Dependency structure change',
        met: edgeChanges >= this.EDGE_CHANGES,
        evidence: `${edgeChanges} cross-component dependency edge(s) added or removed in the window (threshold ${this.EDGE_CHANGES})`
      },
      {
        name: 'Behavioural change',
        met: behaviorChanges > 0,
        evidence: behaviorChanges > 0
          ? `${behaviorChanges} probe or test outcome change(s) in the window`
          : 'Probe and test outcomes unchanged'
      },
      {
        name: 'Invariant crossed VIOLATED',
        met: violatedTransitions.length > 0,
        evidence: violatedTransitions.length > 0 ? violatedTransitions.join('; ') : 'No invariant entered or left VIOLATED'
      }
    ];

    const metCount = conditions.filter(c => c.met).length;
    const propose = metCount >= this.CONDITIONS_REQUIRED;
    const evaluation: EpochEvaluation = { propose, conditions, window };
    if (propose) {
      evaluation.name = boundaryShift < 0
        ? `Boundary erosion from ${candidateId}`
        : `Recovery from ${candidateId}`;
    }
    return evaluation;
  }

  /** Record a proposed epoch starting at the candidate mutation. */
  propose(evaluation: EpochEvaluation, startMutationId: string, previousMutationId: string | undefined, at: number): Epoch {
    const previous = this.current();
    if (previous && previousMutationId) epochs.closeEpoch(previous.epoch_id, previousMutationId);
    const epoch: Epoch = {
      epoch_id: `E-${epochs.nextEpochSequence()}`,
      name: evaluation.name ?? `Epoch from ${startMutationId}`,
      start_mutation_id: startMutationId,
      defining_properties: evaluation.conditions.filter(c => c.met).map(c => `${c.name}: ${c.evidence}`),
      boundary_evidence: evaluation.window,
      status: 'proposed',
      created_at: at
    };
    epochs.insertEpoch(epoch);
    return epoch;
  }

  announce(epoch: Epoch, previousEpochId: string | undefined): void {
    eventBus.emit('epoch.proposed', { epochId: epoch.epoch_id, name: epoch.name, startMutationId: epoch.start_mutation_id, previousEpochId });
  }

  /** A person confirms a proposed boundary; it becomes the current epoch. */
  confirm(epochId: string): Epoch {
    const epoch = epochs.getEpoch(epochId);
    if (!epoch) throw new Error(`Epoch ${epochId} not found`);
    if (epoch.status !== 'proposed') throw new Error(`Epoch ${epochId} is ${epoch.status}, not proposed`);
    for (const other of epochs.listEpochs()) {
      if (other.status === 'current') epochs.updateEpochStatus(other.epoch_id, 'confirmed');
    }
    epochs.updateEpochStatus(epochId, 'current');
    eventBus.emit('epoch.confirmed', { epochId });
    const confirmed = epochs.getEpoch(epochId);
    if (!confirmed) throw new Error(`Epoch ${epochId} disappeared`);
    return confirmed;
  }
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(3)}`;
}

export const epochDetector = new EpochDetector();
