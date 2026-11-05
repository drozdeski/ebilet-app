import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  Train,
  Plus,
  Search,
  Clock,
  QrCode,
  FileText,
  Trash2,
  Edit2,
  Archive,
  RotateCcw,
  WifiOff,
  UploadCloud,
  Loader2,
  Check,
  Menu,
  Sun,
  Moon,
  CalendarClock,
  Layers,
  SlidersHorizontal,
  X,
  Undo2,
} from 'lucide-react';
import {TrainTicket} from './types/ticket';
import {
  getAllTickets,
  saveTicket,
  deleteTicket,
  checkStoragePersistence,
} from './db/ticketStore';
import {ConductorModal} from './components/ConductorModal';
import {TicketModal} from './components/TicketModal';
import {GitHubPagesGuideModal} from './components/GitHubPagesGuideModal';
import {SettingsDrawerModal} from './components/SettingsDrawerModal';
import {useOnlineStatus} from './hooks/useOnlineStatus';
import {parsePDFTicket} from './utils/pdfParser';

export default function App() {
  const isOnline = useOnlineStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tickets, setTickets] = useState<TrainTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'all' | 'archived'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  // Theme state ('dark' OLED default)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('bilety_theme_mode');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Floating Action Button menu state
  const [isFabOpen, setIsFabOpen] = useState(false);

  // PDF processing states
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [pdfProcessMessage, setPdfProcessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Undo deleted ticket toast state
  const [deletedTicketToast, setDeletedTicketToast] = useState<TrainTicket | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  // Modals state
  const [selectedForConductor, setSelectedForConductor] = useState<TrainTicket | null>(null);
  const [ticketToEdit, setTicketToEdit] = useState<TrainTicket | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Apply theme to <html> and meta theme-color
  useEffect(() => {
    const root = document.documentElement;
    const metaTheme = document.getElementById('theme-color-meta');
    if (theme === 'dark') {
      root.classList.add('dark');
      metaTheme?.setAttribute('content', '#000000');
    } else {
      root.classList.remove('dark');
      metaTheme?.setAttribute('content', '#ffffff');
    }
    try {
      localStorage.setItem('bilety_theme_mode', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    loadTickets();
    checkStoragePersistence();

    // Detect iOS Standalone PWA and add root class for guaranteed Dynamic Island clearance
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

  const handleToggleTheme = (nextTheme?: 'dark' | 'light') => {
    setTheme((prev) => (nextTheme ? nextTheme : prev === 'dark' ? 'light' : 'dark'));
  };

  const handleProcessPDFFile = async (file: File) => {
    setIsFabOpen(false);
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfProcessMessage('Wybierz poprawny plik PDF z biletem kolejowym.');
      return;
    }

    setIsProcessingPDF(true);
    setPdfProcessMessage('Odczytywanie biletu PDF i wycinanie kodu Aztec...');

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const parsed = await parsePDFTicket(file);
      const t = parsed.ticket;

      const fallbackBarcode =
        t.ticketNumber ||
        t.bookingReference ||
        `${t.carrier || 'eTravel'}#${t.trainNumber || ''}#${t.carNumber || ''}#${t.seatNumber || ''}#${t.passengerName || ''}`;

      const newTicket: TrainTicket = {
        id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      setActiveFilter('upcoming');

      setPdfProcessMessage(
        `Dodano bilet ${newTicket.trainNumber}: ${newTicket.departureStation} → ${newTicket.arrivalStation}`
      );

      setSelectedForConductor(newTicket);

      setTimeout(() => {
        setPdfProcessMessage(null);
      }, 4500);
    } catch (err) {
      console.error('Błąd podczas przetwarzania PDF:', err);
      setPdfProcessMessage('Nie udało się automatycznie odczytać PDF. Dodaj bilet ręcznie.');
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

  const handleDeleteTicket = async (ticket: TrainTicket, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistically remove from UI immediately
    setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    if (selectedForConductor?.id === ticket.id) {
      setSelectedForConductor(null);
    }

    // Permanently remove from IndexedDB and localStorage mirror
    await deleteTicket(ticket.id);
    const updated = await getAllTickets();
    setTickets(updated);

    // Show Undo toast
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }
    setDeletedTicketToast(ticket);
    undoTimerRef.current = window.setTimeout(() => {
      setDeletedTicketToast(null);
    }, 4500);
  };

  const handleUndoDelete = async () => {
    if (!deletedTicketToast) return;
    const toRestore = deletedTicketToast;
    setDeletedTicketToast(null);
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }
    await saveTicket(toRestore);
    await loadTickets();
  };

  const handleToggleArchive = async (ticket: TrainTicket, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTicket: TrainTicket = {
      ...ticket,
      isArchived: !ticket.isArchived,
      updatedAt: Date.now(),
    };
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? updatedTicket : t))
    );
    await saveTicket(updatedTicket);
    await loadTickets();
  };

  // Counts
  const upcomingCount = useMemo(
    () => tickets.filter((t) => !t.isArchived).length,
    [tickets]
  );
  const archivedCount = useMemo(
    () => tickets.filter((t) => t.isArchived).length,
    [tickets]
  );

  // Nearest active journey for Hero card
  const nextJourney = useMemo(() => {
    const active = tickets.filter((t) => !t.isArchived);
    if (active.length === 0) return null;
    const now = Date.now();
    // Prefer future or currently running trains; fallback to earliest non-archived
    const future = active.filter(
      (t) => new Date(t.arrivalTime).getTime() >= now - 1000 * 60 * 60
    );
    const pool = future.length > 0 ? future : active;
    return [...pool].sort(
      (a, b) =>
        new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
    )[0];
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (activeFilter === 'upcoming' && ticket.isArchived) return false;
      if (activeFilter === 'archived' && !ticket.isArchived) return false;

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
    <div
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
      className="min-h-screen bg-[#F4F5F8] dark:bg-black text-slate-900 dark:text-white flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200"
    >
      {/* Hidden Global PDF File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="application/pdf,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessPDFFile(file);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Minimal iOS Top Header (Dynamic Island Safe Area Aware) */}
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-black/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-zinc-900 header-safe transition-colors">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Brand & Offline Pill */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/30 shrink-0">
              <Train className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Bilety eTravel
                </span>
                {!isOnline && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 text-[10px] font-semibold">
                    <WifiOff className="w-2.5 h-2.5" />
                    Offline
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Controls: Theme Toggle + Hamburger Menu */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleToggleTheme()}
              title={theme === 'dark' ? 'Przełącz na jasny motyw' : 'Przełącz na czarny motyw OLED'}
              aria-label="Zmień motyw kolorystyczny"
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-white active:scale-95 transition cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Ustawienia, kopia zapasowa i status aplikacji"
              aria-label="Otwórz menu ustawień"
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-white active:scale-95 transition cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Scaled for iPhone 16 Pro with generous bottom padding for Tab Bar + FAB) */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-4 pb-36 space-y-5">
        {/* PDF Processing Toast */}
        {pdfProcessMessage && (
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              {isProcessingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
              ) : (
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <span className="font-medium">{pdfProcessMessage}</span>
            </div>
            {!isProcessingPDF && (
              <button
                onClick={() => setPdfProcessMessage(null)}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline shrink-0 cursor-pointer"
              >
                OK
              </button>
            )}
          </div>
        )}

        {/* Drag-and-Drop Overlay Indicator */}
        {isDragging && (
          <div className="p-6 rounded-3xl border-2 border-dashed border-blue-500 bg-blue-500/10 text-center text-sm font-semibold text-blue-400">
            Upuść plik PDF z biletem tutaj, aby automatycznie wyciąć kod Aztec...
          </div>
        )}

        {/* Hero Card: Next Active Journey */}
        {nextJourney && activeFilter === 'upcoming' && !searchQuery && (
          <section
            onClick={() => setSelectedForConductor(nextJourney)}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#090d16] to-black text-white p-5 shadow-xl border border-zinc-800/90 cursor-pointer active:scale-[0.99] transition-transform"
          >
            {/* Subtle top glow */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold tracking-wide uppercase text-[10px]">
                  Główny bilet
                </span>
                <span className="font-semibold text-zinc-300">
                  {nextJourney.carrier}
                </span>
                <span className="text-zinc-600">·</span>
                <span className="font-mono font-bold text-white">
                  {nextJourney.trainNumber}
                </span>
              </div>

              <span className="text-xs font-medium text-zinc-400">
                {new Date(nextJourney.departureTime).toLocaleDateString('pl-PL', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>

            {/* Stations & Times */}
            <div className="grid grid-cols-2 gap-4 py-1">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Odjazd
                </span>
                <div className="text-2xl font-extrabold font-mono text-white tracking-tight mt-0.5">
                  {new Date(nextJourney.departureTime).toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="text-sm font-semibold text-zinc-200 truncate mt-0.5">
                  {nextJourney.departureStation}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Przyjazd
                </span>
                <div className="text-2xl font-extrabold font-mono text-emerald-400 tracking-tight mt-0.5">
                  {new Date(nextJourney.arrivalTime).toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="text-sm font-semibold text-zinc-200 truncate mt-0.5">
                  {nextJourney.arrivalStation}
                </div>
              </div>
            </div>

            {/* Wagon / Seat / Conductor Button Bar */}
            <div className="mt-4 pt-4 border-t border-zinc-800/90 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-center">
                  <span className="text-[9px] text-zinc-400 uppercase block">
                    Wagon
                  </span>
                  <span className="text-base font-extrabold font-mono text-amber-400">
                    {nextJourney.carNumber}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-center">
                  <span className="text-[9px] text-zinc-400 uppercase block">
                    Miejsce
                  </span>
                  <span className="text-base font-extrabold font-mono text-white">
                    {nextJourney.seatNumber}
                  </span>
                </div>
                <div className="hidden xs:block text-xs text-zinc-400 truncate max-w-[130px]">
                  <span className="block text-[10px] text-zinc-500">Pasażer</span>
                  <span className="font-medium text-zinc-200 truncate block">
                    {nextJourney.passengerName}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedForConductor(nextJourney);
                }}
                className="px-4 py-2.5 bg-white text-black hover:bg-zinc-100 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shrink-0 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>Kod do kontroli</span>
              </button>
            </div>
          </section>
        )}

        {/* Section Header + Search Input */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {activeFilter === 'upcoming' && 'Nadchodzące podróże'}
              {activeFilter === 'all' && 'Wszystkie bilety'}
              {activeFilter === 'archived' && 'Archiwum biletów'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-500">
              {filteredTickets.length}{' '}
              {filteredTickets.length === 1
                ? 'bilet zapisany'
                : filteredTickets.length >= 2 && filteredTickets.length <= 4
                  ? 'bilety zapisane'
                  : 'biletów zapisanych'}{' '}
              offline
            </p>
          </div>

          {tickets.length > 0 && (
            <div className="relative w-44 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Szukaj biletu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Ticket Cards List */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 dark:text-zinc-500 text-xs">
            Wczytywanie portfela biletów...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#0c0c0f] border border-slate-200/80 dark:border-zinc-800/90 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Train className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {searchQuery
                  ? 'Brak wyników wyszukiwania'
                  : activeFilter === 'archived'
                    ? 'Archiwum jest puste'
                    : 'Portfel biletów jest pusty'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                {searchQuery
                  ? 'Nie znaleziono biletów pasujących do wpisanej frazy.'
                  : 'Stuknij przycisk (+) w prawym dolnym rogu lub wybierz plik PDF z biletem eTravel / PKP.'}
              </p>
            </div>
            {!searchQuery && (
              <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-sm transition cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Wgraj bilet PDF</span>
                </button>
                <button
                  onClick={() => {
                    setTicketToEdit(null);
                    setIsEditorOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-900 dark:text-white font-semibold rounded-xl text-xs border border-slate-200 dark:border-zinc-800 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dodaj ręcznie</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
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
                  className="group rounded-3xl bg-white dark:bg-[#0c0c0f] border border-slate-200/90 dark:border-zinc-800/90 p-4 sm:p-5 shadow-sm hover:border-blue-500/60 dark:hover:border-blue-500/60 active:scale-[0.99] transition-all cursor-pointer"
                >
                  {/* Top Bar: Carrier, Train Number & Date */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2 text-xs min-w-0">
                      <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">
                        {ticket.carrier}
                      </span>
                      <span className="text-slate-300 dark:text-zinc-700">·</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                        {ticket.trainNumber}
                      </span>
                      {ticket.trainName && (
                        <span className="text-slate-500 dark:text-zinc-400 truncate">
                          "{ticket.trainName}"
                        </span>
                      )}
                      {ticket.isArchived && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[10px] font-medium">
                          Archiwum
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {ticket.hasAttachment && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                          <FileText className="w-3 h-3" />
                          PDF
                        </span>
                      )}
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* Stations & Times */}
                  <div className="py-3.5 grid grid-cols-[1fr_auto] gap-y-2 gap-x-4 items-baseline">
                    <div className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {ticket.departureStation}
                    </div>
                    <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white text-right">
                      {depTimeStr}
                    </div>

                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400 truncate">
                      {ticket.arrivalStation}
                    </div>
                    <div className="text-sm font-mono font-semibold text-slate-500 dark:text-zinc-400 text-right">
                      {arrTimeStr}
                    </div>
                  </div>

                  {/* Seat & Carriage Pill Strip */}
                  <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase block font-sans">
                          Wagon
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {ticket.carNumber}
                        </span>
                      </div>
                      <span className="text-slate-300 dark:text-zinc-700">/</span>
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase block font-sans">
                          Miejsce
                        </span>
                        <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                          {ticket.seatNumber}
                        </span>
                      </div>
                      {ticket.seatType && (
                        <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-sans">
                          ({ticket.seatType})
                        </span>
                      )}
                    </div>

                    <div className="text-right text-[11px] text-slate-500 dark:text-zinc-400">
                      <span>Kl. {ticket.travelClass}</span>
                      {ticket.price && (
                        <span className="ml-2 font-mono text-slate-800 dark:text-zinc-200 font-semibold">
                          {ticket.price}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5">
                        <QrCode className="w-4 h-4" />
                        <span>Pokaż kod QR / Aztec</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTicketToEdit(ticket);
                          setIsEditorOpen(true);
                        }}
                        title="Edytuj bilet"
                        aria-label="Edytuj bilet"
                        className="p-2 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleToggleArchive(ticket, e)}
                        title={
                          ticket.isArchived
                            ? 'Przywróć do nadchodzących'
                            : 'Przenieś do archiwum'
                        }
                        aria-label={
                          ticket.isArchived
                            ? 'Przywróć do nadchodzących'
                            : 'Przenieś do archiwum'
                        }
                        className="p-2 text-slate-400 dark:text-zinc-400 hover:text-amber-500 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        {ticket.isArchived ? (
                          <RotateCcw className="w-4 h-4" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={(e) => handleDeleteTicket(ticket, e)}
                        title="Usuń trwale z pamięci"
                        aria-label="Usuń trwale z pamięci"
                        className="p-2 text-slate-400 dark:text-zinc-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Undo Delete Toast */}
      {deletedTicketToast && (
        <div className="fixed left-4 right-4 max-w-md mx-auto fab-bottom-offset z-40 mb-16 p-3.5 rounded-2xl bg-zinc-900 text-white border border-zinc-700 shadow-2xl flex items-center justify-between gap-3 text-xs">
          <span className="truncate">
            Usunięto bilet <strong>{deletedTicketToast.trainNumber}</strong> z pamięci
          </span>
          <button
            onClick={handleUndoDelete}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Cofnij</span>
          </button>
        </div>
      )}

      {/* Backdrop when FAB speed-dial is open */}
      {isFabOpen && (
        <div
          onClick={() => setIsFabOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Floating Action Button (FAB) in Bottom-Right Corner */}
      <div className="fixed right-4 fab-bottom-offset z-40 flex flex-col items-end gap-2.5">
        {isFabOpen && (
          <div className="flex flex-col items-end gap-2.5 mb-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingPDF}
              className="flex items-center gap-3 pl-4 pr-3.5 py-3 rounded-2xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 shadow-2xl hover:border-blue-500 active:scale-95 transition cursor-pointer"
            >
              <div className="text-right">
                <span className="block text-xs font-bold">Wgraj bilet PDF</span>
                <span className="block text-[10px] text-slate-500 dark:text-zinc-400">
                  Automatyczny odczyt + kod Aztec
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <UploadCloud className="w-5 h-5" />
              </div>
            </button>

            <button
              onClick={() => {
                setIsFabOpen(false);
                setTicketToEdit(null);
                setIsEditorOpen(true);
              }}
              className="flex items-center gap-3 pl-4 pr-3.5 py-3 rounded-2xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 shadow-2xl hover:border-blue-500 active:scale-95 transition cursor-pointer"
            >
              <div className="text-right">
                <span className="block text-xs font-bold">Dodaj ręcznie</span>
                <span className="block text-[10px] text-slate-500 dark:text-zinc-400">
                  Formularz lub wklej tekst e-mail
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Edit2 className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsFabOpen((prev) => !prev)}
          aria-label="Dodaj bilet"
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-200 active:scale-90 cursor-pointer ${
            isFabOpen
              ? 'bg-zinc-800 rotate-45 border border-zinc-700'
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/40'
          }`}
        >
          {isProcessingPDF ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Plus className="w-7 h-7 stroke-[2.5]" />
          )}
        </button>
      </div>

      {/* Native iOS Bottom Navigation Tab Bar (iPhone 16 Pro Home Indicator Safe) */}
      <nav
        aria-label="Dolna nawigacja"
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-zinc-800/90 bottom-nav-safe"
      >
        <div className="max-w-lg mx-auto px-2 pt-2 grid grid-cols-4 gap-1">
          <button
            onClick={() => {
              setActiveFilter('upcoming');
              window.scrollTo({top: 0, behavior: 'smooth'});
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeFilter === 'upcoming' && !isSettingsOpen
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            <div className="relative">
              <CalendarClock className="w-5 h-5" />
              {upcomingCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {upcomingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold mt-1">Nadchodzące</span>
          </button>

          <button
            onClick={() => {
              setActiveFilter('all');
              window.scrollTo({top: 0, behavior: 'smooth'});
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeFilter === 'all' && !isSettingsOpen
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            <div className="relative">
              <Layers className="w-5 h-5" />
              {tickets.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center">
                  {tickets.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold mt-1">Wszystkie</span>
          </button>

          <button
            onClick={() => {
              setActiveFilter('archived');
              window.scrollTo({top: 0, behavior: 'smooth'});
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeFilter === 'archived' && !isSettingsOpen
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            <div className="relative">
              <Archive className="w-5 h-5" />
              {archivedCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center">
                  {archivedCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold mt-1">Archiwum</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              isSettingsOpen
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1">Menu / Status</span>
          </button>
        </div>
      </nav>

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

      <SettingsDrawerModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onToggleTheme={(t) => handleToggleTheme(t)}
        isOnline={isOnline}
        ticketCount={tickets.length}
        onDataChanged={loadTickets}
        onOpenGitHubGuide={() => setIsGuideOpen(true)}
      />

      {isGuideOpen && (
        <GitHubPagesGuideModal onClose={() => setIsGuideOpen(false)} />
      )}
    </div>
  );
}
