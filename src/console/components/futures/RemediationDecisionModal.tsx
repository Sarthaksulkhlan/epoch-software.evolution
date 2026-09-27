import React from 'react';
import type { CounterfactualScenario } from '../../types';
import { ArrowRight, X, AlertTriangle, Cpu } from 'lucide-react';

interface RemediationDecisionModalProps {
  scenario: CounterfactualScenario;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** The adoption request is in flight. */
  isSubmitting?: boolean;
  /** Human-readable reason the last adoption failed. */
  error?: string | null;
}

/** "A" for "A · Keep the current path". */
const futureLetter = (s: CounterfactualScenario) => s.scenarioId ?? s.title.split(' · ')[0];
/** "Keep the current path" for "A · Keep the current path". */
const futureName = (s: CounterfactualScenario) => {
  const prefix = `${futureLetter(s)} · `;
  return s.strategyName.startsWith(prefix) ? s.strategyName.slice(prefix.length) : s.strategyName;
};
/** EPOCH counts changed files; it does not estimate calendar time. */
const filesChanged = (s: CounterfactualScenario) => s.changedFiles?.length || s.projectedTimeDays;

export const RemediationDecisionModal: React.FC<RemediationDecisionModalProps> = ({
  scenario,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  error = null
}) => {
  if (!isOpen) return null;

  const integrityTone =
    scenario.projectedBoundaryIntegrity >= 80
      ? 'text-emerald-400'
      : scenario.projectedBoundaryIntegrity >= 60
      ? 'text-amber-400'
      : 'text-rose-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 font-mono select-none">
      <div className="w-full max-w-lg rounded-sm border border-zinc-700 bg-[#090b10] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-zinc-300" />
            <h3 className="font-bold text-zinc-100 text-xs uppercase tracking-wider">
              Adopt this future?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-zinc-500 hover:text-zinc-300 p-1 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
          <div className="p-3 rounded-sm bg-[#06070a] border border-zinc-800">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
              Future {futureLetter(scenario)}
            </div>
            <div className="font-bold text-zinc-100 font-sans text-sm">{futureName(scenario)}</div>
            <div className="font-sans text-zinc-400 text-xs mt-0.5">{scenario.description}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-sm bg-[#06070a] border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Measured Integrity</span>
              <span className={`${integrityTone} font-bold text-sm tabular-nums`}>
                {scenario.projectedBoundaryIntegrity}% INTEGRITY
              </span>
            </div>
            <div className="p-2.5 rounded-sm bg-[#06070a] border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Files changed</span>
              <span className="text-zinc-200 font-bold text-sm tabular-nums">
                {filesChanged(scenario)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-sm bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 font-sans">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-mono text-[11px] uppercase block text-amber-300">Human Governance Sign-off:</strong>
              Adopting applies this future's measured diff to the sample repository and opens a remediation workflow.
              EPOCH's specialists then check it, and nothing is recorded until a person approves it at the gate.
            </div>
          </div>

          {error && (
            <div role="alert" className="p-2.5 rounded-sm bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs font-sans">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-sm transition-colors uppercase tracking-wider shadow-sm disabled:opacity-60 disabled:cursor-wait"
          >
            <span>{isSubmitting ? 'Adopting…' : 'Adopt future'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
