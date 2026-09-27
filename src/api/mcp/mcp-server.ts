import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

/**
 * EPOCH-MCP (ADR-009, amended by ADR-026). A stdio MCP server that gives Bob
 * EPOCH's longitudinal memory and lets Bob drive WEAVE workflows. It is a thin
 * client of the EPOCH API, so every write shows up on the console's live
 * stream. There is deliberately no approve tool: the human gate stays human.
 */

const API = (process.env.EPOCH_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const AUTHOR = process.env.EPOCH_MCP_AUTHOR ?? 'IBM Bob';

async function call(method: 'GET' | 'POST', path: string, body?: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  } catch {
    throw new Error(`EPOCH API is not reachable at ${API}. Start it with "pnpm api:dev".`);
  }
  const text = await response.text();
  const data = text.length > 0 ? (JSON.parse(text) as unknown) : {};
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data ? String((data as { error: unknown }).error) : response.statusText;
    throw new Error(`${method} ${path} failed (${response.status}): ${message}`);
  }
  return data;
}

async function callText(path: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { headers: { Accept: 'text/markdown' } });
  } catch {
    throw new Error(`EPOCH API is not reachable at ${API}. Start it with "pnpm api:dev".`);
  }
  const text = await response.text();
  if (!response.ok) throw new Error(`GET ${path} failed (${response.status}): ${text.slice(0, 200)}`);
  return text;
}

function ok(summary: string, data?: unknown): CallToolResult {
  const text = data === undefined ? summary : `${summary}\n\n${JSON.stringify(data, null, 2)}`;
  return { content: [{ type: 'text', text }] };
}

function fail(error: unknown): CallToolResult {
  return { content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true };
}

async function run(fn: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (error) {
    return fail(error);
  }
}

