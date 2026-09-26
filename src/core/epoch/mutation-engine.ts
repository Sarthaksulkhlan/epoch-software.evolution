import { eventBus } from '../events/bus.js';
import { events, graphEdges, mutations, transaction, workflows } from '../../store/index.js';
import type { Mutation, TrajectoryDelta } from '../../shared/schema/mutation.schema.js';
import type { TrajectoryPoint } from '../../shared/schema/trajectory-point.schema.js';
import type { Epoch } from '../../shared/schema/epoch.schema.js';
import type { GraphEdge } from '../../shared/schema/graph-edge.schema.js';
import { generateEdgeId, generateEventId, generateWorkflowId } from '../../shared/utils/id.js';
import { diffScans, type InvariantTransition, type ScanDiff } from '../../graph/scanner/diff.js';
import { componentOf, scanRepository, type ScanResult } from '../../graph/scanner/scanner.js';
import { driftDetector, type DriftRun } from '../../graph/drift/detector.js';
import { git, type GitIdentity } from '../../sandbox/git.js';
import { commitAll, diffStat, commitDiff, hasUncommittedChanges, headSha, revertCommit, sampleRepoPath } from '../../sandbox/sample-repo.js';
import { runProbes, runTests } from '../../sandbox/runner.js';
import { EvidenceWriter } from './evidence-writer.js';
import { epochDetector, type EpochEvaluation } from './epoch-detector.js';
import { loadHistory } from './history.js';
import { incidentMonitor, type IncidentChanges } from './incidents.js';
import { invariantManager, isDegradation } from './invariant-store.js';
import { getRepoSpec } from './spec-registry.js';
import { trajectoryEngine } from './trajectory.js';

export interface MutationInput {
  workflowId: string;
  intent: string;
  author: string;
  createdAt: number;
  /** Explicit id for seeded and replayed history; otherwise the next sequence number. */
  mutationId?: string | undefined;
  commitSha?: string | undefined;
  /** Files changed by the commit, repo-relative. */
  changedFiles: string[];
  /** Components to record when no files changed (seeded history). */
  declaredComponents?: string[] | undefined;
  /** Scan of the watched repository after the change. */
  scan: ScanResult;
  deltaSummary?: string | undefined;
  compensates?: string | undefined;
  /** False while seeding the baseline history. */
  allowEpochProposal?: boolean | undefined;
}

export interface MutationOutcome {
  mutation: Mutation;
  point: TrajectoryPoint;
  diff: ScanDiff;
  transitions: InvariantTransition[];
  drift: DriftRun;
  epochEvaluation: EpochEvaluation;
  proposedEpoch: Epoch | undefined;
  previousEpochId: string | undefined;
  incidents: IncidentChanges;
}

const SEQUENCE_FLOOR = 1000;

export function nextMutationId(): string {
  return `M-${Math.max(SEQUENCE_FLOOR, mutations.getLatestMutationSequence()) + 1}`;
}

/**
 * Converts a finished change into a Mutation (ADR-013) and runs the macro loop
 * on it: edges, invariants, trajectory point, drift patterns, epoch detection
 * and incident reconciliation. Every measurement comes from the scan.
 */
export class MutationEngine {
  private queue: Promise<unknown> = Promise.resolve();

  recordMutation(input: MutationInput): MutationOutcome {
    const outcome = transaction(() => this.record(input));
    this.announce(outcome);
    return outcome;
  }

  private record(input: MutationInput): MutationOutcome {
    const spec = getRepoSpec();
    const history = loadHistory();
    const previous = history.at(-1);
    const diff = diffScans(previous?.scan ?? input.scan, input.scan);

    const mutationId = input.mutationId ?? nextMutationId();
    if (!/^M-\d+$/.test(mutationId)) throw new Error(`Invalid mutation id ${mutationId}`);
    if (mutations.getMutation(mutationId)) throw new Error(`Mutation ${mutationId} already exists`);

    const components = affectedComponents(input, diff);
    const writer = new EvidenceWriter(input.workflowId, 'scanner', input.createdAt);
    const scanRef = `scan:${input.scan.stateHash.slice(0, 16)}`;

