import React, {useState, useEffect} from 'react';
import {
  X,
  Github,
  HardDrive,
  ShieldCheck,
  Check,
  ExternalLink,
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

  const gitSnippet = `# 1. Inicjalizacja repozytorium git
git init
git add .
git commit -m "feat: offline iOS PWA train ticket wallet"

# 2. Połączenie z Twoim repozytorium na GitHubie
git remote add origin https://github.com/drozdeski/bilety-etravel.git
git branch -M main
git push -u origin main`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-sm">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                GitHub Pages & Niezależność Offline iOS
              </h2>
              <p className="text-xs text-slate-500">
                Jak wdrożyć na GitHubie i zabezpieczyć pamięć na iPhone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 my-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-h-[70vh] overflow-y-auto pr-1">
          {/* Section 1: iOS Persistence Diagnostic & Enforcer */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900 dark:text-white">
                  Stan pamięci lokalnej IndexedDB na tym urządzeniu
                </span>
              </div>
              <button
                onClick={loadStats}
                className="p-1 text-slate-400 hover:text-slate-600"
                title="Odśwież stan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs mb-3">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Zapisane bilety
                </span>
                <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {stats?.ticketCount ?? '...'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Zajęte miejsce
                </span>
                <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {stats?.usageBytes
                    ? `${(stats.usageBytes / 1024).toFixed(1)} KB`
                    : 'Poniżej 1 MB'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
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
                  {stats?.persisted
                    ? 'Chroniona (Persisted)'
                    : 'Standardowa'}
                </span>
              </div>
            </div>

            {!stats?.persisted && (
              <button
                onClick={handleRequestPersistence}
                disabled={isPersisting}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                {isPersisting
                  ? 'Sprawdzanie...'
                  : 'Wymuś trwałość danych w pamięci Safari'}
              </button>
            )}
          </div>

          {/* Section 2: Why iOS Needs "Add to Home Screen" */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-500" />
              1. Jak zmusić iOS do niezależności offline?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Domyślnie Safari na iOS posiada politykę <em>WebKit 7-day cap</em>, która
              usuwa pliki cookie i bazy IndexedDB stron internetowych, jeśli nie były
              otwierane przez 7 dni.
            </p>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                Rozwiązanie gwarantowane przez Apple:
              </div>
              <p>
                Gdy dodasz tę aplikację do <strong>Ekranu początkowego</strong> (poprzez
                Udostępnij → <em>Do ekranu początkowego</em>), iOS traktuje ją jako osobną
                aplikację PWA. Jej pamięć IndexedDB i pliki Service Worker są chronione
                przed automatycznym czyszczeniem i działają w 100% w trybie samolotowym!
              </p>
            </div>
          </div>

          {/* Section 3: Publishing to GitHub Pages */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Github className="w-4 h-4 text-slate-900 dark:text-white" />
              2. Publikacja na GitHub Pages (krok po kroku)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Aplikacja została już w pełni skonfigurowana pod kątem GitHub Pages:
              w <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">vite.config.ts</code> ustawiono{' '}
              <code className="text-blue-600 font-mono">base: './'</code>, dzięki czemu
              skrypty i plik manifestu ładują się poprawnie w podkatalogu repozytorium:{' '}
              <strong className="text-slate-900 dark:text-white">
                https://drozdeski.github.io/bilety-etravel/
              </strong>.
            </p>

            <div className="rounded-xl bg-slate-900 text-slate-100 p-3 font-mono text-xs overflow-x-auto relative">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  Polecenia Git do wypchnięcia kodu:
                </span>
                <button
                  onClick={() => copyToClipboard(gitSnippet, 1)}
                  className="flex items-center gap-1 hover:text-white transition-colors"
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

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                Automatyczny GitHub Actions wdrożony w repozytorium:
              </div>
              <p>
                W katalogu <code className="font-mono">.github/workflows/deploy.yml</code> znajduje
                się gotowy proces CI/CD. Po wypchnięciu kodu na GitHub:
              </p>
              <ol className="list-decimal list-inside space-y-0.5 pl-1 text-[11px]">
                <li>Wejdź w swoje repozytorium na GitHubie.</li>
                <li>Przejdź do zakładki <strong>Settings → Pages</strong>.</li>
                <li>W sekcji <em>Build and deployment</em> wybierz <strong>Source: GitHub Actions</strong>.</li>
                <li>Każdy kolejny push na gałąź <code className="font-mono">main</code> automatycznie zaktualizuje Twoją stronę na GitHub Pages!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold rounded-xl text-xs transition-colors"
          >
            Zamknij przewodnik
          </button>
        </div>
      </div>
    </div>
  );
};
