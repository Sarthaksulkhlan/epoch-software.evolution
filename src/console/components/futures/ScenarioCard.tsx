import React from 'react';
import { CounterfactualScenario } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { Check, X, ArrowRight, ShieldCheck, AlertTriangle, Layers, Cpu } from 'lucide-react';

interface ScenarioCardProps {
  scenario: CounterfactualScenario;
  isSelected: boolean;
  isApplied: boolean;
  onSelect: () => void;
  onInitiateRemediation: () => void;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  isApplied,
  onInitiateRemediation
}) => {
  return (
    <div className="rounded-sm border border-zinc-800/80 bg-[#08090d] p-5 font-mono select-none space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="font-bold text-zinc-100">{scenario.title.split(':')[0]}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">{scenario.strategyName}</span>
          </div>
          <h2 className="font-sans text-sm font-bold text-zinc-100">{scenario.title}</h2>
        </div>

        <button
          onClick={onInitiateRemediation}
          className={`px-4 py-1.5 rounded-sm text-xs font-semibold transition-colors flex items-center gap-1.5 uppercase tracking-wider ${
            isApplied
              ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/50'
              : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>{isApplied ? 'Selected Path Active' : 'Initiate Human Remediation'}</span>
        </button>
      </div>

      {/* Description & Impact Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
              Architectural Trajectory Hypothesis
            </div>
            <p className="font-sans text-xs text-zinc-300 leading-relaxed bg-[#06070a] p-3 rounded-sm border border-zinc-800">
              {scenario.description}
            </p>
          </div>

          {/* Tradeoffs: Pros and Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-sm bg-[#06070a] border border-zinc-800 space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Structural Benefits</span>
              </div>
              <ul className="space-y-1 font-sans text-xs text-zinc-300">
                {scenario.tradeoffs.pros.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 text-xs mt-0.5">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-sm bg-[#06070a] border border-zinc-800 space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest text-rose-400 font-bold flex items-center gap-1">
                <X className="w-3 h-3" />
                <span>Tradeoffs & Liabilities</span>
              </div>
              <ul className="space-y-1 font-sans text-xs text-zinc-300">
                {scenario.tradeoffs.cons.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-400 text-xs mt-0.5">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right side: Invariants & Evidence Projection */}
        <div className="md:col-span-4 space-y-3">
          <div className="p-3 rounded-sm bg-[#06070a] border border-zinc-800 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">
              Projected Invariant Health
            </div>
            <div className="space-y-1.5">
              {scenario.invariantOutcomes.map(inv => (
                <div key={inv.invariantId} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 text-[11px] truncate max-w-[140px]">{inv.invariantId}</span>
                  <StatusBadge status={inv.projectedStatus} size="sm" showDot={false} />
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-sm bg-[#06070a] border border-zinc-800 space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">
              Projected Evidence Findings
            </div>
            <div className="space-y-1 text-xs">
              {scenario.projectedEvidence.map((ev, idx) => (
                <div key={idx} className="text-[11px] font-sans">
                  <span className="font-mono text-zinc-400 text-[10px] uppercase block">{ev.title}</span>
                  <span className="text-zinc-300 leading-snug">{ev.finding}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
