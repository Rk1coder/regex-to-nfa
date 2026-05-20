import { NFA } from './thompson';
import * as XLSX from 'xlsx';

export function parseNFAJson(content: string): NFA | null {
  try {
    const obj = JSON.parse(content);
    if (!obj.states || !obj.start || !obj.accept || !obj.transitions) return null;
    // Normalize: states can be array of strings or objects
    const states = (obj.states as any[]).map((s: any) => {
      if (typeof s === 'string') return { id: s, isStart: s === obj.start, isAccept: (obj.accept as string[]).includes(s) };
      return { id: String(s.id ?? s), isStart: String(s.id ?? s) === obj.start, isAccept: (obj.accept as string[]).includes(String(s.id ?? s)) };
    });
    const alphabet: string[] = obj.alphabet ?? [];
    return {
      states,
      alphabet,
      start: String(obj.start),
      accept: (obj.accept as any[]).map(String),
      transitions: (obj.transitions as any[]).map(t => ({
        from: String(t.from),
        symbol: String(t.symbol),
        to: Array.isArray(t.to) ? t.to.map(String) : [String(t.to)],
      })),
    };
  } catch {
    return null;
  }
}

export function parseTxtRegex(content: string): string {
  return content.trim().split('\n')[0].trim();
}

// CSV format: first row = header (Durum, a, b, ε, ...), rows = state, then target sets like {q1,q2} or {}
export function parseCSV(content: string): NFA | null {
  try {
    const lines = content.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;
    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const symbols = header.slice(1); // everything after 'Durum'
    const states: { id: string; isStart: boolean; isAccept: boolean }[] = [];
    const transitions: { from: string; symbol: string; to: string[] }[] = [];
    const acceptSet = new Set<string>();
    let start = '';

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      if (cols.length === 0) continue;
      let stateId = cols[0].trim().replace(/^"|"$/g, '');
      let isStart = false;
      let isAccept = false;
      if (stateId.startsWith('→')) { isStart = true; stateId = stateId.slice(1).trim(); start = stateId; }
      if (stateId.endsWith('★')) { isAccept = true; stateId = stateId.slice(0, -1).trim(); acceptSet.add(stateId); }
      if (!start) start = stateId;
      states.push({ id: stateId, isStart, isAccept });
      for (let j = 1; j < symbols.length + 1 && j < cols.length; j++) {
        const sym = symbols[j - 1];
        const cell = cols[j].trim().replace(/^"|"$/g, '').replace(/[{}]/g, '');
        if (cell) {
          const targets = cell.split(',').map(s => s.trim()).filter(Boolean);
          if (targets.length > 0) transitions.push({ from: stateId, symbol: sym, to: targets });
        }
      }
    }

    const alphabet = symbols.filter(s => s !== 'ε');
    return {
      states: states.map(s => ({ ...s, isStart: s.id === start, isAccept: acceptSet.has(s.id) || s.isAccept })),
      alphabet,
      start,
      accept: Array.from(acceptSet),
      transitions,
    };
  } catch {
    return null;
  }
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; current += ch; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += ch;
  }
  result.push(current);
  return result;
}

export function parseXLSX(buffer: ArrayBuffer): NFA | null {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(ws);
    return parseCSV(csv);
  } catch {
    return null;
  }
}

export function exportNFAJson(nfa: NFA): string {
  return JSON.stringify({ type: 'nfa', ...nfa }, null, 2);
}

export function exportNFACSV(nfa: NFA, symbols: string[], table: Record<string, Record<string, string[]>>): string {
  const allSymbols = [...symbols, 'ε'];
  let csv = 'Durum,' + allSymbols.join(',') + '\n';
  for (const state of nfa.states) {
    const prefix = state.id === nfa.start ? '→' : '';
    const suffix = nfa.accept.includes(state.id) ? '★' : '';
    const row = [`${prefix}${state.id}${suffix}`];
    for (const sym of allSymbols) {
      const targets = table[state.id]?.[sym] ?? [];
      row.push(targets.length > 0 ? `"{${targets.join(',')}}"` : '{}');
    }
    csv += row.join(',') + '\n';
  }
  return csv;
}
