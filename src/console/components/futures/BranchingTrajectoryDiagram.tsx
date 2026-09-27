import React from 'react';
import type { CounterfactualScenario } from '../../types';

interface BranchingTrajectoryDiagramProps {
  originMutationId: string;
  /** Title of the branch-point mutation (null while it loads). */
  originTitle?: string | null;
  scenarios: CounterfactualScenario[];
  selectedScenarioId: string;
  appliedScenarioId: string | null;
  onSelectScenario: (id: string) => void;
}

type Tone = 'emerald' | 'amber' | 'cyan';

/** Literal class names so Tailwind can see them. */
const TONES: Record<Tone, { stroke: string; glow: string; card: string }> = {
  emerald: {
    stroke: '#10b981',
    glow: 'filter drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]',
    card: 'border-2 border-emerald-400 bg-gradient-to-b from-[#091a12] to-[#06120c] text-zinc-100 shadow-[0_0_20px_rgba(16,185,129,0.25)] opacity-100 scale-[1.01]'
  },
  amber: {
    stroke: '#f59e0b',
    glow: 'filter drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]',
    card: 'border-2 border-amber-400 bg-gradient-to-b from-[#1a1208] to-[#120c05] text-zinc-100 shadow-[0_0_20px_rgba(245,158,11,0.25)] opacity-100 scale-[1.01]'
  },
  cyan: {
    stroke: '#38bdf8',
    glow: 'filter drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]',
    card: 'border-2 border-cyan-400 bg-gradient-to-b from-[#0a1520] to-[#071018] text-zinc-100 shadow-[0_0_20px_rgba(56,189,248,0.25)] opacity-100 scale-[1.01]'
  }
};

/** The recommended future is emerald; the others are amber, then cyan. */
function tonesFor(scenarios: CounterfactualScenario[]): Tone[] {
  let others = 0;
  return scenarios.map(s => (s.recommended ? 'emerald' : others++ === 0 ? 'amber' : 'cyan'));
}

/** "A" for "A · Keep the current path". */
const futureLetter = (s: CounterfactualScenario) => s.scenarioId ?? s.title.split(' · ')[0];
/** "Keep the current path" for "A · Keep the current path". */
const futureName = (s: CounterfactualScenario) => {
  const prefix = `${futureLetter(s)} · `;
  return s.strategyName.startsWith(prefix) ? s.strategyName.slice(prefix.length) : s.strategyName;
};
/** EPOCH counts changed files; it does not estimate calendar time. */
const filesChanged = (s: CounterfactualScenario) => s.changedFiles?.length || s.projectedTimeDays;

