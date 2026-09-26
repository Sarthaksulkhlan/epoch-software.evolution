import type { Agent, AgentContext, AgentResult } from './contracts.js';

/**
 * Runs a set of specialist agents in parallel and returns their aggregated
 * results. This is the Promise.all runner referenced by ADR-014.
 */
export class AgentCoordinator {
  async runParallel(agents: Agent[], ctx: AgentContext): Promise<AgentResult[]> {
    return Promise.all(agents.map(agent => agent.run(ctx)));
  }
}

export const agentCoordinator = new AgentCoordinator();
