import React from 'react';
import { CodeDiff } from '../../types';

interface DiffViewerProps {
  diff: CodeDiff;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff }) => {
  return (
    <div className="rounded-md border border-slate-800 bg-[#07090e] overflow-hidden text-xs font-mono">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800">
        <span className="text-slate-300 truncate">{diff.filename}</span>
        <div className="flex items-center gap-3 shrink-0 tabular-nums">
          <span className="text-emerald-400">+{diff.additions}</span>
          <span className="text-rose-400">-{diff.deletions}</span>
        </div>
      </div>
      <div className="p-3 overflow-x-auto space-y-0.5 leading-relaxed">
        {diff.hunks.map((line, idx) => {
          let lineClass = 'text-slate-400';
          let bgClass = '';
          if (line.startsWith('+')) {
            lineClass = 'text-emerald-300';
            bgClass = 'bg-emerald-950/20';
          } else if (line.startsWith('-')) {
            lineClass = 'text-rose-300';
            bgClass = 'bg-rose-950/20';
          } else if (line.startsWith('@@')) {
            lineClass = 'text-cyan-400 font-semibold';
            bgClass = 'bg-cyan-950/10';
          }

          return (
            <div
              key={idx}
              className={`px-1.5 py-0.5 rounded-sm whitespace-pre ${lineClass} ${bgClass}`}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
};
