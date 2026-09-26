import {
  decisions,
  driftFindings,
  epochs,
  events,
  evidence,
  graphEdges,
  incidents,
  invariants,
  mutations,
  tasks,
  trajectory,
  workflows
} from '../../store/index.js';
import type { DriftFinding } from '../../shared/schema/drift-finding.schema.js';
import type { Evidence } from '../../shared/schema/evidence.schema.js';
import type { Incident } from '../../shared/schema/incident.schema.js';
import type { Invariant, InvariantStatus } from '../../shared/schema/invariant.schema.js';
import type { Mutation } from '../../shared/schema/mutation.schema.js';
import type { Simulation, Scenario } from '../../shared/schema/simulation.schema.js';
import type { Task } from '../../shared/schema/task.schema.js';
import type { Workflow, WorkflowStatus } from '../../shared/schema/workflow.schema.js';
import type { PlatformEvent } from '../../core/events/bus.js';
import type { ScanResult } from '../../graph/scanner/scanner.js';
import { causalArchaeologist } from '../../graph/causal/archaeologist.js';
import { getInvariantSpec } from '../../core/epoch/spec-registry.js';
import { ENVELOPE } from '../../core/epoch/trajectory.js';
import { mutationEngine } from '../../core/epoch/mutation-engine.js';
import { approvalGate } from '../../core/weave/approval-gate.js';
import { futuresSimulator } from '../../core/futures/simulator.js';
import { AGENTS } from '../../agents/index.js';
import type {
  ActivityEvent,
  ConsoleDriftFinding,
  ConsoleIncident,
  ConsoleInvariant,
  ConsoleMutation,
  ConsoleWorkflow,
  CounterfactualScenario,
  EvidenceItem,
  GraphEdgeData,
  GraphNodeData,
  LifecycleState,
  SpecialistRole,
  SpecialistTask,
  TrajectorySnapshot
} from './types.js';

const iso = (ms: number): string => new Date(ms).toISOString();
const pct = (value: number): number => Math.round(value * 100);
const SCORE: Record<InvariantStatus, number> = { HOLDING: 100, WEAKENED: 50, VIOLATED: 0 };

export function epochIndex(epochId: string | undefined): number {
  const match = /^E-(\d+)$/.exec(epochId ?? '');
  return match?.[1] ? Number.parseInt(match[1], 10) : 0;
}

function scanAt(mutationId: string): ScanResult | undefined {
  return trajectory.getScanForMutation(mutationId) as ScanResult | undefined;
}

function shortTitle(text: string, max = 72): string {
  const sentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return sentence.length > max ? `${sentence.slice(0, max - 1)}…` : sentence.replace(/\.$/, '');
}

// ── Workflows ─────────────────────────────────────────────────────────────────

const LIFECYCLE: Record<WorkflowStatus, { state: LifecycleState; step: number }> = {
  PENDING: { state: 'INTAKE', step: 0 },
  CONTEXT_LOADING: { state: 'INTAKE', step: 1 },
  PLANNING: { state: 'PLANNING', step: 1 },
  DELEGATING: { state: 'PLANNING', step: 2 },
  EXECUTING: { state: 'IMPLEMENTATION', step: 2 },
  VERIFYING: { state: 'VERIFICATION', step: 3 },
  AWAITING_APPROVAL: { state: 'APPROVAL_GATE', step: 4 },
  COMPLETED: { state: 'DEPLOYED', step: 6 },
  REJECTED: { state: 'HALTED', step: 4 }
};

const ROLE: Record<string, { role: SpecialistRole; name: string }> = {
  context: { role: 'ARCHITECT', name: 'Context / Requirements' },
  historian: { role: 'ARCHITECT', name: 'Historian' },
  synthesis: { role: 'ARCHITECT', name: 'Synthesis' },
  bob: { role: 'CODE_SYNTHESIZER', name: 'IBM Bob' },
  qa: { role: 'VERIFICATION_ORACLE', name: 'QA' },
  incident: { role: 'VERIFICATION_ORACLE', name: 'Incident' },
  security: { role: 'INVARIANT_SENTINEL', name: 'Security' },
  scanner: { role: 'INVARIANT_SENTINEL', name: 'EPOCH scanner' },
  evolution: { role: 'DRIFT_ANALYST', name: 'Evolution Analyst' }
};

