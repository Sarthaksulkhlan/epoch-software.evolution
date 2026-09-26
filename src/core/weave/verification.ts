import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { artifacts, driftFindings } from '../../store/index.js';
import type { Verification } from '../../agents/contracts.js';
import { diffScans } from '../../graph/scanner/diff.js';
import { scanRepository } from '../../graph/scanner/scanner.js';
import { runPatterns } from '../../graph/drift/patterns.js';
import { subjectOf } from '../../graph/drift/detector.js';
import { changedFiles, epochWorkDir, sampleRepoPath } from '../../sandbox/sample-repo.js';
import { runProbes, runTests } from '../../sandbox/runner.js';
import { generateArtifactId } from '../../shared/utils/id.js';
import { EvidenceWriter } from '../epoch/evidence-writer.js';
import { loadHistory } from '../epoch/history.js';
import { getRepoSpec } from '../epoch/spec-registry.js';
import { trajectoryEngine } from '../epoch/trajectory.js';

/**
 * Checks the working tree before approval: tests, runtime probes, a structural
 * scan of the system as it would be, and the drift findings approving would
 * raise. This is the "likely trajectory impact" of dossier §23 step 4.
 */
export async function verifyWorkingTree(workflowId: string): Promise<Verification> {
  const repo = sampleRepoPath();
  const spec = getRepoSpec();
  const history = loadHistory();
  const head = history.at(-1)?.scan;

  const [tests, probes] = await Promise.all([runTests(repo), runProbes(repo)]);
  const scan = scanRepository(repo, spec, { tests, probes, previous: head });
  const diff = diffScans(head ?? scan, scan);

  const preview = runPatterns(
    [...history.map(h => ({ mutationId: h.mutation.mutation_id, scan: h.scan, diff: h.diff })), { mutationId: 'PREVIEW', scan, diff }],
    spec
  );
  const open = driftFindings.listDriftFindings({ status: 'open' });
  const driftPreview = preview.filter(outcome => {
    const existing = open.find(f => f.pattern === outcome.pattern && subjectOf(f) === outcome.subject);
    return !existing || existing.severity !== outcome.severity;
  });

  const verification: Verification = {
    tests,
    probes,
    scan,
    diff,
    driftPreview,
    changedFiles: changedFiles(repo),
    withinEnvelope: trajectoryEngine.isWithinEnvelope(scan.couplingScore, scan.boundaryIntegrityScore)
  };

  const at = Date.now();
  const writer = new EvidenceWriter(workflowId, 'scanner', at, 'verification');
  const file = path.join(epochWorkDir(), 'verifications', `${workflowId}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const content = JSON.stringify(verification, null, 2);
  fs.writeFileSync(file, content, 'utf8');
  const ref = path.relative(process.cwd(), file).split(path.sep).join('/');
  artifacts.insertArtifact({
    artifact_id: generateArtifactId(),
    type: 'test_result',
    source_task_id: writer.taskId,
    content_ref: ref,
    hash: crypto.createHash('sha256').update(content).digest('hex'),
    created_at: at,
    mime_type: 'application/json'
  });

  writer.record(
    `Verification of the working tree (${verification.changedFiles.length} changed file(s): ${verification.changedFiles.join(', ') || 'none'}): ` +
      `${tests.passed} tests passed, ${tests.failed} failed; ${probes.filter(p => p.ok).length}/${probes.length} probes pass.`,
    'observed',
    ref,
    tests.failed > 0 || probes.some(p => !p.ok) ? 'high' : undefined
  );
  writer.finish(at, ref);
  return verification;
}

/** The latest stored verification for a workflow, if one ran. */
export function loadVerification(workflowId: string): Verification | undefined {
  const file = path.join(epochWorkDir(), 'verifications', `${workflowId}.json`);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Verification) : undefined;
}
