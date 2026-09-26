import React from 'react';
import type { Mutation, Incident } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { GitCommit, AlertOctagon, CornerDownRight, ArrowRight } from 'lucide-react';

interface MutationCardProps {
  item: {
    type: 'MUTATION' | 'INCIDENT';
    data: Mutation | Incident;
    epoch: number;
    timestamp: string;
  };
  isSelected: boolean;
  onSelect: () => void;
  isCausalOrigin?: boolean;
  isLastInEpoch?: boolean;
}

export const MutationCard: React.FC<MutationCardProps> = ({
  item,
  isSelected,
  onSelect,
  isCausalOrigin = false
}) => {
  const isMutation = item.type === 'MUTATION';
  const mutation = isMutation ? (item.data as Mutation) : null;
  const incident = !isMutation ? (item.data as Incident) : null;

  return (
    <div className="relative pl-6 select-none font-mono">
      {/* Vertical Branch Stem Line */}
      <div className="absolute left-2.5 top-0 bottom-0 w-px bg-zinc-800" />
      {/* Branch Horizontal Connector: ├── */}
      <div className="absolute left-2.5 top-4 w-3.5 h-px bg-zinc-700" />
      {/* Node Dot Marker */}
      <div
        className={`absolute left-[7px] top-[13px] w-2 h-2 rounded-full border ${
          isMutation
            ? isCausalOrigin
              ? 'bg-amber-400 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-zinc-400 border-zinc-300'
            : 'bg-rose-500 border-rose-400 animate-pulse'
        }`}
      />

      {/* Semantic Compressed Card (Understand in 5 seconds) */}
      <div
        onClick={onSelect}
        className={`p-2.5 rounded-sm border transition-all cursor-pointer ${
          isSelected
            ? 'border-zinc-400 bg-[#0f121b] ring-1 ring-zinc-400/30 shadow-md'
            : isCausalOrigin
            ? 'border-amber-500/40 bg-[#120e09] hover:border-amber-500/60'
            : 'border-zinc-800/80 bg-[#08090d] hover:border-zinc-700 hover:bg-[#0b0d13]'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-zinc-100 shrink-0">
              {isMutation ? mutation?.id : incident?.id}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="font-sans text-xs text-zinc-200 truncate">
              {isMutation ? mutation?.title : incident?.title}
            </span>
          </div>

          <div className="shrink-0">
            {isMutation ? (
              <StatusBadge status={mutation!.status} size="sm" showDot={false} />
            ) : (
              <StatusBadge status={incident!.severity} size="sm" />
            )}
          </div>
        </div>

        {/* Level 2 Metadata row */}
        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 mt-1 border-t border-zinc-800/60">
          <div className="flex items-center gap-1.5 truncate">
            {isCausalOrigin && (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <CornerDownRight className="w-3 h-3" /> PRECURSOR → INC-3312
              </span>
            )}
            {!isCausalOrigin && isMutation && (
              <span className="text-zinc-400 truncate">
                {mutation?.touchedComponents.slice(0, 2).join(' · ')}
                {mutation!.touchedComponents.length > 2 ? ` +${mutation!.touchedComponents.length - 2}` : ''}
              </span>
            )}
            {!isMutation && (
              <span className="text-rose-400 truncate font-semibold">
                $420k FROZEN SETTLEMENTS
              </span>
            )}
          </div>

          <span className="tabular-nums shrink-0">
            {new Date(item.timestamp).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>
    </div>
  );
};
