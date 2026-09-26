import React, { useState } from 'react';
import { ActivityEvent } from '../../types';
import { StatusBadge } from './StatusBadge';
import { Play, Pause, Trash2, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface EventFeedProps {
  events: ActivityEvent[];
  isPaused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
  onSelectEntity?: (entityId: string) => void;
}

export const EventFeed: React.FC<EventFeedProps> = ({
  events,
  isPaused,
  onTogglePause,
  onClear,
  onSelectEntity
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <div className="rounded-sm border border-zinc-800/80 bg-[#08090d] flex flex-col h-full font-mono select-none">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#06070a] border-b border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
            Live Stream
          </span>
          <span className="text-[9px] text-zinc-500">
            {isPaused ? '[PAUSED]' : '[SSE ACTIVE]'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePause}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title={isPaused ? 'Resume stream' : 'Pause stream'}
            aria-label={isPaused ? 'Resume stream' : 'Pause stream'}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
          <button
            onClick={onClear}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Clear event feed"
            aria-label="Clear event feed"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Stream List: Compact Level 2 default with smooth entry transition */}
      <div className="p-2 space-y-1.5 overflow-y-auto flex-1 max-h-[380px]">
        {events.length === 0 ? (
          <div className="text-center py-8 text-[11px] text-zinc-500">
            No events in telemetry queue. Awaiting SSE dispatch...
          </div>
        ) : (
          events.map((event, idx) => {
            const isCritical = event.severity === 'CRITICAL';
            const isWarn = event.severity === 'WARN';
            const isSelected = selectedEventId === event.id;

            let borderStyle = 'border-zinc-800/60 bg-zinc-950/40';
            if (isCritical) borderStyle = 'border-rose-500/40 bg-rose-950/20';
            else if (isWarn) borderStyle = 'border-amber-500/30 bg-amber-950/10';

            return (
              <div
                key={event.id}
                onClick={() => setSelectedEventId(isSelected ? null : event.id)}
                className={`p-2 rounded-sm border ${borderStyle} text-[11px] space-y-1 transition-all hover:bg-zinc-900/60 cursor-pointer ${
                  idx === 0 ? 'animate-event-in' : ''
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isCritical
                          ? 'bg-rose-400 animate-pulse'
                          : isWarn
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span className="text-zinc-300 font-semibold truncate">{event.actor}</span>
                  </div>
                  <span className="text-zinc-500 tabular-nums shrink-0">{event.timestamp}</span>
                </div>

                <p className="text-zinc-200 font-sans text-xs leading-snug line-clamp-1">
                  {event.message}
                </p>

                {/* Level 3: Expanded Detail when clicked */}
                {isSelected && (
                  <div className="pt-2 mt-1 border-t border-zinc-800 text-[10px] space-y-1.5 font-sans animate-in fade-in duration-150">
                    <p className="text-zinc-300 leading-relaxed font-mono text-[11px]">
                      {event.message}
                    </p>
                    <div className="flex items-center justify-between font-mono text-zinc-500 pt-1">
                      <span>CATEGORY: {event.category}</span>
                      {event.relatedEntityId && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSelectEntity?.(event.relatedEntityId!);
                          }}
                          className="text-zinc-300 hover:text-white underline"
                        >
                          OPEN {event.relatedEntityId}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Footer */}
      <div className="px-3 py-1.5 bg-[#06070a] border-t border-zinc-800/80 text-[9px] text-zinc-500 flex items-center justify-between">
        <span>TODO(IBM Bob: SSE GET /api/v1/stream)</span>
        <span className="text-emerald-500 font-semibold">ONLINE</span>
      </div>
    </div>
  );
};
