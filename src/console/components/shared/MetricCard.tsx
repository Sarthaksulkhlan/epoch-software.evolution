import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'nominal' | 'warning' | 'critical';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  status = 'nominal'
}) => {
  const getStatusBorder = () => {
    switch (status) {
      case 'warning':
        return 'border-amber-500/30 bg-[#0e0d0a]';
      case 'critical':
        return 'border-rose-500/30 bg-[#12080a]';
      default:
        return 'border-zinc-800/80 bg-[#08090d]';
    }
  };

  const getValueColor = () => {
    switch (status) {
      case 'warning':
        return 'text-amber-300';
      case 'critical':
        return 'text-rose-400';
      default:
        return 'text-zinc-100';
    }
  };

  return (
    <div className={`p-3.5 rounded-sm border ${getStatusBorder()} transition-colors`}>
      <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1">
        <span>{label}</span>
        {status === 'warning' && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
        {status === 'critical' && (
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
        )}
      </div>
      <div className={`text-xl font-mono tabular-nums font-semibold tracking-tight ${getValueColor()}`}>
        {value}
      </div>
      {subtext && (
        <div className="text-[11px] text-zinc-400 font-mono mt-1 truncate">
          {subtext}
        </div>
      )}
    </div>
  );
};
