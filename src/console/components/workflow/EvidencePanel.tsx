import React, { useState } from 'react';
import { EvidenceItem } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { DiffViewer } from '../shared/DiffViewer';
import { FileCode, Activity, CheckSquare, Layers, Terminal, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface EvidencePanelProps {
  evidenceList: EvidenceItem[];
  selectedEvidenceId?: string;
  onSelectEvidence: (id: string) => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidenceList,
  selectedEvidenceId,
  onSelectEvidence
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(true);

  const selectedEvidence = evidenceList.find(e => e.id === selectedEvidenceId) || evidenceList[0];

  const filteredEvidence = evidenceList.filter(e => {
    if (filterType === 'ALL') return true;
    return e.type === filterType;
  });

  // Calculate counts for Level 2 summary chips
  const testCount = evidenceList.filter(e => e.type === 'TEST_RESULTS').length;
  const diffCount = evidenceList.filter(e => e.type === 'CODE_DIFF').length;
  const archCount = evidenceList.filter(e => e.type === 'ARCHITECTURE_OBSERVATION').length;
  const runtimeCount = evidenceList.filter(e => e.type === 'RUNTIME_FINDING' || e.type === 'INVARIANT_CHECK').length;

  const getTypeIcon = (type: EvidenceItem['type']) => {
    switch (type) {
      case 'CODE_DIFF':
        return <FileCode className="w-3.5 h-3.5 text-zinc-300" />;
      case 'TEST_RESULTS':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ARCHITECTURE_OBSERVATION':
        return <Layers className="w-3.5 h-3.5 text-amber-400" />;
      case 'RUNTIME_FINDING':
      case 'INVARIANT_CHECK':
        return <Activity className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  return (
    <div className="rounded-sm border border-zinc-800/80 bg-[#08090d] flex flex-col font-mono select-none">
      {/* Level 1 & 2: Compact Evidence Summary Strip */}
      <div className="p-3 bg-[#06070a] border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-zinc-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>EVIDENCE // 5 VERIFIED</span>
          </div>
          <span className="text-zinc-600">·</span>

          {/* Level 2 Compact Chips */}
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <button
              onClick={() => setFilterType(filterType === 'TEST_RESULTS' ? 'ALL' : 'TEST_RESULTS')}
              className={`px-1.5 py-0.5 rounded-sm border transition-colors ${
                filterType === 'TEST_RESULTS'
                  ? 'bg-zinc-800 text-emerald-400 border-zinc-600'
                  : 'bg-[#090b10] border-zinc-800 hover:border-zinc-700'
              }`}
            >
              TESTS {testCount}
            </button>
            <button
              onClick={() => setFilterType(filterType === 'CODE_DIFF' ? 'ALL' : 'CODE_DIFF')}
              className={`px-1.5 py-0.5 rounded-sm border transition-colors ${
                filterType === 'CODE_DIFF'
                  ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
                  : 'bg-[#090b10] border-zinc-800 hover:border-zinc-700'
              }`}
            >
              DIFF {diffCount}
            </button>
            <button
              onClick={() => setFilterType(filterType === 'ARCHITECTURE_OBSERVATION' ? 'ALL' : 'ARCHITECTURE_OBSERVATION')}
              className={`px-1.5 py-0.5 rounded-sm border transition-colors ${
                filterType === 'ARCHITECTURE_OBSERVATION'
                  ? 'bg-zinc-800 text-amber-400 border-zinc-600'
                  : 'bg-[#090b10] border-zinc-800 hover:border-zinc-700'
              }`}
            >
              ARCH {archCount}
            </button>
            <button
              onClick={() => setFilterType(filterType === 'RUNTIME_FINDING' ? 'ALL' : 'RUNTIME_FINDING')}
              className={`px-1.5 py-0.5 rounded-sm border transition-colors ${
                filterType === 'RUNTIME_FINDING'
                  ? 'bg-zinc-800 text-rose-400 border-zinc-600'
                  : 'bg-[#090b10] border-zinc-800 hover:border-zinc-700'
              }`}
            >
              RUNTIME {runtimeCount}
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsDossierOpen(!isDossierOpen)}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 uppercase tracking-wider self-start sm:self-auto"
        >
          <span>{isDossierOpen ? 'Collapse Dossier' : 'Inspect Full Dossier'}</span>
          {isDossierOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Level 3: Full Expandable Evidence Dossier */}
      {isDossierOpen && (
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-[360px] animate-in fade-in duration-200">
          {/* Artifact Item Selector List */}
          <div className="md:col-span-5 border-r border-zinc-800/80 divide-y divide-zinc-800/60 max-h-[440px] overflow-y-auto">
            {filteredEvidence.map(item => {
              const isSelected = item.id === selectedEvidence?.id;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectEvidence(item.id)}
                  className={`p-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#121520] border-l-2 border-zinc-300'
                      : 'hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {getTypeIcon(item.type)}
                      <span className="text-[10px] text-zinc-300 font-semibold">{item.id}</span>
                    </div>
                    <StatusBadge status={item.status} size="sm" showDot={false} />
                  </div>
                  <div className="font-sans text-xs font-medium text-zinc-200 truncate">{item.title}</div>
                  <div className="font-sans text-[11px] text-zinc-500 truncate mt-0.5">{item.summary}</div>
                </div>
              );
            })}
          </div>

          {/* Level 3 Detail Viewer */}
          <div className="md:col-span-7 p-4 bg-[#06070a] max-h-[440px] overflow-y-auto space-y-4">
            {selectedEvidence ? (
              <>
                <div className="border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                    <span>{selectedEvidence.id} // {selectedEvidence.type}</span>
                    <span className="tabular-nums">{new Date(selectedEvidence.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <h3 className="font-sans text-sm font-bold text-zinc-100">{selectedEvidence.title}</h3>
                  <p className="font-sans text-xs text-zinc-300 mt-1 leading-relaxed">{selectedEvidence.summary}</p>
                </div>

                {/* Level 3 Metrics Grid */}
                {selectedEvidence.metrics && selectedEvidence.metrics.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">
                      Observed Metric Telemetry
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedEvidence.metrics.map(m => (
                        <div key={m.label} className="p-2 rounded-sm bg-[#0a0c12] border border-zinc-800 text-xs">
                          <div className="text-[10px] text-zinc-500 truncate">{m.label}</div>
                          <div className="font-semibold text-zinc-100 mt-0.5">{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Level 3 Full Diff */}
                {selectedEvidence.diff && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">
                      Synthesized Code Modification
                    </div>
                    <DiffViewer diff={selectedEvidence.diff} />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-xs text-zinc-600">
                Select an evidence artifact to view inline dossier.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
