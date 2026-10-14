import React, {useState} from 'react';
import {Download, Share2, PlusSquare, X, Check, Smartphone} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already installed as standalone PWA, suppress
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2.5 shadow-sm text-xs sm:text-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/20 text-blue-300">
              <Smartphone className="w-3.5 h-3.5" />
            </span>
            <p className="truncate font-medium text-slate-200">
              <span className="font-semibold text-white">Dostęp offline: </span>
              Zainstaluj aplikację na telefonie, aby otwierać bilety bez internetu.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {isInstallable && (
              <button
                onClick={install}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white font-medium rounded-lg text-xs transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Zainstaluj
              </button>
            )}

            <button
              onClick={() => setShowGuide(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 font-medium rounded-lg text-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Instrukcja iOS / Safari
            </button>
          </div>
        </div>
      </div>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Instalacja PWA na iPhone / iPad
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Safari na iOS nie wyświetla automatycznego powiadomienia
                </p>
              </div>
            </div>

            <div className="space-y-4 my-5 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Otwórz w Safari i stuknij Udostępnij
                    <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400 inline" />
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Ikona kwadratu ze strzałką w górę na dolnym pasku Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Wybierz "Do ekranu początkowego"
                    <PlusSquare className="w-4 h-4 text-emerald-600 inline" />
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    (Ang. "Add to Home Screen"). Przewiń listę w dół.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Stuknij "Dodaj" w prawym górnym rogu
                    <Check className="w-4 h-4 text-emerald-600 inline" />
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Aplikacja pojawi się obok innych Twoich aplikacji na pulpicie.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <strong>Dlaczego warto dodać do ekranu początkowego?</strong>
              <p className="mt-1">
                iOS izoluje aplikacje z ekranu początkowego w osobnym kontenerze,
                dzięki czemu pamięć podręczna i baza biletów IndexedDB nie są usuwane
                przez Safari po 7 dniach bezczynności.
              </p>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold rounded-xl text-sm transition-colors"
            >
              Rozumiem, zamknij
            </button>
          </div>
        </div>
      )}
    </>
  );
};
