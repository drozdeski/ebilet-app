import React, {useState, useEffect} from 'react';
import {
  X,
  FileText,
  Upload,
  Train,
  Clock,
  MapPin,
  Check,
  AlertCircle,
  Sparkles,
  Calendar,
} from 'lucide-react';
import {RailCarrier, TrainTicket} from '../types/ticket';
import {parseBookingText} from '../utils/parser';

import {parsePDFTicket} from '../utils/pdfParser';

interface TicketModalProps {
  ticketToEdit?: TrainTicket | null;
  onClose: () => void;
  onSave: (ticket: TrainTicket) => void;
}

const COMMON_STATIONS = [
  'Warszawa Centralna',
  'Warszawa Zachodnia',
  'Warszawa Wschodnia',
  'Kraków Główny',
  'Gdańsk Główny',
  'Gdynia Główna',
  'Sopot',
  'Wrocław Główny',
  'Poznań Główny',
  'Katowice',
  'Łódź Fabryczna',
  'Szczecin Główny',
  'Lublin Główny',
  'Białystok',
  'Bydgoszcz Główna',
  'Toruń Główny',
  'Częstochowa',
  'Rzeszów Główny',
  'Opole Główne',
  'Kielce',
  'Zakopane',
];

const CARRIERS: RailCarrier[] = [
  'PKP Intercity',
  'Polregio',
  'Koleje Mazowieckie',
  'eTravel',
  'Koleje Dolnośląskie',
  'Koleje Śląskie',
  'Deutsche Bahn',
  'Inny',
];

