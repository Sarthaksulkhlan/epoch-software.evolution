import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTrajectory } from '../hooks/useTrajectory';
import { EvolutionGraphPreview } from '../components/trajectory/EvolutionGraphPreview';
import { DriftAlertBanner } from '../components/trajectory/DriftAlertBanner';
import { BoundaryIntegrityChart } from '../components/trajectory/BoundaryIntegrityChart';
import { GraphFilterPanel } from '../components/trajectory/GraphFilterPanel';
import { NodeInspector } from '../components/trajectory/NodeInspector';
import { Compass, GitBranch, ArrowUpRight } from 'lucide-react';

export const TrajectoryView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const nodeIdParam = searchParams.get('nodeId');
  const navigate = useNavigate();

  const {
    selectedEpoch,
    setSelectedEpoch,
    selectedNodeId,
    setSelectedNodeId,
    activeDriftFinding,
    selectedNodeDetails,
    activeComponentFilter,
    setActiveComponentFilter,
    activeInvariantFilter,
    setActiveInvariantFilter,
    highlightCausalChain,
    setHighlightCausalChain,
    trendData,
    graphNodes,
    graphEdges,
    invariants
  } = useTrajectory();

  useEffect(() => {
    if (nodeIdParam) {
      setSelectedNodeId(nodeIdParam);
    }
  }, [nodeIdParam, setSelectedNodeId]);

  const components = [
    'Payment API',
    'Order Service',
    'Ledger DB',
    'Archival Job',
    'Dispute Gateway',
    'Webhook Dispatcher'
  ];

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
          onClick={() => navigate('/futures?mutationId=' + selectedNodeId)}
          className="btn-control flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-sm uppercase tracking-wider shrink-0 self-start sm:self-auto shadow-sm"
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Fork Futures</span>
        </button>
      </div>

      {/* Prominent Architectural Drift Banner with Inline Divergence Schematic (Stagger 1) */}
      {activeDriftFinding && (
        <div className="reveal-delay-1">
          <DriftAlertBanner
            driftFinding={activeDriftFinding}
            onSelectCausalMutation={mutId => {
              setSelectedNodeId(mutId);
              setSearchParams({ nodeId: mutId });
            }}
            onOpenCounterfactual={mutId => {
              navigate(`/futures?mutationId=${mutId}`);
            }}
          />
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
          selectedEpoch={selectedEpoch}
          onSelectEpoch={setSelectedEpoch}
        />

        {/* Central Graph Workspace */}
        <div className="flex-1 w-full min-w-0">
          <EvolutionGraphPreview
            nodes={graphNodes}
            edges={graphEdges}
            selectedNodeId={selectedNodeId}
            onSelectNode={id => {
              setSelectedNodeId(id);
              setSearchParams({ nodeId: id });
            }}
            highlightCausalChain={highlightCausalChain}
            selectedEpoch={selectedEpoch}
            componentFilter={activeComponentFilter}
          />
        </div>

        {/* Right Inspector Deck */}
        <NodeInspector
          selectedDetails={selectedNodeDetails}
          onSelectNodeId={id => {
            setSelectedNodeId(id);
            setSearchParams({ nodeId: id });
          }}
          onOpenCounterfactual={mutId => {
            navigate(`/futures?mutationId=${mutId}`);
          }}
        />
      </div>
    </div>
  );
};
