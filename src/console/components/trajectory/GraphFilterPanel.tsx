import React from 'react';
import type { Invariant } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { Layers, ShieldCheck, Check, Radio } from 'lucide-react';

interface GraphFilterPanelProps {
  components: string[];
  activeComponent: string;
  onSelectComponent: (comp: string) => void;
  invariants: Invariant[];
  activeInvariantFilter: string;
  onSelectInvariantFilter: (filter: string) => void;
  highlightCausalChain: boolean;
  onToggleCausalChain: () => void;
  selectedEpoch: number;
  onSelectEpoch: (epoch: number) => void;
}

export const GraphFilterPanel: React.FC<GraphFilterPanelProps> = ({
  components,
  activeComponent,
  onSelectComponent,
  invariants,
  activeInvariantFilter,
  onSelectInvariantFilter,
  highlightCausalChain,
  onToggleCausalChain,
  selectedEpoch,
  onSelectEpoch
}) => {
  return (
    <div className="w-full lg:w-60 rounded-sm border border-zinc-800/80 bg-[#08090d] p-3 space-y-4 font-mono select-none text-xs">
      {/* Epoch Scrubber */}
      <div>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          <span>Epoch Scrubber</span>
          <span className="text-zinc-200 font-bold">E0{selectedEpoch}</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {[0, 1, 2, 3, 4].map(ep => (
            <button
              key={ep}
              onClick={() => onSelectEpoch(ep)}
              className={`py-1 text-xs rounded-sm transition-colors ${
                selectedEpoch === ep
                  ? 'bg-zinc-200 text-zinc-950 font-bold'
                  : 'bg-[#06070a] text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              0{ep}
            </button>
          ))}
        </div>
      </div>

      {/* Causal Chain Toggle */}
      <div className="pt-2 border-t border-zinc-800/80">
        <label className="flex items-center justify-between p-2 rounded-sm bg-[#06070a] border border-zinc-800 cursor-pointer hover:bg-zinc-900/60 transition-colors">
          <div>
            <div className="text-[11px] font-semibold text-zinc-200 uppercase tracking-wide">
              Causal Chain
            </div>
            <div className="text-[9px] text-amber-400 mt-0.5">
              M-1042 → INC-3312
            </div>
          </div>
          <input
            type="checkbox"
            checked={highlightCausalChain}
            onChange={onToggleCausalChain}
            className="w-3.5 h-3.5 rounded-sm text-zinc-600 bg-zinc-900 border-zinc-700 focus:ring-0 cursor-pointer"
          />
        </label>
      </div>

      {/* Components Filter */}
      <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
          <Layers className="w-3 h-3 text-zinc-400" />
          <span>System Subsystems</span>
        </div>
        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
          {['ALL', ...components].map(comp => (
            <button
              key={comp}
              onClick={() => onSelectComponent(comp)}
              className={`w-full text-left px-2 py-1 rounded-sm text-[11px] transition-colors flex items-center justify-between ${
                activeComponent === comp
                  ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                  : 'text-zinc-400 hover:bg-[#06070a] hover:text-zinc-200'
              }`}
            >
              <span className="truncate">{comp === 'ALL' ? 'ALL' : comp}</span>
              {activeComponent === comp && <Check className="w-3 h-3 text-zinc-200 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Invariants Health Filter */}
      <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
          <ShieldCheck className="w-3 h-3 text-zinc-400" />
          <span>Invariant Health</span>
        </div>
        <div className="space-y-1">
          {['ALL', 'HOLDING', 'WEAKENED', 'VIOLATED'].map(invStatus => (
            <button
              key={invStatus}
              onClick={() => onSelectInvariantFilter(invStatus)}
              className={`w-full text-left px-2 py-1 rounded-sm text-[11px] transition-colors flex items-center justify-between ${
                activeInvariantFilter === invStatus
                  ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                  : 'text-zinc-400 hover:bg-[#06070a] hover:text-zinc-200'
              }`}
            >
              <span>{invStatus}</span>
              {invStatus !== 'ALL' && <StatusBadge status={invStatus} size="sm" showDot={false} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
