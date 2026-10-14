import React, {useState} from 'react';
import {
  X,
  Download,
  Upload,
  RotateCcw,
  Check,
  AlertTriangle,
  FileJson,
} from 'lucide-react';
import {
  exportDatabaseJSON,
  importDatabaseJSON,
  seedSampleData,
  clearAllTickets,
} from '../db/ticketStore';

interface BackupRestoreModalProps {
  onClose: () => void;
  onDataChanged: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  onClose,
  onDataChanged,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async () => {
    try {
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
      setImportStatus('Kopia zapasowa JSON została pobrana na Twoje urządzenie.');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Wystąpił błąd podczas eksportu.'
      );
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const count = await importDatabaseJSON(text);
        setImportStatus(`Pomyślnie przywrócono ${count} biletów do IndexedDB!`);
        onDataChanged();
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Nie udało się wczytać pliku JSON.'
        );
      }
    };
    reader.readAsText(file);
  };

  const handleResetToSamples = async () => {
    if (
      window.confirm(
        'Czy na pewno chcesz wyczyścić bazę i wczytać przykładowe bilety demonstracyjne?'
      )
    ) {
      await clearAllTickets();
      await seedSampleData();
      onDataChanged();
      setImportStatus('Zresetowano portfel do przykładowych biletów.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Kopia zapasowa i Przywracanie
              </h3>
              <p className="text-xs text-slate-500">
                Lokalny eksport i import bazy biletów (format JSON)
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

        {importStatus && (
          <div className="my-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {errorMessage && (
          <div className="my-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4 my-5">
          {/* Export card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Eksportuj do pliku
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              Pobierz pełną bazę swoich biletów jako plik <code className="font-mono">.json</code>.
              Możesz zapisać go na iCloud Drive, dysku Google lub wysłać na inne urządzenie.
            </p>
            <button
              onClick={handleExport}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Pobierz kopię biletów (JSON)
            </button>
          </div>

          {/* Import card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Przywróć z pliku
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              Wczytaj wcześniej pobrany plik kopii zapasowej. Wszystkie bilety zostaną
              dodane do Twojej bazy IndexedDB.
            </p>
            <label className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Wybierz plik kopii JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>

          {/* Reset / Demo seed card */}
          <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
            <span>Potrzebujesz danych testowych?</span>
            <button
              type="button"
              onClick={handleResetToSamples}
              className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-blue-600 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Wczytaj bilety demo
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
