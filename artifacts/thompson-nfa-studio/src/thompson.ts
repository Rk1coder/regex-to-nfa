export interface NFAState {
  id: string;
  isStart: boolean;
  isAccept: boolean;
}

export interface NFATransition {
  from: string;
  symbol: string;
  to: string[];
}

export interface NFA {
  states: NFAState[];
  alphabet: string[];
  start: string;
  accept: string[];
  transitions: NFATransition[];
}

export interface BuildStep {
  stepNumber: number;
  description: string;
  subExpression: string;
  highlightStart: number;
  highlightEnd: number;
  addedStates: string[];
  addedTransitions: NFATransition[];
  currentNFA: NFA;
}

// Internal NFA fragment used during construction
interface Fragment {
  start: string;
  accept: string;
  states: NFAState[];
  transitions: NFATransition[];
  alphabet: Set<string>;
}

// AST node types
type RegexNode =
  | { type: 'char'; char: string; pos: number }
  | { type: 'concat'; left: RegexNode; right: RegexNode }
  | { type: 'union'; left: RegexNode; right: RegexNode }
  | { type: 'star'; child: RegexNode }
  | { type: 'plus'; child: RegexNode }
  | { type: 'optional'; child: RegexNode }
  | { type: 'epsilon' };

let stateCounter = 0;

function freshState(): string {
  return `q${stateCounter++}`;
}

// ──────────────────────────────────────────────
// Parser (recursive descent)
// ──────────────────────────────────────────────

class Parser {
  private pos = 0;
  constructor(private input: string) {}

  peek(): string | null {
    return this.pos < this.input.length ? this.input[this.pos] : null;
  }
  consume(): string {
    return this.input[this.pos++];
  }

  parse(): RegexNode {
    const node = this.parseExpr();
    if (this.pos < this.input.length) {
      throw new Error(`Beklenmedik karakter: '${this.input[this.pos]}' (konum ${this.pos})`);
    }
    return node;
  }

  // expr = term (| term)*
  parseExpr(): RegexNode {
    let left = this.parseTerm();
    while (this.peek() === '|') {
      this.consume();
      const right = this.parseTerm();
      left = { type: 'union', left, right };
    }
    return left;
  }

  // term = factor+  (concatenation)
  parseTerm(): RegexNode {
    let left = this.parseFactor();
    while (this.peek() !== null && this.peek() !== ')' && this.peek() !== '|') {
      const right = this.parseFactor();
      left = { type: 'concat', left, right };
    }
    return left;
  }

  // factor = atom quantifier?
  parseFactor(): RegexNode {
    const atom = this.parseAtom();
    const q = this.peek();
    if (q === '*') { this.consume(); return { type: 'star', child: atom }; }
    if (q === '+') { this.consume(); return { type: 'plus', child: atom }; }
    if (q === '?') { this.consume(); return { type: 'optional', child: atom }; }
    return atom;
  }

  // atom = char | ( expr )
  parseAtom(): RegexNode {
    const ch = this.peek();
    if (ch === null) throw new Error('Beklenmedik ifade sonu');
    if (ch === '(') {
      this.consume();
      const inner = this.parseExpr();
      if (this.peek() !== ')') throw new Error(`Kapanmamış parantez`);
      this.consume();
      return inner;
    }
    if (ch === ')' || ch === '|' || ch === '*' || ch === '+' || ch === '?') {
      throw new Error(`Beklenmedik operatör: '${ch}' (konum ${this.pos})`);
    }
    this.consume();
    return { type: 'char', char: ch, pos: this.pos - 1 };
  }
}

// ──────────────────────────────────────────────
// Fragment helpers
// ──────────────────────────────────────────────

function mergeFragments(...frags: Fragment[]): { states: NFAState[]; transitions: NFATransition[]; alphabet: Set<string> } {
  const states: NFAState[] = [];
  const transitions: NFATransition[] = [];
  const alphabet = new Set<string>();
  for (const f of frags) {
    for (const s of f.states) {
      if (!states.find(x => x.id === s.id)) states.push(s);
    }
    for (const t of f.transitions) {
      const existing = transitions.find(x => x.from === t.from && x.symbol === t.symbol);
      if (existing) {
        for (const to of t.to) {
          if (!existing.to.includes(to)) existing.to.push(to);
        }
      } else {
        transitions.push({ from: t.from, symbol: t.symbol, to: [...t.to] });
      }
    }
    for (const a of f.alphabet) alphabet.add(a);
  }
  return { states, transitions, alphabet };
}

