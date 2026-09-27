import React, { useState } from 'react';
import { useWorkflow } from '../hooks/useWorkflow';
import { useEventStream } from '../hooks/useEventStream';
import { useApi } from '../hooks/useApi';
import { WorkflowTimeline } from '../components/workflow/WorkflowTimeline';
import { AgentCard } from '../components/workflow/AgentCard';
import { EvidencePanel } from '../components/workflow/EvidencePanel';
import { ApprovalGate } from '../components/workflow/ApprovalGate';
import { EventFeed } from '../components/shared/EventFeed';
import { MetricCard } from '../components/shared/MetricCard';
import { ViewState } from '../components/shared/ViewState';
import { FolderGit2, Compass, Cpu, Loader2, AlertTriangle, GitBranch } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Invariant, LifecycleState } from '../types';

const PRE_GATE: LifecycleState[] = ['INTAKE', 'PLANNING', 'IMPLEMENTATION'];

export const CurrentView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const workflowIdParam = searchParams.get('workflowId');

  const {
    workflow,
    isLoading,
    error,
    notFound,
    reload,
    submitDecision,
    isSubmitting,
    runToApproval,
    isRunning,
    actionError,
    lastMutation
  } = useWorkflow(workflowIdParam);

  const {
    events,
    isPaused,
    setIsPaused,
    clearEvents
  } = useEventStream();

  const { data: invariants } = useApi<Invariant[]>('/api/v1/invariants', ['invariant', 'mutation']);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | undefined>(undefined);
  const [selectedStageKey, setSelectedStageKey] = useState<string | null>(null);
  const navigate = useNavigate();

  const eventFeed = (
    <EventFeed
      events={events}
      isPaused={isPaused}
      onTogglePause={() => setIsPaused(!isPaused)}
      onClear={clearEvents}
      onSelectEntity={entityId => {
        if (entityId.startsWith('M-')) {
          navigate(`/history?mutationId=${entityId}`);
        } else if (entityId.startsWith('INC-') || entityId.startsWith('INV-') || entityId.startsWith('DRIFT-')) {
          navigate(`/trajectory?nodeId=${entityId}`);
        }
      }}
    />
  );

  if (isLoading) return <ViewState kind="loading" title="Loading the current workflow…" />;
  if (error) return <ViewState kind="error" error={error} onRetry={() => void reload()} />;
  if (notFound || !workflow) {
    return (
      <div className="space-y-5">
        <ViewState
          kind="empty"
          title={workflowIdParam ? `Workflow ${workflowIdParam} not found` : 'No workflow has run yet'}
          message={
            workflowIdParam
              ? 'It may have been removed by a demo reset. The newest workflow is shown when you open Current without an id.'
              : 'Start one from IBM Bob (EPOCH-MCP start_workflow), replay the demo history with pnpm demo-reset and pnpm demo:replay, or adopt a measured future in the Futures lens.'
          }
        >
          {workflowIdParam && (
            <Link to="/" className="btn-control mt-1 px-3 py-1.5 text-xs text-zinc-200 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded-sm uppercase tracking-wider">
              Show the newest workflow
            </Link>
          )}
        </ViewState>
        <div className="max-w-xl">{eventFeed}</div>
      </div>
    );
  }

  const tasksDone = workflow.tasks.filter(t => t.status === 'COMPLETED').length;
  const tasksActive = workflow.tasks.filter(t => t.status === 'RUNNING').length;
  const tasksFailed = workflow.tasks.filter(t => t.status === 'FAILED').length;
  const evidenceFail = workflow.evidence.filter(e => e.status === 'FAIL').length;
  const evidenceWarn = workflow.evidence.filter(e => e.status === 'WARN').length;
  const evidencePass = workflow.evidence.filter(e => e.status === 'PASS').length;
  const weakened = (invariants ?? []).filter(i => i.status === 'WEAKENED');
  const violated = (invariants ?? []).filter(i => i.status === 'VIOLATED');
  const notHolding = [...violated, ...weakened];
  const gateStatus = workflow.decisionGate.status;
  const atGate = workflow.state === 'APPROVAL_GATE';
  const canRun = PRE_GATE.includes(workflow.state) && gateStatus === 'PENDING_REVIEW';
  const busy = isRunning || isSubmitting;

  const cycleLabel =
    workflow.state === 'DEPLOYED' ? 'CHANGE RECORDED' : workflow.state === 'HALTED' ? 'HALTED' : atGate ? 'AWAITING REVIEW' : 'CYCLE ACTIVE';

  return (
    <div className="space-y-6">
      {/* Section 1: Operations Command Header (Stagger reveal 1) */}
      <div className="reveal-delay-1 p-4 rounded-sm border border-zinc-800/80 bg-[#08090d]/90 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="text-zinc-200 font-bold">{workflow.projectName} ({workflow.repo})</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500 uppercase tracking-widest text-[10px]">{workflow.id}</span>
            <span className="text-zinc-600">·</span>
            <span className={`text-[10px] flex items-center gap-1.5 font-bold ${workflow.state === 'HALTED' ? 'text-rose-400' : atGate ? 'text-amber-300' : 'text-emerald-400'}`}>
              <span className={`w-2 h-2 rounded-full ${workflow.state === 'HALTED' ? 'bg-rose-400' : atGate ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse-live`} />
              {cycleLabel}
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

      {/* Remediation / pre-gate: run EPOCH's specialists up to the approval gate */}
      {(canRun || isRunning) && (
        <div className="reveal-delay-1 p-3.5 rounded-sm border border-cyan-500/40 bg-[#07111a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-start gap-3">
            {isRunning ? <Loader2 className="w-5 h-5 text-cyan-300 shrink-0 animate-spin" /> : <GitBranch className="w-5 h-5 text-cyan-300 shrink-0" />}
            <div>
              <div className="font-bold text-cyan-200 uppercase tracking-wider">
                {isRunning ? 'Running Historian, Security, QA and Evolution…' : 'Workflow open: the approval gate opens after EPOCH’s checks'}
              </div>
              <div className="font-sans text-zinc-300 text-xs mt-0.5">
                {isRunning
                  ? 'The specialists and the verification scan run now; on the hosted free tier this takes about 30 seconds.'
                  : 'EPOCH’s specialists examine the change and the scanner verifies the working tree, then the gate asks a person to decide.'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void runToApproval()}
            disabled={busy}
            className="btn-control flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-800 hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-wait border border-cyan-500/50 rounded-sm uppercase tracking-wider self-start sm:self-auto shrink-0"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Running specialists…' : 'Run EPOCH’s specialists to the gate'}</span>
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-sm border border-rose-500/40 bg-[#12080a] text-xs text-rose-200 font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

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
          value={invariants ? (notHolding.length === 0 ? 'All Holding' : `${weakened.length} Weak / ${violated.length} Viol`) : '—'}
          subtext={notHolding.length > 0 ? notHolding.map(i => i.id).join(' & ') : `${invariants?.length ?? 0} invariants checked`}
          status={notHolding.length > 0 ? 'warning' : 'nominal'}
        />
        <MetricCard
          label="Specialist Tasks"
          value={`${tasksDone} Done / ${tasksActive} Active`}
          subtext={tasksFailed > 0 ? `${tasksFailed} failed` : workflow.tasks.length > 0 ? [...new Set(workflow.tasks.map(t => t.agentName))].slice(0, 3).join(', ') : 'None run yet'}
          status={tasksFailed > 0 ? 'warning' : 'nominal'}
        />
        <MetricCard
          label="Evidence Dossier"
          value={`${workflow.evidence.length} Artifacts`}
          subtext={`${evidenceFail} fail · ${evidenceWarn} warn · ${evidencePass} pass`}
          status={evidenceFail > 0 ? 'warning' : 'nominal'}
        />
        <MetricCard
          label="Decision Checkpoint"
          value={gateStatus === 'PENDING_REVIEW' ? (atGate ? 'PENDING' : 'NOT OPEN') : gateStatus}
          subtext={`${workflow.decisionGate.id} · risk ${workflow.decisionGate.riskAssessment.level}`}
          status={gateStatus === 'APPROVED' ? 'nominal' : 'warning'}
        />
      </div>

      {/* Section 4: Next Decision Checkpoint (Prominent Approval Gate with Commit Confirmation) (Stagger reveal 3) */}
      <div className="reveal-delay-3">
        <ApprovalGate
          decisionGate={workflow.decisionGate}
          evidenceList={workflow.evidence}
          canDecide={atGate && !isRunning}
          isSubmitting={isSubmitting}
          waitingNote={
            atGate || gateStatus !== 'PENDING_REVIEW'
              ? undefined
              : 'The gate opens once EPOCH’s specialists and verification have run.'
          }
          recordedMutationId={lastMutation?.id}
          repoLabel={`${workflow.projectName} (${workflow.repo}), branch ${workflow.branch}`}
          onApprove={rationale => void submitDecision('APPROVED', rationale)}
          onReject={rationale => void submitDecision('REJECTED', rationale)}
          onSelectEvidence={id => setSelectedEvidenceId(id)}
        />
      </div>

      {/* Section 5: Specialist Agents & Live Stream (Stagger reveal 3) */}
      <div className="reveal-delay-3 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-zinc-500">
            <span>Specialist Agents & Synthesizers</span>
            <span>{workflow.tasks.length} Tasks</span>
          </div>

          {workflow.tasks.length === 0 ? (
            <div className="rounded-sm border border-zinc-800/80 bg-[#08090d] p-6 text-center text-xs text-zinc-500 font-mono">
              No specialist has run for this workflow yet.
            </div>
          ) : (
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
          )}
        </div>

        <div className="lg:col-span-4">
          {eventFeed}
        </div>
      </div>

      {/* Section 6: Evidence Dossier Section (Stagger reveal 4) */}
      <div className="reveal-delay-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-zinc-500">
          <span>Synthesized Task Evidence Dossier</span>
          <span>{workflow.evidence.length} Recorded Findings</span>
        </div>

        {workflow.evidence.length === 0 ? (
          <div className="rounded-sm border border-zinc-800/80 bg-[#08090d] p-6 text-center text-xs text-zinc-500 font-mono">
            No evidence recorded yet. The specialists attach their claims here as they run.
          </div>
        ) : (
          <EvidencePanel
            evidenceList={workflow.evidence}
            selectedEvidenceId={selectedEvidenceId}
            onSelectEvidence={id => setSelectedEvidenceId(id)}
          />
        )}
      </div>
    </div>
  );
};
