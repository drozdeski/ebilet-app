import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  Train,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  FileText,
  FileJson,
  Github,
  Trash2,
  Edit2,
  Archive,
  RotateCcw,
  WifiOff,
  Wifi,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  UploadCloud,
  FileCheck,
  Loader2,
  Check,
} from 'lucide-react';
import {TrainTicket} from './types/ticket';
import {
  getAllTickets,
  saveTicket,
  deleteTicket,
  checkStoragePersistence,
} from './db/ticketStore';
import {PWAInstallBanner} from './components/PWAInstallBanner';
import {ConductorModal} from './components/ConductorModal';
import {TicketModal} from './components/TicketModal';
import {GitHubPagesGuideModal} from './components/GitHubPagesGuideModal';
import {BackupRestoreModal} from './components/BackupRestoreModal';
import {useOnlineStatus} from './hooks/useOnlineStatus';
import {parsePDFTicket} from './utils/pdfParser';

export default function App() {
  const isOnline = useOnlineStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tickets, setTickets] = useState<TrainTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'archived' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPersisted, setIsPersisted] = useState(false);

  // PDF processing states
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [pdfProcessMessage, setPdfProcessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Modals state
  const [selectedForConductor, setSelectedForConductor] = useState<TrainTicket | null>(null);
  const [ticketToEdit, setTicketToEdit] = useState<TrainTicket | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  useEffect(() => {
    loadTickets();
    checkStoragePersistence().then(setIsPersisted);

    // Detect iOS Standalone PWA and add root class for guaranteed notch/island clearance
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as {standalone?: boolean})?.standalone === true;
    const isIOSDevice =
      /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isStandalone && isIOSDevice) {
      document.documentElement.classList.add('is-ios-standalone');
    }
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await getAllTickets();
      setTickets(data);
    } catch (err) {
      console.error('Błąd podczas ładowania biletów z IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPDFFile = async (file: File) => {
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Wybierz poprawny plik PDF z biletem kolejowym.');
      return;
    }

    setIsProcessingPDF(true);
    setPdfProcessMessage('Odczytywanie danych z biletu PDF i wycinanie kodu Aztec...');

    try {
      // 1. Read as Data URL for offline storage
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 2. Parse PDF contents & extract Aztec barcode
      const parsed = await parsePDFTicket(file);
      const t = parsed.ticket;

      const fallbackBarcode =
        t.ticketNumber ||
        t.bookingReference ||
        `${t.carrier || 'eTravel'}#${t.trainNumber || ''}#${t.carNumber || ''}#${t.seatNumber || ''}#${t.passengerName || ''}`;

      const newTicket: TrainTicket = {
        id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: `${t.departureStation || 'Podróż'} → ${t.arrivalStation || 'Stacja docelowa'}`,
        carrier: t.carrier || 'eTravel',
        trainNumber: t.trainNumber || 'Pociąg',
        trainName: t.trainName || '',
        departureStation: t.departureStation || 'Stacja początkowa',
        departureTime: t.departureTime || new Date().toISOString().slice(0, 16),
        departurePlatform: t.departurePlatform || '',
        arrivalStation: t.arrivalStation || 'Stacja docelowa',
        arrivalTime: t.arrivalTime || new Date().toISOString().slice(0, 16),
        arrivalPlatform: t.arrivalPlatform || '',
        carNumber: t.carNumber || '01',
        seatNumber: t.seatNumber || '01',
        travelClass: t.travelClass || '2',
        seatType: t.seatType || 'Okno',
        passengerName: t.passengerName || 'Podróżny',
        ticketNumber: t.ticketNumber || '',
        bookingReference: t.bookingReference || '',
        emergencyCode: t.emergencyCode || '',
        price: t.price || '',
        barcodeData: fallbackBarcode,
        barcodeImageUrl: parsed.barcodeImageUrl,
        pdfPagePreviewUrl: parsed.pdfPagePreviewUrl,
        hasAttachment: true,
        attachmentName: file.name,
        attachmentType: 'pdf',
        attachmentDataUrl: dataUrl,
        isArchived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveTicket(newTicket);
      await loadTickets();

      setPdfProcessMessage(
        `Dodano bilet ${newTicket.trainNumber}: ${newTicket.departureStation} → ${newTicket.arrivalStation} (Wagon ${newTicket.carNumber}, Miejsce ${newTicket.seatNumber})`
      );

      // Instantly open the Conductor View with the Aztec code and ticket ready!
      setSelectedForConductor(newTicket);

      setTimeout(() => {
        setPdfProcessMessage(null);
      }, 5000);
    } catch (err) {
      console.error('Błąd podczas przetwarzania PDF:', err);
      alert('Nie udało się automatycznie przetworzyć pliku PDF. Możesz dodać bilet ręcznie.');
    } finally {
      setIsProcessingPDF(false);
    }
  };

  const handleSaveTicket = async (ticket: TrainTicket) => {
    await saveTicket(ticket);
    setIsEditorOpen(false);
    setTicketToEdit(null);
    await loadTickets();
  };

  const handleDeleteTicket = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Czy na pewno chcesz usunąć ten bilet z bazy lokalnej?')) {
      await deleteTicket(id);
      await loadTickets();
    }
  };

  const handleToggleArchive = async (ticket: TrainTicket, e: React.MouseEvent) => {
    e.stopPropagation();
    await saveTicket({
      ...ticket,
      isArchived: !ticket.isArchived,
    });
    await loadTickets();
  };

  // Find nearest upcoming journey
  const now = new Date().getTime();
  const nextJourney = useMemo(() => {
    const upcoming = tickets.filter(
      (t) => !t.isArchived && new Date(t.arrivalTime).getTime() >= now - 1000 * 60 * 30
    );
    if (upcoming.length === 0) return null;
    return upcoming.sort(
      (a, b) =>
        new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
    )[0];
  }, [tickets, now]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Tab filter
      if (activeFilter === 'upcoming' && ticket.isArchived) return false;
      if (activeFilter === 'archived' && !ticket.isArchived) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesStation =
          ticket.departureStation.toLowerCase().includes(query) ||
          ticket.arrivalStation.toLowerCase().includes(query);
        const matchesTrain =
          ticket.trainNumber.toLowerCase().includes(query) ||
          (ticket.trainName && ticket.trainName.toLowerCase().includes(query));
        const matchesPassenger =
          ticket.passengerName && ticket.passengerName.toLowerCase().includes(query);
        const matchesRef =
          (ticket.ticketNumber && ticket.ticketNumber.toLowerCase().includes(query)) ||
          (ticket.bookingReference &&
            ticket.bookingReference.toLowerCase().includes(query));

        if (!matchesStation && !matchesTrain && !matchesPassenger && !matchesRef) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, activeFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top iOS / PWA Install Guide Banner */}
      <PWAInstallBanner />

      {/* Top Bar Contract (One-row, 3-zone contract with iOS safe area top padding) */}
      <header
        className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 header-safe transition-all"
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-8">
          {/* Zone 1: Brand Wordmark (Single text element) */}
          <div className="flex items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Train className="w-4 h-4" />
            </div>
            <span className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Bilety eTravel
            </span>
          </div>

          {/* Zone 2: Navigation Links (Clean single-line text links) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => {
                setActiveFilter('upcoming');
                window.scrollTo({top: 0, behavior: 'smooth'});
              }}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Portfel biletów
            </button>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub & iOS PWA
            </button>
            <button
              onClick={() => setIsBackupOpen(true)}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <FileJson className="w-3.5 h-3.5" />
              Kopia JSON
            </button>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleProcessPDFFile(file);
                e.target.value = '';
              }}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingPDF}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isProcessingPDF ? (
                <Loader2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin text-blue-400" />
              ) : (
                <UploadCloud className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-400 dark:text-blue-600" />
              )}
              <span>Wgraj PDF</span>
            </button>

            <button
              onClick={() => {
                setTicketToEdit(null);
                setIsEditorOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ręcznie</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Connection & Storage Guard Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <Wifi className="w-3.5 h-3.5" />
                Połączono (Tryb online)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                Tryb offline (Brak sieci — baza lokalna aktywna)
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span className="hidden sm:inline">
              IndexedDB przechowuje {tickets.length} biletów na tym urządzeniu
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Status pamięci iOS</span>
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              onClick={() => setIsBackupOpen(true)}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-500" />
              <span>Eksport / Import JSON</span>
            </button>
          </div>
        </div>

        {/* PDF Processing Alert / Toast */}
        {pdfProcessMessage && (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2.5">
              {isProcessingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
              ) : (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className="font-medium">{pdfProcessMessage}</span>
            </div>
            {!isProcessingPDF && (
              <button
                onClick={() => setPdfProcessMessage(null)}
                className="text-blue-700 dark:text-blue-300 font-bold hover:underline"
              >
                Zamknij
              </button>
            )}
          </div>
        )}

        {/* Dedicated Quick PDF Dropzone Box */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleProcessPDFFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`p-5 sm:p-6 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left ${
            isDragging
              ? 'border-blue-500 bg-blue-50/90 dark:bg-blue-950/60 shadow-lg scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 hover:bg-slate-50/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              {isProcessingPDF ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <span>Wgraj bilet z pliku PDF (eTravel / PKP Intercity)</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold uppercase">
                  Automatyczny odczyt
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Przeciągnij tutaj plik PDF lub kliknij. Aplikacja automatycznie odczyta stacje,
                godziny, pociąg, wagon, miejsca oraz <strong>wytnie oryginalny kod Aztec</strong> do kontroli.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors">
              <UploadCloud className="w-4 h-4" />
              Wybierz plik PDF
            </span>
          </div>
        </section>

        {/* Hero Card: Next Upcoming Train */}
        {nextJourney && activeFilter !== 'archived' && (
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 text-white p-5 sm:p-7 shadow-xl border border-blue-950">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left journey summary */}
              <div className="space-y-4 max-w-xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-blue-300 font-medium">
                  <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-200 font-semibold tracking-wide uppercase">
                    Najbliższa podróż
                  </span>
                  <span>{nextJourney.carrier}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{nextJourney.trainNumber}</span>
                  {nextJourney.trainName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>"{nextJourney.trainName}"</span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[11px] text-blue-300 uppercase tracking-wider block">
                      Stacja początkowa
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                      {nextJourney.departureStation}
                    </h2>
                    <div className="text-sm text-slate-300 font-mono mt-0.5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>
                        {new Date(nextJourney.departureTime).toLocaleTimeString('pl-PL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {nextJourney.departurePlatform && (
                        <span className="text-xs text-slate-400">
                          ({nextJourney.departurePlatform})
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-blue-300 uppercase tracking-wider block">
                      Stacja docelowa
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                      {nextJourney.arrivalStation}
                    </h3>
                    <div className="text-sm text-slate-300 font-mono mt-0.5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        {new Date(nextJourney.arrivalTime).toLocaleTimeString('pl-PL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {nextJourney.arrivalPlatform && (
                        <span className="text-xs text-slate-400">
                          ({nextJourney.arrivalPlatform})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                  <span>
                    Data:{' '}
                    <strong className="text-white">
                      {new Date(nextJourney.departureTime).toLocaleDateString('pl-PL', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Pasażer: <strong className="text-white">{nextJourney.passengerName}</strong>
                  </span>
                </div>
              </div>

              {/* Right seat HUD & Conductor CTA */}
              <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 lg:w-72">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white/10">
                    <span className="text-[10px] text-blue-200 uppercase tracking-wider block">
                      Wagon
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-amber-400">
                      {nextJourney.carNumber}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/10">
                    <span className="text-[10px] text-blue-200 uppercase tracking-wider block">
                      Miejsce
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-white">
                      {nextJourney.seatNumber}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedForConductor(nextJourney)}
                  className="w-full py-3 px-4 bg-white text-slate-950 hover:bg-blue-50 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98] cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>Pokaż do kontroli</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Ticket Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setActiveFilter('upcoming')}
              className={`py-2 px-3.5 rounded-lg transition-all cursor-pointer ${
                activeFilter === 'upcoming'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Nadchodzące ({tickets.filter((t) => !t.isArchived).length})
            </button>
            <button
              onClick={() => setActiveFilter('archived')}
              className={`py-2 px-3.5 rounded-lg transition-all cursor-pointer ${
                activeFilter === 'archived'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Archiwum ({tickets.filter((t) => t.isArchived).length})
            </button>
            <button
              onClick={() => setActiveFilter('all')}
              className={`py-2 px-3.5 rounded-lg transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Wszystkie ({tickets.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Szukaj stacji, pociągu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Ticket List */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Ładowanie biletów z lokalnej bazy IndexedDB...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Train className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Brak biletów w tym widoku
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Nie znaleziono biletów pasujących do Twojego wyszukiwania.'
                : 'Dodaj swój pierwszy bilet kolejowy lub wklej treść rezerwacji eTravel.'}
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setTicketToEdit(null);
                  setIsEditorOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj bilet teraz</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTickets.map((ticket) => {
              const dep = new Date(ticket.departureTime);
              const arr = new Date(ticket.arrivalTime);
              const depTimeStr = dep.toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const arrTimeStr = arr.toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const dateStr = dep.toLocaleDateString('pl-PL', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              });

              return (
                <article
                  key={ticket.id}
                  onClick={() => setSelectedForConductor(ticket)}
                  className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Top Ticket Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {ticket.carrier}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {ticket.trainNumber}
                        </span>
                        {ticket.trainName && (
                          <span className="text-slate-500 hidden sm:inline">
                            "{ticket.trainName}"
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {ticket.hasAttachment && (
                          <span
                            title="Dołączono dokument PDF lub zrzut ekranu"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">PDF</span>
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-medium ml-1">
                          {dateStr}
                        </span>
                      </div>
                    </div>

                    {/* Route and Times */}
                    <div className="py-3.5 space-y-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {ticket.departureStation}
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white shrink-0">
                          {depTimeStr}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-3 text-slate-600 dark:text-slate-400">
                        <span className="text-sm font-semibold truncate">
                          {ticket.arrivalStation}
                        </span>
                        <span className="text-sm font-mono shrink-0">
                          {arrTimeStr}
                        </span>
                      </div>
                    </div>

                    {/* Carriage and Seat Details (Tabular discipline) */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-sans">
                            Wagon
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {ticket.carNumber}
                          </span>
                        </div>
                        <span aria-hidden="true" className="text-slate-300">/</span>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-sans">
                            Miejsce
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {ticket.seatNumber}
                          </span>
                        </div>
                        {ticket.seatType && (
                          <span className="text-slate-500 text-[11px] font-sans">
                            ({ticket.seatType})
                          </span>
                        )}
                      </div>

                      <div className="text-right text-[11px] text-slate-500">
                        Klasa {ticket.travelClass}
                        {ticket.price && (
                          <span className="ml-2 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                            {ticket.price}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 group-hover:underline">
                        <QrCode className="w-3.5 h-3.5" />
                        Pokaż do kontroli
                      </span>
                      {ticket.barcodeImageUrl && (
                        <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                          Aztec PDF
                        </span>
                      )}
                      {ticket.emergencyCode && (
                        <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono">
                          Kod: {ticket.emergencyCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTicketToEdit(ticket);
                          setIsEditorOpen(true);
                        }}
                        title="Edytuj bilet"
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleToggleArchive(ticket, e)}
                        title={ticket.isArchived ? 'Przywróć z archiwum' : 'Archiwizuj bilet'}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        {ticket.isArchived ? (
                          <RotateCcw className="w-3.5 h-3.5" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={(e) => handleDeleteTicket(ticket.id, e)}
                        title="Usuń bilet"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Informational Footer Strip with GitHub Pages link */}
        <section className="mt-8 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-slate-900 dark:text-white" />
              <span className="font-semibold text-slate-900 dark:text-white">
                Wdrożenie na drozdeski.github.io/bilety-etravel
              </span>
            </div>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Zobacz instrukcję konfiguracji GitHub Pages</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="leading-relaxed">
            Projekt jest w 100% samowystarczalny: Service Worker precache'uje całą aplikację, a IndexedDB
            gwarantuje, że bilety (w tym załączniki PDF) otwierają się błyskawicznie na stacji lub w pociągu
            bez zasięgu sieci komórkowej.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-5 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 pb-safe">
        <p>Bilety eTravel — Niezależny portfel biletów kolejowych PWA dla iOS</p>
      </footer>

      {/* Modals */}
      {selectedForConductor && (
        <ConductorModal
          ticket={selectedForConductor}
          onClose={() => setSelectedForConductor(null)}
        />
      )}

      {isEditorOpen && (
        <TicketModal
          ticketToEdit={ticketToEdit}
          onClose={() => {
            setIsEditorOpen(false);
            setTicketToEdit(null);
          }}
          onSave={handleSaveTicket}
        />
      )}

      {isGuideOpen && (
        <GitHubPagesGuideModal onClose={() => setIsGuideOpen(false)} />
      )}

      {isBackupOpen && (
        <BackupRestoreModal
          onClose={() => setIsBackupOpen(false)}
          onDataChanged={loadTickets}
        />
      )}
    </div>
  );
}
