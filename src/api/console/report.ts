import {
  decisions,
  driftFindings,
  epochs,
  evidence,
  incidents,
  mutations,
  simulations,
  trajectory
} from '../../store/index.js';
import { ENVELOPE } from '../../core/epoch/trajectory.js';
import { consoleDriftFinding, consoleIncident } from './views.js';
import type { Scenario, Simulation } from '../../shared/schema/simulation.schema.js';

/**
 * Builds a human-readable Markdown evolution report from the EPOCH store.
 * Every figure comes from a query; nothing is invented.
 */
export function buildEvolutionReport(): string {
  const sections: string[] = [
    `# Evolution Report`,
    `_Generated ${new Date().toISOString()}_`,
    '',
    currentState(),
    mutations_(),
    driftFindingsSection(),
    incidentsSection(),
    futuresSection(),
    decisionsSection()
  ];
  return sections.join('\n\n');
}

// ── Section helpers ───────────────────────────────────────────────────────────

function currentState(): string {
  const latest = trajectory.getLatestTrajectoryPoint();
  const epoch = epochs.getLatestEpoch();
  const openFindings = driftFindings.listDriftFindings({ status: 'open' });

  if (!latest) {
    return '## Current State\n\n_No trajectory data recorded yet._';
  }

  const integrity = Math.round(latest.boundary_integrity_score * 100);
  const coupling = Math.round(latest.coupling_score * 100);
  const withinEnvelope =
    latest.boundary_integrity_score >= ENVELOPE.minBoundaryIntegrity &&
    latest.coupling_score <= ENVELOPE.maxCoupling;
  const epochLabel = epoch ? `${epoch.epoch_id} (${epoch.name})` : 'unknown';

  return [
    '## Current State',
    '',
    `Current epoch: **${epochLabel}**. ` +
      `Boundary integrity: **${integrity}%** ` +
      `(envelope floor: ${Math.round(ENVELOPE.minBoundaryIntegrity * 100)}%). ` +
      `Coupling: **${coupling}%** ` +
      `(envelope ceiling: ${Math.round(ENVELOPE.maxCoupling * 100)}%). ` +
      `The system is currently **${withinEnvelope ? 'inside' : 'OUTSIDE'}** the envelope. ` +
      `Open drift findings: **${openFindings.length}**.`
  ].join('\n');
}

function mutations_(): string {
  const LIMIT = 10;
  const total = mutations.countMutations();
  const list = mutations.listMutations({ order: 'desc', limit: LIMIT });

  if (list.length === 0) {
    return '## Recorded Mutations\n\n_No mutations recorded yet._';
  }

  const header = `| Mutation | Epoch | Author | Intent |\n| --- | --- | --- | --- |`;
  const rows = list.map(m =>
    `| ${m.mutation_id} | ${m.epoch_id ?? '—'} | ${m.author ?? '—'} | ${singleLine(m.intent)} |`
  );

  const lines: string[] = ['## Recorded Mutations', '', header, ...rows];
  if (total > LIMIT) {
    lines.push('', `_${total - LIMIT} earlier mutation${total - LIMIT === 1 ? '' : 's'} not shown._`);
  }
  return lines.join('\n');
}

function driftFindingsSection(): string {
  const all = driftFindings.listDriftFindings();
  if (all.length === 0) {
    return '## Drift Findings\n\n_No drift findings recorded._';
  }

  // Open first (newest first within each group), then resolved
  const open = all.filter(f => f.status === 'open').sort((a, b) => b.detected_at - a.detected_at);
  const resolved = all.filter(f => f.status !== 'open').sort((a, b) => b.detected_at - a.detected_at);
  const ordered = [...open, ...resolved];

  const parts: string[] = ['## Drift Findings', ''];
  for (const f of ordered) {
    const view = consoleDriftFinding(f);
    const statusLabel =
      f.status === 'open'
        ? '**open**'
        : `resolved by ${view.resolvedBy ?? '—'}`;
    parts.push(
      `### ${f.finding_id}: ${f.title}`,
      '',
      `- **Severity:** ${view.severity}`,
      `- **Detected:** ${view.detectedAt}`,
      `- **Status:** ${statusLabel}`,
      `- **Explanation:** ${view.whyExplanation}`,
      ''
    );
  }
  return parts.join('\n');
}

