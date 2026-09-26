import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { FindingSeverity } from '../../shared/schema/evidence.schema.js';

/**
 * Schema for a watched repository's invariants.json: the machine-checkable
 * rules EPOCH evaluates against the code at every mutation.
 */

const ConstantRef = z.object({ file: z.string().min(1), name: z.string().min(1) });
export type ConstantRef = z.infer<typeof ConstantRef>;

const ImportBoundaryRule = z.object({
  type: z.literal('import-boundary'),
  modules: z.array(z.object({
    module: z.string().min(1),
    allowedImporters: z.array(z.string().min(1)).min(1)
  })).min(1),
  weakenedAt: z.number().int().min(1),
  violatedAt: z.number().int().min(1)
});

const ConstantOrderRule = z.object({
  type: z.literal('constant-order'),
  lesser: ConstantRef,
  greater: ConstantRef,
  escalateWhen: z.object({ module: z.string().min(1), importedOutside: z.string().min(1) }).optional()
});

const TestRule = z.object({
  type: z.literal('test'),
  file: z.string().min(1)
});

export const InvariantRule = z.discriminatedUnion('type', [ImportBoundaryRule, ConstantOrderRule, TestRule]);
export type InvariantRule = z.infer<typeof InvariantRule>;

export const InvariantCategory = z.enum(['BOUNDARY', 'DATA_FLOW', 'TEMPORAL', 'SECURITY']);
export type InvariantCategory = z.infer<typeof InvariantCategory>;

export const InvariantSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: InvariantCategory,
  statement: z.string().min(1),
  owner: z.string().optional(),
  components: z.array(z.string().min(1)).min(1),
  rule: InvariantRule
});
export type InvariantSpec = z.infer<typeof InvariantSpecSchema>;

export const ProbeSpecSchema = z.object({
  id: z.string().min(1),
  component: z.string().min(1),
  incident: z.object({ signal: z.string().min(1), severity: FindingSeverity })
});
export type ProbeSpec = z.infer<typeof ProbeSpecSchema>;

export const ConsistencySpecSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  constants: z.array(ConstantRef).min(2)
});
export type ConsistencySpec = z.infer<typeof ConsistencySpecSchema>;

export const RepoSpecSchema = z.object({
  invariants: z.array(InvariantSpecSchema),
  probes: z.array(ProbeSpecSchema).default([]),
  consistency: z.array(ConsistencySpecSchema).default([])
});
export type RepoSpec = z.infer<typeof RepoSpecSchema>;

export function loadSpec(repoPath: string): RepoSpec {
  const file = path.join(repoPath, 'invariants.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  return RepoSpecSchema.parse(raw);
}

/** Every constant the spec refers to, so the scanner reads only what it needs. */
export function referencedConstants(spec: RepoSpec): ConstantRef[] {
  const refs: ConstantRef[] = [];
  for (const invariant of spec.invariants) {
    if (invariant.rule.type === 'constant-order') refs.push(invariant.rule.lesser, invariant.rule.greater);
  }
  for (const check of spec.consistency) refs.push(...check.constants);
  const seen = new Set<string>();
  return refs.filter(ref => {
    const key = constantKey(ref);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function constantKey(ref: ConstantRef): string {
  return `${ref.file}#${ref.name}`;
}