    writer.record(
      `Structural scan after ${mutationId}${input.commitSha ? ` (commit ${input.commitSha.slice(0, 7)})` : ''}: ` +
        `${input.scan.components.length} components, ${input.scan.componentEdges.length} cross-component dependencies ` +
        `(coupling ${input.scan.couplingScore.toFixed(3)}), boundary integrity ${input.scan.boundaryIntegrityScore.toFixed(3)}.`,
      'observed',
      scanRef
    );
    for (const v of diff.addedViolations) {
      writer.record(`${v.importer} now imports ${v.module}, bypassing the boundary guarded by ${v.invariantId}.`, 'observed', scanRef, 'high');
    }
    for (const v of diff.removedViolations) {
      writer.record(`${v.importer} no longer imports ${v.module}; ${v.invariantId} boundary restored for that path.`, 'observed', scanRef);
    }
    for (const t of diff.invariantTransitions) {
      const detail = input.scan.invariants.find(r => r.invariantId === t.invariantId)?.detail ?? '';
      writer.record(`${t.invariantId} ${t.from} → ${t.to}: ${detail}`, 'observed', scanRef, t.to === 'VIOLATED' ? 'critical' : isDegradation(t.from, t.to) ? 'medium' : 'info');
    }
    for (const edge of diff.addedComponentEdges) {
      writer.record(`New dependency ${edge.from} → ${edge.to} (${edge.via} import${edge.via === 1 ? '' : 's'}).`, 'observed', scanRef, 'low');
    }
    // Checks carried forward from an earlier scan (seeded history) are not re-reported.
    const checksRan = input.scan.tests !== undefined && input.scan.tests.startedAt !== previous?.scan.tests?.startedAt;
    if (checksRan && input.scan.tests) {
      const t = input.scan.tests;
      writer.record(`Sample-app tests: ${t.passed} passed, ${t.failed} failed across ${t.files.length} files.`, 'observed', `tests:${mutationId}`, t.failed > 0 ? 'high' : undefined);
    }
    for (const probe of checksRan ? input.scan.probes ?? [] : []) {
      writer.record(`Runtime probe ${probe.id} ${probe.ok ? 'passed' : 'failed'}: ${probe.detail}`, 'observed', `probe:${probe.id}@${mutationId}`, probe.ok ? undefined : 'critical');
    }
    for (const check of input.scan.consistency.filter(c => !c.ok)) {
      writer.record(`Consistency check ${check.id} failed: ${check.detail}`, 'observed', scanRef, 'medium');
    }

    const epochEvaluation = input.allowEpochProposal === false || !previous
      ? { propose: false, conditions: [], window: [] }
      : epochDetector.evaluate(mutationId, input.scan, history);
    const previousEpoch = epochDetector.current();
    const proposedEpoch = epochEvaluation.propose
      ? epochDetector.propose(epochEvaluation, mutationId, previous?.mutation.mutation_id, input.createdAt)
      : undefined;
    const epochId = proposedEpoch?.epoch_id ?? previousEpoch?.epoch_id;
    if (!epochId) throw new Error('No epoch registered; seed the baseline epoch first');

    const trajectoryDelta: TrajectoryDelta = {
      couplingDelta: diff.couplingDelta,
      boundaryIntegrityDelta: diff.boundaryIntegrityDelta,
      behaviorDelta: diff.behaviorDelta,
      invariantChanges: diff.invariantTransitions.map(t => ({ invariant_id: t.invariantId, previousStatus: t.from, newStatus: t.to }))
    };

    const mutation: Mutation = {
      mutation_id: mutationId,
      workflow_id: input.workflowId,
      intent: input.intent,
      affected_components: components,
      evidence_refs: writer.ids,
      trajectory_delta: trajectoryDelta,
      epoch_id: epochId,
      created_at: input.createdAt,
      author: input.author
    };
    if (input.deltaSummary) mutation.delta_summary = input.deltaSummary;
    if (input.commitSha) mutation.commit_sha = input.commitSha;
    if (input.compensates) mutation.compensates_mutation_id = input.compensates;
    mutations.insertMutation(mutation);
    workflows.setWorkflowRefs(input.workflowId, { mutation_id: mutationId });

    const edges: GraphEdge[] = [
      edge(input.workflowId, 'workflow', mutationId, 'mutation', 'PRODUCES', input.createdAt),
      ...components.map(c => edge(mutationId, 'mutation', c, 'component', 'TOUCHES', input.createdAt))
    ];
    if (previous) edges.push(edge(previous.mutation.mutation_id, 'mutation', mutationId, 'mutation', 'FOLLOWS', input.createdAt));
    if (proposedEpoch && previousEpoch) edges.push(edge(previousEpoch.epoch_id, 'epoch', proposedEpoch.epoch_id, 'epoch', 'BOUNDARY', input.createdAt, 0.9));

