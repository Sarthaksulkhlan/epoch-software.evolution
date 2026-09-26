import React from 'react';
import type { CounterfactualScenario } from '../../types';
import { ArrowRight, X, AlertTriangle, Cpu, ShieldCheck } from 'lucide-react';

interface RemediationDecisionModalProps {
  scenario: CounterfactualScenario;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RemediationDecisionModal: React.FC<RemediationDecisionModalProps> = ({
  scenario,
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 font-mono select-none">
      <div className="w-full max-w-lg rounded-sm border border-zinc-700 bg-[#090b10] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-zinc-300" />
            <h3 className="font-bold text-zinc-100 text-xs uppercase tracking-wider">
              Confirm Architectural Remediation Dispatch
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
          <div className="p-3 rounded-sm bg-[#06070a] border border-zinc-800">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
              Target Intervention Path
            </div>
            <div className="font-bold text-zinc-100 font-sans text-sm">{scenario.title}</div>
            <div className="font-sans text-zinc-400 text-xs mt-0.5">{scenario.strategyName}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-sm bg-[#06070a] border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Projected Recovery</span>
              <span className="text-emerald-400 font-bold text-sm tabular-nums">
                {scenario.projectedBoundaryIntegrity}% INTEGRITY
              </span>
            </div>
            <div className="p-2.5 rounded-sm bg-[#06070a] border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Synthesizer Effort</span>
              <span className="text-zinc-200 font-bold text-sm tabular-nums">
                ~{scenario.projectedTimeDays} DAYS
              </span>
            </div>
          </div>

          <div className="p-3 rounded-sm bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 font-sans">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-mono text-[11px] uppercase block text-amber-300">Human Governance Sign-off:</strong>
              Confirming this remediation path will queue task synthesis on the IBM Bob 2.0 AI execution fabric
              and register proposed mutation M-1090 into the WEAVE lifecycle plane.
            </div>
          </div>

          <div className="text-[10px] text-zinc-500">
            TODO(IBM Bob: POST /api/v1/simulations/remediate)
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-sm transition-colors uppercase tracking-wider shadow-sm"
          >
            <span>Dispatch to IBM Bob 2.0</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
