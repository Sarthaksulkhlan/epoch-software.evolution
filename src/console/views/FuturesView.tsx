import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSimulations } from '../hooks/useSimulations';
import { BranchingTrajectoryDiagram } from '../components/futures/BranchingTrajectoryDiagram';
import { ScenarioCard } from '../components/futures/ScenarioCard';
import { ScenarioComparisonTable } from '../components/futures/ScenarioComparisonTable';
import { RemediationDecisionModal } from '../components/futures/RemediationDecisionModal';
import { GitBranch, AlertTriangle, ShieldCheck, CheckCircle2, RotateCcw, Cpu } from 'lucide-react';

export const FuturesView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const mutationIdParam = searchParams.get('mutationId');

  const {
    divergenceMutationId,
    setDivergenceMutationId,
    divergenceMutation,
    scenarios,
    selectedScenarioId,
    setSelectedScenarioId,
    activeScenario,
    appliedRemediationScenarioId,
    handleApplyRemediation,
    handleResetRemediation,
    isDecisionModalOpen,
    setIsDecisionModalOpen
  } = useSimulations(mutationIdParam || 'M-1042');

  useEffect(() => {
    if (mutationIdParam) {
      setDivergenceMutationId(mutationIdParam);
    }
  }, [mutationIdParam, setDivergenceMutationId]);

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
            What could happen next? Trace how alternative architectural interventions branching from{' '}
            <strong className="text-zinc-200 font-mono">{divergenceMutation.id}</strong> impact long-term boundary
            durability, microservice isolation, and incident recurrence.
          </p>
        </div>

        {/* Branch Point Selector with micro-interaction */}
        <div className="flex items-center gap-2 p-2 rounded-sm bg-[#06070a] border border-zinc-800 shrink-0 text-xs">
          <span className="text-zinc-400 uppercase tracking-widest text-[10px] font-bold">Branch Point:</span>
          <select
            value={divergenceMutationId}
            onChange={e => {
              setDivergenceMutationId(e.target.value);
              setSearchParams({ mutationId: e.target.value });
            }}
            className="btn-control text-xs bg-[#090b10] border border-zinc-700 rounded-sm px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="M-1042">M-1042: Chargeback Eligibility Window</option>
            <option value="M-1051">M-1051: OrderService Cache Bypass</option>
            <option value="M-1077">M-1077: Direct Ledger Partition Join</option>
          </select>
        </div>
      </div>

      {/* Applied Remediation Feedback Banner */}
      {appliedRemediationScenarioId && (
        <div className="p-3.5 rounded-sm border border-emerald-500/50 bg-[#08150f] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
            <div>
              <div className="font-bold text-emerald-300 uppercase tracking-wider">
                Remediation Plan Dispatched to IBM Bob 2.0 Execution Fabric
              </div>
              <div className="font-sans text-zinc-300 text-xs mt-0.5">
                Active path:{' '}
                <strong className="text-white">{scenarios.find(s => s.id === appliedRemediationScenarioId)?.title}</strong>.
                Boundary integrity recovery vector projected to 94%.
              </div>
            </div>
          </div>
          <button
            onClick={handleResetRemediation}
            className="btn-control flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-700 rounded-sm hover:bg-zinc-800 uppercase tracking-wider self-start sm:self-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Decision</span>
          </button>
        </div>
      )}

      {/* Epistemic Uncertainty Notice */}
      <div className="reveal-delay-1 p-3 rounded-sm bg-[#06070a] border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5 font-sans">
        <AlertTriangle className="w-4 h-4 text-amber-400/80 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong className="font-mono text-zinc-300 uppercase text-[11px] mr-1">Epistemic Notice:</strong>
          Counterfactual models project hypotheses and scenario-based estimates, not mathematically deterministic outcomes.
          Human architects maintain final governance over all architectural interventions.
        </span>
      </div>

      {/* Primary Visual Branching Trajectory Diagram (Stagger 2) */}
      <div className="reveal-delay-2">
        <BranchingTrajectoryDiagram
          originMutationId={divergenceMutation.id}
          scenarios={scenarios}
          selectedScenarioId={selectedScenarioId}
          appliedScenarioId={appliedRemediationScenarioId}
          onSelectScenario={id => setSelectedScenarioId(id)}
        />
      </div>

      {/* Detailed Branch Inspector (Stagger 3) */}
      <div className="reveal-delay-3">
        <ScenarioCard
          scenario={activeScenario}
          isSelected={true}
          isApplied={appliedRemediationScenarioId === activeScenario.id}
          onSelect={() => {}}
          onInitiateRemediation={() => setIsDecisionModalOpen(true)}
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

      {/* Human Remediation Decision Modal */}
      <RemediationDecisionModal
        scenario={activeScenario}
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        onConfirm={() => handleApplyRemediation(activeScenario.id)}
      />
    </div>
  );
};
