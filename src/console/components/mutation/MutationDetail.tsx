import React, { useState } from 'react';
import { Mutation, Incident } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import {
  GitCommit,
  AlertTriangle,
  GitBranch,
  ArrowRight,
  ShieldAlert,
  Compass,
  FileCode,
  CheckCircle2,
  Terminal,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface MutationDetailProps {
  mutation?: Mutation | null;
  incident?: Incident | null;
  onSelectMutationById?: (id: string) => void;
}

export const MutationDetail: React.FC<MutationDetailProps> = ({
  mutation,
  incident,
  onSelectMutationById
}) => {
  const [showFullDiff, setShowFullDiff] = useState(false);

  if (incident && !mutation) {
    return (
      <div className="rounded-sm border border-rose-500/40 bg-[#090a0f] p-4 space-y-3.5 font-mono select-none">
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-bold text-rose-300">{incident.id}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-xs text-zinc-400">EPOCH 0{incident.epoch} INCIDENT</span>
          </div>
          <StatusBadge status={incident.severity} size="md" />
        </div>

        <div>
          <h3 className="font-sans text-sm font-bold text-zinc-100">{incident.title}</h3>
          <p className="font-sans text-xs text-zinc-300 mt-1.5 leading-relaxed bg-[#06070a] p-3 rounded-sm border border-zinc-800">
            {incident.blastRadiusSummary}
          </p>
        </div>

        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">
            Candidate Causal Propagation Chain
          </div>
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-sm bg-[#06070a] border border-zinc-800">
            {incident.candidateCausalChain.map((id, idx) => (
              <React.Fragment key={id}>
                <button
                  onClick={() => onSelectMutationById?.(id)}
                  className="text-xs text-zinc-300 hover:text-white px-2 py-0.5 bg-zinc-900 rounded-sm border border-zinc-700 hover:border-zinc-500 transition-colors font-bold"
                >
                  {id}
                </button>
                {idx < incident.candidateCausalChain.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="font-sans text-[11px] text-zinc-400 mt-1.5">
            Earliest plausible contributing mutation: <strong className="text-amber-400 font-mono">{incident.earliestPlausibleContributingMutationId}</strong>.
          </p>
        </div>

        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
            Invariants Breached
          </div>
          <div className="flex flex-wrap gap-1.5">
            {incident.invariantsViolated.map(inv => (
              <span key={inv} className="px-2 py-0.5 rounded-sm bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                {inv}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-[10px] text-zinc-500">
            RECORDED: {new Date(incident.timestamp).toLocaleString()}
          </div>
          <Link
            to={`/trajectory?nodeId=${incident.id}`}
            className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors uppercase tracking-wider"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Trace in Trajectory</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!mutation) {
    return (
      <div className="rounded-sm border border-zinc-800 bg-[#08090d] p-8 text-center text-xs text-zinc-500 font-mono">
        Select a mutation or incident from the chronological timeline to inspect its architectural trajectory.
      </div>
    );
  }

  const isCausalOrigin = mutation.id === 'M-1042';

  return (
    <div className="rounded-sm border border-zinc-800 bg-[#08090d] p-4 space-y-3.5 font-mono select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="font-bold text-zinc-100">{mutation.id}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">EPOCH 0{mutation.epoch}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500">{mutation.commitHash}</span>
          </div>
          <h3 className="font-sans text-sm font-bold text-zinc-100">{mutation.title}</h3>
        </div>
        <StatusBadge status={mutation.status} size="md" />
      </div>

      {/* Semantic Causal Callout for M-1042 */}
      {isCausalOrigin && (
        <div className="p-3 rounded-sm border border-amber-500/40 bg-[#120e0a] text-xs text-amber-200 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="tracking-wide text-[11px] uppercase">EARLIEST PLAUSIBLE CONTRIBUTING MUTATION</span>
          </div>
          <p className="font-sans leading-relaxed text-amber-200/90 text-xs">
            Retention boundary remained at 15d despite chargeback eligibility expansion to 30d.
            Silent temporal gap catalyzed downstream hotfixes M-1051, M-1077, and production freeze INC-3312.
          </p>
        </div>
      )}

      {/* Declared Intent */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">Declared Intent</div>
        <p className="font-sans text-xs text-zinc-300 leading-relaxed bg-[#06070a] p-2.5 rounded-sm border border-zinc-800">
          {mutation.intent}
        </p>
      </div>

      {/* Touched Components */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">Affected Components</div>
        <div className="flex flex-wrap gap-1">
          {mutation.touchedComponents.map(comp => (
            <span key={comp} className="px-2 py-0.5 rounded-sm bg-[#06070a] border border-zinc-800 text-xs text-zinc-300">
              {comp}
            </span>
          ))}
        </div>
      </div>

      {/* Immediate Outcome vs Structural Consequence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="p-2.5 rounded-sm border border-zinc-800 bg-[#06070a] space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="uppercase tracking-widest text-zinc-500">Immediate Verification</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> PASS
            </span>
          </div>
          <p className="font-sans text-[11px] text-zinc-300 leading-snug">
            {mutation.immediateOutcome.summary}
          </p>
        </div>

        <div className="p-2.5 rounded-sm border border-zinc-800 bg-[#06070a] space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="uppercase tracking-widest text-zinc-500">Structural Consequence</span>
            <span className="text-amber-400 font-bold">
              {mutation.structuralConsequences.driftContribution} DRIFT
            </span>
          </div>
          <p className="font-sans text-[11px] text-zinc-300 leading-snug">
            {mutation.structuralConsequences.summary}
          </p>
        </div>
      </div>

      {/* Invariant Impact */}
      {mutation.structuralConsequences.weakenedInvariantIds.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Invariant Impact</div>
          <div className="flex flex-wrap gap-1.5">
            {mutation.structuralConsequences.weakenedInvariantIds.map(invId => (
              <span key={invId} className="px-2 py-0.5 rounded-sm bg-amber-950/50 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                {invId} (WEAKENED)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Causal Propagation Chain */}
      {mutation.candidateCausalChain && mutation.candidateCausalChain.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            Candidate Causal Propagation Chain
          </div>
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-sm bg-[#06070a] border border-zinc-800">
            {mutation.candidateCausalChain.map((id, idx) => (
              <React.Fragment key={id}>
                <button
                  onClick={() => onSelectMutationById?.(id)}
                  className={`px-2 py-0.5 rounded-sm text-xs transition-colors border ${
                    id === mutation.id
                      ? 'border-zinc-400 bg-zinc-800 text-white font-bold'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {id}
                </button>
                {idx < mutation.candidateCausalChain.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
            <ArrowRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="px-2 py-0.5 rounded-sm bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-bold">
              INC-3312
            </span>
          </div>
        </div>
      )}

      {/* Synthesized Code Diff with Progressive Disclosure Toggle */}
      {mutation.diffPreview && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500">
            <span>Synthesized Diff Preview</span>
            <button
              onClick={() => setShowFullDiff(!showFullDiff)}
              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
            >
              <span>{showFullDiff ? 'Collapse' : 'Expand Full'}</span>
              {showFullDiff ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          <pre className={`p-2.5 rounded-sm bg-[#06070a] border border-zinc-800 text-[10.5px] font-mono text-zinc-300 overflow-x-auto leading-relaxed ${
            showFullDiff ? 'max-h-96' : 'max-h-24'
          }`}>
            {mutation.diffPreview}
          </pre>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="pt-2.5 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] text-zinc-500">
          AUTHOR: <span className="text-zinc-300">{mutation.author}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/trajectory?nodeId=${mutation.id}`}
            className="flex items-center gap-1 px-3 py-1 rounded-sm text-xs text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors uppercase tracking-wider"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Trajectory</span>
          </Link>
          <Link
            to={`/futures?mutationId=${mutation.id}`}
            className="flex items-center gap-1 px-3 py-1 rounded-sm text-xs text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 transition-colors uppercase tracking-wider"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Fork Futures</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