export function specialistTask(task: Task, evidenceCount: number): SpecialistTask {
  const meta = ROLE[task.agent_type] ?? { role: 'ARCHITECT' as const, name: task.agent_type };
  const out: SpecialistTask = {
    id: task.task_id,
    role: meta.role,
    agentName: task.agent_type === 'bob' && task.input_ref ? `IBM Bob · ${task.input_ref}` : meta.name,
    action: AGENTS[task.agent_type]?.role ?? (task.agent_type === 'scanner' ? 'Scans the code, runs tests and probes' : 'Implements and reasons about the change'),
    status: task.status === 'SKIPPED' ? 'BLOCKED' : task.status,
    startedAt: iso(task.started_at ?? Date.now()),
    evidenceProducedCount: evidenceCount
  };
  if (task.completed_at) {
    out.completedAt = iso(task.completed_at);
    if (task.started_at) out.durationMs = task.completed_at - task.started_at;
  }
  return out;
}

export function evidenceItem(e: Evidence, agent: string): EvidenceItem {
  const claim = e.claim;
  const type: EvidenceItem['type'] =
    /\btests?\b.*\b(passed|failed)\b/i.test(claim) ? 'TEST_RESULTS'
      : /\bprobe\b|incident/i.test(claim) ? 'RUNTIME_FINDING'
        : /\bINV-[A-Z]+-\d+\b/.test(claim) ? 'INVARIANT_CHECK'
          : /\bimports?\b|diff|added line/i.test(claim) ? 'CODE_DIFF'
            : 'ARCHITECTURE_OBSERVATION';
  const severity = e.finding_severity;
  const status: EvidenceItem['status'] =
    severity === 'critical' || severity === 'high' ? 'FAIL'
      : severity === 'medium' || severity === 'low' ? 'WARN'
        : e.status === 'observed' && /\b(pass(es|ed)?|0 failed|no secrets|consistent)\b/i.test(claim) ? 'PASS'
          : 'INFO';
  const item: EvidenceItem = {
    id: e.evidence_id,
    taskId: e.task_id,
    type,
    title: `${ROLE[agent]?.name ?? agent} · ${e.status}`,
    summary: claim,
    timestamp: iso(e.created_at),
    status,
    details: { evidenceStatus: e.status, sourceRef: e.source_artifact_ref, agent, severity: severity ?? null }
  };
  const counts = /(\d+) passed, (\d+) failed/.exec(claim);
  if (counts?.[1] && counts[2]) item.metrics = [{ label: 'Passed', value: Number(counts[1]) }, { label: 'Failed', value: Number(counts[2]) }];
  return item;
}

export function consoleWorkflow(workflow: Workflow): ConsoleWorkflow {
  const event = events.getEvent(workflow.trigger_event_id);
  const requirement = typeof event?.payload.requirement === 'string' ? event.payload.requirement : workflow.title ?? '';
  const taskList = tasks.listTasksByWorkflow(workflow.workflow_id);
  const allEvidence = evidence.listEvidenceByWorkflow(workflow.workflow_id);
  const agentOf = new Map(taskList.map(t => [t.task_id, t.agent_type as string]));
  const pkg = approvalGate.buildPackage(workflow.workflow_id);
  const decision = decisions.listDecisionsByWorkflow(workflow.workflow_id).at(-1);
  const lifecycle = LIFECYCLE[workflow.status];

  const gate: ConsoleWorkflow['decisionGate'] = {
    id: `gate-${workflow.workflow_id}`,
    workflowId: workflow.workflow_id,
    title: `Approve: ${workflow.title ?? shortTitle(requirement)}`,
    requirement,
    riskAssessment: {
      level: pkg.riskLevel === 'critical' || pkg.riskLevel === 'high' ? 'HIGH' : pkg.riskLevel === 'medium' ? 'MEDIUM' : 'LOW',
      summary: pkg.recommendation,
      affectedInvariants: (pkg.trajectoryPreview?.invariantTransitions ?? []).map(t => t.invariantId)
    },
    requiredEvidenceIds: allEvidence.filter(e => e.finding_severity === 'high' || e.finding_severity === 'critical').map(e => e.evidence_id),
    status: decision ? decision.action : 'PENDING_REVIEW'
  };
  if (decision) {
    gate.decidedAt = iso(decision.timestamp);
    gate.decidedBy = decision.actor;
    if (decision.rationale) gate.rationale = decision.rationale;
  }

  return {
    id: workflow.workflow_id,
    projectId: 'sample-app',
    projectName: 'Payments service',
    repo: 'sample-app',
    branch: 'main',
    requirementTitle: workflow.title ?? shortTitle(requirement),
    requirementDescription: requirement,
    state: lifecycle.state,
    initiatedAt: iso(workflow.created_at),
    completedSteps: lifecycle.step,
    totalSteps: 6,
    tasks: taskList.map(t => specialistTask(t, allEvidence.filter(e => e.task_id === t.task_id).length)),
    evidence: allEvidence.map(e => evidenceItem(e, agentOf.get(e.task_id) ?? 'unknown')),
    decisionGate: gate
  };
}

