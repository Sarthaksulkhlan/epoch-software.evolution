import React, { useState } from 'react';
import type { DriftFinding, Mutation, Invariant, Incident, IntegrityTrendPoint } from '../../types';
import { AlertTriangle, ArrowRight, ChevronDown, ChevronUp, GitBranch, FileSearch, Info } from 'lucide-react';

interface DriftAlertBannerProps {
  driftFinding: DriftFinding;
  onSelectCausalMutation: (mutationId: string) => void;
  onOpenCounterfactual: (mutationId: string) => void;
  /** Integrity trend (one point per recorded mutation), for the integrity path. */
  trend?: IntegrityTrendPoint[];
  mutations?: Mutation[];
  invariants?: Invariant[];
  openIncident?: Incident | null;
  /** Every open drift finding, so the operator can switch between them. */
  openFindings?: DriftFinding[];
  onSelectFinding?: (driftId: string) => void;
}

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export const DriftAlertBanner: React.FC<DriftAlertBannerProps> = ({
  driftFinding,
  onSelectCausalMutation,
  onOpenCounterfactual,
  trend = [],
  mutations = [],
  invariants = [],
  openIncident = null,
  openFindings = [],
  onSelectFinding
}) => {
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);

  const threshold = trend[0]?.threshold ?? 80;
  const scoreTone = (score: number) =>
    score >= 95 ? 'text-emerald-400' : score >= threshold ? 'text-amber-400' : 'text-rose-400';

  // Integrity path from the recorded trend: first → lowest → latest (duplicates collapsed).
  const integrityPath: number[] = (() => {
    if (trend.length === 0) return [driftFinding.integrityScore];
    const first = trend[0].score;
    const lowest = Math.min(...trend.map(p => p.score));
    const latest = trend[trend.length - 1].score;
    return [first, lowest, latest].filter((s, i, arr) => i === 0 || s !== arr[i - 1]);
  })();

  const earliestId = driftFinding.earliestPlausibleMutationId;
  const earliestMutation = mutations.find(m => m.id === earliestId);
  const whatChanged = earliestMutation
    ? earliestMutation.intent || earliestMutation.title
    : driftFinding.title;

  const downstreamIds = driftFinding.candidateCausalChain.filter(id => id !== earliestId);
  const components = [driftFinding.sourceComponent, driftFinding.targetComponent].filter(c => c && c.trim() !== '');
  const violatedInvariant = driftFinding.violatedInvariantId
    ? invariants.find(inv => inv.id === driftFinding.violatedInvariantId)
    : undefined;

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
                Integrity:{' '}
                {integrityPath.map((score, idx) => (
                  <React.Fragment key={`${score}-${idx}`}>
                    {idx > 0 && ' → '}
                    <span className={`${scoreTone(score)}${idx === integrityPath.length - 1 ? ' font-bold' : ''}`}>{score}%</span>
                  </React.Fragment>
                ))}
              </span>
            </div>

            <div className="text-[11px] text-zinc-400 font-sans mt-0.5">
              {earliestId ? (
                <>
                  Earliest plausible contributor: <strong className="text-amber-400 font-mono">{earliestId}</strong> on {driftFinding.boundaryName}
                </>
              ) : (
                <>{driftFinding.title}</>
              )}
            </div>

            {openFindings.length > 1 && onSelectFinding && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px]">
                <span className="text-zinc-500 uppercase tracking-widest text-[9px] mr-0.5">Open findings:</span>
                {openFindings.map(f => (
                  <button
                    key={f.id}
                    onClick={() => onSelectFinding(f.id)}
                    title={f.title}
                    className={`btn-control px-1.5 py-0.5 rounded-sm border font-bold ${
                      f.id === driftFinding.id
                        ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-amber-400'
                    }`}
                  >
                    {f.id}
                  </button>
                ))}
              </div>
            )}
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

          {earliestId && (
            <button
              onClick={() => onOpenCounterfactual(earliestId)}
              className="btn-control flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-sm uppercase tracking-wider"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Fork Future</span>
            </button>
          )}
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
                {earliestMutation && (
                  <strong className="font-mono text-amber-400 mr-1">{earliestMutation.id}:</strong>
                )}
                {whatChanged}
              </p>
            </div>

            {/* 2. Mutations Involved */}
            <div className="p-3 bg-[#0a0a0f] border border-zinc-800 rounded space-y-1">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] block font-bold">2. MUTATIONS INVOLVED</span>
              <div className="text-xs text-zinc-300 font-sans space-y-1">
                {earliestId && (
                  <div>
                    Earliest plausible mutation: <strong className="text-amber-400 font-mono">{earliestId}</strong>
                  </div>
                )}
                <div className="text-zinc-400 text-[11px]">
                  {downstreamIds.length > 0 ? (
                    <>
                      Associated downstream changes:{' '}
                      {downstreamIds.map((id, idx) => {
                        const mut = mutations.find(m => m.id === id);
                        return (
                          <React.Fragment key={id}>
                            {idx > 0 && (idx === downstreamIds.length - 1 ? ' & ' : ', ')}
                            <span className="font-mono text-zinc-300">{id}</span>
                            {mut && <> ({truncate(mut.title, 48)})</>}
                          </React.Fragment>
                        );
                      })}
                      .
                    </>
                  ) : (
                    <>No further mutations in the candidate chain.</>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Affected Components */}
            <div className="p-3 bg-[#0a0a0f] border border-zinc-800 rounded space-y-1">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] block font-bold">3. AFFECTED COMPONENTS</span>
              <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono pt-0.5">
                {components.length > 0 ? (
                  components.map((comp, idx) => (
                    <React.Fragment key={`${comp}-${idx}`}>
                      {idx > 0 && <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />}
                      <span
                        className={
                          idx === 0
                            ? 'px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300'
                            : 'px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300'
                        }
                      >
                        {comp}
                      </span>
                    </React.Fragment>
                  ))
                ) : (
                  <span className="text-zinc-500 font-sans text-[11px]">No component pair recorded.</span>
                )}
              </div>
            </div>

            {/* 4. Evidence Supporting Finding */}
            <div className="p-3 bg-[#0a0a0f] border border-zinc-800 rounded space-y-1">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] block font-bold">4. SUPPORTING EVIDENCE</span>
              <ul className="text-[11px] text-zinc-300 font-sans list-disc list-inside space-y-0.5">
                {openIncident && (
                  <li>
                    <strong className="font-mono text-rose-400">{openIncident.id}:</strong> {openIncident.title} ({openIncident.severity})
                  </li>
                )}
                <li>
                  <strong className="font-mono text-zinc-200">BOUNDARY:</strong> {driftFinding.boundaryName}
                </li>
                <li>
                  <strong className="font-mono text-zinc-200">INTEGRITY:</strong>{' '}
                  <span className={scoreTone(driftFinding.integrityScore)}>{driftFinding.integrityScore}%</span> at detection (threshold {threshold})
                </li>
              </ul>
            </div>

            {/* 5. Invariant or Boundary Affected */}
            {driftFinding.violatedInvariantId && (
              <div className="p-3 bg-[#0a0a0f] border border-zinc-800 rounded space-y-1">
                <span className="text-zinc-500 uppercase tracking-widest text-[9px] block font-bold">5. BOUNDARY INVARIANTS</span>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-mono font-bold">{driftFinding.violatedInvariantId}</span>
                    {violatedInvariant && (
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          violatedInvariant.status === 'HOLDING'
                            ? 'text-emerald-400'
                            : violatedInvariant.status === 'WEAKENED'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {violatedInvariant.status}
                      </span>
                    )}
                  </div>
                  {violatedInvariant && (
                    <div className="text-[10px] text-zinc-400 font-sans">
                      {violatedInvariant.name}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. Epistemic Qualification */}
            <div className="p-3 bg-[#0a0a0f] border border-zinc-800 rounded space-y-1">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] block font-bold">6. EPISTEMIC QUALIFICATION</span>
              <div className="flex items-start gap-1.5 text-zinc-300 font-sans text-[11px] leading-relaxed">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  EPOCH names a <strong>candidate causal chain</strong> from the recorded mutations, the scanner's measurements and the dependency graph. It is evidence, not proof.
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
              {openIncident && (
                <>
                  <ArrowRight className="w-3 h-3 text-rose-500 shrink-0" />
                  <button
                    onClick={() => onSelectCausalMutation(openIncident.id)}
                    className="btn-control px-2 py-0.5 rounded-sm bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold"
                  >
                    {openIncident.id}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