function incidentsSection(): string {
  const all = incidents.listIncidents();
  if (all.length === 0) {
    return '## Incidents\n\n_No incidents recorded._';
  }

  const parts: string[] = ['## Incidents', ''];
  for (const inc of all) {
    const view = consoleIncident(inc);
    const evidenceCount = inc.remediation_workflow_id
      ? evidence.listEvidenceByWorkflow(inc.remediation_workflow_id).length
      : 0;
    const chain =
      view.candidateCausalChain.length > 0
        ? view.candidateCausalChain.join(' → ') + ' _(hypothesised)_'
        : '_none recorded_';
    parts.push(
      `### ${inc.incident_id}: ${inc.signal}`,
      '',
      `- **Severity:** ${view.severity}`,
      `- **Status:** ${view.status}`,
      `- **Affected component:** ${inc.affected_component}`,
      `- **Candidate causal chain:** ${chain}`,
      `- **Evidence items:** ${evidenceCount}`,
      ''
    );
  }
  return parts.join('\n');
}

function futuresSection(): string {
  const all = simulations.listSimulations();
  if (all.length === 0) {
    return '## Latest Futures Comparison\n\n_No futures simulations recorded._';
  }

  // Most recent completed simulation, or most recent of any status
  const sim: Simulation =
    all.find(s => s.status === 'COMPLETED') ?? all[0]!;

  const parts: string[] = [
    '## Latest Futures Comparison',
    '',
    `**Simulation:** ${sim.simulation_id}  `,
    `**Hypothesis:** ${sim.hypothesis}  `,
    `**Forked from:** ${sim.base_mutation_id}`,
    '',
    '| Scenario | Integrity | Coupling | Tests | Probe | Recommended | Adopted |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  ];

  for (const s of sim.scenarios) {
    const recommended = bestScenarioId(sim) === s.scenario_id ? '✓' : '';
    const adopted = sim.selected_scenario_id === s.scenario_id ? '✓' : '';
    parts.push(scenarioRow(s, recommended, adopted));
  }

  return parts.join('\n');
}

function scenarioRow(s: Scenario, recommended: string, adopted: string): string {
  const integrity =
    s.boundary_integrity_after !== undefined
      ? `${Math.round(s.boundary_integrity_after * 100)}%`
      : '—';
  const coupling =
    s.coupling_score_after !== undefined
      ? `${Math.round(s.coupling_score_after * 100)}%`
      : '—';
  const tests =
    s.tests_passed !== undefined
      ? `${s.tests_passed}/${(s.tests_passed ?? 0) + (s.tests_failed ?? 0)}`
      : '—';
  const probe =
    s.status === 'COMPLETED'
      ? (s.probes_failed?.length ?? 0) === 0
        ? 'pass'
        : `fail (${s.probes_failed?.join(', ')})`
      : '—';
  return `| ${s.scenario_id}: ${s.label} | ${integrity} | ${coupling} | ${tests} | ${probe} | ${recommended} | ${adopted} |`;
}

function decisionsSection(): string {
  const all = decisions.listDecisions(50);
  if (all.length === 0) {
    return '## Human Decisions\n\n_No decisions recorded._';
  }

  const header = `| Decision | Actor | Workflow | Rationale |\n| --- | --- | --- | --- |`;
  const rows = all.map(d =>
    `| ${d.action} | ${d.actor} | ${d.workflow_id} | ${d.rationale ? singleLine(d.rationale) : '—'} |`
  );
  return ['## Human Decisions', '', header, ...rows].join('\n');
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Collapse newlines and trim Markdown pipe characters to keep table cells clean. */
function singleLine(text: string): string {
  return text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

/**
 * Pick the best scenario id from a simulation using the same heuristic as the
 * futures simulator: highest boundary integrity, then fewest probes failed,
 * then fewest tests failed. Returns undefined when no scenario is COMPLETED.
 */
function bestScenarioId(sim: Simulation): string | undefined {
  const done = sim.scenarios.filter(s => s.status === 'COMPLETED');
  if (done.length === 0) return undefined;
  const best = done.reduce((a, b) => {
    const ai = a.boundary_integrity_after ?? 0;
    const bi = b.boundary_integrity_after ?? 0;
    if (ai !== bi) return ai > bi ? a : b;
    const ap = a.probes_failed?.length ?? 0;
    const bp = b.probes_failed?.length ?? 0;
    if (ap !== bp) return ap < bp ? a : b;
    const at = a.tests_failed ?? 0;
    const bt = b.tests_failed ?? 0;
    return at <= bt ? a : b;
  });
  return best.scenario_id;
}
