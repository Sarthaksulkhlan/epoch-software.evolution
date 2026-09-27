import React from 'react';
import type { CounterfactualScenario } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { Check, X } from 'lucide-react';

interface ScenarioComparisonTableProps {
  scenarios: CounterfactualScenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
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

export const ScenarioComparisonTable: React.FC<ScenarioComparisonTableProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario
}) => {
  // One row per invariant any future was measured against, in first-seen order.
  const invariants = new Map<string, string>();
  for (const s of scenarios) {
    for (const inv of s.invariantOutcomes) {
      if (!invariants.has(inv.invariantId)) invariants.set(inv.invariantId, inv.invariantName);
    }
  }

  return (
    <div className="rounded-sm border border-zinc-800/80 bg-[#08090d] overflow-hidden font-mono select-none">
      <div className="p-3 bg-[#06070a] border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
            Side-by-Side Architectural Tradeoff Matrix
          </h3>
          <p className="font-sans text-[11px] text-zinc-400 mt-0.5">
            Boundary integrity, invariant scan, tests and changed files for each future, side by side.
          </p>
        </div>
        <div className="text-[10px] text-zinc-500 bg-[#090b10] px-2 py-0.5 rounded-sm border border-zinc-800">
          MEASURED IN ISOLATED WORKTREES
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
                  <div className="flex items-center justify-between gap-1">
                    <span>Future {futureLetter(s)}</span>
                    <span className="flex items-center gap-1">
                      {s.recommended && (
                        <span className="text-[9px] text-emerald-300 px-1 py-0.2 rounded-sm border border-emerald-500/30 bg-emerald-950/60">
                          RECOMMENDED
                        </span>
                      )}
                      {s.selected && (
                        <span className="text-[9px] text-emerald-400 px-1 py-0.2 rounded-sm border border-emerald-500/40 bg-emerald-950">
                          ADOPTED
                        </span>
                      )}
                      {selectedScenarioId === s.id && (
                        <span className="text-[9px] text-zinc-200 px-1 py-0.2 rounded-sm border border-zinc-600 bg-zinc-800">
                          VIEWING
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-normal normal-case truncate mt-0.5">
                    {futureName(s)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-xs">
            {/* Boundary Integrity */}
            <tr>
              <td className="p-3 font-medium text-zinc-400 bg-[#06070a]">
                Boundary Integrity
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

            {/* Incident Risk */}
            <tr>
              <td className="p-3 font-medium text-zinc-400 bg-[#06070a]">
                Incident Risk
              </td>
              {scenarios.map(s => (
                <td key={s.id} className="p-3">
                  <StatusBadge status={s.projectedIncidentRisk} size="sm" />
                </td>
              ))}
            </tr>

            {/* Files changed */}
            <tr>
              <td className="p-3 font-medium text-zinc-400 bg-[#06070a] align-top">
                Files changed
              </td>
              {scenarios.map(s => (
                <td key={s.id} className="p-3 text-zinc-300 align-top">
                  <span className="font-bold tabular-nums">{filesChanged(s)}</span>
                  {s.changedFiles && s.changedFiles.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-[10px] text-zinc-500">
                      {s.changedFiles.map(file => (
                        <li key={file} className="truncate" title={file}>{file}</li>
                      ))}
                    </ul>
                  )}
                </td>
              ))}
            </tr>

            {/* One row per invariant */}
            {[...invariants.entries()].map(([invariantId, invariantName]) => (
              <tr key={invariantId}>
                <td className="p-3 font-medium text-zinc-400 bg-[#06070a]">
                  {`${invariantId} (${invariantName})`}
                </td>
                {scenarios.map(s => {
                  const inv = s.invariantOutcomes.find(i => i.invariantId === invariantId);
                  return (
                    <td key={s.id} className="p-3">
                      {inv ? (
                        <StatusBadge status={inv.projectedStatus} size="sm" showDot={false} />
                      ) : (
                        <span className="text-[10px] text-zinc-600">not measured</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

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

            {/* Liabilities */}
            <tr>
              <td className="p-3 font-medium text-zinc-400 bg-[#06070a] align-top">
                Tradeoffs & Liabilities
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
