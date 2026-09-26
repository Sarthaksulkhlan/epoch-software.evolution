import React, { useState } from 'react';
import { useWorkflow } from '../hooks/useWorkflow';
import { useEventStream } from '../hooks/useEventStream';
import { WorkflowTimeline } from '../components/workflow/WorkflowTimeline';
import { AgentCard } from '../components/workflow/AgentCard';
import { EvidencePanel } from '../components/workflow/EvidencePanel';
import { ApprovalGate } from '../components/workflow/ApprovalGate';
import { EventFeed } from '../components/shared/EventFeed';
import { MetricCard } from '../components/shared/MetricCard';
import { GitBranch, FolderGit2, AlertTriangle, Layers, ShieldCheck, Compass, Terminal, ShieldAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const CurrentView: React.FC = () => {
  const {
    workflow,
    isDemoActionApplied,
    submitDecision,
    resetDecision
  } = useWorkflow();

  const {
    events,
    isPaused,
    setIsPaused,
    clearEvents
  } = useEventStream();

  const [selectedTaskId, setSelectedTaskId] = useState<string>('TASK-204');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>('EVID-804');
  const [selectedStageKey, setSelectedStageKey] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Section 1: Operations Command Header (Stagger reveal 1) */}
      <div className="reveal-delay-1 p-4 rounded-sm border border-zinc-800/80 bg-[#08090d]/90 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="text-zinc-200 font-bold">{workflow.projectId}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Operations Deck</span>
            <span className="text-zinc-600">·</span>
            <span className="text-emerald-400 text-[10px] flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-live" />
              CYCLE ACTIVE
            </span>
          </div>

          <h1 className="text-base font-bold text-zinc-100 font-sans tracking-tight">
            {workflow.requirementTitle}
          </h1>

          <p className="text-xs text-zinc-400 font-sans mt-1 max-w-4xl leading-relaxed">
            {workflow.requirementDescription}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/trajectory"
            className="btn-control flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-300 bg-amber-950/60 hover:bg-amber-950/90 border border-amber-500/40 rounded-sm uppercase tracking-wider font-semibold shadow-sm"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400 animate-pulse-warn" />
            <span>Trajectory Drift</span>
          </Link>
          <Link
            to="/history"
            className="btn-control flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-sm uppercase tracking-wider"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Lineage</span>
          </Link>
        </div>
      </div>

      {/* Section 2: Prominent Connected Lifecycle Pipeline (Clickable Interactive Stages) (Stagger reveal 2) */}
      <div className="reveal-delay-2">
        <WorkflowTimeline
          currentState={workflow.state}
          completedSteps={workflow.completedSteps}
          totalSteps={workflow.totalSteps}
          workflow={workflow}
          selectedStageKey={selectedStageKey}
          onSelectStage={setSelectedStageKey}
        />
      </div>

      {/* Section 3: Telemetry Metrics Readout (Stagger reveal 2) */}
      <div className="reveal-delay-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Boundary Invariants"
          value="1 Weak / 1 Viol"
          subtext="INV-BOUND-04 & INV-TIME-02"
          status="warning"
        />
        <MetricCard
          label="Specialist Tasks"
          value="4 Done / 1 Active"
          subtext="IBM Bob 2.0 & EPOCH Sentinel"
          status="nominal"
        />
        <MetricCard
          label="Evidence Dossier"
          value="5 Artifacts"
          subtext="Diffs, matrix, sentinel audits"
          status="nominal"
        />
        <MetricCard
          label="Decision Checkpoint"
          value={workflow.decisionGate.status === 'PENDING_REVIEW' ? 'PENDING' : workflow.decisionGate.status}
          subtext="GATE-774 Architectural Gate"
          status={workflow.decisionGate.status === 'APPROVED' ? 'nominal' : 'warning'}
        />
      </div>

      {/* Section 4: Next Decision Checkpoint (Prominent Approval Gate with Commit Confirmation) (Stagger reveal 3) */}
      <div className="reveal-delay-3">
        <ApprovalGate
          decisionGate={workflow.decisionGate}
          evidenceList={workflow.evidence}
          isDemoActionApplied={isDemoActionApplied}
          onApprove={rationale => submitDecision('APPROVED', rationale)}
          onReject={rationale => submitDecision('REJECTED', rationale)}
          onReset={resetDecision}
          onSelectEvidence={id => setSelectedEvidenceId(id)}
        />
      </div>

      {/* Section 5: Specialist Agents & Live Stream (Stagger reveal 3) */}
      <div className="reveal-delay-3 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-zinc-500">
            <span>Specialist Agents & Synthesizers</span>
            <span>WEAVE Fabric Managed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {workflow.tasks.map(task => (
              <AgentCard
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                onSelect={() => setSelectedTaskId(task.id)}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-4">
          <EventFeed
            events={events}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            onClear={clearEvents}
            onSelectEntity={entityId => {
              if (entityId.startsWith('M-')) {
                navigate(`/history?mutationId=${entityId}`);
              } else if (entityId.startsWith('INC-')) {
                navigate(`/trajectory?nodeId=${entityId}`);
              }
            }}
          />
        </div>
      </div>

      {/* Section 6: Evidence Dossier Section (Stagger reveal 4) */}
      <div className="reveal-delay-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-zinc-500">
          <span>Synthesized Task Evidence Dossier</span>
          <span>5 Cryptographically Verified Findings</span>
        </div>

        <EvidencePanel
          evidenceList={workflow.evidence}
          selectedEvidenceId={selectedEvidenceId}
          onSelectEvidence={id => setSelectedEvidenceId(id)}
        />
      </div>
    </div>
  );
};