type Json = Record<string, unknown>;
const asJson = (value: unknown): Json => (typeof value === 'object' && value !== null ? (value as Json) : {});

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;
const WRITES = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
const SPECIALISTS = ['context', 'historian', 'security', 'qa', 'evolution', 'incident', 'synthesis'] as const;

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'epoch', version: '0.4.0' });

  // ── Longitudinal memory (read-only) ───────────────────────────────────────

  server.registerTool('get_trajectory_snapshot', {
    title: 'Trajectory snapshot',
    description: 'Current boundary integrity, coupling, envelope status, open drift findings, current epoch and invariant statuses of the watched system.',
    annotations: READ_ONLY
  }, () => run(async () => {
    const { snapshot } = asJson(await call('GET', '/api/trajectory/snapshot'));
    const s = asJson(snapshot);
    return ok(`Boundary integrity ${s.boundaryIntegrityScore}, coupling ${s.couplingScore}, ${s.withinEnvelope ? 'inside' : 'OUTSIDE'} the envelope, ${s.openDriftFindings} open drift finding(s), epoch ${s.currentEpochId}.`, s);
  }));

  server.registerTool('get_mutation_history', {
    title: 'Mutation history',
    description: 'Recent mutations (intent, author, touched components, trajectory delta), optionally for one component such as "disputes" or "ledger".',
    inputSchema: { component: z.string().optional(), limit: z.number().int().min(1).max(50).default(10) },
    annotations: READ_ONLY
  }, ({ component, limit }) => run(async () => {
    const query = new URLSearchParams({ limit: String(limit ?? 10) });
    if (component) query.set('component', component);
    const { mutations } = asJson(await call('GET', `/api/mutations?${query}`));
    const list = (mutations as Json[]).map(m => ({ id: m.mutation_id, intent: m.intent, author: m.author, components: m.affected_components, epoch: m.epoch_id, delta: m.trajectory_delta }));
    return ok(`${list.length} mutation(s)${component ? ` touching ${component}` : ''}, newest first.`, list);
  }));

  server.registerTool('get_mutation', {
    title: 'Mutation detail',
    description: 'One mutation with its evidence, weakened invariants, related incidents, drift findings and diff.',
    inputSchema: { mutation_id: z.string().regex(/^M-\d+$/) },
    annotations: READ_ONLY
  }, ({ mutation_id }) => run(async () => {
    const detail = asJson(await call('GET', `/api/mutations/${mutation_id}`));
    const diff = typeof detail.diff === 'string' ? detail.diff.slice(0, 4000) : null;
    return ok(`${mutation_id}: ${String(asJson(detail.mutation).intent)}`, { ...detail, diff });
  }));

  server.registerTool('check_invariants', {
    title: 'Invariant status',
    description: 'Machine-checked invariants with their status (HOLDING, WEAKENED, VIOLATED) and the scanner detail. Filter by components to see what a change could affect.',
    inputSchema: { components: z.array(z.string()).optional() },
    annotations: READ_ONLY
  }, ({ components }) => run(async () => {
    const { invariants } = asJson(await call('GET', '/api/invariants'));
    const list = (invariants as Json[]).filter(i => !components || components.length === 0 || (i.scope_components as string[]).some(c => components.includes(c)));
    return ok(list.map(i => `${i.invariant_id} ${i.status}: ${i.name}`).join('\n'), list.map(i => ({ id: i.invariant_id, name: i.name, status: i.status, scope: i.scope_components, detail: i.detail })));
  }));

  server.registerTool('get_causal_chain', {
    title: 'Causal archaeology',
    description: 'Candidate causal chain for a drift finding, incident, invariant, mutation or free-text symptom. Returns ranked candidates with the earliest plausible mutation. Results are hypotheses, never proof.',
    inputSchema: {
      symptom: z.string().optional(),
      finding_id: z.string().optional(),
      incident_id: z.string().optional(),
      invariant_id: z.string().optional(),
      mutation_id: z.string().optional()
    },
    annotations: READ_ONLY
  }, args => run(async () => {
    const query = new URLSearchParams();
    if (args.finding_id) query.set('finding', args.finding_id);
    else if (args.incident_id) query.set('incident', args.incident_id);
    else if (args.invariant_id) query.set('invariant', args.invariant_id);
    else if (args.mutation_id) query.set('mutation', args.mutation_id);
    else query.set('symptom', args.symptom ?? 'open drift');
    const { chain } = asJson(await call('GET', `/api/graph/causal-chain?${query}`));
    const c = asJson(chain);
    const earliest = asJson(c.earliestPlausible);
    const proximate = asJson(c.mostProximate);
    return ok(
      `Candidate causal chain for ${asJson(c.subject).id}: ${(c.chain as string[]).join(' → ') || 'none'}. ` +
        `Earliest plausible: ${earliest.mutationId ?? 'none'} (${earliest.evidenceStatus ?? '-'}); most proximate: ${proximate.mutationId ?? 'none'} (${proximate.evidenceStatus ?? '-'}). ${c.language}`,
      c
    );
  }));

  server.registerTool('list_drift_findings', {
    title: 'Drift findings',
    description: 'Boundary erosion, invariant weakening and dependency growth findings with severity, measurement and the mutations behind them.',
    inputSchema: { status: z.enum(['open', 'resolved']).optional() },
    annotations: READ_ONLY
  }, ({ status }) => run(async () => {
    const { findings } = asJson(await call('GET', `/api/drift${status ? `?status=${status}` : ''}`));
    const list = findings as Json[];
    return ok(list.map(f => `${f.finding_id} ${f.severity} ${f.status}: ${f.title}`).join('\n') || 'No drift findings.', list);
  }));

  server.registerTool('list_active_workflows', {
    title: 'Active workflows',
    description: 'WEAVE workflows that have not completed or been rejected.',
    annotations: READ_ONLY
  }, () => run(async () => {
    const { workflows } = asJson(await call('GET', '/api/workflows/active'));
    const list = (workflows as Json[]).map(w => ({ id: w.workflow_id, title: w.title, kind: w.kind, status: w.status, stage: w.current_stage }));
    return ok(`${list.length} active workflow(s).`, list);
  }));

  server.registerTool('get_workflow_status', {
    title: 'Workflow status',
    description: 'Status, valid next transitions, task graph, evidence counts, decision and resulting mutation of a workflow.',
    inputSchema: { workflow_id: z.string().min(1) },
    annotations: READ_ONLY
  }, ({ workflow_id }) => run(async () => {
    const r = asJson(await call('GET', `/api/workflows/${workflow_id}`));
    const wf = asJson(r.workflow);
    const tasks = (r.tasks as Json[]).map(t => ({ agent: t.agent_type, status: t.status, claims: (t.evidence as unknown[]).length }));
    const decision = (r.decisions as Json[]).at(-1);
    const mutation = r.mutation ? asJson(r.mutation).mutation_id : null;
    return ok(
      `${workflow_id} is ${wf.status}${wf.current_stage ? ` (${wf.current_stage})` : ''}.` +
        (decision ? ` Decision: ${decision.action} by ${decision.actor}.` : '') +
        (mutation ? ` Recorded as ${mutation}.` : ''),
      { status: wf.status, stage: wf.current_stage, validTransitions: r.validTransitions, tasks, decision: decision ?? null, mutation }
    );
  }));

  server.registerTool('get_context_bundle', {
    title: 'Context bundle',
    description: 'Requirement, acceptance criteria, relevant files, prior mutations, invariants in scope and provenance for a workflow.',
    inputSchema: { workflow_id: z.string().min(1) },
    annotations: READ_ONLY
  }, ({ workflow_id }) => run(async () => {
    const { context } = asJson(await call('GET', `/api/workflows/${workflow_id}/context`));
    return ok(`Context bundle for ${workflow_id}.`, context);
  }));

  server.registerTool('get_decision_package', {
    title: 'Decision package',
    description: 'What the human sees at the approval gate: risk, recommendation, open questions, measured improvements, trajectory preview and drift preview.',
    inputSchema: { workflow_id: z.string().min(1) },
    annotations: READ_ONLY
  }, ({ workflow_id }) => run(async () => {
    const { package: pkg } = asJson(await call('GET', `/api/workflows/${workflow_id}/decision-package`));
    const p = asJson(pkg);
    return ok(`Risk ${p.riskLevel}. ${p.recommendation}`, { ...p, evidenceByAgent: undefined });
  }));

  server.registerTool('get_repo_status', {
    title: 'Sample repository status',
    description: 'Where the watched payments service lives on disk (edit files there), its HEAD commit and uncommitted changes.',
    annotations: READ_ONLY
  }, () => run(async () => {
    const status = asJson(await call('GET', '/api/repo/status'));
    return ok(`Edit the watched system in ${status.path}. HEAD ${String(status.head).slice(0, 7)}; ${(status.changedFiles as string[]).length} changed file(s).`, status);
  }));

  // ── Driving WEAVE workflows (writes; Bob asks before each call) ──────────

  server.registerTool('start_workflow', {
    title: 'Start a WEAVE workflow',
    description: 'Record a requirement as an event and open a workflow. EPOCH assembles the context bundle; the workflow waits in PLANNING for record_plan.',
    inputSchema: {
      requirement: z.string().min(3),
      title: z.string().optional(),
      kind: z.enum(['feature', 'incident', 'remediation']).default('feature')
    },
    annotations: WRITES
  }, ({ requirement, title, kind }) => run(async () => {
    const r = asJson(await call('POST', '/api/workflows', { requirement, title, kind, author: AUTHOR, source: 'epoch-mcp' }));
    const wf = asJson(r.workflow);
    const ctx = asJson(r.context);
    const repo = asJson(ctx.repository);
    return ok(
      `Workflow ${wf.workflow_id} is ${wf.status}. Relevant files: ${(repo.relevant_files as string[]).join(', ') || 'none found'}. ` +
        `${(ctx.prior_mutations as unknown[]).length} prior mutation(s) and ${(ctx.invariants as unknown[]).length} invariant(s) in scope. Next: record_plan.`,
      { workflow_id: wf.workflow_id, status: wf.status, context: ctx }
    );
  }));

  server.registerTool('record_plan', {
    title: 'Record the plan',
    description: 'Store Bob\'s plan for the workflow and create the specialist task graph. Moves the workflow to EXECUTING.',
    inputSchema: { workflow_id: z.string().min(1), plan: z.string().min(1).max(20_000) },
    annotations: WRITES
  }, ({ workflow_id, plan }) => run(async () => {
    const r = asJson(await call('POST', `/api/workflows/${workflow_id}/plan`, { actor: AUTHOR, plan }));
    const layers = (asJson(r.plan).layers as Json[][]).map(l => l.map(t => t.agent).join(' ∥ '));
    return ok(`Plan recorded; ${workflow_id} is EXECUTING. Specialist layers: ${layers.join(' → ')}.`, r.plan);
  }));

  server.registerTool('run_specialist', {
    title: 'Run an EPOCH specialist',
    description: 'Run one of EPOCH\'s deterministic specialists (they measure; they do not guess) and record its claims as evidence. Use from a subagent: Historian, Security and QA can run in parallel.',
    inputSchema: { workflow_id: z.string().min(1), agent: z.enum(SPECIALISTS) },
    annotations: WRITES
  }, ({ workflow_id, agent }) => run(async () => {
    const r = asJson(await call('POST', `/api/workflows/${workflow_id}/specialists/${agent}`));
    const claims = (r.evidence as Json[]).map(e => `[${e.status}${e.finding_severity ? `/${e.finding_severity}` : ''}] ${e.claim}`);
    return ok(`${agent}: ${r.summary} (risk ${r.riskLevel})\n${claims.join('\n')}`);
  }));

  server.registerTool('record_evidence', {
    title: 'Record a claim',
    description: 'Record Bob\'s own claim on the workflow. Use "observed" only for things you measured, "inferred" for conclusions and "hypothesised" for candidate explanations.',
    inputSchema: {
      workflow_id: z.string().min(1),
      claim: z.string().min(3).max(4000),
      status: z.enum(['observed', 'inferred', 'hypothesised']),
      source_ref: z.string().min(1),
      severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
      subagent: z.string().default('bob')
    },
    annotations: WRITES
  }, args => run(async () => {
    const r = asJson(await call('POST', `/api/workflows/${args.workflow_id}/evidence`, {
      claim: args.claim, status: args.status, source_ref: args.source_ref, severity: args.severity, agent: args.subagent
    }));
    return ok(`Recorded ${asJson(r.evidence).evidence_id} (${args.status}).`);
  }));

  server.registerTool('request_approval', {
    title: 'Request approval',
    description: 'Verify the working tree (tests, runtime probes, structural scan, drift preview), run the verification specialists and open the human approval gate. Returns the decision package. A human approves or rejects in the EPOCH console.',
    inputSchema: { workflow_id: z.string().min(1) },
    annotations: WRITES
  }, ({ workflow_id }) => run(async () => {
    const { package: pkg } = asJson(await call('POST', `/api/workflows/${workflow_id}/request-approval`, { actor: AUTHOR }));
    const p = asJson(pkg);
    const preview = asJson(p.trajectoryPreview);
    const transitions = (preview.invariantTransitions as Json[] | undefined ?? []).map(t => `${t.invariantId} ${t.from}→${t.to}`);
    return ok(
      `Approval requested. Risk ${p.riskLevel}. ${p.recommendation}` +
        (transitions.length > 0 ? ` If approved: ${transitions.join(', ')}.` : '') +
        ` Waiting for a human decision in the console; poll get_workflow_status.`,
      { riskLevel: p.riskLevel, recommendation: p.recommendation, openQuestions: p.openQuestions, improvements: p.improvements, trajectoryPreview: p.trajectoryPreview, driftPreview: p.driftPreview, tests: p.tests, probes: p.probes }
    );
  }));

  server.registerTool('start_incident_workflow', {
    title: 'Investigate an incident',
    description: 'Open an incident workflow with the incident\'s candidate causal chain in its context.',
    inputSchema: { incident_id: z.string().regex(/^INC-\d+$/) },
    annotations: WRITES
  }, ({ incident_id }) => run(async () => {
    const r = asJson(await call('POST', `/api/incidents/${incident_id}/workflow`, { actor: AUTHOR }));
    return ok(`Workflow ${asJson(r.workflow).workflow_id} opened for ${incident_id}.`, { workflow: r.workflow, chain: r.chain });
  }));

  // ── Counterfactual futures ─────────────────────────────────────────────────

  server.registerTool('fork_futures', {
    title: 'Fork counterfactual futures',
    description: 'Create one to three isolated git worktrees of the watched system at a mutation (default: the latest). Implement each future in its worktree path, then call evaluate_future. Nothing touches the real repository.',
    inputSchema: {
      hypothesis: z.string().min(5),
      base_mutation_id: z.string().regex(/^M-\d+$/).optional(),
      scenarios: z.array(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/), label: z.string(), description: z.string() })).min(1).max(3)
    },
    annotations: WRITES
  }, args => run(async () => {
    const r = asJson(await call('POST', '/api/simulations', { hypothesis: args.hypothesis, base_mutation_id: args.base_mutation_id, scenarios: args.scenarios }));
    const sim = asJson(r.simulation);
    const paths = (sim.scenarios as Json[]).map(s => `${s.scenario_id}: ${s.worktree_path}`);
    return ok(`Simulation ${sim.simulation_id} forked from ${sim.base_mutation_id}. Implement each future in its worktree:\n${paths.join('\n')}`, { simulation_id: sim.simulation_id, scenarios: sim.scenarios });
  }));

  server.registerTool('evaluate_future', {
    title: 'Measure a future',
    description: 'Run tests, runtime probes and the structural scan inside one future\'s worktree and record the measured outcome.',
    inputSchema: { simulation_id: z.string().min(1), scenario_id: z.string().min(1) },
    annotations: WRITES
  }, ({ simulation_id, scenario_id }) => run(async () => {
    const r = asJson(await call('POST', `/api/simulations/${simulation_id}/scenarios/${scenario_id}/evaluate`));
    const scenario = (asJson(r.simulation).scenarios as Json[]).find(s => s.scenario_id === scenario_id) ?? {};
    return ok(
      `Future ${scenario_id}: boundary integrity ${scenario.boundary_integrity_after}, coupling ${scenario.coupling_score_after}, ` +
        `${scenario.tests_passed} tests passed, ${scenario.tests_failed} failed, failing probes: ${(scenario.probes_failed as string[] | undefined)?.join(', ') || 'none'}. Recommended so far: ${r.recommended ?? 'n/a'}.`,
      scenario
    );
  }));

  server.registerTool('get_simulation', {
    title: 'Simulation results',
    description: 'All futures of a simulation with their measurements and the recommended one. A human selects the future to adopt in the console.',
    inputSchema: { simulation_id: z.string().min(1) },
    annotations: READ_ONLY
  }, ({ simulation_id }) => run(async () => {
    const r = asJson(await call('GET', `/api/simulations/${simulation_id}`));
    return ok(`Recommended future: ${r.recommended ?? 'none yet'}.`, r);
  }));

  server.registerTool('get_evolution_report', {
    title: 'Evolution report',
    description: 'A Markdown document describing how the watched service has changed and why: current state, mutations table, drift findings, incidents, latest futures comparison and human decisions. Every figure comes from the EPOCH store.',
    annotations: READ_ONLY
  }, () => run(async () => {
    const md = await callText('/api/v1/report');
    return ok(md);
  }));

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
  console.error(`EPOCH-MCP ready on stdio; API ${API}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startMcpServer().catch(error => {
    console.error('EPOCH-MCP failed to start:', error);
    process.exit(1);
  });
}
