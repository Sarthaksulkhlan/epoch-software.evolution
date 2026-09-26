/**
 * Raw card numbers keyed by token. Only card-vault.ts may import this file
 * (invariant INV-SEC-09, PCI-DSS perimeter).
 */
export const pans = new Map<string, string>();