function cloneNFA(states: NFAState[], transitions: NFATransition[], start: string, accept: string[]): NFA {
  const alphabet = new Set<string>();
  for (const t of transitions) {
    if (t.symbol !== 'ε') alphabet.add(t.symbol);
  }
  return {
    states: states.map(s => ({ ...s })),
    transitions: transitions.map(t => ({ ...t, to: [...t.to] })),
    alphabet: Array.from(alphabet).sort(),
    start,
    accept: [...accept],
  };
}

function buildTransitionTable(nfa: NFA): { states: string[]; symbols: string[]; table: Record<string, Record<string, string[]>> } {
  const nonEpsilonSymbols = Array.from(new Set(
    nfa.transitions.filter(t => t.symbol !== 'ε').map(t => t.symbol)
  )).sort();
  const states = nfa.states.map(s => s.id);
  const table: Record<string, Record<string, string[]>> = {};
  for (const s of states) table[s] = {};
  for (const t of nfa.transitions) {
    if (!table[t.from]) table[t.from] = {};
    if (!table[t.from][t.symbol]) table[t.from][t.symbol] = [];
    for (const to of t.to) {
      if (!table[t.from][t.symbol].includes(to)) table[t.from][t.symbol].push(to);
    }
  }
  return { states, symbols: nonEpsilonSymbols, table };
}

export { buildTransitionTable };

// ──────────────────────────────────────────────
// NFA Builder
// ──────────────────────────────────────────────

function buildPrimitive(ch: string): Fragment {
  const s0 = freshState();
  const s1 = freshState();
  return {
    start: s0,
    accept: s1,
    states: [
      { id: s0, isStart: false, isAccept: false },
      { id: s1, isStart: false, isAccept: false },
    ],
    transitions: [{ from: s0, symbol: ch, to: [s1] }],
    alphabet: ch === 'ε' ? new Set() : new Set([ch]),
  };
}

function buildEpsilon(): Fragment {
  const s0 = freshState();
  const s1 = freshState();
  return {
    start: s0,
    accept: s1,
    states: [
      { id: s0, isStart: false, isAccept: false },
      { id: s1, isStart: false, isAccept: false },
    ],
    transitions: [{ from: s0, symbol: 'ε', to: [s1] }],
    alphabet: new Set(),
  };
}

function buildConcat(A: Fragment, B: Fragment): Fragment {
  const { states, transitions, alphabet } = mergeFragments(A, B);
  // Connect A's accept to B's start via ε
  const epsilonTrans: NFATransition = { from: A.accept, symbol: 'ε', to: [B.start] };
  const existing = transitions.find(t => t.from === A.accept && t.symbol === 'ε');
  if (existing) {
    if (!existing.to.includes(B.start)) existing.to.push(B.start);
  } else {
    transitions.push(epsilonTrans);
  }
  return { start: A.start, accept: B.accept, states, transitions, alphabet };
}

function buildUnion(A: Fragment, B: Fragment): Fragment {
  const newStart = freshState();
  const newAccept = freshState();
  const { states, transitions, alphabet } = mergeFragments(A, B);
  states.push({ id: newStart, isStart: false, isAccept: false });
  states.push({ id: newAccept, isStart: false, isAccept: false });
  transitions.push({ from: newStart, symbol: 'ε', to: [A.start, B.start] });
  transitions.push({ from: A.accept, symbol: 'ε', to: [newAccept] });
  transitions.push({ from: B.accept, symbol: 'ε', to: [newAccept] });
  return { start: newStart, accept: newAccept, states, transitions, alphabet };
}

function buildStar(A: Fragment): Fragment {
  const newStart = freshState();
  const newAccept = freshState();
  const { states, transitions, alphabet } = mergeFragments(A);
  states.push({ id: newStart, isStart: false, isAccept: false });
  states.push({ id: newAccept, isStart: false, isAccept: false });
  transitions.push({ from: newStart, symbol: 'ε', to: [A.start, newAccept] }); // bypass
  transitions.push({ from: A.accept, symbol: 'ε', to: [A.start, newAccept] }); // loop + exit
  return { start: newStart, accept: newAccept, states, transitions, alphabet };
}

function buildPlus(A: Fragment): Fragment {
  const newAccept = freshState();
  const { states, transitions, alphabet } = mergeFragments(A);
  states.push({ id: newAccept, isStart: false, isAccept: false });
  transitions.push({ from: A.accept, symbol: 'ε', to: [A.start, newAccept] }); // loop + exit
  return { start: A.start, accept: newAccept, states, transitions, alphabet };
}

