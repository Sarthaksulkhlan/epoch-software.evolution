import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutationHistory, type HistoryFilterType } from '../hooks/useMutationHistory';
import { MutationCard } from '../components/mutation/MutationCard';
import { MutationDetail } from '../components/mutation/MutationDetail';
import { History, Play, AlertTriangle, GitCommit, Layers } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const mutationIdParam = searchParams.get('mutationId');

  const {
    filteredItems,
    selectedMutation,
    selectedIncident,
    filterType,
    activeReplayEpoch,
    setSelectedMutationId,
    setSelectedIncidentId,
    setFilterType,
    setActiveReplayEpoch
  } = useMutationHistory();

  useEffect(() => {
    if (mutationIdParam) {
      setSelectedMutationId(mutationIdParam);
    }
  }, [mutationIdParam, setSelectedMutationId]);

  // Group items by epoch for the archaeological timeline
  const groupedByEpoch = useMemo(() => {
    const groups: Record<number, typeof filteredItems> = {};
    filteredItems.forEach(item => {
      if (!groups[item.epoch]) {
        groups[item.epoch] = [];
      }
      groups[item.epoch].push(item);
    });
    return Object.entries(groups)
      .map(([epochStr, items]) => ({ epoch: Number(epochStr), items }))
      .sort((a, b) => b.epoch - a.epoch); // newest epoch first
  }, [filteredItems]);

  return (
    <div className="space-y-5 select-none font-mono">
      {/* Header Context Deck (Stagger 1) */}
      <div className="reveal-delay-1 p-4 rounded-sm border border-zinc-800/80 bg-[#08090d]/90 backdrop-blur flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="text-zinc-200 font-bold uppercase tracking-wider">Archaeological Lineage</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500 text-[10px]">Causal Mutation Tree</span>
          </div>

          <h1 className="text-base font-bold text-zinc-100 font-sans tracking-tight">
            System Evolutionary History
          </h1>

          <p className="text-xs text-zinc-400 font-sans mt-1 max-w-3xl leading-relaxed">
            History is not merely a Git commit list. Trace how individually passing mutations across epochs 0 through 4
            cumulatively weakened architectural boundaries and yielded production freeze INC-3312.
          </p>
        </div>

        {/* Temporal Replay Controls */}
        <div className="p-2 rounded-sm bg-[#06070a] border border-zinc-800 flex flex-col gap-1.5 shrink-0 text-xs">
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span className="flex items-center gap-1 uppercase tracking-wider">
              <Play className="w-3 h-3 text-cyan-400" />
              <span>Historical Replay</span>
            </span>
            <span className="text-zinc-200 font-bold">
              {activeReplayEpoch === null ? 'EPOCH 04 (LATEST)' : `EPOCH 0${activeReplayEpoch}`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map(ep => (
              <button
                key={ep}
                onClick={() => setActiveReplayEpoch(ep)}
                className={`btn-control px-2.5 py-1 text-xs rounded-sm transition-all duration-200 ${
                  activeReplayEpoch === ep
                    ? 'bg-cyan-500 text-zinc-950 font-bold shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                E0{ep}
              </button>
            ))}
            <button
              onClick={() => setActiveReplayEpoch(null)}
              className="btn-control px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-sm"
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Causal Origin Banner (Stagger 2) */}
      <div className="reveal-delay-2 p-3 rounded-sm border border-zinc-800 bg-[#06070a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-400 font-sans text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse-warn" />
          <span>
            Seeded Storyline: Notice mutation{' '}
            <button
              onClick={() => {
                setSelectedMutationId('M-1042');
                setSelectedIncidentId(null);
                setSearchParams({ mutationId: 'M-1042' });
              }}
              className="font-mono text-amber-300 font-bold underline hover:no-underline"
            >
              M-1042
            </button>{' '}
            ("Extend chargeback eligibility from 15 to 30 days"). Tests passed cleanly, but it left archival jobs at 15 days,
            leading to hotfixes M-1051, M-1077, and production freeze INC-3312.
          </span>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 shrink-0 text-[10px]">
          {(['ALL', 'MUTATION', 'INCIDENT', 'DRIFT_RISK'] as HistoryFilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`btn-control px-2 py-1 rounded-sm transition-colors uppercase tracking-wider ${
                filterType === f
                  ? 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              {f === 'ALL' ? 'ALL' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Split layout: Timeline on left, Inspector on right (Stagger 3) */}
      <div className="reveal-delay-3 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Timeline Stream */}
        <div className="lg:col-span-6 space-y-4 max-h-[780px] overflow-y-auto pr-2">
          {groupedByEpoch.map((epochGroup, groupIdx) => (
            <div
              key={epochGroup.epoch}
              className="space-y-2 transition-all duration-300"
              style={{ animationDelay: `${groupIdx * 120}ms` }}
            >
              {/* Epoch Section Header: EPOCH 04 */}
              <div className="flex items-center gap-2 pt-1 pb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400/80 shadow-[0_0_6px_rgba(56,189,248,0.5)]" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-widest">
                  EPOCH 0{epochGroup.epoch}
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-500 font-mono">
                  {epochGroup.items.length} EVENTS
                </span>
              </div>

              {/* Items in Epoch with vertical branch tree */}
              <div className="space-y-2">
                {epochGroup.items.map((item, idx) => {
                  const isMutation = item.type === 'MUTATION';
                  const isSelected = isMutation
                    ? selectedMutation?.id === item.data.id && !selectedIncident
                    : selectedIncident?.id === item.data.id;

                  return (
                    <MutationCard
                      key={item.data.id}
                      item={item}
                      isSelected={isSelected}
                      isCausalOrigin={item.data.id === 'M-1042'}
                      isLastInEpoch={idx === epochGroup.items.length - 1}
                      onSelect={() => {
                        if (isMutation) {
                          setSelectedMutationId(item.data.id);
                          setSelectedIncidentId(null);
                          setSearchParams({ mutationId: item.data.id });
                        } else {
                          setSelectedIncidentId(item.data.id);
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Inspector on the Right */}
        <div className="lg:col-span-6">
          <div className="sticky top-4 transition-all duration-300 ease-out">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-zinc-500 mb-2 px-1">
              <span>Architectural Inspector</span>
              <span className="text-zinc-300 font-bold">
                {selectedIncident ? selectedIncident.id : selectedMutation?.id}
              </span>
            </div>

            <MutationDetail
              mutation={selectedIncident ? null : selectedMutation}
              incident={selectedIncident}
              onSelectMutationById={id => {
                setSelectedMutationId(id);
                setSelectedIncidentId(null);
                setSearchParams({ mutationId: id });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
