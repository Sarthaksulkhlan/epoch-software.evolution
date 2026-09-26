import React, { useState } from 'react';
import { DecisionGate, EvidenceItem } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, RotateCcw, Info, Terminal, ShieldAlert, ChevronDown, ChevronUp, GitCommit } from 'lucide-react';

interface ApprovalGateProps {
  decisionGate: DecisionGate;
  evidenceList: EvidenceItem[];
  isDemoActionApplied: boolean;
  onApprove: (rationale?: string) => void;
  onReject: (rationale?: string) => void;
  onReset: () => void;
  onSelectEvidence?: (evidenceId: string) => void;
}

export const ApprovalGate: React.FC<ApprovalGateProps> = ({
  decisionGate,
  evidenceList,
  isDemoActionApplied,
  onApprove,
  onReject,
  onReset,
  onSelectEvidence
}) => {
  const [rationale, setRationale] = useState('');
  const [isReviewExpanded, setIsReviewExpanded] = useState(false);
  const [isConfirmCommitOpen, setIsConfirmCommitOpen] = useState(false);

  const isPending = decisionGate.status === 'PENDING_REVIEW';
  const isApproved = decisionGate.status === 'APPROVED';
  const isRejected = decisionGate.status === 'REJECTED';

  const handleInitialApproveClick = () => {
    // APPROVE != AUTOMATIC COMMIT: Open explicit confirmation dialog
    setIsConfirmCommitOpen(true);
  };

  const handleConfirmCommit = () => {
    setIsConfirmCommitOpen(false);
    onApprove(rationale);
  };

  const handleCancelCommit = () => {
    setIsConfirmCommitOpen(false);
  };

  return (
    <div className="rounded-sm border border-amber-500/35 bg-gradient-to-b from-[#0e0f15] via-[#090a0f] to-[#07080c] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(245,158,11,0.08)] relative overflow-hidden font-mono select-none">
      {/* Top Warning Stripe Indicator (Previous Visual Style) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 opacity-80" />

      {/* Level 1 & 2: Primary Checkpoint Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs">
            {/* Operational notification badge with slow 6.0s restrained breathing pulse */}
            <span className="px-2 py-0.5 rounded-sm bg-amber-950/80 text-amber-300 border border-amber-500/60 uppercase font-bold text-[10px] flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-warn-slow" />
              APPROVAL REQUIRED
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-300 font-bold">{decisionGate.id}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400 text-[11px] font-sans">
              {decisionGate.requiredEvidenceIds.length} evidence verified · {decisionGate.riskAssessment.affectedInvariants.length} invariant weakened
            </span>
          </div>

          <h2 className="text-sm font-bold text-zinc-100 font-sans tracking-tight">
            {decisionGate.title}
          </h2>

          <p className="text-xs text-zinc-400 font-sans mt-0.5 line-clamp-1">
            {decisionGate.requirement}
          </p>
        </div>

        {/* Level 1 Actions with Clean Micro-Interactions */}
        <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
          {isPending ? (
            <>
              <button
                type="button"
                onClick={() => setIsReviewExpanded(!isReviewExpanded)}
                className="btn-control flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-700 rounded-sm hover:bg-zinc-800 uppercase tracking-wider"
              >
                <span>{isReviewExpanded ? 'Hide Review' : 'Review Dossier'}</span>
                {isReviewExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onReject(rationale)}
                className="btn-control flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/50 rounded-sm uppercase tracking-wider"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Reject</span>
              </button>
              <button
                type="button"
                onClick={handleInitialApproveClick}
                className="btn-control flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-sm uppercase tracking-wider shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Approve</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-sans">
                {isApproved ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> COMMITTED IN DEMO
                  </span>
                ) : (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4" /> HALTED IN DEMO
                  </span>
                )}
              </div>
              <button
                onClick={onReset}
                className="btn-control flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-300 hover:text-white border border-zinc-800 rounded-sm hover:bg-zinc-900"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Explicit Commit Confirmation Dialog (APPROVE != AUTOMATIC COMMIT) */}
      {isConfirmCommitOpen && (
        <div className="mt-4 p-4 rounded-sm border border-emerald-500/50 bg-[#07130c] text-xs space-y-3 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="font-bold text-emerald-300 uppercase tracking-wider text-[11px]">
                Commit this change? — Explicit Confirmation Required
              </div>
            </div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              Checkpoint: {decisionGate.id}
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Human approval verified by Principal Engineer. You are about to promote synthesized changes from{' '}
            <strong className="text-white font-mono">feat/extend-chargeback-30d</strong> to production commit.
          </p>

          <div className="p-2 rounded bg-[#040c07] border border-emerald-500/30 text-[11px] text-emerald-200/90 font-mono">
            Boundary Notice: Invariant <strong className="text-amber-300">INV-BOUND-04</strong> is weakened. Downstream archival partition sync scheduled.
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-950">
            <button
              type="button"
              onClick={handleCancelCommit}
              className="btn-control px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-700 rounded-sm uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmCommit}
              className="btn-control flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-sm uppercase tracking-wider shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
              <span>Confirm Commit</span>
            </button>
          </div>
        </div>
      )}

      {/* Level 3: Progressive Disclosure Review Panel (Opened on "Review Dossier") */}
      {isReviewExpanded && isPending && !isConfirmCommitOpen && (
        <div className="mt-4 pt-4 border-t border-zinc-800 space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Risk & Invariants */}
            <div className="lg:col-span-8 space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                  Full Proposed Scope
                </div>
                <p className="text-xs text-zinc-200 font-mono bg-[#06070a] p-3 rounded-sm border border-zinc-800/80 leading-relaxed">
                  {decisionGate.requirement}
                </p>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                  Architectural Risk Analysis
                </div>
                <div className="p-3 rounded-sm border border-amber-500/30 bg-[#120e0a] text-xs text-amber-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="font-sans leading-relaxed text-xs">
                      {decisionGate.riskAssessment.summary}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20 text-[11px]">
                    <span className="text-amber-400 font-bold uppercase">Weakened Invariants:</span>
                    {decisionGate.riskAssessment.affectedInvariants.map(invId => (
                      <span key={invId} className="px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/40 text-amber-300 font-bold">
                        {invId}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rationale Input */}
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Optional Condition Note / Directives:
                </label>
                <input
                  type="text"
                  value={rationale}
                  onChange={e => setRationale(e.target.value)}
                  placeholder="e.g. Approved provided archival partition retention is upgraded to 45 days in next sprint."
                  className="w-full text-xs px-3 py-2 bg-[#06070a] border border-zinc-800 rounded-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-sans"
                />
              </div>
            </div>

            {/* Right: Evidence Verification Checklist */}
            <div className="lg:col-span-4 space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center justify-between">
                <span>Verified Evidence</span>
                <span>{decisionGate.requiredEvidenceIds.length} Verified</span>
              </div>

              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                {decisionGate.requiredEvidenceIds.map(evId => {
                  const ev = evidenceList.find(e => e.id === evId);
                  return (
                    <div
                      key={evId}
                      onClick={() => onSelectEvidence?.(evId)}
                      className="p-2 rounded-sm bg-[#06070a] hover:bg-[#0f1118] border border-zinc-800/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="truncate mr-2 font-mono">
                        <span className="text-zinc-300 block text-[11px] font-bold">{evId}</span>
                        <span className="text-zinc-500 truncate block text-[10px] font-sans">
                          {ev ? ev.title : 'Evidence dossier'}
                        </span>
                      </div>
                      {ev && <StatusBadge status={ev.status} size="sm" showDot={false} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
