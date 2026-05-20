import { NFA, buildTransitionTable } from '../thompson';

interface TransitionTableProps {
  nfa: NFA;
}

export function TransitionTable({ nfa }: TransitionTableProps) {
  const { states, symbols, table } = buildTransitionTable(nfa);
  const allSymbols = [...symbols, 'ε'];

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
        Durum Geçiş Tablosu
      </h3>
      <div className="overflow-auto flex-1">
        <table className="text-xs border-collapse min-w-full">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="px-4 py-2 text-left font-mono text-gray-500 border-r border-[hsl(var(--border))] bg-[#0d1117] sticky left-0">
                Durum
              </th>
              {allSymbols.map(s => (
                <th
                  key={s}
                  className={`px-4 py-2 text-center font-mono font-bold border-r border-[hsl(var(--border))] bg-[#0d1117] ${s === 'ε' ? 'text-amber-500' : 'text-cyan-400'}`}
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map(stateId => {
              const isStart = nfa.start === stateId;
              const isAccept = nfa.accept.includes(stateId);
              return (
                <tr
                  key={stateId}
                  className={`border-b border-[hsl(var(--border))] transition-colors ${isStart ? 'bg-cyan-950/20' : isAccept ? 'bg-green-950/20' : 'hover:bg-[hsl(var(--muted))]'}`}
                >
                  <td className={`px-4 py-2 font-mono font-bold border-r border-[hsl(var(--border))] sticky left-0 ${isStart ? 'bg-cyan-950/40 text-cyan-300' : isAccept ? 'bg-green-950/40 text-green-300' : 'bg-[#0d1117] text-gray-300'}`}>
                    <span className="flex items-center gap-1">
                      {isStart && <span className="text-cyan-500 text-xs">→</span>}
                      <span data-testid={`state-${stateId}`}>{stateId}</span>
                      {isAccept && <span className="text-green-500 text-xs">★</span>}
                    </span>
                  </td>
                  {allSymbols.map(sym => {
                    const targets = table[stateId]?.[sym] ?? [];
                    return (
                      <td
                        key={sym}
                        className={`px-4 py-2 font-mono text-center border-r border-[hsl(var(--border))] ${targets.length > 0 ? (sym === 'ε' ? 'text-amber-400' : 'text-gray-300') : 'text-gray-700'}`}
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
