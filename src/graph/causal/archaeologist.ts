import { driftFindings, graphEdges, incidents, invariants, mutations } from '../../store/index.js';
import type { Mutation } from '../../shared/schema/mutation.schema.js';
import type { InvariantStatus } from '../../shared/schema/invariant.schema.js';
import { loadHistory, sequenceOf, type HistoryEntry } from '../../core/epoch/history.js';
import { componentOf } from '../scanner/scanner.js';

export type CausalSubjectType = 'drift_finding' | 'incident' | 'invariant' | 'mutation' | 'symptom';

export interface CausalFactors {
  temporal: number;
  structural: number;
  intentMismatch: number;
  incidentCorrelation: number;
}

export interface CausalCandidate {
  mutationId: string;
  intent: string;
  author?: string;
  createdAt: number;
  score: number;
  factors: CausalFactors;
  reasons: string[];
  role: 'earliest-plausible' | 'proximate' | 'contributing';
  evidenceStatus: 'inferred' | 'hypothesised';
}

export interface CausalChain {
  subject: { type: CausalSubjectType; id: string; description: string };
  components: string[];
  invariantIds: string[];
  /** Candidate mutations in chronological order. */
  chain: string[];
  /** Candidates ranked by score, highest first. */
  candidates: CausalCandidate[];
  earliestPlausible: CausalCandidate | null;
  mostProximate: CausalCandidate | null;
  traversal: { examined: number; maxDepth: number };
  language: string;
}

interface Subject {
  type: CausalSubjectType;
  id: string;
  description: string;
  components: string[];
  invariantIds: string[];
  anchorMutationId: string | undefined;
  probeId?: string | undefined;
}

const WEIGHTS: CausalFactors = { temporal: 0.3, structural: 0.3, intentMismatch: 0.2, incidentCorrelation: 0.2 };
const MAX_DEPTH = 10;
const LANGUAGE = 'Candidate causal chain ranked by evidence. Temporal order and structural overlap support the hypothesis; they do not prove causality.';

/**
 * Causal archaeology (ADR-018): walk backwards from a symptom through the
 * mutation graph and rank the mutations that plausibly led to it.
 */
export class CausalArchaeologist {
  traceFinding(findingId: string): CausalChain {
    const finding = driftFindings.getDriftFinding(findingId);
    if (!finding) throw new Error(`Drift finding ${findingId} not found`);
    return this.trace({
      type: 'drift_finding',
      id: finding.finding_id,
      description: finding.title,
      components: finding.components,
      invariantIds: finding.invariant_id ? [finding.invariant_id] : [],
      anchorMutationId: latestOf([finding.detected_by_mutation_id, ...finding.mutation_ids])
    });
  }

  traceIncident(incidentId: string): CausalChain {
    const incident = incidents.getIncident(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);
    const related = invariants.listInvariants().filter(i => i.scope_components.includes(incident.affected_component));
    const probe = /^probe:([^@]+)@(M-\d+)$/.exec(incident.reproduction_ref ?? '');
    return this.trace({
      type: 'incident',
      id: incident.incident_id,
      description: incident.signal,
      components: [...new Set([incident.affected_component, ...related.flatMap(i => i.scope_components)])],
      invariantIds: related.map(i => i.invariant_id),
      anchorMutationId: probe?.[2] ?? mutations.getLatestMutation()?.mutation_id,
      probeId: probe?.[1]
    });
  }

  traceInvariant(invariantId: string): CausalChain {
    const invariant = invariants.getInvariant(invariantId);
    if (!invariant) throw new Error(`Invariant ${invariantId} not found`);
    return this.trace({
      type: 'invariant',
      id: invariant.invariant_id,
      description: `${invariant.invariant_id} is ${invariant.status}`,
      components: invariant.scope_components,
      invariantIds: [invariant.invariant_id],
      anchorMutationId: invariant.last_checked_mutation_id ?? mutations.getLatestMutation()?.mutation_id
    });
  }

