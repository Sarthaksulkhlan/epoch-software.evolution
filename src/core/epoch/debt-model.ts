import { driftFindings, incidents, invariants, mutations, trajectory } from '../../store/index.js';
import type { ScanResult } from '../../graph/scanner/scanner.js';
import { getInvariantSpec } from './spec-registry.js';

export type DebtDimension = 'architecture' | 'business_rules' | 'dependencies' | 'runtime' | 'knowledge' | 'agentic';

export interface DebtItem {
  dimension: DebtDimension;
  /** 0 = no accumulated divergence, 1 = severe. An interpretation of observed facts. */
  score: number;
  indicator: string;
  mutations: string[];
  evidenceStatus: 'inferred';
}

export interface DebtSummary {
  total: number;
  dimensions: DebtItem[];
  computedAt: number;
}

const AI_AUTHOR = /\b(ai|agent|bob)\b/i;

/**
 * Evolution debt: accumulated divergence between the system
 * being built and the intended one, reported per dimension with the mutations
 * behind it. Scores interpret measurements, so they are labelled inferred.
 */
export class EvolutionDebtModel {
  summary(): DebtSummary {
    const latest = trajectory.getLatestScan();
    const scan = latest?.scan as ScanResult | undefined;
    const points = trajectory.listTrajectoryPoints();
    const openFindings = driftFindings.listDriftFindings({ status: 'open' });
    const all = invariants.listInvariants();

    const violations = scan?.boundaryViolations ?? [];
    const architecture: DebtItem = {
      dimension: 'architecture',
      score: clamp(violations.length / 4),
      indicator: violations.length === 0
        ? 'No imports bypass a declared boundary.'
        : `${violations.length} import(s) bypass declared boundaries: ${violations.map(v => `${v.importer} → ${v.module}`).join('; ')}.`,
      mutations: unique(openFindings.filter(f => f.pattern === 'boundary_erosion').flatMap(f => f.mutation_ids)),
      evidenceStatus: 'inferred'
    };

    const rules = all.filter(i => {
      const category = getInvariantSpec(i.invariant_id)?.category;
      return category === 'TEMPORAL' || category === 'DATA_FLOW';
    });
    const brokenRules = rules.filter(i => i.status !== 'HOLDING');
    const businessRules: DebtItem = {
      dimension: 'business_rules',
      score: rules.length > 0 ? clamp(brokenRules.reduce((s, i) => s + (i.status === 'VIOLATED' ? 1 : 0.5), 0) / rules.length) : 0,
      indicator: brokenRules.length === 0
        ? 'All business-rule invariants hold.'
        : brokenRules.map(i => `${i.invariant_id} ${i.status}`).join(', '),
      mutations: unique(brokenRules.flatMap(i => i.violation_mutations)),
      evidenceStatus: 'inferred'
    };

    const baseline = points[0]?.coupling_score ?? 0;
    const now = points.at(-1)?.coupling_score ?? baseline;
    const growth = baseline > 0 ? (now - baseline) / baseline : 0;
    const dependencies: DebtItem = {
      dimension: 'dependencies',
      score: clamp(growth),
      indicator: `Coupling ${now.toFixed(3)} vs ${baseline.toFixed(3)} at the start of recorded history (${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(0)}%).`,
      mutations: unique(openFindings.filter(f => f.pattern === 'dependency_growth').flatMap(f => f.mutation_ids)),
      evidenceStatus: 'inferred'
    };

    const openIncidents = incidents.listIncidents().filter(i => i.status !== 'resolved' && i.status !== 'wont_fix');
    const failingProbes = (scan?.probes ?? []).filter(p => !p.ok);
    const runtime: DebtItem = {
      dimension: 'runtime',
      score: clamp((openIncidents.length + failingProbes.length) / 2),
      indicator: openIncidents.length === 0 && failingProbes.length === 0
        ? 'No open incidents; runtime probes pass.'
        : `${openIncidents.length} open incident(s); ${failingProbes.length} failing probe(s).`,
      mutations: unique(openIncidents.flatMap(i => i.candidate_mutations ?? [])),
      evidenceStatus: 'inferred'
    };

    const inconsistent = (scan?.consistency ?? []).filter(c => !c.ok);
    const knowledge: DebtItem = {
      dimension: 'knowledge',
      score: clamp(inconsistent.length / 2),
      indicator: inconsistent.length === 0
        ? 'Customer-facing copy agrees with the policies it describes.'
        : inconsistent.map(c => c.detail).join('; '),
      mutations: [],
      evidenceStatus: 'inferred'
    };

    const contributing = unique(openFindings.flatMap(f => f.mutation_ids));
    const byAgents = contributing.filter(id => AI_AUTHOR.test(mutations.getMutation(id)?.author ?? ''));
    const agentic: DebtItem = {
      dimension: 'agentic',
      score: contributing.length > 0 ? clamp(byAgents.length / contributing.length) : 0,
      indicator: contributing.length === 0
        ? 'No open drift findings to attribute.'
        : `${byAgents.length} of ${contributing.length} mutations behind open drift findings were written by AI agents.`,
      mutations: byAgents,
      evidenceStatus: 'inferred'
    };

    const dimensions = [architecture, businessRules, dependencies, runtime, knowledge, agentic];
    return {
      total: Math.round((dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length) * 1000) / 1000,
      dimensions,
      computedAt: Date.now()
    };
  }
}

function clamp(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export const debtModel = new EvolutionDebtModel();
