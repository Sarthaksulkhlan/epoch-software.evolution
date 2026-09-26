import React from 'react';
import type { LifecycleState, Workflow } from '../../types';
import { Check, ShieldAlert, X, ChevronRight, FileText, Cpu, AlertTriangle, ShieldCheck, GitCommit } from 'lucide-react';

interface WorkflowTimelineProps {
  currentState: LifecycleState;
  completedSteps: number;
  totalSteps: number;
  workflow?: Workflow;
  selectedStageKey?: string | null;
  onSelectStage?: (stageKey: string | null) => void;
}

const STAGES: { key: string; label: string; sub: string }[] = [
  { key: 'INTAKE', label: 'INTAKE', sub: 'Requirement Scope' },
  { key: 'PLANNING', label: 'PLAN', sub: 'Boundary Invariants' },
  { key: 'IMPLEMENTATION', label: 'IMPLEMENT', sub: 'Code Synthesis' },
  { key: 'VERIFICATION', label: 'VERIFY', sub: 'Oracle Regression' },
  { key: 'APPROVAL_GATE', label: 'APPROVAL', sub: 'Governance Gate' },
  { key: 'DEPLOYED', label: 'COMMIT', sub: 'Production Promotion' }
];

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  currentState,
  workflow,
  selectedStageKey,
  onSelectStage
}) => {
  const getStageIndex = (state: LifecycleState) => {
    switch (state) {
      case 'INTAKE': return 0;
      case 'PLANNING': return 1;
      case 'IMPLEMENTATION': return 2;
      case 'VERIFICATION': return 3;
      case 'APPROVAL_GATE': return 4;
      case 'DEPLOYED': return 5;
      case 'HALTED': return 4;
      default: return 0;
    }
  };

  const activeIndex = getStageIndex(currentState);

  const handleStageClick = (stageKey: string) => {
    if (!onSelectStage) return;
    if (selectedStageKey === stageKey) {
      onSelectStage(null);
    } else {
      onSelectStage(stageKey);
    }
  };

  return (
    <div className="w-full bg-[#08090d]/90 backdrop-blur border border-zinc-800/80 rounded-sm p-4 font-mono select-none space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-live" />
          <span className="uppercase tracking-widest font-bold text-zinc-100 text-[11px]">
            Lifecycle Execution Pipeline
          </span>
        </div>
        <div className="text-zinc-500 text-[10px]">
          CLICK ANY STAGE TO INSPECT CONTEXT · WEAVE CONTROL PLANE
        </div>
      </div>

      {/* Connected Horizontal Flow Pipeline: Clickable Interactive Stages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeIndex || currentState === 'DEPLOYED';
          const isCurrent = idx === activeIndex && currentState !== 'DEPLOYED' && currentState !== 'HALTED';
          const isHalted = idx === activeIndex && currentState === 'HALTED';
          const isSelected = selectedStageKey === stage.key;

          const selectionRing = isSelected ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.3)]' : '';

          if (isCurrent) {
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => handleStageClick(stage.key)}
                className={`p-3 rounded-sm border-2 border-cyan-400/90 bg-gradient-to-b from-[#0a1828] to-[#07101a] text-zinc-100 animate-active-stage flex flex-col justify-between min-h-[82px] transition-all relative overflow-hidden text-left cursor-pointer ${selectionRing}`}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-pulse" />

                <div className="flex items-center justify-between mb-1 w-full">
                  <span className="text-[9px] uppercase tracking-widest text-cyan-300 font-bold">
                    0{idx + 1} // ACTIVE
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                    IN PROGRESS
                  </span>
                </div>

                <div className="w-full">
                  <div className="text-xs font-bold tracking-wider text-white font-mono flex items-center justify-between">
                    <span>{stage.label}</span>
                    <span className="text-[9px] text-cyan-400 font-normal">85%</span>
                  </div>
                  <div className="w-full h-1 bg-cyan-950 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full w-5/6 animate-pulse" />
                  </div>
                </div>
              </button>
            );
          }

          if (isHalted) {
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => handleStageClick(stage.key)}
                className={`p-3 rounded-sm border border-rose-500/80 bg-[#16080a] text-rose-300 flex flex-col justify-between min-h-[82px] transition-all shadow-[0_0_15px_rgba(244,63,94,0.2)] text-left cursor-pointer ${selectionRing}`}
              >
                <div className="flex items-center justify-between mb-1 w-full">
                  <span className="text-[9px] uppercase tracking-widest text-rose-400 font-bold">
                    0{idx + 1} // HALTED
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold">
                    <ShieldAlert className="w-3.5 h-3.5" /> HALTED
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold tracking-wider text-rose-100 font-mono">
                    {stage.label}
                  </div>
                  <div className="text-[10px] text-rose-300/80 truncate mt-0.5 font-sans">
                    {stage.sub}
                  </div>
                </div>
              </button>
            );
          }

          if (isDone) {
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => handleStageClick(stage.key)}
                className={`p-3 rounded-sm border border-zinc-800/80 bg-[#07090c] text-zinc-400 flex flex-col justify-between min-h-[82px] opacity-80 hover:opacity-100 hover:border-zinc-700 transition-all text-left cursor-pointer ${selectionRing}`}
              >
                <div className="flex items-center justify-between mb-1 w-full">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500">
                    0{idx + 1}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                    <Check className="w-3 h-3" /> PASS
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold tracking-wider text-zinc-300 font-mono">
                    {stage.label}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5 font-sans">
                    {stage.sub}
                  </div>
                </div>
              </button>
            );
          }

          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => handleStageClick(stage.key)}
              className={`p-3 rounded-sm border border-zinc-900 bg-[#060709] text-zinc-600 flex flex-col justify-between min-h-[82px] opacity-55 hover:opacity-85 hover:border-zinc-800 transition-all text-left cursor-pointer ${selectionRing}`}
            >
              <div className="flex items-center justify-between mb-1 w-full">
                <span className="text-[9px] uppercase tracking-widest text-zinc-600">
                  0{idx + 1}
                </span>
                <span className="text-[10px] text-zinc-600">PENDING</span>
              </div>
              <div>
                <div className="text-xs font-medium tracking-wider text-zinc-500 font-mono">
                  {stage.label}
                </div>
                <div className="text-[10px] text-zinc-600 truncate mt-0.5 font-sans">
                  {stage.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Contextual Detail Inspector Drawer (Level 3 Progressive Disclosure) */}
      {selectedStageKey && (
        <div className="mt-3 p-3.5 rounded-sm border border-cyan-500/40 bg-[#060910] text-xs space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
                {selectedStageKey === 'INTAKE' && '01 // INTAKE — REQUIREMENT SCOPE & INCOMING CONTEXT'}
                {selectedStageKey === 'PLANNING' && '02 // PLAN — WORKFLOW PLANNING & AGENT ALLOCATION'}
                {selectedStageKey === 'IMPLEMENTATION' && '03 // IMPLEMENT — CODE SYNTHESIS & MUTATION ACTIVITY'}
                {selectedStageKey === 'VERIFICATION' && '04 // VERIFY — ORACLE REGRESSION & INVARIANT AUDIT'}
                {selectedStageKey === 'APPROVAL_GATE' && '05 // APPROVAL — GOVERNANCE GATE & RISK CHECKPOINT'}
                {selectedStageKey === 'DEPLOYED' && '06 // COMMIT — PRODUCTION PROMOTION & TARGET SPEC'}
              </span>
            </div>
            <button
              onClick={() => onSelectStage?.(null)}
              className="btn-control flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800"
            >
              <X className="w-3 h-3" />
              <span>Close</span>
            </button>
          </div>

          {/* INTAKE Detail */}
          {selectedStageKey === 'INTAKE' && (
            <div className="space-y-2 text-zinc-300 font-sans">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span className="text-zinc-500">Project:</span>
                <span className="text-zinc-200 font-bold">{workflow?.projectId || 'HYPERION-COMMERCE'}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500">Directive:</span>
                <span className="text-amber-300 font-bold">EU-2026-PAY-882</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {workflow?.requirementDescription || 'In response to EU statutory compliance directive (EU-2026-PAY-882), merchant accounts must support 30-day chargeback claims without breaking settlement ledger reconciliations.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                <div className="p-2 bg-[#090b10] border border-zinc-800 rounded">
                  <span className="text-zinc-500 block uppercase">Baseline Window</span>
                  <span className="text-zinc-200 font-bold text-xs mt-0.5 block">15 Calendar Days</span>
                </div>
                <div className="p-2 bg-[#090b10] border border-zinc-800 rounded">
                  <span className="text-zinc-500 block uppercase">Target Requirement</span>
                  <span className="text-cyan-300 font-bold text-xs mt-0.5 block">30 Calendar Days</span>
                </div>
                <div className="p-2 bg-[#090b10] border border-zinc-800 rounded">
                  <span className="text-zinc-500 block uppercase">Lifecycle Status</span>
                  <span className="text-emerald-400 font-bold text-xs mt-0.5 block">Synthesized & Parsed</span>
                </div>
              </div>
            </div>
          )}

          {/* PLANNING Detail */}
          {selectedStageKey === 'PLANNING' && (
            <div className="space-y-2 text-zinc-300">
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                The WEAVE workflow planner decomposed the intake requirement into 4 specialist tasks, allocating IBM Bob 2.0 synthesizers and continuous boundary sentinels.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                <div className="p-2 bg-[#090b10] border border-zinc-800 rounded space-y-1">
                  <span className="text-zinc-500 block uppercase">Specialist Tasks Planned</span>
                  <div className="text-zinc-200">TASK-201: Boundary Invariant Pre-check</div>
                  <div className="text-zinc-200">TASK-202: Code Synthesis (Rule Engine)</div>
                  <div className="text-zinc-200">TASK-203: Sentinel Static Coupling Audit</div>
                  <div className="text-zinc-200">TASK-204: Evidence Dossier Compilation</div>
                </div>
                <div className="p-2 bg-[#090b10] border border-zinc-800 rounded space-y-1">
                  <span className="text-zinc-500 block uppercase">Invariants Under Watch</span>
                  <div className="text-amber-300">INV-BOUND-04: Cross-Service Ledger Isolation</div>
                  <div className="text-zinc-300">INV-TIME-02: Temporal Archival Parity</div>
                  <div className="text-zinc-300">INV-AUTH-01: Idempotent Dispute Token Validation</div>
                </div>
              </div>
            </div>
          )}

          {/* IMPLEMENTATION Detail */}
          {selectedStageKey === 'IMPLEMENTATION' && (
            <div className="space-y-2 text-zinc-300 font-sans">
              <p className="text-xs text-zinc-300 leading-relaxed">
                IBM Bob 2.0 synthesized the window calculation updates across dispute rule engine modules, modifying eligibility thresholds from 15 to 30 days.
              </p>
              <div className="p-2.5 bg-[#090b10] border border-zinc-800 rounded font-mono text-[10px] space-y-1">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>File: <strong className="text-zinc-200">services/dispute/src/eligibility/ruleEngine.ts</strong></span>
                  <span className="text-emerald-400">+14 additions / -3 deletions</span>
                </div>
                <div className="text-zinc-400">
                  Generated Mutation ID: <strong className="text-amber-300">M-1042</strong> (Pull Request #892)
                </div>
                <div className="text-amber-400/90 text-[10px] pt-1 border-t border-zinc-800">
                  ⚠ Synthesis Warning: Archival cron job assumes immutable settlements after 15 days.
                </div>
              </div>
            </div>
          )}

          {/* VERIFICATION Detail */}
          {selectedStageKey === 'VERIFICATION' && (
            <div className="space-y-2 text-zinc-300">
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                Regression oracles and static coupling audits evaluated the synthesized changes prior to human governance review.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[10px]">
                <div className="p-2 bg-[#090b10] border border-zinc-800 rounded">
                  <span className="text-zinc-500 block uppercase">Regression Suites</span>
                  <span className="text-emerald-400 font-bold text-xs mt-0.5 block">42/42 Passed</span>
                </div>
                <div className="p-2 bg-[#090b10] border border-zinc-800 rounded">
                  <span className="text-zinc-500 block uppercase">Boundary Sentinel</span>
                  <span className="text-amber-400 font-bold text-xs mt-0.5 block">1 Invariant Weakened</span>
                </div>
                <div className="p-2 bg-[#090b10] border border-zinc-800 rounded">
                  <span className="text-zinc-500 block uppercase">Evidence Items</span>
                  <span className="text-cyan-300 font-bold text-xs mt-0.5 block">5 Findings Attached</span>
                </div>
              </div>
            </div>
          )}

          {/* APPROVAL_GATE Detail */}
          {selectedStageKey === 'APPROVAL_GATE' && (
            <div className="space-y-2 text-zinc-300 font-sans">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Mandatory human-in-the-loop checkpoint GATE-774. Architectural governance gate blocks automatic promotion until human principal signs off with explicit commit confirmation.
              </p>
              <div className="p-2.5 bg-[#090b10] border border-amber-500/30 rounded font-mono text-[10px] space-y-1 text-amber-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Checkpoint: GATE-774</span>
                  <span className="text-amber-400 uppercase font-bold">Pending Review</span>
                </div>
                <div className="text-zinc-300 text-[10px]">
                  Risk: Modification introduces latency anomaly in settlement ledger partition archival.
                </div>
              </div>
            </div>
          )}

          {/* DEPLOYED / COMMIT Detail */}
          {selectedStageKey === 'DEPLOYED' && (
            <div className="space-y-2 text-zinc-300 font-mono text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Target Subsystem: <strong className="text-zinc-200">Hyperion Commerce v3.4.1</strong></span>
                <span>Branch: <strong className="text-cyan-300">feat/extend-chargeback-30d</strong></span>
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Explicit confirmation required before commit promotion. Once confirmed by the user, changes transition to the committed state.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
