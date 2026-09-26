import React, { useState } from 'react';
import { SpecialistTask } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { Cpu, Terminal, ShieldCheck, Activity, Bot, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface AgentCardProps {
  task: SpecialistTask;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  task,
  isSelected = false,
  onSelect
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getRoleIcon = () => {
    switch (task.role) {
      case 'ARCHITECT':
        return <Cpu className="w-3.5 h-3.5 text-zinc-300" />;
      case 'CODE_SYNTHESIZER':
        return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
      case 'VERIFICATION_ORACLE':
        return <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />;
      case 'INVARIANT_SENTINEL':
        return <Activity className="w-3.5 h-3.5 text-purple-400" />;
      case 'DRIFT_ANALYST':
        return <Bot className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'ACTIVE';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  return (
    <div
      className={`rounded-sm border transition-all font-mono select-none ${
        isSelected || isExpanded
          ? 'border-zinc-500 bg-[#0e111a] ring-1 ring-zinc-500/20'
          : 'border-zinc-800/80 bg-[#08090d] hover:border-zinc-700 hover:bg-[#0c0e14]'
      }`}
    >
      {/* Level 1 & 2: Compact Operational Row (Click to Expand / Inspect) */}
      <div
        onClick={() => {
          setIsExpanded(!isExpanded);
          onSelect?.();
        }}
        className="p-3 flex items-center justify-between cursor-pointer gap-3"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded bg-zinc-900 border border-zinc-800 shrink-0">
            {getRoleIcon()}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-200 tracking-wide">
                {task.agentName}
              </span>
              <span className="text-zinc-600 text-[10px]">·</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest">
                {task.role}
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5 font-sans">
              <span>{task.evidenceProducedCount} artifact{task.evidenceProducedCount !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>Runtime: {formatDuration(task.durationMs)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <StatusBadge status={task.status} size="sm" />
          <button
            type="button"
            className="text-zinc-500 hover:text-zinc-300 p-0.5"
            aria-label="Toggle agent details"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Level 3: Full Detailed Information on Interaction */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-800/80 bg-[#06070a] text-xs font-sans text-zinc-300 space-y-2 animate-in fade-in duration-200">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
              Synthesized Operational Action
            </div>
            <p className="leading-relaxed bg-[#090b10] p-2.5 rounded-sm border border-zinc-800 text-xs">
              {task.action}
            </p>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
            <span>TASK ID: {task.id}</span>
            <span>STARTED: {new Date(task.startedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
