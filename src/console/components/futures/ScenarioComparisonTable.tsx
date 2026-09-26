import React from 'react';
import { CounterfactualScenario } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { Check, X, AlertTriangle } from 'lucide-react';

interface ScenarioComparisonTableProps {
  scenarios: CounterfactualScenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
}

export const ScenarioComparisonTable: React.FC<ScenarioComparisonTableProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario
}) => {
  return (
    <div className="rounded-sm border border-zinc-800/80 bg-[#08090d] overflow-hidden font-mono select-none">
      <div className="p-3 bg-[#06070a] border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
            Side-by-Side Architectural Tradeoff Matrix
          </h3>
          <p className="font-sans text-[11px] text-zinc-400 mt-0.5">
            Evaluated against boundary isolation, invariant durability, and downstream relapse probability.
          </p>
        </div>
        <div className="text-[10px] text-zinc-500 bg-[#090b10] px-2 py-0.5 rounded-sm border border-zinc-800">
          CONFIDENCE INTERVAL: 88.4% (SCENARIO-BASED ESTIMATE)
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-[#06070a] text-zinc-500 text-[10px] uppercase tracking-wider">
              <th className="p-3 w-1/4">Evaluation Vector</th>
              {scenarios.map(s => (
                <th
                  key={s.id}
                  onClick={() => onSelectScenario(s.id)}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedScenarioId === s.id
                      ? 'text-zinc-100 bg-zinc-900/60 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{s.title.split(':')[0]}</span>
                    {selectedScenarioId === s.id && (
                      <span className="text-[9px] text-zinc-200 px-1 py-0.2 rounded-sm border border-zinc-600 bg-zinc-800">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-normal truncate mt-0.5">
                    {s.strategyName}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-xs">
            {/* Projected Boundary Integrity */}
            <tr>
              <td className="p-3 font-medium text-zinc-400 bg-[#06070a]">
                Projected Boundary Integrity
              </td>
              {scenarios.map(s => (
                <td key={s.id} className="p-3 font-mono font-bold tabular-nums">
                  <span
                    className={
                      s.projectedBoundaryIntegrity >= 80
                        ? 'text-emerald-400'
                        : s.projectedBoundaryIntegrity >= 60
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }
                  >
                    {s.projectedBoundaryIntegrity}%
                  </span>
                </td>
              ))}
            </tr>

            {/* Projected Incident Risk */}
            <tr>
              <td className="p-3 font-medium text-zinc-400 bg-[#06070a]">
                Downstream Incident Risk
              </td>
              {scenarios.map(s => (
                <td key={s.id} className="p-3">
                  <StatusBadge status={s.projectedIncidentRisk} size="sm" />
                </td>
              ))}
            </tr>

            {/* Implementation Horizon */}
            <tr>
              <td className="p-3 font-medium text-zinc-400 bg-[#06070a]">
                Implementation Horizon
              </td>
              {scenarios.map(s => (
                <td key={s.id} className="p-3 text-zinc-300">
                  ~{s.projectedTimeDays} engineering days
                </td>
              ))}
            </tr>

            {/* Invariant INV-BOUND-04 */}
            <tr>
              <td className="p-3 font-medium text-zinc-400 bg-[#06070a]">
                INV-BOUND-04 (Boundary Isolation)
              </td>
              {scenarios.map(s => {
                const inv = s.invariantOutcomes.find(i => i.invariantId === 'INV-BOUND-04');
                return (
                  <td key={s.id} className="p-3">
                    <StatusBadge status={inv?.projectedStatus || 'HOLDING'} size="sm" showDot={false} />
                  </td>
                );
              })}
            </tr>

            {/* Invariant INV-TIME-02 */}
            <tr>
              <td className="p-3 font-medium text-zinc-400 bg-[#06070a]">
                INV-TIME-02 (Archival Window)
              </td>
              {scenarios.map(s => {
                const inv = s.invariantOutcomes.find(i => i.invariantId === 'INV-TIME-02');
                return (
                  <td key={s.id} className="p-3">
                    <StatusBadge status={inv?.projectedStatus || 'HOLDING'} size="sm" showDot={false} />
                  </td>
                );
              })}
            </tr>

            {/* Key Advantages */}
            <tr>
              <td className="p-3 font-medium text-zinc-400 bg-[#06070a] align-top">
                Key Advantages
              </td>
              {scenarios.map(s => (
                <td key={s.id} className="p-3 align-top font-sans text-[11px] text-zinc-300">
                  <ul className="space-y-1">
                    {s.tradeoffs.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>

            {/* Strategic Liabilities */}
            <tr>
              <td className="p-3 font-medium text-zinc-400 bg-[#06070a] align-top">
                Architectural Liabilities
              </td>
              {scenarios.map(s => (
                <td key={s.id} className="p-3 align-top font-sans text-[11px] text-zinc-300">
                  <ul className="space-y-1">
                    {s.tradeoffs.cons.map((con, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <X className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
