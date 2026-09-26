import type { AgentContext, AgentResult } from './contracts.js';

/**
 * No-op hook for direct IBM Bob Agent-mode synthesis.
 *
 * In the full architecture Bob reads all specialist evidence and composes the
 * decision package. For the scaffold phase this hook preserves the contract
 * without requiring a live Bob session; it will be wired to the real Bob
 * invocation in a later step.
 */
export async function invokeBobSynthesis(
  _ctx: AgentContext,
  _specialistResults: AgentResult[]
): Promise<AgentResult> {
  return {
    agentName: 'bob-synthesis',
    evidence: [],
    summary: 'Bob synthesis hook is not yet wired.',
    riskLevel: 'low'
  };
}