function buildOptional(A: Fragment): Fragment {
  const newStart = freshState();
  const newAccept = freshState();
  const { states, transitions, alphabet } = mergeFragments(A);
  states.push({ id: newStart, isStart: false, isAccept: false });
  states.push({ id: newAccept, isStart: false, isAccept: false });
  transitions.push({ from: newStart, symbol: 'ε', to: [A.start, newAccept] }); // bypass ε
  transitions.push({ from: A.accept, symbol: 'ε', to: [newAccept] });
  return { start: newStart, accept: newAccept, states, transitions, alphabet };
}

// ──────────────────────────────────────────────
// AST → NFA with step recording
// ──────────────────────────────────────────────

function nodeToString(node: RegexNode): string {
  switch (node.type) {
    case 'char': return node.char;
    case 'epsilon': return 'ε';
    case 'star': return `(${nodeToString(node.child)})*`;
    case 'plus': return `(${nodeToString(node.child)})+`;
    case 'optional': return `(${nodeToString(node.child)})?`;
    case 'concat': return `${nodeToString(node.left)}${nodeToString(node.right)}`;
    case 'union': return `(${nodeToString(node.left)}|${nodeToString(node.right)})`;
  }
}

function buildFromAST(
  node: RegexNode,
  originalRegex: string,
  steps: BuildStep[],
  existingStates: NFAState[],
  existingTransitions: NFATransition[],
): Fragment {
  switch (node.type) {
    case 'char': {
      const frag = buildPrimitive(node.char);
      const allStates = [...existingStates, ...frag.states];
      const allTransitions = mergeAll([...existingTransitions, ...frag.transitions]);
      const nfa = cloneNFA(
        allStates.map((s, i) => ({ ...s, isStart: i === allStates.length - frag.states.length, isAccept: false })),
        allTransitions,
        frag.start,
        [frag.accept]
      );
      markStartAccept(nfa, frag.start, [frag.accept]);
      steps.push({
        stepNumber: steps.length + 1,
        description: `Temel NFA oluşturuldu: '${node.char}' karakteri için`,
        subExpression: node.char,
        highlightStart: node.pos,
        highlightEnd: node.pos + 1,
        addedStates: frag.states.map(s => s.id),
        addedTransitions: frag.transitions,
        currentNFA: nfa,
      });
      return frag;
    }

    case 'epsilon': {
      const frag = buildEpsilon();
      const allStates = [...existingStates, ...frag.states];
      const allTransitions = mergeAll([...existingTransitions, ...frag.transitions]);
      const nfa = cloneNFA(allStates, allTransitions, frag.start, [frag.accept]);
      markStartAccept(nfa, frag.start, [frag.accept]);
      steps.push({
        stepNumber: steps.length + 1,
        description: `Epsilon (ε) NFA oluşturuldu`,
        subExpression: 'ε',
        highlightStart: 0,
        highlightEnd: 0,
        addedStates: frag.states.map(s => s.id),
        addedTransitions: frag.transitions,
        currentNFA: nfa,
      });
      return frag;
    }

    case 'concat': {
      const leftFrag = buildFromAST(node.left, originalRegex, steps, existingStates, existingTransitions);
      const prevStates = [...existingStates, ...leftFrag.states];
      const prevTransitions = mergeAll([...existingTransitions, ...leftFrag.transitions]);
      const rightFrag = buildFromAST(node.right, originalRegex, steps, prevStates, prevTransitions);
      const frag = buildConcat(leftFrag, rightFrag);
      const allStates = [...existingStates, ...frag.states.filter(s => !existingStates.find(e => e.id === s.id))];
      const allTransitions = mergeAll([...existingTransitions, ...frag.transitions]);
      const nfa = cloneNFA(allStates, allTransitions, frag.start, [frag.accept]);
      markStartAccept(nfa, frag.start, [frag.accept]);
      steps.push({
        stepNumber: steps.length + 1,
        description: `Birleştirme (Concatenation): '${nodeToString(node.left)}' ve '${nodeToString(node.right)}' birleştirildi`,
        subExpression: nodeToString(node),
        highlightStart: 0,
        highlightEnd: originalRegex.length,
        addedStates: [],
        addedTransitions: [{ from: leftFrag.accept, symbol: 'ε', to: [rightFrag.start] }],
        currentNFA: nfa,
      });
      return frag;
    }

    case 'union': {
      const leftFrag = buildFromAST(node.left, originalRegex, steps, existingStates, existingTransitions);
      const prevStates = [...existingStates, ...leftFrag.states];
      const prevTransitions = mergeAll([...existingTransitions, ...leftFrag.transitions]);
      const rightFrag = buildFromAST(node.right, originalRegex, steps, prevStates, prevTransitions);

      const newStart = freshState();
      const newAccept = freshState();
      const mergedFragment = mergeFragments(leftFrag, rightFrag);
      mergedFragment.states.push({ id: newStart, isStart: false, isAccept: false });
      mergedFragment.states.push({ id: newAccept, isStart: false, isAccept: false });
      mergedFragment.transitions.push({ from: newStart, symbol: 'ε', to: [leftFrag.start, rightFrag.start] });
      mergedFragment.transitions.push({ from: leftFrag.accept, symbol: 'ε', to: [newAccept] });
      mergedFragment.transitions.push({ from: rightFrag.accept, symbol: 'ε', to: [newAccept] });

      const frag: Fragment = { start: newStart, accept: newAccept, ...mergedFragment };
      const allStates = [...existingStates, ...frag.states.filter(s => !existingStates.find(e => e.id === s.id))];
      const allTransitions = mergeAll([...existingTransitions, ...frag.transitions]);
      const nfa = cloneNFA(allStates, allTransitions, frag.start, [frag.accept]);
      markStartAccept(nfa, frag.start, [frag.accept]);
      steps.push({
        stepNumber: steps.length + 1,
        description: `Birleşim (Union): '${nodeToString(node.left)}' veya '${nodeToString(node.right)}' için yeni başlangıç ve kabul durumları eklendi`,
        subExpression: nodeToString(node),
        highlightStart: 0,
        highlightEnd: originalRegex.length,
        addedStates: [newStart, newAccept],
        addedTransitions: [
          { from: newStart, symbol: 'ε', to: [leftFrag.start, rightFrag.start] },
          { from: leftFrag.accept, symbol: 'ε', to: [newAccept] },
          { from: rightFrag.accept, symbol: 'ε', to: [newAccept] },
        ],
        currentNFA: nfa,
      });
      return frag;
    }

    case 'star': {
      const childFrag = buildFromAST(node.child, originalRegex, steps, existingStates, existingTransitions);
      const newStart = freshState();
      const newAccept = freshState();
      const { states, transitions, alphabet } = mergeFragments(childFrag);
      states.push({ id: newStart, isStart: false, isAccept: false });
      states.push({ id: newAccept, isStart: false, isAccept: false });
      transitions.push({ from: newStart, symbol: 'ε', to: [childFrag.start, newAccept] });
      transitions.push({ from: childFrag.accept, symbol: 'ε', to: [childFrag.start, newAccept] });
      const frag: Fragment = { start: newStart, accept: newAccept, states, transitions, alphabet };
      const allStates = [...existingStates, ...frag.states.filter(s => !existingStates.find(e => e.id === s.id))];
      const allTransitions = mergeAll([...existingTransitions, ...frag.transitions]);
      const nfa = cloneNFA(allStates, allTransitions, frag.start, [frag.accept]);
      markStartAccept(nfa, frag.start, [frag.accept]);
      steps.push({
        stepNumber: steps.length + 1,
        description: `Kleene Yıldızı (*): '${nodeToString(node.child)}' için döngü ve atlama ε-geçişleri eklendi`,
        subExpression: nodeToString(node),
        highlightStart: 0,
        highlightEnd: originalRegex.length,
        addedStates: [newStart, newAccept],
        addedTransitions: [
          { from: newStart, symbol: 'ε', to: [childFrag.start, newAccept] },
          { from: childFrag.accept, symbol: 'ε', to: [childFrag.start, newAccept] },
        ],
        currentNFA: nfa,
      });
      return frag;
    }

    case 'plus': {
      const childFrag = buildFromAST(node.child, originalRegex, steps, existingStates, existingTransitions);
      const newAccept = freshState();
      const { states, transitions, alphabet } = mergeFragments(childFrag);
      states.push({ id: newAccept, isStart: false, isAccept: false });
      transitions.push({ from: childFrag.accept, symbol: 'ε', to: [childFrag.start, newAccept] });
      const frag: Fragment = { start: childFrag.start, accept: newAccept, states, transitions, alphabet };
      const allStates = [...existingStates, ...frag.states.filter(s => !existingStates.find(e => e.id === s.id))];
      const allTransitions = mergeAll([...existingTransitions, ...frag.transitions]);
      const nfa = cloneNFA(allStates, allTransitions, frag.start, [frag.accept]);
      markStartAccept(nfa, frag.start, [frag.accept]);
      steps.push({
        stepNumber: steps.length + 1,
        description: `Artı (+): '${nodeToString(node.child)}' en az bir kez geçmeli; döngü ε-geçişi eklendi`,
        subExpression: nodeToString(node),
        highlightStart: 0,
        highlightEnd: originalRegex.length,
        addedStates: [newAccept],
        addedTransitions: [{ from: childFrag.accept, symbol: 'ε', to: [childFrag.start, newAccept] }],
        currentNFA: nfa,
      });
      return frag;
    }

    case 'optional': {
      const childFrag = buildFromAST(node.child, originalRegex, steps, existingStates, existingTransitions);
      const newStart = freshState();
      const newAccept = freshState();
      const { states, transitions, alphabet } = mergeFragments(childFrag);
      states.push({ id: newStart, isStart: false, isAccept: false });
      states.push({ id: newAccept, isStart: false, isAccept: false });
      transitions.push({ from: newStart, symbol: 'ε', to: [childFrag.start, newAccept] });
      transitions.push({ from: childFrag.accept, symbol: 'ε', to: [newAccept] });
      const frag: Fragment = { start: newStart, accept: newAccept, states, transitions, alphabet };
      const allStates = [...existingStates, ...frag.states.filter(s => !existingStates.find(e => e.id === s.id))];
      const allTransitions = mergeAll([...existingTransitions, ...frag.transitions]);
      const nfa = cloneNFA(allStates, allTransitions, frag.start, [frag.accept]);
      markStartAccept(nfa, frag.start, [frag.accept]);
      steps.push({
        stepNumber: steps.length + 1,
        description: `Opsiyonel (?): '${nodeToString(node.child)}' isteğe bağlı; atlama ε-geçişi eklendi`,
        subExpression: nodeToString(node),
        highlightStart: 0,
        highlightEnd: originalRegex.length,
        addedStates: [newStart, newAccept],
        addedTransitions: [
          { from: newStart, symbol: 'ε', to: [childFrag.start, newAccept] },
          { from: childFrag.accept, symbol: 'ε', to: [newAccept] },
        ],
        currentNFA: nfa,
      });
      return frag;
    }
  }
}

