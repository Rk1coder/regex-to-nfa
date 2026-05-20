import { useEffect, useRef } from 'react';
import { NFA, NFATransition, buildTransitionTable } from '../thompson';

interface TransitionTableProps {
  nfa: NFA;
  newStateIds?: string[];
  newTransitions?: NFATransition[];
  stepLabel?: string;
}

export function TransitionTable({
  nfa,
  newStateIds = [],
  newTransitions = [],
  stepLabel,
}: TransitionTableProps) {
  const { states, symbols, table } = buildTransitionTable(nfa);
  const allSymbols = [...symbols, 'ε'];
  const tableRef = useRef<HTMLDivElement>(null);
  const firstNewRowRef = useRef<HTMLTableRowElement>(null);

  const newStateSet = new Set(newStateIds);

  const newTransitionKeys = new Set<string>();
  for (const t of newTransitions) {
    for (const to of t.to) {
      newTransitionKeys.add(`${t.from}|${t.symbol}|${to}`);
    }
  }

  function isCellNew(stateId: string, sym: string, targets: string[]) {
    return targets.some(to => newTransitionKeys.has(`${stateId}|${sym}|${to}`));
  }

  useEffect(() => {
    if (firstNewRowRef.current && tableRef.current) {
      firstNewRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [newStateIds.join(',')]);

  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-1 flex-shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Durum Geçiş Tablosu
        </h3>
        {stepLabel && (
          <span className="text-xs font-mono text-cyan-600 truncate max-w-xs">
            — {stepLabel}
          </span>
        )}
        {newStateIds.length > 0 && (
          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 flex-shrink-0">
            +{newStateIds.length} yeni durum
          </span>
        )}
      </div>

      {/* Table */}
      <div ref={tableRef} className="overflow-auto flex-1 px-2 pb-2">
        <table className="text-xs border-collapse min-w-full">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="px-4 py-2 text-left font-mono text-gray-500 border-r border-[hsl(var(--border))] bg-[#0a0f16] sticky left-0 z-10">
                Durum
              </th>
              {allSymbols.map(s => (
                <th
                  key={s}
                  className={`px-4 py-2 text-center font-mono font-bold border-r border-[hsl(var(--border))] bg-[#0a0f16] ${s === 'ε' ? 'text-amber-500' : 'text-cyan-400'}`}
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map((stateId, idx) => {
              const isStart = nfa.start === stateId;
              const isAccept = nfa.accept.includes(stateId);
              const isNew = newStateSet.has(stateId);
              const isFirstNew = isNew && newStateIds[0] === stateId;

              const rowBase = isNew
                ? 'bg-cyan-950/40 border-cyan-800/50'
                : isStart
                ? 'bg-cyan-950/20'
                : isAccept
                ? 'bg-green-950/20'
                : idx % 2 === 0
                ? 'bg-[#0a0f16]'
                : 'bg-[#0d1117]';

              return (
                <tr
                  key={stateId}
                  ref={isFirstNew ? firstNewRowRef : undefined}
                  className={`border-b transition-all ${rowBase} ${isNew ? 'animate-table-flash' : ''}`}
                >
                  {/* State cell */}
                  <td
                    className={`px-4 py-1.5 font-mono font-bold border-r border-[hsl(var(--border))] sticky left-0 z-10
                      ${isNew ? 'bg-cyan-950/60 text-cyan-200' : isStart ? 'bg-cyan-950/40 text-cyan-300' : isAccept ? 'bg-green-950/40 text-green-300' : 'bg-[#0a0f16] text-gray-300'}`}
                  >
                    <span className="flex items-center gap-1">
                      {isStart && <span className="text-cyan-500 text-xs">→</span>}
                      <span>{stateId}</span>
                      {isAccept && <span className="text-green-500 text-xs">★</span>}
                      {isNew && <span className="text-cyan-600 text-[9px] font-normal ml-1">yeni</span>}
                    </span>
                  </td>

                  {/* Transition cells */}
                  {allSymbols.map(sym => {
                    const targets = table[stateId]?.[sym] ?? [];
                    const cellNew = isCellNew(stateId, sym, targets);
                    return (
                      <td
                        key={sym}
                        className={`px-4 py-1.5 font-mono text-center border-r border-[hsl(var(--border))] transition-colors
                          ${cellNew
                            ? sym === 'ε'
                              ? 'text-amber-300 bg-amber-950/30 font-bold'
                              : 'text-cyan-200 bg-cyan-950/30 font-bold'
                            : targets.length > 0
                            ? sym === 'ε'
                              ? 'text-amber-500'
                              : 'text-gray-300'
                            : 'text-gray-700'
                          }`}
                      >
                        {targets.length > 0 ? `{${targets.join(', ')}}` : '∅'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