  traceMutation(mutationId: string): CausalChain {
    const mutation = mutations.getMutation(mutationId);
    if (!mutation) throw new Error(`Mutation ${mutationId} not found`);
    const weakened = graphEdges.getEdgesFrom(mutationId, 'WEAKENS').map(e => e.to_id);
    return this.trace({
      type: 'mutation',
      id: mutationId,
      description: mutation.intent,
      components: mutation.affected_components,
      invariantIds: weakened,
      anchorMutationId: mutationId
    });
  }

  /** Free-text entry point used by Bob: resolves ids in the text, then component names, then the newest open finding. */
  traceSymptom(symptom: string): CausalChain {
    const id = /\b(DRIFT-\d+|INC-\d+|INV-[A-Z]+-\d+|M-\d+)\b/.exec(symptom)?.[1];
    if (id?.startsWith('DRIFT-')) return this.traceFinding(id);
    if (id?.startsWith('INC-')) return this.traceIncident(id);
    if (id?.startsWith('INV-')) return this.traceInvariant(id);
    if (id?.startsWith('M-')) return this.traceMutation(id);

    const text = symptom.toLowerCase();
    const openIncident = incidents.listIncidents().find(i => i.status !== 'resolved' && text.includes(i.affected_component));
    if (openIncident) return this.traceIncident(openIncident.incident_id);
    const openFinding = driftFindings.listDriftFindings({ status: 'open' })
      .find(f => f.components.some(c => text.includes(c))) ?? driftFindings.listDriftFindings({ status: 'open' })[0];
    if (openFinding) return this.traceFinding(openFinding.finding_id);
    throw new Error('No open incident or drift finding matches this symptom');
  }

  private trace(subject: Subject): CausalChain {
    const history = loadHistory();
    const byId = new Map(history.map(h => [h.mutation.mutation_id, h]));
    const anchor = subject.anchorMutationId;
    if (!anchor || !byId.has(anchor)) {
      return this.empty(subject);
    }

    const ancestors = graphEdges.ancestorMutations(anchor, MAX_DEPTH);
    const reachable = [{ mutation_id: anchor, depth: 0 }, ...ancestors];
    const probeFlip = subject.probeId ? findProbeFlip(history, subject.probeId) : undefined;

    const candidates: CausalCandidate[] = [];
    for (const { mutation_id: id, depth } of reachable) {
      const entry = byId.get(id);
      if (!entry) continue;
      const relevance = relevanceOf(entry, subject);
      if (!relevance.relevant) continue;
      const factors = scoreFactors(entry, subject, depth, relevance, probeFlip);
      const score = round3(
        factors.temporal * WEIGHTS.temporal +
        factors.structural * WEIGHTS.structural +
        factors.intentMismatch * WEIGHTS.intentMismatch +
        factors.incidentCorrelation * WEIGHTS.incidentCorrelation
      );
      const candidate: CausalCandidate = {
        mutationId: id,
        intent: entry.mutation.intent,
        createdAt: entry.mutation.created_at,
        score,
        factors,
        reasons: relevance.reasons,
        role: 'contributing',
        evidenceStatus: factors.incidentCorrelation === 1 ? 'inferred' : 'hypothesised'
      };
      if (entry.mutation.author) candidate.author = entry.mutation.author;
      candidates.push(candidate);
    }

    if (candidates.length === 0) return this.empty(subject, reachable.length);

    const chronological = [...candidates].sort((a, b) => sequenceOf(a.mutationId) - sequenceOf(b.mutationId));
    const earliest = chronological.find(c => c.reasons.some(r => r.startsWith('Degraded') || r.startsWith('Introduced'))) ?? chronological[0]!;
    const ranked = [...candidates].sort((a, b) => b.score - a.score || sequenceOf(b.mutationId) - sequenceOf(a.mutationId));
    const proximate = ranked[0]!;
    earliest.role = 'earliest-plausible';
    if (proximate !== earliest) proximate.role = 'proximate';

    return {
      subject: { type: subject.type, id: subject.id, description: subject.description },
      components: subject.components,
      invariantIds: subject.invariantIds,
      chain: chronological.map(c => c.mutationId),
      candidates: ranked,
      earliestPlausible: earliest,
      mostProximate: proximate,
      traversal: { examined: reachable.length, maxDepth: MAX_DEPTH },
      language: LANGUAGE
    };
  }

