import React, { useState } from 'react';
import type { DriftFinding } from '../../types';
import { AlertTriangle, ArrowRight, ShieldAlert, ChevronDown, ChevronUp, ExternalLink, GitBranch, FileSearch, CheckCircle2, Info } from 'lucide-react';

interface DriftAlertBannerProps {
  driftFinding: DriftFinding;
  onSelectCausalMutation: (mutationId: string) => void;
  onOpenCounterfactual: (mutationId: string) => void;
}

export const DriftAlertBanner: React.FC<DriftAlertBannerProps> = ({
  driftFinding,
  onSelectCausalMutation,
  onOpenCounterfactual
}) => {
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);

  return (
    <div className="rounded-sm border border-amber-500/45 bg-gradient-to-b from-[#120e09] via-[#0d0a07] to-[#080706] font-mono select-none overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(245,158,11,0.1)]">
      {/* Level 1 & 2: Compact Semantic Drift Summary (Understand in 5 seconds) */}
      <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-sm bg-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4 animate-pulse-warn-slow" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-amber-300 uppercase tracking-widest text-[10px]">
                ARCHITECTURAL DRIFT
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-300 font-bold">
                {driftFinding.candidateCausalChain.join(' → ')}
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-[10px] text-zinc-400">
                Integrity: <span className="text-emerald-400">100%</span> → <span className="text-amber-400">82%</span> → <span className="text-rose-400 font-bold">{driftFinding.integrityScore}%</span>
              </span>
            </div>

            <div className="text-[11px] text-zinc-400 font-sans mt-0.5">
              Earliest plausible contributor: <strong className="text-amber-400 font-mono">{driftFinding.earliestPlausibleMutationId}</strong> on {driftFinding.boundaryName}
            </div>
          </div>
        </div>

        {/* Level 1 Actions */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            onClick={() => setIsWhyExpanded(!isWhyExpanded)}
            className="btn-control flex items-center gap-1 px-3 py-1.5 text-xs text-amber-300 bg-amber-950/60 hover:bg-amber-950/90 border border-amber-500/40 rounded-sm uppercase tracking-wider font-semibold"
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>{isWhyExpanded ? 'Hide Analysis' : 'Why?'}</span>
            {isWhyExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={() => onOpenCounterfactual(driftFinding.earliestPlausibleMutationId)}
            className="btn-control flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-sm uppercase tracking-wider"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Fork Future</span>
          </button>
        </div>
      </div>

      {/* Level 3: Evidence-Backed Structured Reasoning Inspector (Progressive Disclosure) */}
      {isWhyExpanded && (
        <div className="p-4 bg-[#060608] border-t border-amber-500/30 space-y-4 text-xs animate-in fade-in duration-200">
          {/* Section: WHY THIS WAS FLAGGED (Synthesized Diagnostic Assessment) */}
          <div className="border-b border-zinc-800 pb-3">
            <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>WHY THIS WAS FLAGGED — DIAGNOSTIC REASONING ASSESSMENT</span>
            </div>
            <p className="font-sans text-xs text-zinc-200 leading-relaxed bg-[#0a0a10] p-3 rounded-sm border border-zinc-800/80">
              {driftFinding.whyExplanation}
            </p>
          </div>

          {/* Structured Diagnostic Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 1. What Changed */}
            <div className="p-3 bg-[#0a0a0f] border border-zinc-800 rounded space-y-1">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] block font-bold">1. WHAT CHANGED</span>
              <p className="font-sans text-xs text-zinc-200 leading-relaxed">
                Dispute eligibility calculation widened from 15 calendar days to 30 calendar days (PR #892). However, automated settlement ledger archival partitions remained set to a 15-day purge window.
              </p>
            </div>

            {/* 2. Mutations Involved */}
            <div className="p-3 bg-[#0a0a0f] border border-zinc-800 rounded space-y-1">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] block font-bold">2. MUTATIONS INVOLVED</span>
              <div className="text-xs text-zinc-300 font-sans space-y-1">
                <div>
                  Earliest plausible mutation: <strong className="text-amber-400 font-mono">{driftFinding.earliestPlausibleMutationId}</strong>
                </div>
                <div className="text-zinc-400 text-[11px]">
                  Associated downstream changes: <span className="font-mono text-zinc-300">M-1051</span> (cache bypass) &amp; <span className="font-mono text-zinc-300">M-1077</span> (direct ledger partition join).
                </div>
              </div>
            </div>

            {/* 3. Affected Components */}
            <div className="p-3 bg-[#0a0a0f] border border-zinc-800 rounded space-y-1">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] block font-bold">3. AFFECTED COMPONENTS</span>
              <div className="flex flex-wrap gap-1 text-[10px] font-mono pt-0.5">
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">Payment API</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">Order Service</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300">Ledger DB Partitions</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300">Archival Job Cron</span>
              </div>
            </div>

            {/* 4. Evidence Supporting Finding */}
            <div className="p-3 bg-[#0a0a0f] border border-zinc-800 rounded space-y-1">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] block font-bold">4. SUPPORTING EVIDENCE</span>
              <ul className="text-[11px] text-zinc-300 font-sans list-disc list-inside space-y-0.5">
                <li><strong className="font-mono text-zinc-200">EVID-802:</strong> Code diff shows 30d rule with explicit 15d archival conflict warning.</li>
                <li><strong className="font-mono text-zinc-200">EVID-803:</strong> Telemetry confirms Order Service performing cross-domain direct SQL joins.</li>
                <li><strong className="font-mono text-rose-400">INC-3312:</strong> $420k frozen un-reconciled settlements upon archival purge.</li>
              </ul>
            </div>

            {/* 5. Invariant or Boundary Affected */}
            <div className="p-3 bg-[#0a0a0f] border border-zinc-800 rounded space-y-1">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] block font-bold">5. BOUNDARY INVARIANTS</span>
              <div className="text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-mono font-bold">INV-BOUND-04</span>
                  <span className="text-[10px] text-rose-400 font-bold uppercase">WEAKENED → VIOLATED</span>
                </div>
                <div className="text-[10px] text-zinc-400 font-sans">
                  Cross-Service Ledger Boundary Isolation. Downstream query bypassed service contract.
                </div>
              </div>
            </div>

            {/* 6. Epistemic Qualification */}
            <div className="p-3 bg-[#0a0a0f] border border-zinc-800 rounded space-y-1">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] block font-bold">6. EPISTEMIC QUALIFICATION</span>
              <div className="flex items-start gap-1.5 text-zinc-300 font-sans text-[11px] leading-relaxed">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Evidence indicates a <strong>candidate causal chain</strong> based on commit lineage and telemetry traces. EPOCH qualifies this finding as high-confidence structural correlation, not mathematical determinism.
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Causal Chain Links */}
          <div className="p-2.5 rounded bg-[#040407] border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">
              Interactive Candidate Causal Chain:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              {driftFinding.candidateCausalChain.map((mutId, idx) => (
                <React.Fragment key={mutId}>
                  <button
                    onClick={() => onSelectCausalMutation(mutId)}
                    className="btn-control px-2 py-0.5 rounded-sm bg-zinc-900 border border-zinc-700 text-zinc-200 font-bold hover:border-amber-400"
                  >
                    {mutId}
                  </button>
                  {idx < driftFinding.candidateCausalChain.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
              <ArrowRight className="w-3 h-3 text-rose-500 shrink-0" />
              <span className="px-2 py-0.5 rounded-sm bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold">
                INC-3312
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
