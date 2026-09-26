import { createHash } from 'node:crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function fileTreeDigest(files: string[]): string {
  const sortedFiles = [...files].sort();
  return sha256(sortedFiles.join('\n'));
}

export function stateHash(components: string[], couplingScore: number, boundaryScore: number): string {
  const sortedComponents = [...components].sort();
  const input = `${sortedComponents.join(',')}|${couplingScore.toFixed(4)}|${boundaryScore.toFixed(4)}`;
  return sha256(input);
}
