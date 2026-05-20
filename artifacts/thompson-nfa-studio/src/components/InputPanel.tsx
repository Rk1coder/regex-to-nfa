import { useState } from 'react';
import { validateRegex } from '../thompson';
import { FileImporter } from './FileImporter';
import { NFA } from '../thompson';

interface InputPanelProps {
  regex: string;
  setRegex: (r: string) => void;
  onConvert: (r: string) => void;
  stepMode: boolean;
  setStepMode: (v: boolean) => void;
  onNFAImport: (nfa: NFA) => void;
}

const PRESETS = ['(a|b)*abb', 'a*b+', '(ab|c)?d'];

const HOW_TO_STEPS = [
  'Regex alanına bir düzenli ifade girin. Desteklenen operatörler: | (birleşim), * (Kleene yıldızı), + (artı), ? (opsiyonel), ( ) parantezler.',
  '"Adım Adım" modunu açın ve "Dönüştür"e tıklayın — NFA adım adım animasyonla oluşturulur.',
  'Sağ panelden adımlar arasında gezinin veya "Otomatik Oynat" ile animasyonu başlatın.',
  'Hazır şablonlardan birini seçerek örnek NFA\'ları anında görüntüleyebilir; JSON, TXT veya CSV dosyası yükleyebilirsiniz.',
];

export function InputPanel({ regex, setRegex, onConvert, stepMode, setStepMode, onNFAImport }: InputPanelProps) {
  const [err, setErr] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRegex(val);
    const { valid, error } = validateRegex(val);
    setErr(valid ? '' : (error || 'Geçersiz ifade'));
  };

  const handlePreset = (preset: string) => {
    setRegex(preset);
    setErr('');
    onConvert(preset);
  };

  const handleConvertClick = () => {
    const { valid, error } = validateRegex(regex);
    if (!valid) { setErr(error || 'Geçersiz ifade'); return; }
    setErr('');
    onConvert(regex);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted font-bold">Regex Girişi</span>
        <button
          data-testid="button-how-to"
          onClick={() => setShowModal(true)}
          className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-800 rounded px-2 py-1 transition-colors"
        >
          Nasıl Kullanılır?
        </button>
      </div>

      {/* Regex input */}
      <div>
        <textarea
          data-testid="input-regex"
          value={regex}
          onChange={handleChange}
          placeholder="(a|b)*abb"
          rows={3}
          className={`w-full bg-[#0d1117] border ${err ? 'border-red-500' : 'border-[hsl(var(--border))]'} rounded-md p-3 text-[hsl(var(--foreground))] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none transition-colors`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        />
        {err && (
          <div data-testid="error-regex" className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <span>⚠</span> {err}
          </div>
        )}
      </div>

      {/* Convert button */}
      <button
        data-testid="button-convert"
        onClick={handleConvertClick}
        disabled={!!err}
        className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#0d1117] py-2.5 rounded-md font-bold text-sm transition-colors tracking-wide"
      >
        Dönüştür
      </button>

      {/* Step mode toggle */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-[hsl(var(--foreground))]">Adım Adım</span>
        <button
          data-testid="toggle-step-mode"
          onClick={() => setStepMode(!stepMode)}
          className={`relative w-11 h-6 rounded-full transition-colors ${stepMode ? 'bg-cyan-500' : 'bg-[hsl(var(--muted))]'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${stepMode ? 'translate-x-5' : ''}`}
          />
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-[hsl(var(--border))] pt-4">
        <div className="text-xs uppercase tracking-widest text-muted font-bold mb-3">Hazır Şablonlar</div>
        <div className="flex flex-col gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset}
              data-testid={`button-preset-${preset}`}
              onClick={() => handlePreset(preset)}
              className="text-left bg-[hsl(var(--muted))] hover:bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] hover:border-cyan-700 px-3 py-2.5 rounded-md transition-colors group"
            >
              <span className="font-mono text-sm text-cyan-300 group-hover:text-cyan-200">{preset}</span>
            </button>
          ))}
        </div>
      </div>

      {/* File importer */}
      <div className="border-t border-[hsl(var(--border))] pt-4">
        <FileImporter onNFAImport={onNFAImport} onRegexImport={(r) => { setRegex(r); setErr(''); }} />
      </div>

      {/* How to use modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[#161b22] border border-[hsl(var(--border))] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Nasıl Kullanılır?</h2>
              <button
                data-testid="button-close-modal"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <ul className="space-y-3">
              {HOW_TO_STEPS.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  <span className="flex-shrink-0 w-6 h-6 bg-cyan-900 text-cyan-300 rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