  private empty(subject: Subject, examined = 0): CausalChain {
    return {
      subject: { type: subject.type, id: subject.id, description: subject.description },
      components: subject.components,
      invariantIds: subject.invariantIds,
      chain: [],
      candidates: [],
      earliestPlausible: null,
      mostProximate: null,
      traversal: { examined, maxDepth: MAX_DEPTH },
      language: LANGUAGE
    };
  }
}

interface Relevance {
  relevant: boolean;
  reasons: string[];
  degraded: string[];
}

function relevanceOf(entry: HistoryEntry, subject: Subject): Relevance {
  const reasons: string[] = [];
  const degraded: string[] = [];
  for (const t of entry.diff.invariantTransitions) {
    if (subject.invariantIds.includes(t.invariantId) && rank(t.to) > rank(t.from)) {
      degraded.push(t.invariantId);
      reasons.push(`Degraded ${t.invariantId} ${t.from}→${t.to}`);
    }
  }
  for (const v of entry.diff.addedViolations) {
    if (subject.invariantIds.length === 0 || subject.invariantIds.includes(v.invariantId)) {
      reasons.push(`Introduced ${v.importer} → ${v.module} (${v.invariantId})`);
    }
  }
  // Dependency edges only explain subjects that are about structure, not a specific invariant.
  if (subject.invariantIds.length === 0) {
    for (const edge of entry.diff.addedComponentEdges) {
      if (subject.components.includes(edge.from) || subject.components.includes(edge.to)) {
        reasons.push(`Added dependency ${edge.from} → ${edge.to}`);
      }
    }
  }
  for (const probe of entry.diff.probeChanges) {
    if (probe.from === true && probe.to === false) reasons.push(`Probe ${probe.id} started failing after this change`);
  }
  return { relevant: reasons.length > 0, reasons, degraded };
}

function scoreFactors(entry: HistoryEntry, subject: Subject, depth: number, relevance: Relevance, probeFlip: string | undefined): CausalFactors {
  const touched = new Set(entry.mutation.affected_components);
  const overlap = subject.components.length > 0
    ? subject.components.filter(c => touched.has(c)).length / subject.components.length
    : 0;

  // Intent–outcome mismatch: the change degraded an invariant whose scope reaches beyond what it touched.
  const mismatch = relevance.degraded.some(id => {
    const invariant = invariants.getInvariant(id);
    return invariant ? invariant.scope_components.some(c => !touched.has(c)) : false;
  }) || entry.diff.addedViolations.some(v => !touched.has(componentOf(v.module)));

  return {
    temporal: round3(1 - depth / (MAX_DEPTH + 1)),
    structural: round3(Math.min(1, overlap * 2)),
    intentMismatch: mismatch ? 1 : 0,
    incidentCorrelation: probeFlip === entry.mutation.mutation_id ? 1 : relevance.reasons.some(r => r.startsWith('Probe')) ? 1 : 0
  };
}

function findProbeFlip(history: HistoryEntry[], probeId: string): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]!;
    if (entry.diff.probeChanges.some(p => p.id === probeId && p.from === true && p.to === false)) return entry.mutation.mutation_id;
  }
  return undefined;
}

function latestOf(ids: string[]): string | undefined {
  return [...ids].sort((a, b) => sequenceOf(b) - sequenceOf(a))[0];
}

function rank(status: InvariantStatus): number {
  return status === 'HOLDING' ? 0 : status === 'WEAKENED' ? 1 : 2;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export type { Mutation };
export const causalArchaeologist = new CausalArchaeologist();