export const BranchingTrajectoryDiagram: React.FC<BranchingTrajectoryDiagramProps> = ({
  originMutationId,
  originTitle,
  scenarios,
  selectedScenarioId,
  appliedScenarioId,
  onSelectScenario
}) => {
  const tones = tonesFor(scenarios);
  const n = scenarios.length;
  // Drop line under each card: n=1 -> 300, n=2 -> 150/450, n=3 -> 100/300/500.
  const xs = scenarios.map((_, i) => (600 * (2 * i + 1)) / (2 * Math.max(n, 1)));
  const minX = Math.min(...xs, 300);
  const maxX = Math.max(...xs, 300);
  const gridCols = n === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';

  return (
    <div className="w-full rounded-sm border border-zinc-800/80 bg-[#08090d]/90 backdrop-blur p-4 sm:p-5 font-mono select-none overflow-hidden shadow-sm">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-live" />
          <span className="uppercase tracking-widest font-bold text-zinc-100 text-[11px]">
            Counterfactual Branching Topology
          </span>
        </div>
        <div className="text-[10px] text-zinc-400">
          SELECT A FUTURE TO INSPECT ITS MEASUREMENTS
        </div>
      </div>

      {/* SVG Tree / Branching Schematic with Sequential Drawing */}
      <div className="relative w-full max-w-4xl mx-auto py-1">
        {/* Origin Node: the branch-point mutation (Appears first) */}
        <div className="flex justify-center mb-2">
          <div className="px-5 py-2.5 rounded-sm bg-[#06070a] border-2 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-center transition-all duration-300">
            <div className="text-[9.5px] text-amber-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
              DIVERGENCE POINT
            </div>
            <div className="text-sm font-bold text-zinc-100 mt-0.5">
              {originMutationId}
            </div>
            {originTitle && (
              <div className="text-[10px] text-zinc-400 font-sans mt-0.5">
                {originTitle}
              </div>
            )}
          </div>
        </div>

        {/* Tree Branch Lines with animated drawing down */}
        <div className="relative h-10 w-full flex items-center justify-center">
          <svg className="w-full h-10 overflow-visible" viewBox="0 0 600 40">
            {/* Center vertical stem down from origin */}
            <line x1="300" y1="0" x2="300" y2="18" stroke="#52525b" strokeWidth="2" className="animate-branch-draw" />

            {/* Horizontal branch distributor across the futures */}
            {n > 1 && (
              <line x1={minX} y1="18" x2={maxX} y2="18" stroke="#52525b" strokeWidth="2" className="animate-branch-draw" style={{ animationDelay: '150ms' }} />
            )}

            {/* Vertical drop to each future */}
            {scenarios.map((scenario, sIdx) => {
              const isSelected = selectedScenarioId === scenario.id;
              const tone = TONES[tones[sIdx]];
              return (
                <line
                  key={scenario.id}
                  x1={xs[sIdx]}
                  y1="18"
                  x2={xs[sIdx]}
                  y2="40"
                  stroke={isSelected ? tone.stroke : '#3f3f46'}
                  strokeWidth={isSelected ? 3 : 1.5}
                  className={`animate-branch-draw ${isSelected ? tone.glow : ''}`}
                  style={{ animationDelay: `${250 + sIdx * 100}ms` }}
                />
              );
            })}
          </svg>
        </div>

        {/* Branch Heads: Level 1 & 2 Comparison (Sequential Entrance & Interactive Focus) */}
        <div className={`grid grid-cols-1 ${gridCols} gap-3 pt-2`}>
          {scenarios.map((scenario, sIdx) => {
            const isSelected = selectedScenarioId === scenario.id;
            const isApplied = appliedScenarioId === scenario.id;

            const borderStyle = isSelected
              ? TONES[tones[sIdx]].card
              : 'border-zinc-800 bg-[#06070a] text-zinc-400 opacity-55 hover:opacity-90';

            return (
              <div
                key={scenario.id}
                onClick={() => onSelectScenario(scenario.id)}
                className={`p-3.5 rounded-sm border cursor-pointer transition-all duration-300 ease-out ${borderStyle} flex flex-col justify-between`}
                style={{
                  animation: `section-reveal 500ms cubic-bezier(0.16, 1, 0.3, 1) ${sIdx * 150 + 200}ms both`
                }}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1 font-mono">
                    <span className="font-bold uppercase tracking-wider">Future {futureLetter(scenario)}</span>
                    <span className="flex items-center gap-1">
                      {scenario.recommended && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-bold">
                          RECOMMENDED
                        </span>
                      )}
                      {isApplied && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </span>
                  </div>

                  <h3 className="font-sans text-xs font-bold text-zinc-100 truncate">
                    {futureName(scenario)}
                  </h3>

                  <p className="font-sans text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                    {scenario.description}
                  </p>
                </div>

                {/* Level 2 Metrics Readout with animated figures */}
                <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
                  <div>
                    <span className="text-zinc-500 uppercase tracking-widest text-[9px] block">INTEGRITY</span>
                    <span
                      className={`font-bold tabular-nums text-xs transition-colors duration-200 ${
                        scenario.projectedBoundaryIntegrity >= 80
                          ? 'text-emerald-400'
                          : scenario.projectedBoundaryIntegrity >= 60
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {scenario.projectedBoundaryIntegrity}%
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="text-zinc-500 uppercase tracking-widest text-[9px] block">FILES</span>
                    <span className="font-bold text-zinc-200 text-xs tabular-nums">
                      {filesChanged(scenario)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-zinc-500 uppercase tracking-widest text-[9px] block">INCIDENT RISK</span>
                    <span
                      className={`font-bold text-xs ${
                        scenario.projectedIncidentRisk === 'LOW'
                          ? 'text-emerald-400'
                          : scenario.projectedIncidentRisk === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {scenario.projectedIncidentRisk}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