    const transitions = invariantManager.applyScan(input.scan, mutationId);
    for (const t of transitions.filter(t => isDegradation(t.from, t.to))) {
      edges.push(edge(mutationId, 'mutation', t.invariantId, 'invariant', 'WEAKENS', input.createdAt, 1, scanRef));
    }
    for (const e of edges) graphEdges.insertEdge(e);

    const point = trajectoryEngine.recordPoint(mutationId, input.scan, epochId, input.createdAt);

    const patternHistory = loadHistory().map(h => ({ mutationId: h.mutation.mutation_id, scan: h.scan, diff: h.diff }));
    const drift = driftDetector.run(patternHistory, spec, mutationId, input.createdAt,
      (claim, severity) => writer.record(claim, 'observed', `drift:${mutationId}`, severity));

    const incidentChanges = incidentMonitor.reconcile(input.scan, spec, mutationId, input.createdAt, writer);
    writer.finish(input.createdAt, scanRef);

    return {
      mutation: { ...mutation, evidence_refs: writer.ids },
      point,
      diff,
      transitions,
      drift,
      epochEvaluation,
      proposedEpoch,
      previousEpochId: previousEpoch?.epoch_id,
      incidents: incidentChanges
    };
  }

  private announce(outcome: MutationOutcome): void {
    const m = outcome.mutation;
    eventBus.emit('mutation.committed', {
      mutationId: m.mutation_id,
      workflowId: m.workflow_id,
      intent: m.intent,
      author: m.author ?? null,
      components: m.affected_components,
      epochId: m.epoch_id,
      commitSha: m.commit_sha ?? null
    });
    invariantManager.announce(outcome.transitions, m.mutation_id);
    eventBus.emit('trajectory.updated', {
      mutationId: m.mutation_id,
      couplingScore: outcome.point.coupling_score,
      boundaryIntegrityScore: outcome.point.boundary_integrity_score,
      driftDelta: outcome.point.drift_delta,
      withinEnvelope: trajectoryEngine.isWithinEnvelope(outcome.point.coupling_score, outcome.point.boundary_integrity_score)
    });
    for (const f of [...outcome.drift.detected, ...outcome.drift.escalated]) {
      eventBus.emit('drift.detected', { findingId: f.finding_id, pattern: f.pattern, severity: f.severity, title: f.title, mutationId: m.mutation_id, invariantId: f.invariant_id ?? null });
    }
    for (const f of outcome.drift.resolved) {
      eventBus.emit('drift.resolved', { findingId: f.finding_id, mutationId: m.mutation_id });
    }
    if (outcome.proposedEpoch) epochDetector.announce(outcome.proposedEpoch, outcome.previousEpochId);
    incidentMonitor.announce(outcome.incidents, m.mutation_id);
  }

