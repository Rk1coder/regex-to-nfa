import { BuildStep, NFA, buildTransitionTable } from '../thompson';
import { exportNFAJson, exportNFACSV } from '../fileUtils';

interface StepPanelProps {
  steps: BuildStep[];
  currentStep: number;
  setCurrentStep: (s: number) => void;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  playSpeed: number;
  setPlaySpeed: (v: number) => void;
  nfa: NFA | null;
  regex: string;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function StepPanel({ steps, currentStep, setCurrentStep, isPlaying, setIsPlaying, playSpeed, setPlaySpeed, nfa, regex }: StepPanelProps) {
  const handleExportJSON = () => {
    if (!nfa) return;
    downloadFile(exportNFAJson(nfa), 'nfa.json', 'application/json');
  };

  const handleExportCSV = () => {
    if (!nfa) return;
    const { symbols, table } = buildTransitionTable(nfa);
    downloadFile(exportNFACSV(nfa, symbols, table), 'nfa_tablo.csv', 'text/csv');
  };

  const isEmpty = steps.length === 0;
  const step = steps[currentStep];
  const hasStep = currentStep >= 0 && step != null;

  return (
    <div className="flex flex-col h-full gap-0">
      <div className="text-xs uppercase tracking-widest text-muted font-bold mb-3 flex-shrink-0">Adım Paneli</div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm text-center px-4">
          Adım adım görünüm için "Adım Adım" modunu açın ve "Dönüştür"e tıklayın
        </div>
      ) : (
        <>
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
            {/* Progress indicator */}
            <div className="bg-[#0d1117] border border-[hsl(var(--border))] rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  Adım {hasStep ? currentStep + 1 : '-'} / {steps.length}
                </span>
                <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
                  {steps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentStep(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === currentStep ? 'bg-cyan-400' : i < currentStep ? 'bg-cyan-800' : 'bg-gray-700'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Step description */}
            {hasStep && (
              <div className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md p-3 space-y-2">
                <div className="text-sm text-white leading-relaxed">{step.description}</div>
                <div className="font-mono text-xs bg-[#0d1117] border border-[hsl(var(--border))] rounded p-2 text-cyan-300">
                  {step.subExpression}
                </div>
              </div>
            )}

            {/* Added states and transitions */}
            {hasStep && (step.addedStates.length > 0 || step.addedTransitions.length > 0) && (
              <div className="space-y-2">
                {step.addedStates.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Eklenen Durumlar:</div>
                    <div className="flex flex-wrap gap-1">
                      {step.addedStates.map(s => (
                        <span key={s} className="font-mono text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {step.addedTransitions.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Eklenen Geçişler:</div>
                    <div className="space-y-1">
                      {step.addedTransitions.map((t, i) => (
                        <div key={i} className="font-mono text-xs text-gray-400 flex items-center gap-1">
                          <span className="text-cyan-400">{t.from}</span>
                          <span className="text-gray-600">─</span>
                          <span className={t.symbol === 'ε' ? 'text-amber-400' : 'text-white'}>{t.symbol}</span>
                          <span className="text-gray-600">→</span>
                          <span className="text-cyan-400">{t.to.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Export buttons */}
            {nfa && (
              <div className="border-t border-[hsl(var(--border))] pt-3 space-y-2">
                <div className="text-xs uppercase tracking-widest text-muted font-bold mb-2">Dışa Aktar</div>
                <button
                  data-testid="button-export-json"
                  onClick={handleExportJSON}
                  className="w-full bg-[hsl(var(--muted))] hover:bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] hover:border-cyan-700 py-2 rounded text-sm text-gray-300 transition-colors"
                >
                  JSON Dışa Aktar
                </button>
                <button
                  data-testid="button-export-csv"
                  onClick={handleExportCSV}
                  className="w-full bg-[hsl(var(--muted))] hover:bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] hover:border-cyan-700 py-2 rounded text-sm text-gray-300 transition-colors"
                >
                  CSV Dışa Aktar
                </button>
              </div>
            )}
          </div>

          {/* Fixed navigation + speed — always pinned to bottom */}
          <div className="flex-shrink-0 border-t border-[hsl(var(--border))] pt-3 mt-3 space-y-3">
            {/* Navigation row */}
            <div className="flex gap-2">
              <button
                data-testid="button-prev-step"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep <= 0}
                className="flex-1 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] py-2 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ◀ Önceki
              </button>
              <button
                data-testid="button-play-step"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={currentStep >= steps.length - 1 && !isPlaying}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white py-2 rounded text-sm font-bold transition-colors"
              >
                {isPlaying ? '⏸ Durdur' : '⏵ Oynat'}
              </button>
              <button
                data-testid="button-next-step"
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={currentStep >= steps.length - 1}
                className="flex-1 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] py-2 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki ▶
              </button>
            </div>

            {/* Speed control */}
            <div className="border border-[hsl(var(--border))] rounded-md p-3 bg-[#0d1117]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Hız</span>
                <span className="text-xs font-mono text-cyan-400">
                  {playSpeed === 500 ? 'Hızlı' : playSpeed === 1000 ? 'Normal' : 'Yavaş'}
                </span>
              </div>
              <input
                data-testid="slider-speed"
                type="range"
                min={1} max={3} step={1}
                value={playSpeed === 500 ? 3 : playSpeed === 1000 ? 2 : 1}
                onChange={e => {
                  const v = Number(e.target.value);
                  setPlaySpeed(v === 3 ? 500 : v === 2 ? 1000 : 2000);
                }}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Yavaş</span>
                <span>Normal</span>
                <span>Hızlı</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Export buttons when no steps (NFA imported) */}
      {isEmpty && nfa && (
        <div className="mt-auto border-t border-[hsl(var(--border))] pt-4 space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted font-bold mb-2">Dışa Aktar</div>
          <button
            data-testid="button-export-json"
            onClick={handleExportJSON}
            className="w-full bg-[hsl(var(--muted))] hover:bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] hover:border-cyan-700 py-2 rounded text-sm text-gray-300 transition-colors"
          >
            JSON Dışa Aktar
          </button>
          <button
            data-testid="button-export-csv"
            onClick={handleExportCSV}
            className="w-full bg-[hsl(var(--muted))] hover:bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] hover:border-cyan-700 py-2 rounded text-sm text-gray-300 transition-colors"
          >
            CSV Dışa Aktar
          </button>
        </div>
      )}
    </div>
  );
}
