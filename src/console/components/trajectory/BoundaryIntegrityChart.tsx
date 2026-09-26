import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface BoundaryIntegrityChartProps {
  data: Array<{ epochLabel: string; score: number; threshold: number; coupling: number }>;
  currentEpoch: number;
}

export const BoundaryIntegrityChart: React.FC<BoundaryIntegrityChartProps> = ({
  data
}) => {
  return (
    <div className="rounded-sm border border-zinc-800/80 bg-[#08090d] p-3 font-mono select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">
          Boundary Integrity Index Across Epochs
        </span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-zinc-300">
            <span className="inline-block w-2.5 h-0.5 bg-zinc-300" /> Integrity Score
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="inline-block w-2.5 h-0.5 bg-rose-400" /> Threshold (75)
          </span>
        </div>
      </div>

      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="technicalIntegrityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#71717a" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#71717a" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="epochLabel"
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="p-2 rounded-sm bg-[#090b10] border border-zinc-700 text-[11px] font-mono shadow-md">
                      <div className="text-zinc-300 font-bold">{item.epochLabel}</div>
                      <div className="text-zinc-200">Integrity: {item.score}%</div>
                      <div className="text-amber-400">Coupling: {item.coupling}%</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#d4d4d8"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#technicalIntegrityGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
