import { useRef, useState } from 'react';
import { NFA } from '../thompson';
import { parseNFAJson, parseTxtRegex, parseCSV, parseXLSX } from '../fileUtils';
import { useToast } from '@/hooks/use-toast';

interface FileImporterProps {
  onNFAImport: (nfa: NFA) => void;
  onRegexImport: (regex: string) => void;
}

export function FileImporter({ onNFAImport, onRegexImport }: FileImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showGuide, setShowGuide] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'json') {
        const text = await file.text();
        const nfa = parseNFAJson(text);
        if (!nfa) throw new Error('Geçersiz JSON formatı');
        onNFAImport(nfa);
        toast({ title: 'Başarılı', description: 'NFA JSON dosyasından yüklendi.' });
      } else if (ext === 'txt') {
        const text = await file.text();
        const regex = parseTxtRegex(text);
        if (!regex) throw new Error('Boş dosya');
        onRegexImport(regex);
        toast({ title: 'Başarılı', description: `Regex yüklendi: "${regex}"` });
      } else if (ext === 'csv') {
        const text = await file.text();
        const nfa = parseCSV(text);
        if (!nfa) throw new Error('Geçersiz CSV formatı');
        onNFAImport(nfa);
        toast({ title: 'Başarılı', description: 'NFA CSV dosyasından yüklendi.' });
      } else if (ext === 'xlsx') {
        const buf = await file.arrayBuffer();
        const nfa = parseXLSX(buf);
        if (!nfa) throw new Error('Geçersiz Excel formatı');
        onNFAImport(nfa);
        toast({ title: 'Başarılı', description: 'NFA Excel dosyasından yüklendi.' });
      } else {
        throw new Error('Desteklenmeyen dosya türü');
      }
    } catch (err: any) {
      toast({ title: 'Hata', description: err.message || 'Dosya okunamadı.', variant: 'destructive' });
    }

    // Reset so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs uppercase tracking-widest text-muted font-bold">İçe Aktar</div>

      <label
        data-testid="button-file-upload"
        className="cursor-pointer flex items-center justify-center gap-2 border border-dashed border-[hsl(var(--border))] hover:border-cyan-600 hover:bg-[hsl(var(--muted))] text-sm py-3 rounded-md transition-colors text-gray-400 hover:text-cyan-400"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Dosya Yükle
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".json,.txt,.csv,.xlsx"
          onChange={handleFile}
        />
      </label>

      <button
        data-testid="button-format-guide"
        onClick={() => setShowGuide(!showGuide)}
        className="text-xs text-gray-500 hover:text-gray-300 text-left flex items-center gap-1 transition-colors"
      >
        <span className={`transition-transform ${showGuide ? 'rotate-90' : ''}`}>▶</span>
        Format Kılavuzu
      </button>

      {showGuide && (
        <div className="text-xs text-gray-400 space-y-3 bg-[#0d1117] border border-[hsl(var(--border))] rounded-md p-3">
          <div>
            <div className="text-cyan-400 font-bold mb-1">JSON Formatı</div>
            <pre className="text-gray-500 text-[10px] overflow-x-auto whitespace-pre-wrap">{`{
  "type": "nfa",
  "states": ["q0","q1"],
  "alphabet": ["a","b"],
  "start": "q0",
  "accept": ["q1"],
  "transitions": [
    {"from":"q0","symbol":"a","to":["q1"]},
    {"from":"q0","symbol":"ε","to":["q1"]}
  ]
}`}</pre>
          </div>
          <div>
            <div className="text-cyan-400 font-bold mb-1">TXT Formatı</div>
            <pre className="text-gray-500 text-[10px]">(a|b)*abb</pre>
          </div>
          <div>
            <div className="text-cyan-400 font-bold mb-1">CSV / Excel Formatı</div>
            <pre className="text-gray-500 text-[10px]">{`Durum,a,b,ε
q0,"{q1}","{}","{q2}"
q1,"{}","{q2}","{}"`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