export const TicketModal: React.FC<TicketModalProps> = ({
  ticketToEdit,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'paste' | 'file'>('form');
  const [pasteText, setPasteText] = useState('');
  const [parsedStatus, setParsedStatus] = useState<string | null>(null);

  // Form states
  const [carrier, setCarrier] = useState<RailCarrier>('PKP Intercity');
  const [trainNumber, setTrainNumber] = useState('IC ');
  const [trainName, setTrainName] = useState('');
  const [departureStation, setDepartureStation] = useState('Warszawa Centralna');
  const [departureTime, setDepartureTime] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString().slice(0, 16)
  );
  const [departurePlatform, setDeparturePlatform] = useState('Peron 1');
  const [arrivalStation, setArrivalStation] = useState('Kraków Główny');
  const [arrivalTime, setArrivalTime] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 4.5).toISOString().slice(0, 16)
  );
  const [arrivalPlatform, setArrivalPlatform] = useState('');
  const [carNumber, setCarNumber] = useState('04');
  const [seatNumber, setSeatNumber] = useState('52');
  const [travelClass, setTravelClass] = useState<'1' | '2'>('2');
  const [seatType, setSeatType] = useState<
    'Okno' | 'Korytarz' | 'Środek' | 'Przedział' | 'Bezprzedziałowy'
  >('Okno');
  const [passengerName, setPassengerName] = useState('Jan Kowalski');
  const [ticketNumber, setTicketNumber] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [price, setPrice] = useState('');
  const [barcodeData, setBarcodeData] = useState('');

  const [barcodeImageUrl, setBarcodeImageUrl] = useState<string | undefined>();
  const [pdfPagePreviewUrl, setPdfPagePreviewUrl] = useState<string | undefined>();
  const [emergencyCode, setEmergencyCode] = useState<string | undefined>();
  const [isParsingPDF, setIsParsingPDF] = useState(false);

  // Attachment states
  const [hasAttachment, setHasAttachment] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentType, setAttachmentType] = useState<'pdf' | 'image'>('pdf');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState('');

  useEffect(() => {
    if (ticketToEdit) {
      setCarrier(ticketToEdit.carrier);
      setTrainNumber(ticketToEdit.trainNumber);
      setTrainName(ticketToEdit.trainName || '');
      setDepartureStation(ticketToEdit.departureStation);
      setDepartureTime(ticketToEdit.departureTime);
      setDeparturePlatform(ticketToEdit.departurePlatform || '');
      setArrivalStation(ticketToEdit.arrivalStation);
      setArrivalTime(ticketToEdit.arrivalTime);
      setArrivalPlatform(ticketToEdit.arrivalPlatform || '');
      setCarNumber(ticketToEdit.carNumber);
      setSeatNumber(ticketToEdit.seatNumber);
      setTravelClass(ticketToEdit.travelClass);
      setSeatType(ticketToEdit.seatType || 'Okno');
      setPassengerName(ticketToEdit.passengerName);
      setTicketNumber(ticketToEdit.ticketNumber || '');
      setBookingReference(ticketToEdit.bookingReference || '');
      setEmergencyCode(ticketToEdit.emergencyCode || '');
      setPrice(ticketToEdit.price || '');
      setBarcodeData(ticketToEdit.barcodeData || '');
      setBarcodeImageUrl(ticketToEdit.barcodeImageUrl);
      setPdfPagePreviewUrl(ticketToEdit.pdfPagePreviewUrl);
      setHasAttachment(ticketToEdit.hasAttachment);
      setAttachmentName(ticketToEdit.attachmentName || '');
      setAttachmentType(ticketToEdit.attachmentType || 'pdf');
      setAttachmentDataUrl(ticketToEdit.attachmentDataUrl || '');
    }
  }, [ticketToEdit]);

  const handleParseText = () => {
    if (!pasteText.trim()) return;
    const parsed = parseBookingText(pasteText);

    if (parsed.carrier) setCarrier(parsed.carrier);
    if (parsed.trainNumber) setTrainNumber(parsed.trainNumber);
    if (parsed.trainName) setTrainName(parsed.trainName);
    if (parsed.departureStation) setDepartureStation(parsed.departureStation);
    if (parsed.departureTime) setDepartureTime(parsed.departureTime);
    if (parsed.departurePlatform) setDeparturePlatform(parsed.departurePlatform);
    if (parsed.arrivalStation) setArrivalStation(parsed.arrivalStation);
    if (parsed.arrivalTime) setArrivalTime(parsed.arrivalTime);
    if (parsed.carNumber) setCarNumber(parsed.carNumber);
    if (parsed.seatNumber) setSeatNumber(parsed.seatNumber);
    if (parsed.travelClass) setTravelClass(parsed.travelClass);
    if (parsed.seatType) setSeatType(parsed.seatType);
    if (parsed.passengerName) setPassengerName(parsed.passengerName);
    if (parsed.ticketNumber) setTicketNumber(parsed.ticketNumber);
    if (parsed.bookingReference) setBookingReference(parsed.bookingReference);
    if (parsed.price) setPrice(parsed.price);
    if (parsed.barcodeData) setBarcodeData(parsed.barcodeData);

    setParsedStatus('Rozpoznano pomyślnie dane biletu z tekstu!');
    setActiveTab('form');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    setAttachmentName(file.name);
    setAttachmentType(isPdf ? 'pdf' : 'image');
    setHasAttachment(true);

    // Read full raw file as Data URL for offline storage
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // If PDF, automatically parse ticket text and extract Aztec / QR barcode!
    if (isPdf) {
      setIsParsingPDF(true);
      setParsedStatus('Odczytywanie danych z pliku PDF oraz wycinanie kodu Aztec...');
      try {
        const parsed = await parsePDFTicket(file);
        const t = parsed.ticket;

        if (t.carrier) setCarrier(t.carrier);
        if (t.trainNumber) setTrainNumber(t.trainNumber);
        if (t.trainName) setTrainName(t.trainName);
        if (t.departureStation) setDepartureStation(t.departureStation);
        if (t.arrivalStation) setArrivalStation(t.arrivalStation);
        if (t.departureTime) setDepartureTime(t.departureTime);
        if (t.arrivalTime) setArrivalTime(t.arrivalTime);
        if (t.carNumber) setCarNumber(t.carNumber);
        if (t.seatNumber) setSeatNumber(t.seatNumber);
        if (t.travelClass) setTravelClass(t.travelClass);
        if (t.seatType) setSeatType(t.seatType);
        if (t.passengerName) setPassengerName(t.passengerName);
        if (t.ticketNumber) setTicketNumber(t.ticketNumber);
        if (t.bookingReference) setBookingReference(t.bookingReference);
        if (t.emergencyCode) setEmergencyCode(t.emergencyCode);
        if (t.price) setPrice(t.price);
        if (t.barcodeData) setBarcodeData(t.barcodeData);

        if (parsed.barcodeImageUrl) {
          setBarcodeImageUrl(parsed.barcodeImageUrl);
        }
        if (parsed.pdfPagePreviewUrl) {
          setPdfPagePreviewUrl(parsed.pdfPagePreviewUrl);
        }

        setParsedStatus(
          `Odczytano automatycznie bilet: ${t.trainNumber || ''} (Wagon ${t.carNumber || ''}, Miejsce ${t.seatNumber || ''}) dla ${t.passengerName || ''}`
        );
        setActiveTab('form');
      } catch (err) {
        console.error('Błąd parsowania PDF:', err);
        setParsedStatus('Załączono plik PDF. Uzupełnij pola formularza ręcznie.');
      } finally {
        setIsParsingPDF(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fallbackBarcode =
      barcodeData ||
      `${carrier}#${trainNumber}#${carNumber}#${seatNumber}#${passengerName}#${ticketNumber || Date.now()}`;

    const newTicket: TrainTicket = {
      id: ticketToEdit ? ticketToEdit.id : `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `${departureStation} → ${arrivalStation}`,
      carrier,
      trainNumber: trainNumber.trim(),
      trainName: trainName.trim(),
      departureStation: departureStation.trim(),
      departureTime,
      departurePlatform: departurePlatform.trim(),
      arrivalStation: arrivalStation.trim(),
      arrivalTime,
      arrivalPlatform: arrivalPlatform.trim(),
      carNumber: carNumber.trim(),
      seatNumber: seatNumber.trim(),
      travelClass,
      seatType,
      passengerName: passengerName.trim(),
      ticketNumber: ticketNumber.trim(),
      bookingReference: bookingReference.trim(),
      emergencyCode: emergencyCode?.trim(),
      price: price.trim(),
      barcodeData: fallbackBarcode,
      barcodeImageUrl,
      pdfPagePreviewUrl,
      hasAttachment,
      attachmentName,
      attachmentType,
      attachmentDataUrl,
      isArchived: ticketToEdit ? ticketToEdit.isArchived : false,
      createdAt: ticketToEdit ? ticketToEdit.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    onSave(newTicket);
  };


  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Train className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {ticketToEdit ? 'Edytuj bilet kolejowy' : 'Dodaj nowy bilet kolejowy'}
              </h2>
              <p className="text-xs text-slate-500">
                Wszystkie dane są zapisywane w 100% lokalnie w IndexedDB
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

        {/* Segmented Tab Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl my-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all ${
              activeTab === 'form'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Formularz
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'paste'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Wklej eTravel / PKP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'file'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Załącznik PDF / Zdjęcie
          </button>
        </div>

        {parsedStatus && (
          <div className="mb-4 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{parsedStatus}</span>
          </div>
        )}

        {/* Tab Content: Quick Paste Parser */}
        {activeTab === 'paste' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
              Wklej treść potwierdzenia z maila lub SMS (np. z <strong>eTravel</strong> lub <strong>PKP Intercity</strong>). System automatycznie rozpozna stacje, godziny, pociąg, wagon i miejsca.
            </div>

            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Wklej tutaj treść biletu, np.:
Pociąg: EIP 1301 Pendolino
Relacja: Warszawa Centralna - Kraków Główny
Odjazd: 14:25, Przyjazd: 16:50
Wagon: 04, Miejsce: 52 okno
Bilet nr: 9482910
Podróżny: Jan Kowalski"
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="button"
              onClick={handleParseText}
              disabled={!pasteText.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Rozpoznaj i wypełnij formularz
            </button>
          </div>
        )}

        {/* Tab Content: Attachment Upload */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              Załącz oryginalny plik PDF biletu lub zrzut ekranu. Plik zostanie zapisany w pamięci <strong>IndexedDB</strong> Twojej przeglądarki, więc otworzysz go nawet bez dostępu do sieci.
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 cursor-pointer hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-800/50">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Wybierz plik PDF lub zdjęcie (PNG, JPG)
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Maksymalnie 15 MB
              </span>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {hasAttachment && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900 dark:text-blue-300 truncate max-w-[200px]">
                    {attachmentName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHasAttachment(false);
                    setAttachmentDataUrl('');
                    setAttachmentName('');
                  }}
                  className="text-red-500 hover:text-red-700 font-semibold"
                >
                  Usuń
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Form (Always present for review and edits) */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Row 1: Carrier & Train */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Przewoźnik
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value as RailCarrier)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              >
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Numer i nazwa pociągu
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="np. EIP 1301"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="np. Pendolino"
                  value={trainName}
                  onChange={(e) => setTrainName(e.target.value)}
                  className="w-24 px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Stations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Stacja odjazdu
              </label>
              <input
                type="text"
                required
                list="station-list"
                placeholder="np. Warszawa Centralna"
                value={departureStation}
                onChange={(e) => setDepartureStation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Stacja przyjazdu
              </label>
              <input
                type="text"
                required
                list="station-list"
                placeholder="np. Kraków Główny"
                value={arrivalStation}
                onChange={(e) => setArrivalStation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <datalist id="station-list">
            {COMMON_STATIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          {/* Row 3: Departure & Arrival Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Data i godzina odjazdu
              </label>
              <input
                type="datetime-local"
                required
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Data i godzina przyjazdu
              </label>
              <input
                type="datetime-local"
                required
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 4: Coach (Wagon), Seat (Miejsce), Class */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Wagon
              </label>
              <input
                type="text"
                required
                placeholder="np. 04"
                value={carNumber}
                onChange={(e) => setCarNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Miejsce
              </label>
              <input
                type="text"
                required
                placeholder="np. 52"
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Typ miejsca
              </label>
              <select
                value={seatType}
                onChange={(e) =>
                  setSeatType(
                    e.target.value as
                      | 'Okno'
                      | 'Korytarz'
                      | 'Środek'
                      | 'Przedział'
                      | 'Bezprzedziałowy'
                  )
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="Okno">Okno</option>
                <option value="Korytarz">Korytarz</option>
                <option value="Środek">Środek</option>
                <option value="Bezprzedziałowy">Bezprzedziałowy</option>
                <option value="Przedział">Przedział</option>
              </select>
            </div>
          </div>

          {/* Row 5: Passenger & Ticket Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Imię i nazwisko podróżnego
              </label>
              <input
                type="text"
                placeholder="np. Jan Kowalski"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Numer biletu / PNR
              </label>
              <input
                type="text"
                placeholder="np. 9482019482"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md transition-colors"
            >
              {ticketToEdit ? 'Zapisz zmiany' : 'Dodaj bilet do portfela'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
