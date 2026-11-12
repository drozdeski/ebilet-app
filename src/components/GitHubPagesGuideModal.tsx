import React, {useState, useEffect} from 'react';
import {
  X,
  Github,
  HardDrive,
  ShieldCheck,
  Check,
  Smartphone,
  Copy,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import {
  getStorageStats,
  requestStoragePersistence,
} from '../db/ticketStore';
import {StorageStats} from '../types/ticket';

interface GitHubPagesGuideModalProps {
  onClose: () => void;
}

export const GitHubPagesGuideModal: React.FC<GitHubPagesGuideModalProps> = ({
  onClose,
}) => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const s = await getStorageStats();
    setStats(s);
  };

  const handleRequestPersistence = async () => {
    setIsPersisting(true);
    await requestStoragePersistence();
    await loadStats();
    setIsPersisting(false);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const gitSnippet = `# 1. Zapisz wszystkie pliki (w tym package-lock.json oraz .github/workflows)
git add .
git commit -m "chore: update offline ticket wallet"

# 2. Wypchnij zmiany do repozytorium na GitHubie
git push origin main`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-3 sm:px-4 bg-black/80 backdrop-blur-md modal-safe-Overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0c0c0f] rounded-3xl max-w-xl w-full max-h-full flex flex-col shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
      >
        {/* Sticky Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-sm">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                GitHub Pages i Tryb Offline
              </h2>
              <p className="text-xs text-slate-500">
                Wdrożenie aplikacji oraz ochrona pamięci lokalnej
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold cursor-pointer"
            aria-label="Zamknij"
          >
            <X className="w-4 h-4" />
            <span>Zamknij</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5 text-xs sm:text-sm text-slate-600 dark:text-zinc-300">
          {/* Section 1: Storage Diagnostic */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900 dark:text-white">
                  Stan pamięci lokalnej IndexedDB
                </span>
              </div>
              <button
                onClick={loadStats}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Odśwież stan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs mb-3">
              <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Zapisane bilety
                </span>
                <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {stats?.ticketCount ?? '...'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Zajęte miejsce
                </span>
                <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {stats?.usageBytes
                    ? `${(stats.usageBytes / 1024).toFixed(1)} KB`
                    : '< 1 MB'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Status trwałości
                </span>
                <span
                  className={`text-xs font-bold inline-flex items-center gap-1 mt-1 ${
                    stats?.persisted
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {stats?.persisted ? 'Chroniona' : 'Standardowa'}
                </span>
              </div>
            </div>

            {!stats?.persisted && (
              <button
                onClick={handleRequestPersistence}
                disabled={isPersisting}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {isPersisting
                  ? 'Sprawdzanie...'
                  : 'Wymuś trwałą ochronę danych w przeglądarce'}
              </button>
            )}
          </div>

          {/* Section 2: Offline PWA Persistence */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-500" />
              1. Pełna niezależność od połączenia sieciowego
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Przeglądarki mobilne mogą czyścić dane rzadko odwiedzanych witryn.
              Zainstalowanie aplikacji jako PWA gwarantuje pełną izolację pamięci.
            </p>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                Dodanie do ekranu głównego:
              </div>
              <p>
                Po dodaniu aplikacji do ekranu głównego urządzenia (poprzez menu{' '}
                <em>Udostępnij → Dodaj do ekranu głównego</em>), jej baza IndexedDB
                oraz pliki Service Worker działają w 100% w trybie offline.
              </p>
            </div>
          </div>

          {/* Section 3: Publishing to GitHub Pages */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Github className="w-4 h-4 text-slate-900 dark:text-white" />
              2. Publikacja i aktualizacja na GitHub Pages
            </h3>
            <div className="rounded-xl bg-slate-900 text-slate-100 p-3 font-mono text-xs overflow-x-auto relative border border-zinc-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  Polecenia Git do aktualizacji:
                </span>
                <button
                  onClick={() => copyToClipboard(gitSnippet, 1)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedIndex === 1 ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Skopiowano</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopiuj</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">{gitSnippet}</pre>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 p-3 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Zamknij przewodnik
          </button>
        </div>
      </div>
    </div>
  );
};