  /**
   * Called when a workflow is approved: commit the sample repo's working tree,
   * run tests, probes and the scanner, and record the mutation. Returns
   * undefined when the workflow changed no code. Calls are serialised.
   */
  processWorkflowCompletion(workflowId: string): Promise<MutationOutcome | undefined> {
    const run = this.queue.then(() => this.completeWorkflow(workflowId));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async completeWorkflow(workflowId: string): Promise<MutationOutcome | undefined> {
    const workflow = workflows.getWorkflow(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    if (workflow.mutation_id || workflow.kind === 'seed') return undefined;

    const repo = sampleRepoPath();
    if (!hasUncommittedChanges(repo)) return undefined;

    const event = events.getEvent(workflow.trigger_event_id);
    const payload = event?.payload ?? {};
    const requested = typeof payload.mutation_id === 'string' && /^M-\d+$/.test(payload.mutation_id) && !mutations.getMutation(payload.mutation_id)
      ? payload.mutation_id
      : undefined;
    const mutationId = requested ?? nextMutationId();
    const author = typeof payload.author === 'string' && payload.author.length > 0 ? payload.author : 'EPOCH operator';
    const title = workflow.title ?? (typeof payload.requirement === 'string' ? firstLine(payload.requirement) : `Workflow ${workflowId}`);
    const intent = typeof payload.requirement === 'string' ? payload.requirement : title;

    const before = headSha(repo);
    const commitSha = commitAll(`${mutationId}: ${title}`, identityFor(author), `Workflow ${workflowId}`, repo);
    const stat = diffStat(commitDiff(before, commitSha, repo));

    return this.recordFromRepo({
      workflowId,
      mutationId,
      intent,
      author,
      commitSha,
      changedFiles: stat.files,
      deltaSummary: `${stat.files.length} file(s) changed (+${stat.additions} −${stat.deletions}): ${stat.files.join(', ')}`
    });
  }

  /** Run tests, probes and the scanner on the sample repo and record the mutation. */
  async recordFromRepo(input: Omit<MutationInput, 'scan' | 'createdAt'> & { createdAt?: number }): Promise<MutationOutcome> {
    const repo = sampleRepoPath();
    const [tests, probes] = await Promise.all([runTests(repo), runProbes(repo)]);
    const previous = loadHistory().at(-1)?.scan;
    const scan = scanRepository(repo, getRepoSpec(), { tests, probes, previous });
    return this.recordMutation({ ...input, createdAt: input.createdAt ?? Date.now(), scan });
  }

  /**
   * Mutations are immutable (ADR-013). Undoing one reverts its commit in the
   * sample repo and records a compensating mutation.
   */
  compensate(mutationId: string, actor: string): Promise<MutationOutcome> {
    const run = this.queue.then(async () => {
      const target = mutations.getMutation(mutationId);
      if (!target) throw new Error(`Mutation ${mutationId} not found`);
      if (!target.commit_sha) throw new Error(`Mutation ${mutationId} has no commit to revert (seeded history)`);
      const repo = sampleRepoPath();
      if (hasUncommittedChanges(repo)) throw new Error('The sample repository has uncommitted changes; finish or discard them first');

      const at = Date.now();
      const eventId = generateEventId();
      events.insertEvent({ event_id: eventId, type: 'workflow.manual', source: 'epoch-api', timestamp: at, payload: { action: 'compensate', target: mutationId, author: actor } });
      const workflowId = generateWorkflowId();
      workflows.insertWorkflow({ workflow_id: workflowId, trigger_event_id: eventId, kind: 'remediation', title: `Revert ${mutationId}`, status: 'COMPLETED', created_at: at, completed_at: at });

      const newId = nextMutationId();
      const before = headSha(repo);
      const commitSha = revertCommit(target.commit_sha, `${newId}: Revert ${mutationId}`, identityFor(actor), repo);
      const stat = diffStat(commitDiff(before, commitSha, repo));
      return this.recordFromRepo({
        workflowId,
        mutationId: newId,
        intent: `Compensate ${mutationId}: ${target.intent}`,
        author: actor,
        commitSha,
        changedFiles: stat.files,
        deltaSummary: `Reverts ${mutationId} (${stat.files.join(', ')})`,
        compensates: mutationId
      });
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Files changed by a mutation's commit, for the console's diff preview. */
  mutationDiff(mutationId: string): string | undefined {
    const mutation = mutations.getMutation(mutationId);
    if (!mutation?.commit_sha) return undefined;
    try {
      return git(sampleRepoPath(), ['show', '--no-color', '--format=', mutation.commit_sha]);
    } catch {
      return undefined;
    }
  }
}

function affectedComponents(input: MutationInput, diff: ScanDiff): string[] {
  const set = new Set<string>();
  for (const file of input.changedFiles) {
    if (file.startsWith('src/')) set.add(componentOf(file));
  }
  for (const e of [...diff.addedComponentEdges, ...diff.removedComponentEdges]) {
    set.add(e.from);
    set.add(e.to);
  }
  for (const c of input.declaredComponents ?? []) set.add(c);
  if (set.size === 0) set.add('root');
  return [...set].sort();
}

function edge(
  fromId: string,
  fromType: GraphEdge['from_type'],
  toId: string,
  toType: GraphEdge['to_type'],
  relationship: GraphEdge['relationship'],
  at: number,
  confidence = 1,
  evidenceRef?: string
): GraphEdge {
  const e: GraphEdge = { edge_id: generateEdgeId(), from_id: fromId, from_type: fromType, to_id: toId, to_type: toType, relationship, confidence, created_at: at };
  if (evidenceRef) e.evidence_ref = evidenceRef;
  return e;
}

export function identityFor(author: string): GitIdentity {
  const name = author.replace(/[<>\n\r]/g, '').slice(0, 80) || 'EPOCH';
  return { name, email: 'epoch@localhost' };
}

function firstLine(text: string): string {
  const line = text.split(/\r?\n/)[0] ?? text;
  const sentence = line.split(/(?<=\.)\s/)[0] ?? line;
  return sentence.length > 90 ? `${sentence.slice(0, 87)}…` : sentence;
}

export const mutationEngine = new MutationEngine();
