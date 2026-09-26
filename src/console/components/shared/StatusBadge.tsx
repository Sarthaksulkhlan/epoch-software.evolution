import React from 'react';
import { InvariantStatus, TaskStatus, IncidentSeverity, LifecycleState } from '../../types';

interface StatusBadgeProps {
  status: InvariantStatus | TaskStatus | IncidentSeverity | LifecycleState | string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', showDot = true }) => {
  const getStyle = () => {
    switch (status) {
      case 'HOLDING':
      case 'COMPLETED':
      case 'PASS':
      case 'SUCCESS':
      case 'DEPLOYED':
        return {
          dot: 'bg-emerald-400',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30 bg-emerald-950/20'
        };
      case 'WEAKENED':
      case 'RUNNING':
      case 'WARN':
      case 'WARNING':
      case 'PENDING_REVIEW':
      case 'APPROVAL_GATE':
      case 'MEDIUM':
        return {
          dot: 'bg-amber-400 animate-pulse',
          text: 'text-amber-300',
          border: 'border-amber-500/30 bg-amber-950/20'
        };
      case 'VIOLATED':
      case 'FAILED':
      case 'FAIL':
      case 'CRITICAL':
      case 'HIGH':
      case 'HALTED':
      case 'REJECTED':
        return {
          dot: 'bg-rose-400 animate-pulse',
          text: 'text-rose-400',
          border: 'border-rose-500/30 bg-rose-950/20'
        };
      default:
        return {
          dot: 'bg-zinc-400',
          text: 'text-zinc-400',
          border: 'border-zinc-800 bg-zinc-900/40'
        };
    }
  };

  const style = getStyle();
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border font-mono uppercase tracking-wider ${textSize} ${style.border} ${style.text} whitespace-nowrap select-none`}
    >
      {showDot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{status.replace(/_/g, ' ')}</span>
    </span>
  );
};
