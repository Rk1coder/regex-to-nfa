import { useState, useEffect } from 'react';
import { regexToNFA, validateRegex, NFA, BuildStep } from './thompson';
import { InputPanel } from './components/InputPanel';
import { GraphView } from './components/GraphView';
import { StepPanel } from './components/StepPanel';
import { TransitionTable } from './components/TransitionTable';
import { Toaster } from '@/components/ui/toaster';

function App() {
  const [regex, setRegex] = useState('(a|b)*abb');
  const [nfa, setNfa] = useState<NFA | null>(null);
  const [steps, setSteps] = useState<BuildStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [stepMode, setStepMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);

  const handleConvert = (exp: string) => {
    const { valid } = validateRegex(exp);
    if (!valid) return;
    try {
      const res = regexToNFA(exp);
      setNfa(res.nfa);
      setSteps(res.steps);
      setCurrentStep(stepMode && res.steps.length > 0 ? 0 : -1);
      setIsPlaying(false);
    } catch {
      // validation should have caught this
    }
  };

  const handleNFAImport = (importedNfa: NFA) => {
    setNfa(importedNfa);
    setSteps([]);
    setCurrentStep(-1);
    setIsPlaying(false);
  };

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying || !stepMode) return;
    if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const id = setInterval(() => {
      setCurrentStep(s => {
        if (s >= steps.length - 1) {
          setIsPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, playSpeed);
    return () => clearInterval(id);
  }, [isPlaying, currentStep, steps.length, playSpeed, stepMode]);

  // What NFA to show: step snapshot or full final NFA
  const activeNfa: NFA | null =
    stepMode && currentStep >= 0 && steps[currentStep]
      ? steps[currentStep].currentNFA
      : nfa;

  // What newly-added state IDs to highlight on current step
  const newStateIds: string[] =
    stepMode && currentStep >= 0 && steps[currentStep]
      ? steps[currentStep].addedStates
      : [];

  return (
    <div className="h-screen w-screen bg-[#0d1117] text-[hsl(var(--foreground))] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 flex-shrink-0 border-b border-[hsl(var(--border))] flex items-center justify-between px-5 bg-[#0d1117]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50" />
          <h1 className="text-sm font-bold tracking-tight text-white font-mono">Thompson NFA Studio</h1>
          <span className="text-gray-700 text-xs">—</span>
          <span className="text-gray-600 text-xs">Düzenli İfadeden NFA Dönüştürücü</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
          {nfa && (
            <>
              <span className="text-cyan-800">{nfa.states.length} durum</span>
              <span>·</span>
              <span className="text-amber-900">{nfa.transitions.reduce((a, t) => a + t.to.length, 0)} geçiş</span>
            </>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-72 flex-shrink-0 border-r border-[hsl(var(--border))] bg-[#0d1117] overflow-y-auto p-4">
          <InputPanel
            regex={regex}
            setRegex={setRegex}
            onConvert={handleConvert}
            stepMode={stepMode}
            setStepMode={setStepMode}
            onNFAImport={handleNFAImport}
          />
        </aside>

        {/* Center: graph + transition table */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Graph */}
          <div className="flex-1 overflow-hidden">
            <GraphView nfa={activeNfa} newStateIds={newStateIds} />
          </div>

          {/* Transition table */}
          {activeNfa && (
            <div className="h-44 flex-shrink-0 border-t border-[hsl(var(--border))] bg-[#0a0f16] overflow-hidden">
              <TransitionTable
                nfa={activeNfa}
                newStateIds={newStateIds}
                newTransitions={
                  stepMode && currentStep >= 0 && steps[currentStep]
                    ? steps[currentStep].addedTransitions
                    : []
                }
                stepLabel={
                  stepMode && currentStep >= 0 && steps[currentStep]
                    ? `Adım ${currentStep + 1} / ${steps.length}: ${steps[currentStep].description}`
                    : undefined
                }
              />
            </div>
          )}
        </main>

        {/* Right panel */}
        <aside className="w-72 flex-shrink-0 border-l border-[hsl(var(--border))] bg-[#0d1117] overflow-y-auto p-4">
          <StepPanel
            steps={steps}
            currentStep={currentStep}
            setCurrentStep={(s) => { setCurrentStep(s); setIsPlaying(false); }}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            playSpeed={playSpeed}
            setPlaySpeed={setPlaySpeed}
            nfa={nfa}
            regex={regex}
          />
        </aside>
      </div>

      <Toaster />
    </div>
  );
}

export default App;
