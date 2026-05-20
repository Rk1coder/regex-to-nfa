import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import cydagre from 'cytoscape-dagre';
import { NFA } from '../thompson';

cytoscape.use(cydagre as any);

interface GraphViewProps {
  nfa: NFA | null;
  newStateIds?: string[];
}

function buildElements(nfa: NFA, newStateIds: string[] = []) {
  const nodes = nfa.states.map(s => ({
    data: { id: s.id, label: s.id, isStart: s.isStart, isAccept: s.isAccept, isNew: newStateIds.includes(s.id) },
    classes: [
      s.isStart ? 'start' : '',
      s.isAccept ? 'accept' : '',
      newStateIds.includes(s.id) ? 'new-node' : '',
    ].filter(Boolean).join(' '),
  }));

  // Deduplicate edges: same from-symbol-to combos get merged
  const edgeMap = new Map<string, { from: string; symbol: string; to: string }>();
  for (const t of nfa.transitions) {
    for (const toState of t.to) {
      const key = `${t.from}::${t.symbol}::${toState}`;
      if (!edgeMap.has(key)) edgeMap.set(key, { from: t.from, symbol: t.symbol, to: toState });
    }
  }

  const edges = Array.from(edgeMap.values()).map((e, i) => ({
    data: { id: `e${i}`, source: e.from, target: e.to, label: e.symbol },
    classes: e.symbol === 'ε' ? 'epsilon' : 'char',
  }));

  return [...nodes, ...edges];
}

export function GraphView({ nfa, newStateIds = [] }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy previous instance
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    if (!nfa) return;

    const elements = buildElements(nfa, newStateIds);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#1a2332',
            'border-width': 2,
            'border-color': '#2d4a6e',
            color: '#c9d1d9',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-family': '"JetBrains Mono", monospace',
            'font-size': '12px',
            width: 44,
            height: 44,
            'overlay-padding': 4,
          } as any,
        },
        {
          selector: 'node.start',
          style: {
            'background-color': '#0c3a5c',
            'border-color': '#0ea5e9',
            'border-width': 3,
            color: '#7dd3fc',
          } as any,
        },
        {
          selector: 'node.accept',
          style: {
            'background-color': '#0a2e1a',
            'border-color': '#22c55e',
            'border-width': 3,
            color: '#86efac',
            'outline-color': '#22c55e',
            'outline-width': 2,
            'outline-opacity': 0.5,
          } as any,
        },
        {
          selector: 'node.start.accept',
          style: {
            'background-color': '#0c2a3c',
            'border-color': '#22c55e',
            'border-width': 3,
            color: '#86efac',
          } as any,
        },
        {
          selector: 'node.new-node',
          style: {
            'border-color': '#f59e0b',
            'border-width': 3,
          } as any,
        },
        {
          selector: 'edge',
          style: {
            label: 'data(label)',
            color: '#9ca3af',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#4b5563',
            'line-color': '#374151',
            width: 1.5,
            'font-family': '"JetBrains Mono", monospace',
            'font-size': '11px',
            'text-background-color': '#0d1117',
            'text-background-opacity': 1,
            'text-background-padding': '2px',
            'text-border-opacity': 0,
          } as any,
        },
        {
          selector: 'edge.char',
          style: {
            'line-color': '#4b5563',
            'target-arrow-color': '#4b5563',
            color: '#d1d5db',
          } as any,
        },
        {
          selector: 'edge.epsilon',
          style: {
            'line-color': '#78350f',
            'target-arrow-color': '#92400e',
            'line-style': 'dashed',
            'line-dash-pattern': [6, 4],
            color: '#fbbf24',
            width: 1.5,
          } as any,
        },
      ],
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 50,
        rankSep: 80,
        edgeSep: 10,
        fit: true,
        padding: 30,
      } as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cyRef.current = cy;

    // Animate new nodes in
    if (newStateIds.length > 0) {
      cy.nodes('.new-node').style({ opacity: 0 } as any);
      setTimeout(() => {
        cy.nodes('.new-node').animate({ style: { opacity: 1 } } as any, { duration: 400 });
      }, 50);
    }

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nfa, newStateIds]);

  const handleExportPNG = () => {
    if (!cyRef.current) return;
    setExporting(true);
    const blob = cyRef.current.png({ output: 'blob', bg: '#0d1117', full: true, scale: 2 }) as unknown as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nfa.png';
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const handleFit = () => {
    cyRef.current?.fit(undefined, 30);
  };

  return (
    <div className="w-full h-full relative bg-[#0d1117]">
      {!nfa ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-700">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-40">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <div className="text-center">
            <div className="text-sm">NFA grafiği burada görünecek</div>
            <div className="text-xs mt-1 text-gray-800">Bir regex girin ve "Dönüştür"e tıklayın</div>
          </div>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="absolute top-3 left-3 z-10 flex gap-3 text-xs font-mono">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#0c3a5c] border border-[#0ea5e9] inline-block" />
              <span className="text-gray-500">Başlangıç</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#0a2e1a] border border-[#22c55e] inline-block" />
              <span className="text-gray-500">Kabul</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-5 h-px border-t border-dashed border-amber-600 inline-block" />
              <span className="text-gray-500">ε-geçiş</span>
            </span>
          </div>

          {/* Controls */}
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <button
              data-testid="button-fit-graph"
              onClick={handleFit}
              className="bg-[#161b22] border border-[hsl(var(--border))] hover:border-cyan-700 text-gray-400 hover:text-cyan-400 text-xs px-3 py-1.5 rounded transition-colors"
            >
              Sığdır
            </button>
            <button
              data-testid="button-export-png"
              onClick={handleExportPNG}
              disabled={exporting}
              className="bg-[#161b22] border border-[hsl(var(--border))] hover:border-cyan-700 text-gray-400 hover:text-cyan-400 text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              PNG Dışa Aktar
            </button>
          </div>

          <div ref={containerRef} className="w-full h-full" />
        </>
      )}
    </div>
  );
}
