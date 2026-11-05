import React, {useState, useEffect, useRef} from 'react';
import {
  X,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  HardDrive,
  ShieldCheck,
  FileJson,
  Download,
  Upload,
  Trash2,
  Sparkles,
  Smartphone,
  Github,
  Check,
  AlertCircle,
  Share2,
  PlusSquare,
  ChevronRight,
} from 'lucide-react';
import {StorageStats} from '../types/ticket';
import {
  getStorageStats,
  requestStoragePersistence,
  exportDatabaseJSON,
  importDatabaseJSON,
  clearAllTickets,
  seedSampleData,
} from '../db/ticketStore';
import {usePWAInstall} from '../hooks/usePWAInstall';

interface SettingsDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: (theme: 'dark' | 'light') => void;
  isOnline: boolean;
  ticketCount: number;
  onDataChanged: () => Promise<void> | void;
  onOpenGitHubGuide: () => void;
}

export const SettingsDrawerModal: React.FC<SettingsDrawerModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  isOnline,
  ticketCount,
  onDataChanged,
  onOpenGitHubGuide,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {isInstallable, isInstalled, install} = usePWAInstall();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      setStatusMsg(null);
      setErrorMsg(null);
      setConfirmClearAll(false);
    }
  }, [isOpen, ticketCount]);

  if (!isOpen) return null;

  const loadStats = async () => {
    const s = await getStorageStats();
    setStats(s);
  };

  const handleRequestPersistence = async () => {
    setIsPersisting(true);
    await requestStoragePersistence();
    await loadStats();
    setIsPersisting(false);
    setStatusMsg('Wysłano żądanie trwałej ochrony pamięci IndexedDB.');
  };

  const handleExportJSON = async () => {
    try {
      setErrorMsg(null);
      const jsonStr = await exportDatabaseJSON();
      const blob = new Blob([jsonStr], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `bilety-etravel-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg('Pobrano plik kopii zapasowej JSON.');
    } catch {
      setErrorMsg('Nie udało się wyeksportować bazy danych.');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMsg(null);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const count = await importDatabaseJSON(text);
        await onDataChanged();
        await loadStats();
        setStatusMsg(`Zaimportowano ${count} biletów do pamięci urządzenia.`);
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Błąd wczytywania pliku JSON.'
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAll = async () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }
    await clearAllTickets();
    await onDataChanged();
    await loadStats();
    setConfirmClearAll(false);
    setStatusMsg('Wszystkie bilety zostały trwale usunięte z pamięci.');
  };

  const handleLoadSample = async () => {
    await seedSampleData();
    await onDataChanged();
    await loadStats();
    setStatusMsg('Dodano przykładowy bilet testowy.');
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md pt-safe pb-safe"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#0c0c0f] text-slate-900 dark:text-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-zinc-800/90 shadow-2xl max-h-[88vh] overflow-y-auto p-5 sm:p-6 space-y-5"
      >
        {/* Top Grab Handle for iOS Sheet feel */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              Ustawienia i Status Aplikacji
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Pamięć offline IndexedDB, motyw OLED oraz kopia zapasowa
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            aria-label="Zamknij menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status / Feedback Banner */}
        {statusMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Theme Switcher (OLED Dark vs Light) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/70 dark:border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Motyw ekranu (iPhone OLED)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onToggleTheme('dark')}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition cursor-pointer ${
                theme === 'dark'
                  ? 'bg-black text-white border-blue-500 shadow-sm ring-1 ring-blue-500/50'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
              }`}
            >
              <Moon className="w-4 h-4 text-blue-400" />
              <span>Czarny OLED</span>
            </button>
            <button
              onClick={() => onToggleTheme('light')}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-slate-900 border-blue-600 shadow-sm ring-1 ring-blue-600/30'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Jasny dzień</span>
            </button>
          </div>
        </div>

        {/* 2. Technical Status: Network & IndexedDB */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/70 dark:border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-500" />
              Status Techniczny & Pamięć iOS
            </span>
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Wifi className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                <WifiOff className="w-3 h-3" /> Tryb Offline
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-slate-200/70 dark:border-zinc-800">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase block">
                Bilety w bazie
              </span>
              <span className="text-sm font-bold font-mono mt-0.5 block">
                {ticketCount}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-slate-200/70 dark:border-zinc-800">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase block">
                Zajęte miejsce
              </span>
              <span className="text-sm font-bold font-mono mt-0.5 block">
                {stats ? formatBytes(stats.usageBytes) : '...'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-slate-200/70 dark:border-zinc-800">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase block">
                Ochrona iOS
              </span>
              <span
                className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${
                  stats?.persisted || isInstalled
                    ? 'text-emerald-500'
                    : 'text-amber-500'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {isInstalled ? 'PWA Aktywne' : stats?.persisted ? 'Trwała' : 'Standard'}
              </span>
            </div>
          </div>

          {!stats?.persisted && (
            <button
              onClick={handleRequestPersistence}
              disabled={isPersisting}
              className="w-full py-2 px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {isPersisting
                  ? 'Zabezpieczanie pamięci...'
                  : 'Wymuś trwałą blokadę pamięci w Safari'}
              </span>
            </button>
          )}
        </div>

        {/* 3. Backup JSON & Database Management */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/70 dark:border-zinc-800/80 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
            <FileJson className="w-3.5 h-3.5 text-amber-500" />
            Kopia Zapasowa JSON i Zarządzanie Bazą
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportJSON}
              className="py-2.5 px-3 rounded-xl bg-white dark:bg-black hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>Eksportuj JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-white dark:bg-black hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span>Importuj JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800/80 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleLoadSample}
              className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-black hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-600 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Dodaj bilet testowy</span>
            </button>

            <button
              onClick={handleClearAll}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                confirmClearAll
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {confirmClearAll
                  ? 'Kliknij ponownie, aby potwierdzić'
                  : 'Wyczyść wszystkie bilety'}
              </span>
            </button>
          </div>
        </div>

        {/* 4. iOS PWA Install & GitHub Pages Info */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/70 dark:border-zinc-800/80 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-500" />
            Instalacja iOS PWA & GitHub Pages
          </span>

          {!isInstalled && (
            <div className="text-xs text-slate-600 dark:text-zinc-400 space-y-1.5 bg-white dark:bg-black p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800">
              <p className="font-semibold text-slate-900 dark:text-white">
                Jak zainstalować na iPhone 16 Pro:
              </p>
              <p className="flex items-center gap-1.5">
                1. Stuknij <Share2 className="w-3.5 h-3.5 text-blue-500 inline" />{' '}
                <strong>Udostępnij</strong> na dolnym pasku Safari.
              </p>
              <p className="flex items-center gap-1.5">
                2. Wybierz <PlusSquare className="w-3.5 h-3.5 text-emerald-500 inline" />{' '}
                <strong>Do ekranu początkowego</strong>.
              </p>
              {isInstallable && (
                <button
                  onClick={install}
                  className="mt-2 w-full py-2 bg-blue-600 text-white rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Zainstaluj aplikację PWA
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => {
              onClose();
              onOpenGitHubGuide();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-black hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-between transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Github className="w-4 h-4" />
              <span>Konfiguracja GitHub Pages i architektura offline</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
