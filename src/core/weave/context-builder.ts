import fs from 'node:fs';
import path from 'node:path';
import { events, incidents, invariants, mutations, trajectory, workflows } from '../../store/index.js';
import type { ContextBundle, MutationSummary } from '../../shared/schema/context-bundle.schema.js';
import type { Invariant } from '../../shared/schema/invariant.schema.js';
import { fileTreeDigest } from '../../shared/utils/hash.js';
import { currentBranch, EPOCH_WORK_DIR, headSha, sampleRepoPath } from '../../sandbox/sample-repo.js';
import type { ScanResult } from '../../graph/scanner/scanner.js';
import { componentOfFile, keywords, listSource } from '../../agents/code-search.js';

const GENERIC = new Set(['days', 'must', 'from', 'with', 'that', 'this', 'into', 'should', 'extend', 'reflect', 'customer', 'customer-facing', 'touchpoints', 'every', 'when', 'will']);

export interface ParsedRequirement {
  statement: string;
  acceptanceCriteria: string[];
}

/** First sentence is the statement; remaining sentences and bullet lines are acceptance criteria. */
export function parseRequirement(text: string): ParsedRequirement {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const bullets = lines.filter(l => /^[-*•]\s+/.test(l)).map(l => l.replace(/^[-*•]\s+/, ''));
  const prose = lines.filter(l => !/^[-*•]\s+/.test(l)).join(' ');
  const sentences = prose.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
  return {
    statement: sentences[0] ?? prose,
    acceptanceCriteria: [...sentences.slice(1), ...bullets]
  };
}

/**
 * Assembles the ContextBundle handed to Bob and to every specialist. Every
 * item carries a provenance record pointing at where it came from.
 */
export class ContextBuilder {
  build(workflowId: string): ContextBundle {
    const workflow = workflows.getWorkflow(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    const event = events.getEvent(workflow.trigger_event_id);
    const requirementText = typeof event?.payload.requirement === 'string' ? event.payload.requirement : workflow.title ?? '';
    const parsed = parseRequirement(requirementText);
    const at = Date.now();
    const repo = sampleRepoPath();

    const files = fs.existsSync(repo) ? listSource(repo) : [];
    const words = keywords(requirementText).filter(w => !GENERIC.has(w) && w.length >= 5);
    const relevant = files.filter(file => {
      const text = fs.readFileSync(path.join(repo, file), 'utf8').toLowerCase();
      return words.some(w => text.includes(w) || text.includes(w.replace(/-/g, '_')));
    });
    const components = [...new Set(relevant.map(componentOfFile))];

    const prior = new Map<string, MutationSummary>();
    for (const component of components) {
      for (const m of mutations.listMutations({ component, limit: 10 })) {
        prior.set(m.mutation_id, {
          mutation_id: m.mutation_id,
          intent: m.intent,
          affected_components: m.affected_components,
          trajectory_delta: m.trajectory_delta,
          created_at: m.created_at
        });
      }
    }
    const priorMutations = [...prior.values()].sort((a, b) => b.created_at - a.created_at).slice(0, 10);

    const scoped = new Map<string, Invariant>();
    for (const component of components) {
      for (const inv of invariants.listInvariantsByComponent(component)) scoped.set(inv.invariant_id, inv);
    }

    const head = fs.existsSync(path.join(repo, '.git')) ? headSha(repo) : 'unknown';
    const bundle: ContextBundle = {
      workflow_id: workflowId,
      assembled_at: at,
      repository: {
        repo: 'sample-app',
        branch: fs.existsSync(path.join(repo, '.git')) ? currentBranch(repo) : 'main',
        head_commit: head,
        file_tree_digest: fileTreeDigest(files),
        relevant_files: relevant
      },
      requirements: requirementText.length > 0
        ? [{ id: `${workflowId}-req`, statement: parsed.statement, acceptance_criteria: parsed.acceptanceCriteria, source: `event:${workflow.trigger_event_id}` }]
        : [],
      prior_mutations: priorMutations,
      invariants: [...scoped.values()],
      provenance: [
        { item_id: `${workflowId}-req`, source_type: 'event', source_ref: `event:${workflow.trigger_event_id}`, retrieved_at: at },
        { item_id: 'repository', source_type: 'git', source_ref: `sample-repo@${head}`, retrieved_at: at },
        ...relevant.map(file => ({ item_id: file, source_type: 'code', source_ref: `sample-repo@${head.slice(0, 7)}:${file}`, retrieved_at: at })),
        ...priorMutations.map(m => ({ item_id: m.mutation_id, source_type: 'mutation', source_ref: `graph:${m.mutation_id}`, retrieved_at: at })),
        ...[...scoped.keys()].map(id => ({ item_id: id, source_type: 'invariant', source_ref: `invariants.json#${id}`, retrieved_at: at }))
      ]
    };

    const latestScan = trajectory.getLatestScan()?.scan as ScanResult | undefined;
    const probes = latestScan?.probes ?? [];
    const openIncidents = incidents.listIncidents().filter(i => i.status !== 'resolved' && i.status !== 'wont_fix');
    if (workflow.kind === 'incident' || openIncidents.length > 0) {
      bundle.telemetry = {
        error_rate: probes.length > 0 ? probes.filter(p => !p.ok).length / probes.length : 0,
        p99_latency_ms: 0,
        recent_alerts: openIncidents.map(i => `${i.incident_id}: ${i.signal}`)
      };
    }

    const file = path.join(EPOCH_WORK_DIR, 'context', `${workflowId}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(bundle, null, 2), 'utf8');
    workflows.setWorkflowRefs(workflowId, { context_ref: path.relative(process.cwd(), file).split(path.sep).join('/') });
    return bundle;
  }

  /** The bundle saved for a workflow, rebuilt when it is missing. */
  load(workflowId: string): ContextBundle {
    const workflow = workflows.getWorkflow(workflowId);
    const ref = workflow?.context_ref;
    if (ref && fs.existsSync(ref)) return JSON.parse(fs.readFileSync(ref, 'utf8')) as ContextBundle;
    return this.build(workflowId);
  }
}

export const contextBuilder = new ContextBuilder();
