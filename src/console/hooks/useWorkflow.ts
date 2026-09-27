import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import { apiPost, describeError, isNotFound } from '../api/client';
import type { Workflow, Mutation } from '../types';

/**
 * CURRENT lens: the workflow to show (GET /api/v1/workflows/:id when an id is
 * given, else /api/v1/workflows/active), the reviewer's decision, and running
 * EPOCH's specialists up to the approval gate.
 */
export function useWorkflow(workflowId?: string | null) {
  const path = workflowId ? `/api/v1/workflows/${encodeURIComponent(workflowId)}` : '/api/v1/workflows/active';
  const { data, error, isLoading, reload } = useApi<Workflow>(path, ['workflow', 'task', 'mutation']);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastMutation, setLastMutation] = useState<Mutation | null>(null);

  const submitDecision = useCallback(async (decision: 'APPROVED' | 'REJECTED', rationale?: string) => {
    if (!data) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const result = await apiPost<{ workflow: Workflow; mutation: Mutation | null }>(
        `/api/v1/workflows/${encodeURIComponent(data.id)}/decision`,
        { decision, rationale: rationale?.trim() || undefined, actor: 'reviewer' }
      );
      setLastMutation(result.mutation);
      await reload();
    } catch (err) {
      setActionError(describeError(err, 'write'));
    } finally {
      setIsSubmitting(false);
    }
  }, [data, reload]);

  /** POST /api/workflows/:id/run-to-approval (note: /api, not /api/v1). Takes ~30 s on the hosted free tier. */
  const runToApproval = useCallback(async () => {
    if (!data) return;
    setIsRunning(true);
    setActionError(null);
    try {
      await apiPost(`/api/workflows/${encodeURIComponent(data.id)}/run-to-approval`, { actor: 'reviewer' });
      await reload();
    } catch (err) {
      setActionError(describeError(err, 'write'));
      await reload();
    } finally {
      setIsRunning(false);
    }
  }, [data, reload]);

  const notFound = !data && isNotFound(error);

  return {
    workflow: data ?? null,
    isLoading: isLoading && !data,
    error: notFound || data ? null : error,
    notFound,
    reload,
    submitDecision,
    isSubmitting,
    runToApproval,
    isRunning,
    actionError,
    lastMutation
  };
}
