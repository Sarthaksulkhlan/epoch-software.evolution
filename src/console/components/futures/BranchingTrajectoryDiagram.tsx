import React from 'react';
import type { CounterfactualScenario } from '../../types';
import { ArrowRight, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';

interface BranchingTrajectoryDiagramProps {
  originMutationId: string;
  scenarios: CounterfactualScenario[];
  selectedScenarioId: string;
  appliedScenarioId: string | null;
  onSelectScenario: (id: string) => void;
}

export const BranchingTrajectoryDiagram: React.FC<BranchingTrajectoryDiagramProps> = ({
  originMutationId,
  scenarios,
  selectedScenarioId,
  appliedScenarioId,
  onSelectScenario
}) => {
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
          SELECT BRANCH TO PROJECT ARCHITECTURAL VECTOR
        </div>
      </div>

      {/* SVG Tree / Branching Schematic with Sequential Drawing */}
      <div className="relative w-full max-w-4xl mx-auto py-1">
        {/* Origin Node: M-1042 (Appears first) */}
        <div className="flex justify-center mb-2">
          <div className="px-5 py-2.5 rounded-sm bg-[#06070a] border-2 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-center transition-all duration-300">
            <div className="text-[9.5px] text-amber-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
              DIVERGENCE POINT
            </div>
            <div className="text-sm font-bold text-zinc-100 mt-0.5">
              {originMutationId}
            </div>
            <div className="text-[10px] text-zinc-400 font-sans mt-0.5">
              Extend chargeback eligibility 15d → 30d
            </div>
          </div>
        </div>

        {/* Tree Branch Lines with animated drawing down */}
        <div className="relative h-10 w-full flex items-center justify-center">
          <svg className="w-full h-10 overflow-visible" viewBox="0 0 600 40">
            {/* Center vertical stem down from origin */}
            <line x1="300" y1="0" x2="300" y2="18" stroke="#52525b" strokeWidth="2" className="animate-branch-draw" />
            
            {/* Horizontal branch distributor: 100 to 500 */}
            <line x1="100" y1="18" x2="500" y2="18" stroke="#52525b" strokeWidth="2" className="animate-branch-draw" style={{ animationDelay: '150ms' }} />

            {/* Vertical drop to Path A (x=100) */}
            <line
              x1="100"
              y1="18"
              x2="100"
              y2="40"
              stroke={selectedScenarioId === 'SCENARIO-A' ? '#f59e0b' : '#3f3f46'}
              strokeWidth={selectedScenarioId === 'SCENARIO-A' ? 3 : 1.5}
              className={`animate-branch-draw ${selectedScenarioId === 'SCENARIO-A' ? 'filter drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]' : ''}`}
              style={{ animationDelay: '250ms' }}
            />

            {/* Vertical drop to Path B (x=300) */}
            <line
              x1="300"
              y1="18"
              x2="300"
              y2="40"
              stroke={selectedScenarioId === 'SCENARIO-B' ? '#10b981' : '#3f3f46'}
              strokeWidth={selectedScenarioId === 'SCENARIO-B' ? 3 : 1.5}
              className={`animate-branch-draw ${selectedScenarioId === 'SCENARIO-B' ? 'filter drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]' : ''}`}
              style={{ animationDelay: '350ms' }}
            />

            {/* Vertical drop to Path C (x=500) */}
            <line
              x1="500"
              y1="18"
              x2="500"
              y2="40"
              stroke={selectedScenarioId === 'SCENARIO-C' ? '#38bdf8' : '#3f3f46'}
              strokeWidth={selectedScenarioId === 'SCENARIO-C' ? 3 : 1.5}
              className={`animate-branch-draw ${selectedScenarioId === 'SCENARIO-C' ? 'filter drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]' : ''}`}
              style={{ animationDelay: '450ms' }}
            />
          </svg>
        </div>

        {/* Branch Heads: Level 1 & 2 Comparison (Sequential Entrance & Interactive Focus) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {scenarios.map((scenario, sIdx) => {
            const isSelected = selectedScenarioId === scenario.id;
            const isApplied = appliedScenarioId === scenario.id;

            let borderStyle = 'border-zinc-800 bg-[#06070a] text-zinc-400 opacity-55 hover:opacity-90';
            if (isSelected) {
              borderStyle =
                scenario.id === 'SCENARIO-B'
                  ? 'border-2 border-emerald-400 bg-gradient-to-b from-[#091a12] to-[#06120c] text-zinc-100 shadow-[0_0_20px_rgba(16,185,129,0.25)] opacity-100 scale-[1.01]'
                  : scenario.id === 'SCENARIO-A'
                  ? 'border-2 border-amber-400 bg-gradient-to-b from-[#1a1208] to-[#120c05] text-zinc-100 shadow-[0_0_20px_rgba(245,158,11,0.25)] opacity-100 scale-[1.01]'
                  : 'border-2 border-cyan-400 bg-gradient-to-b from-[#0a1520] to-[#071018] text-zinc-100 shadow-[0_0_20px_rgba(56,189,248,0.25)] opacity-100 scale-[1.01]';
            }

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
                    <span className="font-bold uppercase tracking-wider">{scenario.title.split(':')[0]}</span>
                    {isApplied && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <h3 className="font-sans text-xs font-bold text-zinc-100 truncate">
                    {scenario.strategyName}
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
                    <span className="text-zinc-500 uppercase tracking-widest text-[9px] block">EFFORT</span>
                    <span className="font-bold text-zinc-200 text-xs">
                      ~{scenario.projectedTimeDays}d
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
