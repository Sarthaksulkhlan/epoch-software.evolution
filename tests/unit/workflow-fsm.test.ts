import { describe, expect, it } from 'vitest';
import { WorkflowEngine } from '../../src/core/weave/workflow-engine.js';
import { parseRequirement } from '../../src/core/weave/context-builder.js';
import type { WorkflowStatus } from '../../src/shared/schema/workflow.schema.js';

const engine = new WorkflowEngine();

describe('WEAVE workflow state machine (ADR-012)', () => {
  const happyPath: WorkflowStatus[] = ['PENDING', 'CONTEXT_LOADING', 'PLANNING', 'DELEGATING', 'EXECUTING', 'VERIFYING', 'AWAITING_APPROVAL', 'COMPLETED'];

  it('allows the happy path one step at a time', () => {
    for (let i = 1; i < happyPath.length; i++) {
      expect(engine.canTransition(happyPath[i - 1]!, happyPath[i]!)).toBe(true);
    }
  });

  it('rejects skipping stages', () => {
    expect(engine.canTransition('PENDING', 'EXECUTING')).toBe(false);
    expect(engine.canTransition('EXECUTING', 'COMPLETED')).toBe(false);
    expect(engine.canTransition('PLANNING', 'AWAITING_APPROVAL')).toBe(false);
  });

  it('allows retry from verification and changes requested at the gate', () => {
    expect(engine.canTransition('VERIFYING', 'EXECUTING')).toBe(true);
    expect(engine.canTransition('AWAITING_APPROVAL', 'EXECUTING')).toBe(true);
  });

  it('allows abort from every open state and nothing out of terminal states', () => {
    for (const state of happyPath.slice(0, -1)) expect(engine.canTransition(state, 'REJECTED')).toBe(true);
    expect(engine.getValidTransitions('COMPLETED')).toEqual([]);
    expect(engine.getValidTransitions('REJECTED')).toEqual([]);
  });
});

describe('requirement parsing', () => {
  it('uses the first sentence as the statement and the rest as acceptance criteria', () => {
    const parsed = parseRequirement('Extend chargeback eligibility from 15 to 30 days. All customer-facing touchpoints must reflect the new window.\n- Receipts show 30 days');
    expect(parsed.statement).toBe('Extend chargeback eligibility from 15 to 30 days.');
    expect(parsed.acceptanceCriteria).toEqual(['All customer-facing touchpoints must reflect the new window.', 'Receipts show 30 days']);
  });
});