function mergeAll(transitions: NFATransition[]): NFATransition[] {
  const map = new Map<string, NFATransition>();
  for (const t of transitions) {
    const key = `${t.from}::${t.symbol}`;
    if (map.has(key)) {
      const existing = map.get(key)!;
      for (const to of t.to) {
        if (!existing.to.includes(to)) existing.to.push(to);
      }
    } else {
      map.set(key, { from: t.from, symbol: t.symbol, to: [...t.to] });
    }
  }
  return Array.from(map.values());
}

function markStartAccept(nfa: NFA, start: string, accepts: string[]) {
  for (const s of nfa.states) {
    s.isStart = s.id === start;
    s.isAccept = accepts.includes(s.id);
  }
  nfa.start = start;
  nfa.accept = accepts;
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export function validateRegex(regex: string): { valid: boolean; error?: string; errorIndex?: number } {
  if (!regex.trim()) return { valid: false, error: 'Regex ifadesi boş olamaz', errorIndex: 0 };
  try {
    const parser = new Parser(regex);
    parser.parse();
    return { valid: true };
  } catch (e: any) {
    const msg: string = e.message || 'Geçersiz regex';
    const match = msg.match(/konum (\d+)/);
    const idx = match ? parseInt(match[1]) : undefined;
    return { valid: false, error: msg, errorIndex: idx };
  }
}

export function regexToNFA(regex: string): { nfa: NFA; steps: BuildStep[] } {
  stateCounter = 0;
  const parser = new Parser(regex);
  const ast = parser.parse();
  const steps: BuildStep[] = [];
  const frag = buildFromAST(ast, regex, steps, [], []);

  // Finalize: mark start and accept on the complete NFA
  const finalNFA = steps[steps.length - 1]?.currentNFA ?? cloneNFA(frag.states, frag.transitions, frag.start, [frag.accept]);
  markStartAccept(finalNFA, frag.start, [frag.accept]);

  // Update last step's NFA to be the final one
  if (steps.length > 0) {
    steps[steps.length - 1].currentNFA = finalNFA;
  }

  return { nfa: finalNFA, steps };
}
