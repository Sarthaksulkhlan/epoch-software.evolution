import React from 'react';
import { Mutation, Incident, Invariant } from '../../types';
import { GraphNodeData } from '../../data/mock/trajectory';
import { StatusBadge } from '../shared/StatusBadge';
import { GitCommit, AlertOctagon, ShieldCheck, Clock, ArrowRight, GitBranch } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NodeInspectorProps {
  selectedDetails:
    | { type: 'MUTATION'; data: Mutation }
    | { type: 'INCIDENT'; data: Incident }
    | { type: 'INVARIANT'; data: Invariant }
    | { type: 'EPOCH_BOUNDARY'; data: GraphNodeData }
    | null;
  onSelectNodeId: (nodeId: string) => void;
  onOpenCounterfactual: (mutationId: string) => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  selectedDetails,
  onSelectNodeId,
  onOpenCounterfactual
}) => {
  if (!selectedDetails) {
    return (
      <div className="w-full lg:w-72 rounded-sm border border-zinc-800/80 bg-[#08090d] p-6 text-center text-xs text-zinc-500 font-mono">
        Select a node on the evolution topology canvas to inspect telemetry.
      </div>
    );
  }

  const { type, data } = selectedDetails;

  return (
    <div className="w-full lg:w-72 rounded-sm border border-zinc-800/80 bg-[#08090d] p-4 flex flex-col justify-between space-y-4 max-h-[540px] overflow-y-auto font-mono select-none text-xs">
      <div className="space-y-3">
        {/* Node Identifier Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {type === 'MUTATION' && <GitCommit className="w-3.5 h-3.5 text-zinc-300" />}
            {type === 'INCIDENT' && <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />}
            {type === 'INVARIANT' && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
            {type === 'EPOCH_BOUNDARY' && <Clock className="w-3.5 h-3.5 text-zinc-400" />}
            <span className="font-bold text-zinc-100">
              {type === 'MUTATION' && (data as Mutation).id}
              {type === 'INCIDENT' && (data as Incident).id}
              {type === 'INVARIANT' && (data as Invariant).id}
              {type === 'EPOCH_BOUNDARY' && (data as GraphNodeData).label}
            </span>
          </div>

          {type === 'MUTATION' && <StatusBadge status={(data as Mutation).status} size="sm" />}
          {type === 'INCIDENT' && <StatusBadge status={(data as Incident).severity} size="sm" />}
          {type === 'INVARIANT' && <StatusBadge status={(data as Invariant).status} size="sm" />}
        </div>

        {/* Node Detail Content */}
        {type === 'MUTATION' && (() => {
          const m = data as Mutation;
          const isOrigin = m.id === 'M-1042';

          return (
            <div className="space-y-2.5">
              <div>
                <h4 className="font-sans font-bold text-zinc-100">{m.title}</h4>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  EPOCH 0{m.epoch} · COMMIT {m.commitHash}
                </div>
              </div>

              {isOrigin && (
                <div className="p-2 rounded-sm bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] font-sans leading-relaxed">
                  <strong>Earliest Plausible Contributor</strong> to incident INC-3312.
                </div>
              )}

              <div>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">
                  Touched Components
                </span>
                <div className="flex flex-wrap gap-1">
                  {m.touchedComponents.map(c => (
                    <span key={c} className="px-1.5 py-0.2 rounded-sm bg-[#06070a] border border-zinc-800 text-[10px] text-zinc-400">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">
                  Immediate Verification
                </span>
                <p className="font-sans text-[11px] text-zinc-300 leading-snug bg-[#06070a] p-2 rounded-sm border border-zinc-800">
                  {m.immediateOutcome.summary}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">
                  Structural Drift Impact
                </span>
                <p className="font-sans text-[11px] text-zinc-300 leading-snug bg-[#06070a] p-2 rounded-sm border border-zinc-800">
                  {m.structuralConsequences.summary}
                </p>
              </div>

              {m.candidateCausalChain && m.candidateCausalChain.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">
                    Causal Chain
                  </span>
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    {m.candidateCausalChain.map((id, idx) => (
                      <React.Fragment key={id}>
                        <button
                          onClick={() => onSelectNodeId(id)}
                          className="text-zinc-300 hover:text-white underline"
                        >
                          {id}
                        </button>
                        {idx < m.candidateCausalChain.length - 1 && <span className="text-zinc-600">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {type === 'INCIDENT' && (() => {
          const inc = data as Incident;
          return (
            <div className="space-y-2.5">
              <div>
                <h4 className="font-sans font-bold text-zinc-100">{inc.title}</h4>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  EPOCH 0{inc.epoch} · BLAST RADIUS CRITICAL
                </div>
              </div>

              <div className="p-2 rounded-sm bg-rose-950/40 border border-rose-500/40 text-rose-300 text-[10px] font-sans leading-relaxed">
                {inc.blastRadiusSummary}
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">
                  Upstream Causality
                </span>
                <div className="text-[11px]">
                  <p className="text-zinc-300">
                    Contributing origin:{' '}
                    <button
                      onClick={() => onSelectNodeId(inc.earliestPlausibleContributingMutationId)}
                      className="text-amber-400 font-bold underline"
                    >
                      {inc.earliestPlausibleContributingMutationId}
                    </button>
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {type === 'INVARIANT' && (() => {
          const inv = data as Invariant;
          return (
            <div className="space-y-2.5">
              <div>
                <h4 className="font-sans font-bold text-zinc-100">{inv.name}</h4>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  CATEGORY: {inv.category}
                </div>
              </div>

              <p className="font-sans text-[11px] text-zinc-300 leading-snug bg-[#06070a] p-2 rounded-sm border border-zinc-800">
                {inv.description}
              </p>

              {inv.violationMessage && (
                <div className="p-2 rounded-sm bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] font-sans">
                  <strong>Finding:</strong> {inv.violationMessage}
                </div>
              )}
            </div>
          );
        })()}

        {type === 'EPOCH_BOUNDARY' && (() => {
          const eb = data as GraphNodeData;
          return (
            <div className="space-y-2">
              <h4 className="font-bold text-zinc-100">{eb.label}</h4>
              <p className="font-sans text-zinc-400 text-xs">{eb.sublabel}</p>
            </div>
          );
        })()}
      </div>

      {/* Prominent Action Controls */}
      <div className="pt-2 border-t border-zinc-800 space-y-2">
        {type === 'MUTATION' && (
          <button
            onClick={() => onOpenCounterfactual((data as Mutation).id)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-sm transition-colors uppercase tracking-wider shadow-sm"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Fork Futures from {(data as Mutation).id}</span>
          </button>
        )}

        {type === 'INCIDENT' && (
          <button
            onClick={() => onSelectNodeId((data as Incident).earliestPlausibleContributingMutationId)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-sm transition-colors uppercase tracking-wider"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Trace Origin {(data as Incident).earliestPlausibleContributingMutationId}</span>
          </button>
        )}
      </div>
    </div>
  );
};
