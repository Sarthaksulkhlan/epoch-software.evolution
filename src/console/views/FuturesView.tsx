import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSimulations } from '../hooks/useSimulations';
import { BranchingTrajectoryDiagram } from '../components/futures/BranchingTrajectoryDiagram';
import { ScenarioCard } from '../components/futures/ScenarioCard';
import { ScenarioComparisonTable } from '../components/futures/ScenarioComparisonTable';
import { RemediationDecisionModal } from '../components/futures/RemediationDecisionModal';
import { ViewState } from '../components/shared/ViewState';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const FuturesView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const mutationIdParam = searchParams.get('mutationId');

  const {
    isLoading,
    error,
    reload,
    scenarios,
    divergenceIds,
    divergenceMutationId,
    setDivergenceMutationId,
    requestedMutationId,
    requestedMissing,
    divergenceMutation,
    selectedScenarioId,
    setSelectedScenarioId,
    activeScenario,
    adoptedScenario,
    adopt,
    isAdopting,
    adoptError,
    setAdoptError,
    isDecisionModalOpen,
    setIsDecisionModalOpen
  } = useSimulations(mutationIdParam);

  // Follow the URL when another lens links here with a different branch point.
  useEffect(() => {
    if (mutationIdParam) {
      setDivergenceMutationId(mutationIdParam);
    }
  }, [mutationIdParam, setDivergenceMutationId]);

  const openDecision = () => {
    setAdoptError(null);
    setIsDecisionModalOpen(true);
  };

  const closeDecision = () => {
    if (isAdopting) return;
    setIsDecisionModalOpen(false);
    setAdoptError(null);
  };

  /** Adopt the inspected future, then follow its remediation workflow in the Current lens. */
  const confirmAdopt = async () => {
    if (!activeScenario) return;
    const workflowId = await adopt(activeScenario.id);
    if (workflowId) navigate(`/?workflowId=${encodeURIComponent(workflowId)}`);
  };

  return (
    <div className="space-y-5 select-none font-mono">
      {/* Header Deck (Stagger 1) */}
      <div className="reveal-delay-1 p-4 rounded-sm border border-zinc-800/80 bg-[#08090d]/90 backdrop-blur flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="text-zinc-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-live" />
              Futures Engine
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500 text-[10px]">COUNTERFACTUAL REASONING PLANE</span>
          </div>

          <h1 className="text-base font-bold text-zinc-100 font-sans tracking-tight">
            Counterfactual Architecture Divergence
          </h1>

          <p className="text-xs text-zinc-400 font-sans mt-0.5 max-w-4xl leading-relaxed">
            {divergenceMutationId ? (
              <>
                What could happen next? Compare the futures forked from{' '}
                <strong className="text-zinc-200 font-mono">{divergenceMutationId}</strong>: each was applied in its own
                worktree and measured for boundary integrity, invariant health and incident risk.
              </>
            ) : (
              <>
                What could happen next? Each future is forked from a recorded mutation, applied in its own worktree and
                measured before anyone adopts it.
              </>
            )}
          </p>

          {requestedMissing && (
            <p className="text-[11px] text-zinc-500 font-sans mt-1">
              No futures were forked from {requestedMutationId}; showing the futures forked from {divergenceMutationId}.
            </p>
          )}
        </div>

        {/* Branch Point Selector with micro-interaction */}
        <div className="flex items-center gap-2 p-2 rounded-sm bg-[#06070a] border border-zinc-800 shrink-0 text-xs">
          <span className="text-zinc-400 uppercase tracking-widest text-[10px] font-bold">Branch Point:</span>
          <select
            value={divergenceMutationId ?? ''}
            disabled={divergenceIds.length === 0}
            onChange={e => {
              setDivergenceMutationId(e.target.value);
              setSearchParams({ mutationId: e.target.value });
            }}
            className="btn-control text-xs bg-[#090b10] border border-zinc-700 rounded-sm px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer disabled:cursor-not-allowed disabled:text-zinc-500"
          >
            {divergenceIds.length === 0 && <option value="">{isLoading ? 'Loading…' : 'No futures yet'}</option>}
            {divergenceIds.map(id => (
              <option key={id} value={id}>
                {id === divergenceMutationId && divergenceMutation ? `${id}: ${divergenceMutation.title}` : id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <ViewState kind="loading" />
      ) : error ? (
        <ViewState kind="error" error={error} onRetry={reload} />
      ) : !activeScenario ? (
        <ViewState
          kind="empty"
          title="No futures measured yet"
          message={
            <>
              Fork futures with <code className="font-mono text-zinc-300">pnpm demo:futures</code> or ask Bob to fork them.
            </>
          }
        />
      ) : (
        <>
          {/* Adopted Future Banner */}
          {adoptedScenario && (
            <div className="p-3.5 rounded-sm border border-emerald-500/50 bg-[#08150f] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
                <div>
                  <div className="font-bold text-emerald-300 uppercase tracking-wider">
                    Future adopted
                  </div>
                  <div className="font-sans text-zinc-300 text-xs mt-0.5">
                    Future <strong className="text-white">{adoptedScenario.title}</strong> adopted: its remediation
                    workflow is open.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-control flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-700 rounded-sm hover:bg-zinc-800 uppercase tracking-wider self-start sm:self-auto"
              >
                <span>Open in Current</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Epistemic Uncertainty Notice */}
          <div className="reveal-delay-1 p-3 rounded-sm bg-[#06070a] border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5 font-sans">
            <AlertTriangle className="w-4 h-4 text-amber-400/80 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong className="font-mono text-zinc-300 uppercase text-[11px] mr-1">Epistemic Notice:</strong>
              Each future was applied in its own worktree and measured with the service's tests, runtime probes and
              invariant scanner. The numbers describe that future's code, not production. A person decides which one to
              adopt.
            </span>
          </div>

          {/* Primary Visual Branching Trajectory Diagram (Stagger 2) */}
          <div className="reveal-delay-2">
            <BranchingTrajectoryDiagram
              originMutationId={divergenceMutationId ?? activeScenario.divergenceMutationId}
              originTitle={divergenceMutation?.title ?? null}
              scenarios={scenarios}
              selectedScenarioId={selectedScenarioId}
              appliedScenarioId={adoptedScenario?.id ?? null}
              onSelectScenario={id => setSelectedScenarioId(id)}
            />
          </div>

          {/* Detailed Branch Inspector (Stagger 3) */}
          <div className="reveal-delay-3">
            <ScenarioCard
              scenario={activeScenario}
              isSelected={true}
              isApplied={adoptedScenario?.id === activeScenario.id}
              isAdopting={isAdopting}
              otherAdopted={adoptedScenario !== null && adoptedScenario.id !== activeScenario.id}
              onSelect={() => {}}
              onInitiateRemediation={openDecision}
            />
          </div>

          {/* Side-by-Side Tradeoff Matrix (Stagger 4) */}
          <div className="reveal-delay-4">
            <ScenarioComparisonTable
              scenarios={scenarios}
              selectedScenarioId={selectedScenarioId}
              onSelectScenario={id => setSelectedScenarioId(id)}
            />
          </div>

          {/* Human Adoption Decision Modal */}
          <RemediationDecisionModal
            scenario={activeScenario}
            isOpen={isDecisionModalOpen}
            onClose={closeDecision}
            onConfirm={() => void confirmAdopt()}
            isSubmitting={isAdopting}
            error={adoptError}
          />
        </>
      )}
    </div>
  );
};