/** The workflow the CURRENT lens should show: the newest open one, else the newest finished one. */
export function activeWorkflow(): Workflow | undefined {
  return workflows.getActiveWorkflows()[0] ?? workflows.listWorkflows({ limit: 50 }).find(w => w.kind !== 'seed');
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function consoleMutation(m: Mutation): ConsoleMutation {
  const scan = scanAt(m.mutation_id);
  const edges = graphEdges.listEdgesForNode(m.mutation_id);
  const findings = driftFindings.listDriftFindings().filter(f => f.mutation_ids.includes(m.mutation_id));
  const weakened = edges.filter(e => e.relationship === 'WEAKENS' && e.from_id === m.mutation_id).map(e => e.to_id);
  const openIncident = incidents.listIncidents().find(i => i.status !== 'resolved' && (i.candidate_mutations ?? []).includes(m.mutation_id));
  const compensated = mutations.listMutations().some(x => x.compensates_mutation_id === m.mutation_id);
  const failingProbes = (scan?.probes ?? []).filter(p => !p.ok);
  const transitions = m.trajectory_delta.invariantChanges.map(c => `${c.invariant_id} ${c.previousStatus}→${c.newStatus}`);
  const diff = mutationEngine.mutationDiff(m.mutation_id);

  const contribution: ConsoleMutation['structuralConsequences']['driftContribution'] =
    findings.some(f => f.severity === 'critical') ? 'CRITICAL'
      : findings.length > 0 ? 'MODERATE'
        : weakened.length > 0 ? 'SIGNIFICANT'
          : m.trajectory_delta.couplingDelta > 0 ? 'LOW'
            : 'NONE';

  const out: ConsoleMutation = {
    id: m.mutation_id,
    title: shortTitle(m.intent),
    intent: m.intent,
    timestamp: iso(m.created_at),
    epoch: epochIndex(m.epoch_id),
    author: m.author ?? 'unknown',
    commitHash: m.commit_sha ? m.commit_sha.slice(0, 7) : '—',
    status: compensated ? 'REVERTED' : 'COMMITTED',
    touchedComponents: m.affected_components,
    immediateOutcome: {
      unitTests: (scan?.tests?.failed ?? 0) > 0 ? 'FAIL' : 'PASS',
      integrationTests: failingProbes.length > 0 ? 'FAIL' : 'PASS',
      summary: `${scan?.tests ? `${scan.tests.passed}/${scan.tests.passed + scan.tests.failed} tests pass` : 'Tests not run'}; ${failingProbes.length > 0 ? `probe ${failingProbes.map(p => p.id).join(', ')} fails` : 'runtime probes pass'}.`
    },
    structuralConsequences: {
      summary: [
        m.delta_summary,
        transitions.length > 0 ? `Invariants: ${transitions.join(', ')}` : undefined,
        `Boundary integrity ${m.trajectory_delta.boundaryIntegrityDelta >= 0 ? '+' : ''}${m.trajectory_delta.boundaryIntegrityDelta.toFixed(3)}, coupling ${m.trajectory_delta.couplingDelta >= 0 ? '+' : ''}${m.trajectory_delta.couplingDelta.toFixed(3)}`
      ].filter(Boolean).join('. '),
      driftContribution: contribution,
      weakenedInvariantIds: weakened
    },
    downstreamMutationIds: [...new Set(findings.flatMap(f => f.mutation_ids).filter(id => sequence(id) > sequence(m.mutation_id)))],
    candidateCausalChain: openIncident?.candidate_mutations ?? [],
    relatedIncidentIds: edges.filter(e => e.relationship === 'CAUSED_BY' && e.to_id === m.mutation_id).map(e => e.from_id),
    evidenceIds: m.evidence_refs
  };
  if (diff) out.diffPreview = diff.length > 6000 ? `${diff.slice(0, 6000)}\n…` : diff;
  return out;
}

function sequence(id: string): number {
  return Number.parseInt(id.replace(/^M-/, ''), 10) || 0;
}

// ── Incidents, invariants, drift ─────────────────────────────────────────────

export function consoleIncident(i: Incident): ConsoleIncident {
  const chain = causalArchaeologist.traceIncident(i.incident_id);
  const at = /@(M-\d+)$/.exec(i.reproduction_ref ?? '')?.[1];
  const scan = at ? scanAt(at) : undefined;
  const probeId = /^probe:([^@]+)@/.exec(i.reproduction_ref ?? '')?.[1];
  return {
    id: i.incident_id,
    title: i.signal,
    severity: i.severity === 'critical' ? 'CRITICAL' : i.severity === 'high' ? 'HIGH' : i.severity === 'medium' ? 'MEDIUM' : 'LOW',
    timestamp: iso(i.detected_at),
    epoch: epochIndex(at ? mutations.getMutation(at)?.epoch_id : undefined),
    affectedComponents: [i.affected_component],
    blastRadiusSummary: scan?.probes?.find(p => p.id === probeId)?.detail ?? i.signal,
    earliestPlausibleContributingMutationId: chain.earliestPlausible?.mutationId ?? '',
    candidateCausalChain: chain.chain,
    status: i.status === 'resolved' ? 'RESOLVED' : i.status === 'wont_fix' ? 'MITIGATED' : 'ACTIVE',
    invariantsViolated: (scan?.invariants ?? []).filter(r => r.status === 'VIOLATED').map(r => r.invariantId)
  };
}

export function consoleInvariant(inv: Invariant): ConsoleInvariant {
  const spec = getInvariantSpec(inv.invariant_id);
  const latest = trajectory.getLatestScan()?.scan as ScanResult | undefined;
  const detail = latest?.invariants.find(r => r.invariantId === inv.invariant_id)?.detail;
  const trend = epochs.listEpochs().map(e => {
    const points = trajectory.listTrajectoryPoints({ epochId: e.epoch_id });
    const last = points.at(-1);
    const status = last ? scanAt(last.mutation_id)?.invariants.find(r => r.invariantId === inv.invariant_id)?.status ?? 'HOLDING' : 'HOLDING';
    return { epoch: epochIndex(e.epoch_id), score: SCORE[status] };
  });
  const out: ConsoleInvariant = {
    id: inv.invariant_id,
    name: spec?.name ?? inv.invariant_id,
    category: spec?.category ?? 'BOUNDARY',
    description: spec?.statement ?? inv.statement,
    status: inv.status,
    lastCheckedEpoch: epochIndex(inv.last_checked_mutation_id ? mutations.getMutation(inv.last_checked_mutation_id)?.epoch_id : undefined),
    historicalTrend: trend,
    responsibleComponents: inv.scope_components
  };
  if (inv.status !== 'HOLDING' && detail) out.violationMessage = detail;
  return out;
}

export function consoleDriftFinding(f: DriftFinding): ConsoleDriftFinding & { status: string; resolvedBy: string | null } {
  const chain = causalArchaeologist.traceFinding(f.finding_id);
  const latest = trajectory.getLatestTrajectoryPoint();
  const name = f.invariant_id ? getInvariantSpec(f.invariant_id)?.name ?? f.invariant_id : `${f.components[0] ?? 'component'} dependencies`;
  const earliest = chain.earliestPlausible;
  return {
    id: f.finding_id,
    title: f.title,
    severity: f.severity === 'critical' ? 'CRITICAL' : 'WARNING',
    detectedEpoch: epochIndex(mutations.getMutation(f.detected_by_mutation_id)?.epoch_id),
    detectedAt: iso(f.detected_at),
    boundaryName: name,
    sourceComponent: f.components[0] ?? '',
    targetComponent: f.components[1] ?? '',
    whyExplanation: `${f.summary}${chain.chain.length > 0 ? ` Candidate causal chain: ${chain.chain.join(' → ')}.` : ''}` +
      (earliest ? ` Earliest plausible mutation: ${earliest.mutationId} (${earliest.evidenceStatus}) — ${earliest.reasons.join('; ')}.` : '') +
      ` ${chain.language}`,
    earliestPlausibleMutationId: earliest?.mutationId ?? f.earliest_plausible_mutation_id ?? '',
    candidateCausalChain: chain.chain,
    violatedInvariantId: f.invariant_id ?? '',
    integrityScore: pct(latest?.boundary_integrity_score ?? 1),
    status: f.status,
    resolvedBy: f.resolved_by_mutation_id ?? null
  };
}

// ── Trajectory ───────────────────────────────────────────────────────────────

export function trajectorySnapshots(): TrajectorySnapshot[] {
  const findings = driftFindings.listDriftFindings();
  return epochs.listEpochs().map(e => {
    const points = trajectory.listTrajectoryPoints({ epochId: e.epoch_id });
    const last = points.at(-1);
    const scan = last ? scanAt(last.mutation_id) : undefined;
    const ids = new Set(points.map(p => p.mutation_id));
    const active = findings.filter(f => ids.has(f.detected_by_mutation_id) && (f.status === 'open' || !ids.has(f.resolved_by_mutation_id ?? ''))).length;
    return {
      epoch: epochIndex(e.epoch_id),
      label: `${e.epoch_id}: ${e.name}${e.status === 'proposed' ? ' (proposed)' : ''}`,
      timestamp: iso(points[0]?.timestamp ?? e.created_at),
      boundaryIntegrityScore: pct(last?.boundary_integrity_score ?? 1),
      activeDriftCount: active,
      mutations: points.map(p => p.mutation_id),
      invariants: (scan?.invariants ?? invariants.listInvariants().map(i => ({ invariantId: i.invariant_id, status: i.status }))).map(r => ({ id: r.invariantId, status: r.status }))
    };
  });
}

export function trendData(limit = 12): Array<{ epochLabel: string; score: number; threshold: number; coupling: number }> {
  return trajectory.listTrajectoryPoints({ limit }).map(p => ({
    epochLabel: `E${epochIndex(p.epoch_id)}: ${p.mutation_id}`,
    score: pct(p.boundary_integrity_score),
    threshold: pct(ENVELOPE.minBoundaryIntegrity),
    coupling: pct(p.coupling_score)
  }));
}

/**
 * Evolution graph laid out for the console: epochs on top, mutations in time
 * order, incidents and invariants below. `recent` limits the seeded history shown.
 */
export function consoleGraph(recent = 6): { nodes: GraphNodeData[]; edges: GraphEdgeData[] } {
  const all = mutations.listMutations({ order: 'asc' });
  const seeded = all.filter(m => !m.commit_sha || m.author?.startsWith('seed history'));
  const hidden = new Set(seeded.slice(0, Math.max(0, seeded.length - recent)).map(m => m.mutation_id));
  const shown = all.filter(m => !hidden.has(m.mutation_id));
  const openIncident = incidents.listIncidents().find(i => i.status !== 'resolved');
  const chain = new Set(openIncident?.candidate_mutations ?? []);
  const x = new Map(shown.map((m, i) => [m.mutation_id, 80 + i * 150]));

  const nodes: GraphNodeData[] = [];
  for (const e of epochs.listEpochs()) {
    const firstShown = shown.find(m => m.epoch_id === e.epoch_id);
    if (!firstShown) continue;
    const node: GraphNodeData = { id: e.epoch_id, type: 'EpochBoundaryNode', label: e.epoch_id, sublabel: e.name, epoch: epochIndex(e.epoch_id), status: e.status, x: (x.get(firstShown.mutation_id) ?? 80) - 40, y: 40 };
    nodes.push(node);
  }
  for (const m of shown) {
    const findings = driftFindings.listDriftFindings().filter(f => f.mutation_ids.includes(m.mutation_id));
    const node: GraphNodeData = {
      id: m.mutation_id,
      type: 'MutationNode',
      label: m.mutation_id,
      sublabel: shortTitle(m.intent, 40),
      epoch: epochIndex(m.epoch_id),
      status: m.compensates_mutation_id ? 'COMPENSATING' : 'COMMITTED',
      x: x.get(m.mutation_id) ?? 80,
      y: 160,
      isCausalChain: chain.has(m.mutation_id)
    };
    const severity = findings.some(f => f.severity === 'critical') ? 'CRITICAL' : findings.length > 0 ? 'WARNING' : undefined;
    if (severity) node.severity = severity;
    nodes.push(node);
  }
  incidents.listIncidents().forEach((i, index) => {
    const at = /@(M-\d+)$/.exec(i.reproduction_ref ?? '')?.[1];
    nodes.push({ id: i.incident_id, type: 'IncidentNode', label: i.incident_id, sublabel: shortTitle(i.signal, 40), epoch: epochIndex(at ? mutations.getMutation(at)?.epoch_id : undefined), status: i.status.toUpperCase(), severity: i.severity.toUpperCase(), x: (at ? x.get(at) : undefined) ?? 80 + index * 150, y: 300, isCausalChain: i.status !== 'resolved' });
  });
  invariants.listInvariants().forEach((inv, index) => {
    nodes.push({ id: inv.invariant_id, type: 'InvariantNode', label: inv.invariant_id, sublabel: getInvariantSpec(inv.invariant_id)?.name ?? '', epoch: 0, status: inv.status, x: 80 + index * 220, y: 420 });
  });

  const ids = new Set(nodes.map(n => n.id));
  const edges: GraphEdgeData[] = [];
  for (const e of graphEdges.listAllEdges()) {
    if (!ids.has(e.from_id) || !ids.has(e.to_id)) continue;
    if (!['FOLLOWS', 'CAUSED_BY', 'WEAKENS', 'REMEDIATES', 'SPAWNED', 'BOUNDARY'].includes(e.relationship)) continue;
    edges.push({
      id: e.edge_id,
      source: e.from_id,
      target: e.to_id,
      label: e.relationship === 'CAUSED_BY' ? `candidate cause (${e.confidence.toFixed(2)})` : e.relationship.toLowerCase().replace('_', ' '),
      isCausal: e.relationship === 'CAUSED_BY' || (e.relationship === 'FOLLOWS' && chain.has(e.from_id) && chain.has(e.to_id)),
      style: e.relationship === 'CAUSED_BY' || e.relationship === 'WEAKENS' ? 'critical' : e.relationship === 'REMEDIATES' || e.relationship === 'SPAWNED' ? 'success' : 'default'
    });
  }
  return { nodes, edges };
}

// ── Futures ───────────────────────────────────────────────────────────────────

export function consoleScenario(simulation: Simulation, scenario: Scenario): CounterfactualScenario & Record<string, unknown> {
  const outcomes = scenario.invariant_outcomes ?? [];
  const violated = outcomes.filter(o => o.status === 'VIOLATED');
  const probesFailed = scenario.probes_failed ?? [];
  const files = scenario.changes.length;
  const recommended = futuresSimulator.recommend(simulation)?.scenario_id === scenario.scenario_id;
  const pros: string[] = [];
  const cons: string[] = [];
  if (scenario.status === 'COMPLETED') {
    if (probesFailed.length === 0) pros.push('Runtime probe passes: late disputes reconcile');
    else cons.push(`Probe fails: ${probesFailed.join(', ')}`);
    if ((scenario.tests_failed ?? 0) === 0) pros.push(`All ${scenario.tests_passed ?? 0} tests pass`);
    else cons.push(`${scenario.tests_failed} test(s) fail`);
    if (violated.length === 0) pros.push('Every invariant holds');
    for (const v of violated) cons.push(`${v.invariant_id} stays VIOLATED`);
    if (files <= 1) pros.push('Smallest change (1 file)');
    else cons.push(`${files} files change`);
  }
  return {
    id: `${simulation.simulation_id}:${scenario.scenario_id}`,
    divergenceMutationId: simulation.base_mutation_id,
    title: scenario.label,
    strategyName: scenario.label,
    description: scenario.description,
    implementationEffort: files <= 1 ? 'LOW' : files <= 3 ? 'MEDIUM' : 'HIGH',
    projectedBoundaryIntegrity: pct(scenario.boundary_integrity_after ?? 0),
    projectedIncidentRisk: probesFailed.length > 0 ? 'HIGH' : violated.length > 0 ? 'MEDIUM' : 'LOW',
    projectedTimeDays: files,
    invariantOutcomes: outcomes.map(o => ({
      invariantId: o.invariant_id,
      invariantName: getInvariantSpec(o.invariant_id)?.name ?? o.invariant_id,
      projectedStatus: o.status,
      rationale: 'Measured by the EPOCH scanner in this future\'s worktree'
    })),
    tradeoffs: { pros, cons },
    projectedEvidence: [
      { title: 'Tests', type: 'TEST_RESULTS', finding: scenario.status === 'COMPLETED' ? `${scenario.tests_passed ?? 0} passed, ${scenario.tests_failed ?? 0} failed` : 'Not measured yet' },
      { title: 'Runtime probe', type: 'RUNTIME_FINDING', finding: scenario.status === 'COMPLETED' ? (probesFailed.length === 0 ? 'late-dispute-after-archival passes' : `${probesFailed.join(', ')} fails`) : 'Not measured yet' },
      { title: 'Structure', type: 'ARCHITECTURE_OBSERVATION', finding: scenario.status === 'COMPLETED' ? `Boundary integrity ${(scenario.boundary_integrity_after ?? 0).toFixed(2)}, coupling ${(scenario.coupling_score_after ?? 0).toFixed(2)}` : 'Not measured yet' }
    ],
    simulationId: simulation.simulation_id,
    scenarioId: scenario.scenario_id,
    status: scenario.status,
    measured: scenario.status === 'COMPLETED',
    recommended,
    changedFiles: scenario.changes,
    selected: simulation.selected_scenario_id === scenario.scenario_id
  };
}

// ── Activity feed ────────────────────────────────────────────────────────────

export function activityEvent(event: PlatformEvent): ActivityEvent | undefined {
  const p = event.payload;
  const s = (key: string): string => (typeof p[key] === 'string' ? (p[key] as string) : '');
  const base = { id: `EVT-${event.id}`, timestamp: iso(event.timestamp) };
  switch (event.type) {
    case 'workflow.created':
      return { ...base, actor: s('author') || 'EPOCH', category: 'SPECIALIST', message: `Workflow started: ${s('title')}`, relatedEntityId: s('workflowId'), severity: 'INFO' };
    case 'workflow.updated':
      return { ...base, actor: s('actor') || 'EPOCH', category: 'SPECIALIST', message: `Workflow ${s('from')} → ${s('to')}${s('stage') ? ` (${s('stage')})` : ''}`, relatedEntityId: s('workflowId'), severity: s('to') === 'REJECTED' ? 'WARN' : 'INFO' };
    case 'task.started':
      return { ...base, actor: ROLE[s('agent')]?.name ?? s('agent'), category: 'SPECIALIST', message: `${ROLE[s('agent')]?.name ?? s('agent')} started (${s('phase')})`, relatedEntityId: s('taskId'), severity: 'INFO' };
    case 'task.completed':
      return { ...base, actor: ROLE[s('agent')]?.name ?? s('agent'), category: 'SPECIALIST', message: `${ROLE[s('agent')]?.name ?? s('agent')}: ${s('summary')}`, relatedEntityId: s('taskId'), severity: s('riskLevel') === 'critical' ? 'CRITICAL' : s('riskLevel') === 'high' ? 'WARN' : 'SUCCESS' };
    case 'task.failed':
      return { ...base, actor: s('agent'), category: 'SPECIALIST', message: `${s('agent')} failed: ${s('error')}`, relatedEntityId: s('taskId'), severity: 'WARN' };
    case 'approval.requested':
      return { ...base, actor: 'EPOCH', category: 'DECISION', message: `Approval requested for "${s('title')}" (risk ${s('riskLevel')})`, relatedEntityId: s('workflowId'), severity: s('riskLevel') === 'critical' ? 'CRITICAL' : 'WARN' };
    case 'decision.recorded':
      return { ...base, actor: s('actor'), category: 'DECISION', message: `${s('action')} by ${s('actor')}${s('rationale') ? `: ${s('rationale')}` : ''}`, relatedEntityId: s('workflowId'), severity: s('action') === 'APPROVED' ? 'SUCCESS' : 'WARN' };
    case 'mutation.committed':
      return { ...base, actor: s('author') || 'EPOCH', category: 'MUTATION', message: `${s('mutationId')} recorded: ${s('intent')}`, relatedEntityId: s('mutationId'), severity: 'INFO' };
    case 'invariant.changed':
      return { ...base, actor: 'EPOCH scanner', category: 'INVARIANT', message: `${s('invariantId')} ${s('from')} → ${s('to')} after ${s('mutationId')}`, relatedEntityId: s('invariantId'), severity: s('to') === 'VIOLATED' ? 'CRITICAL' : s('to') === 'WEAKENED' ? 'WARN' : 'SUCCESS' };
    case 'drift.detected':
      return { ...base, actor: 'EPOCH drift detector', category: 'DRIFT', message: `${s('findingId')} ${s('title')} (${s('severity')})`, relatedEntityId: s('findingId'), severity: s('severity') === 'critical' ? 'CRITICAL' : 'WARN' };
    case 'drift.resolved':
      return { ...base, actor: 'EPOCH drift detector', category: 'DRIFT', message: `${s('findingId')} resolved by ${s('mutationId')}`, relatedEntityId: s('findingId'), severity: 'SUCCESS' };
    case 'epoch.proposed':
      return { ...base, actor: 'EPOCH', category: 'DRIFT', message: `New epoch proposed: ${s('epochId')} ${s('name')}`, relatedEntityId: s('epochId'), severity: 'WARN' };
    case 'incident.detected':
      return { ...base, actor: 'Runtime probe', category: 'DRIFT', message: `${s('incidentId')}: ${s('signal')}`, relatedEntityId: s('incidentId'), severity: 'CRITICAL' };
    case 'incident.resolved':
      return { ...base, actor: 'Runtime probe', category: 'DRIFT', message: `${s('incidentId')} resolved by ${s('mutationId')}`, relatedEntityId: s('incidentId'), severity: 'SUCCESS' };
    case 'simulation.started':
      return { ...base, actor: 'EPOCH futures', category: 'DRIFT', message: `Futures forked from ${s('baseMutationId')}: ${s('hypothesis')}`, relatedEntityId: s('simulationId'), severity: 'INFO' };
    case 'simulation.completed':
      return { ...base, actor: 'EPOCH futures', category: 'DRIFT', message: `Futures measured; recommended ${s('recommended') || 'none'}`, relatedEntityId: s('simulationId'), severity: 'SUCCESS' };
    case 'repo.file_changed':
      return { ...base, actor: 'IBM Bob (hook)', category: 'SPECIALIST', message: `Bob edited ${s('file') || 'the sample repo'}; boundary integrity if approved: ${typeof p.boundaryIntegrityIfApproved === 'number' ? p.boundaryIntegrityIfApproved.toFixed(2) : 'n/a'}`, severity: p.withinEnvelope === false ? 'WARN' : 'INFO' };
    case 'bob.activity':
      return { ...base, actor: 'IBM Bob', category: 'SPECIALIST', message: `${s('event')}${s('detail') ? `: ${s('detail')}` : ''}`, severity: 'INFO' };
    case 'evidence.created':
      return s('agent').startsWith('bob') ? { ...base, actor: `IBM Bob · ${s('agent').replace('bob:', '')}`, category: 'SPECIALIST', message: s('claim'), relatedEntityId: s('evidenceId'), severity: s('severity') === 'critical' ? 'CRITICAL' : s('severity') === 'high' ? 'WARN' : 'INFO' } : undefined;
    default:
      return undefined;
  }
}
