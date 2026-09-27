import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTrajectory } from '../hooks/useTrajectory';
import { EvolutionGraphPreview } from '../components/trajectory/EvolutionGraphPreview';
import { DriftAlertBanner } from '../components/trajectory/DriftAlertBanner';
import { BoundaryIntegrityChart } from '../components/trajectory/BoundaryIntegrityChart';
import { GraphFilterPanel } from '../components/trajectory/GraphFilterPanel';
import { NodeInspector } from '../components/trajectory/NodeInspector';
import { ViewState } from '../components/shared/ViewState';
import { GitBranch, ShieldCheck, AlertTriangle } from 'lucide-react';

const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

export const TrajectoryView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const nodeIdParam = searchParams.get('nodeId');
  const navigate = useNavigate();

  const {
    isLoading,
    error,
    reload,
    epochs,
    selectedEpoch,
    setSelectedEpoch,
    selectedNodeId,
    setSelectedNodeId,
    handleSelectDrift,
    activeDriftFinding,
    openDriftFindings,
    openIncident,
    originMutationId,
    selectedNodeDetails,
    activeComponentFilter,
    setActiveComponentFilter,
    activeInvariantFilter,
    setActiveInvariantFilter,
    highlightCausalChain,
    setHighlightCausalChain,
    snapshots,
    trendData,
    graphNodes,
    graphEdges,
    invariants,
    mutations,
    components,
    componentMatchIds,
    envelope
  } = useTrajectory();

  const openFindingsText =
    openDriftFindings.length === 0
      ? 'no open drift findings'
      : `${openDriftFindings.length} open drift finding${openDriftFindings.length === 1 ? '' : 's'}`;

  useEffect(() => {
    if (nodeIdParam) {
      setSelectedNodeId(nodeIdParam);
    }
  }, [nodeIdParam, setSelectedNodeId]);

  const selectNode = (id: string) => {
    setSelectedNodeId(id);
    setSearchParams({ nodeId: id });
  };

  // Fork from the selected mutation, else from the earliest plausible contributor.
  const forkMutationId = selectedNodeId.startsWith('M-') ? selectedNodeId : originMutationId;
  const openIncidentId = openIncident?.id;
  const isEmpty = !isLoading && !error && snapshots.length === 0 && mutations.length === 0;

  return (
    <div className="space-y-4 select-none font-mono">
      {/* Trajectory Header Deck (Stagger 1) */}
      <div className="reveal-delay-1 p-4 rounded-sm border border-zinc-800/80 bg-[#08090d]/90 backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="text-zinc-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-live" />
              Trajectory Plane
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500 text-[10px]">EPOCH SIGNATURE WORKSPACE</span>
          </div>

          <h1 className="text-base font-bold text-zinc-100 font-sans tracking-tight">
            Architectural Evolution & System Drift Topology
          </h1>

          <p className="text-xs text-zinc-400 font-sans mt-0.5 max-w-4xl leading-relaxed">
            What is the system becoming? EPOCH continuously maps boundary integrity and isolates
            structural drift before latent mismatches culminate in irreversible domain coupling.
          </p>
        </div>

        <button
          onClick={() => navigate(forkMutationId ? `/futures?mutationId=${encodeURIComponent(forkMutationId)}` : '/futures')}
          className="btn-control flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-sm uppercase tracking-wider shrink-0 self-start sm:self-auto shadow-sm"
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Fork Futures</span>
        </button>
      </div>

      {isLoading ? (
        <ViewState kind="loading" />
      ) : error ? (
        <ViewState kind="error" error={error} onRetry={reload} />
      ) : isEmpty ? (
        <ViewState
          kind="empty"
          message="No trajectory recorded yet. Record history with pnpm demo-reset, or let Bob land a change."
        />
      ) : (
        <>
          {/* Prominent Architectural Drift Banner with Inline Divergence Schematic (Stagger 1) */}
          {activeDriftFinding && (
            <div className="reveal-delay-1">
              <DriftAlertBanner
                driftFinding={activeDriftFinding}
                onSelectCausalMutation={selectNode}
                onOpenCounterfactual={mutId => {
                  navigate(`/futures?mutationId=${encodeURIComponent(mutId)}`);
                }}
                trend={trendData}
                mutations={mutations}
                invariants={invariants}
                openIncident={openIncident}
                openFindings={openDriftFindings}
                onSelectFinding={handleSelectDrift}
              />
            </div>
          )}

          {/* Envelope status: always shown once known, so a recovery is visible even while a warning stays open */}
          {(envelope || !activeDriftFinding) && (
            <div className="reveal-delay-1">
              {envelope && !envelope.withinEnvelope ? (
                <div className="rounded-sm border border-amber-500/45 bg-gradient-to-b from-[#120e09] via-[#0d0a07] to-[#080706] font-mono select-none overflow-hidden p-3 flex items-center gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(245,158,11,0.1)]">
                  <div className="p-1.5 rounded-sm bg-amber-500/20 text-amber-400 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-amber-300 uppercase tracking-widest text-[10px]">
                      Outside the envelope
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-[10px] text-zinc-400">
                      boundary integrity {pct(envelope.boundaryIntegrityScore)} · coupling {pct(envelope.couplingScore)} · {openFindingsText}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-sm border border-emerald-500/40 bg-gradient-to-b from-[#07110c] via-[#060d09] to-[#050806] font-mono select-none overflow-hidden p-3 flex items-center gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(16,185,129,0.1)]">
                  <div className="p-1.5 rounded-sm bg-emerald-500/15 text-emerald-400 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-emerald-300 uppercase tracking-widest text-[10px]">
                      Inside the envelope
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-[10px] text-zinc-400">
                      {envelope
                        ? `boundary integrity ${pct(envelope.boundaryIntegrityScore)} · coupling ${pct(envelope.couplingScore)} · ${openFindingsText}`
                        : openFindingsText}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Supporting Trend Readout: Boundary Integrity across epochs (Stagger 2) */}
          <div className="reveal-delay-2">
            <BoundaryIntegrityChart data={trendData} currentEpoch={selectedEpoch} />
          </div>

          {/* Central Evolution Graph Workspace (Stagger 3) */}
          <div className="reveal-delay-3 flex flex-col lg:flex-row gap-4 items-start">
            {/* Left Filter Rail */}
            <GraphFilterPanel
              components={components}
              activeComponent={activeComponentFilter}
              onSelectComponent={setActiveComponentFilter}
              invariants={invariants}
              activeInvariantFilter={activeInvariantFilter}
              onSelectInvariantFilter={setActiveInvariantFilter}
              highlightCausalChain={highlightCausalChain}
              onToggleCausalChain={() => setHighlightCausalChain(!highlightCausalChain)}
              epochs={epochs}
              selectedEpoch={selectedEpoch}
              onSelectEpoch={setSelectedEpoch}
              originMutationId={originMutationId}
              openIncidentId={openIncidentId}
            />

            {/* Central Graph Workspace */}
            <div className="flex-1 w-full min-w-0">
              <EvolutionGraphPreview
                nodes={graphNodes}
                edges={graphEdges}
                selectedNodeId={selectedNodeId}
                onSelectNode={selectNode}
                highlightCausalChain={highlightCausalChain}
                selectedEpoch={selectedEpoch}
                originMutationId={originMutationId}
                openIncidentId={openIncidentId}
                componentMatchIds={componentMatchIds}
                activeInvariantFilter={activeInvariantFilter}
              />
            </div>

            {/* Right Inspector Deck */}
            <NodeInspector
              selectedDetails={selectedNodeDetails}
              onSelectNodeId={selectNode}
              onOpenCounterfactual={mutId => {
                navigate(`/futures?mutationId=${encodeURIComponent(mutId)}`);
              }}
              originMutationId={originMutationId}
              openIncidentId={openIncidentId}
            />
          </div>
        </>
      )}
    </div>
  );
};
