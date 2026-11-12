import React, {useState, useEffect} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import {
  X,
  Sun,
  FileText,
  User,
  Train,
  Clock,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {TrainTicket} from '../types/ticket';
import {
  cleanStationName,
  cleanPassengerName,
  extractHighResBarcodeFromDataUrl,
} from '../utils/pdfParser';
import {saveTicket} from '../db/ticketStore';

interface ConductorModalProps {
  ticket: TrainTicket | null;
  onClose: () => void;
}

const HD_BARCODE_CACHE_KEY = 'bilety_hd_barcode_upgraded_v1';

export const ConductorModal: React.FC<ConductorModalProps> = ({
  ticket,
  onClose,
}) => {
  const [maxBrightness, setMaxBrightness] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);
  const [hdBarcodeUrl, setHdBarcodeUrl] = useState<string | undefined>(
    ticket?.barcodeImageUrl
  );

  useEffect(() => {
    setHdBarcodeUrl(ticket?.barcodeImageUrl);
    if (!ticket) return;

    // Automatically upgrade existing PDF tickets to 4.5x crisp HD Aztec barcode
    const checkAndUpgrade = async () => {
      if (!ticket.attachmentDataUrl) return;
      try {
        const upgradedMap = JSON.parse(
          localStorage.getItem(HD_BARCODE_CACHE_KEY) || '{}'
        );
        const cleanedDep =
          cleanStationName(ticket.departureStation) || ticket.departureStation;
        const cleanedArr =
          cleanStationName(ticket.arrivalStation) || ticket.arrivalStation;
        const cleanedPass =
          cleanPassengerName(ticket.passengerName) || ticket.passengerName;

        const needsStationFix =
          cleanedDep !== ticket.departureStation ||
          cleanedArr !== ticket.arrivalStation ||
          cleanedPass !== ticket.passengerName;

        if (!upgradedMap[ticket.id]) {
          const newHdUrl = await extractHighResBarcodeFromDataUrl(
            ticket.attachmentDataUrl
          );
          if (newHdUrl) {
            setHdBarcodeUrl(newHdUrl);
            upgradedMap[ticket.id] = true;
            localStorage.setItem(
              HD_BARCODE_CACHE_KEY,
              JSON.stringify(upgradedMap)
            );
            await saveTicket({
              ...ticket,
              departureStation: cleanedDep,
              arrivalStation: cleanedArr,
              passengerName: cleanedPass,
              barcodeImageUrl: newHdUrl,
            });
            return;
          }
        }

        if (needsStationFix) {
          await saveTicket({
            ...ticket,
            departureStation: cleanedDep,
            arrivalStation: cleanedArr,
            passengerName: cleanedPass,
          });
        }
      } catch {
        // ignore
      }
    };

    checkAndUpgrade();
  }, [ticket]);

  if (!ticket) return null;

  const depDate = new Date(ticket.departureTime);
  const arrDate = new Date(ticket.arrivalTime);

  const formattedDepTime = depDate.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedArrTime = arrDate.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = depDate.toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const displayDeparture =
    cleanStationName(ticket.departureStation) || ticket.departureStation;
  const displayArrival =
    cleanStationName(ticket.arrivalStation) || ticket.arrivalStation;
  const displayPassenger =
    cleanPassengerName(ticket.passengerName) ||
    ticket.passengerName ||
    'Nieokreślony';

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-3 sm:px-4 modal-safe-Overlay ${
        maxBrightness ? 'bg-white' : 'bg-black/85 backdrop-blur-md'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md max-h-full flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-colors duration-200 ${
          maxBrightness
            ? 'bg-white text-black border-2 border-black'
            : 'bg-white text-slate-900 border border-slate-200 dark:border-zinc-700'
        }`}
      >
        {/* Sticky Top Header Toolbar — Always Visible */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 truncate">
              Kontrola biletowa
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMaxBrightness(!maxBrightness)}
              title="Maksymalny kontrast dla skanera"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                maxBrightness
                  ? 'bg-black text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{maxBrightness ? 'Standard' : 'Kontrast'}</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              aria-label="Zamknij"
            >
              <X className="w-4 h-4" />
              <span>Zamknij</span>
            </button>
          </div>
        </div>

        {/* Scrollable Middle Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Compact Seat & Coach Banner */}
          <div className="bg-slate-950 text-white px-4 py-3 text-center">
            <div className="flex items-center justify-between gap-2 max-w-xs mx-auto mb-2 text-[11px] text-blue-300 font-semibold uppercase">
              <span className="inline-flex items-center gap-1">
                <Train className="w-3.5 h-3.5" />
                {ticket.carrier} · {ticket.trainNumber}
              </span>
              <span className="text-slate-300">
                Kl. {ticket.travelClass} · {ticket.seatType || 'Siedzące'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-w-xs mx-auto">
              <div className="bg-white/10 rounded-2xl py-1.5 px-3 border border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-slate-300 font-medium block">
                  Wagon
                </span>
                <span className="text-2xl font-extrabold font-mono tracking-tight text-amber-400">
                  {ticket.carNumber}
                </span>
              </div>

              <div className="bg-white/10 rounded-2xl py-1.5 px-3 border border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-slate-300 font-medium block">
                  Miejsce
                </span>
                <span className="text-2xl font-extrabold font-mono tracking-tight text-white">
                  {ticket.seatNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Aztec / QR Barcode Container (High-Contrast White Area) */}
          <div className="p-4 bg-white flex flex-col items-center justify-center border-b border-dashed border-slate-200">
            <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-inner flex flex-col items-center">
              {hdBarcodeUrl ? (
                <img
                  src={hdBarcodeUrl}
                  alt="Kod Aztec z biletu PDF"
                  style={{imageRendering: 'pixelated'}}
                  className="w-52 sm:w-56 h-auto object-contain"
                />
              ) : (
                <QRCodeSVG
                  value={ticket.barcodeData || `TICKET-${ticket.id}`}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              )}
            </div>

            <div className="mt-2.5 text-center space-y-1">
              <p className="text-xs font-mono text-slate-500 tracking-tight">
                Bilet:{' '}
                <strong className="text-slate-900 font-bold">
                  {ticket.ticketNumber ||
                    ticket.bookingReference ||
                    ticket.id.slice(0, 8)}
                </strong>
              </p>
              {ticket.emergencyCode && (
                <p className="text-xs font-mono text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 inline-block font-semibold">
                  Kod awaryjny: {ticket.emergencyCode}
                </p>
              )}
            </div>
          </div>

          {/* Passenger & Journey Details */}
          <div className="p-4 space-y-3 text-sm bg-slate-50/70">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-xs">Podróżny:</span>
              </div>
              <span className="font-bold text-slate-900 text-right text-xs sm:text-sm truncate">
                {displayPassenger}
              </span>
            </div>

            {/* Route & Times */}
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>Stacja początkowa</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm sm:text-base truncate">
                    {displayDeparture}
                  </div>
                  {ticket.departurePlatform && (
                    <div className="text-[11px] text-slate-500">
                      {ticket.departurePlatform}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Odjazd</span>
                  </div>
                  <div className="font-bold font-mono text-slate-900 text-base">
                    {formattedDepTime}
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Stacja docelowa</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm sm:text-base truncate">
                    {displayArrival}
                  </div>
                  {ticket.arrivalPlatform && (
                    <div className="text-[11px] text-slate-500">
                      {ticket.arrivalPlatform}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Przyjazd</span>
                  </div>
                  <div className="font-bold font-mono text-slate-900 text-base">
                    {formattedArrTime}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 text-center pt-1">
                Data podróży:{' '}
                <span className="font-semibold text-slate-800">{formattedDate}</span>
              </div>
            </div>

            {/* Attached Document Section */}
            {(ticket.hasAttachment || ticket.pdfPagePreviewUrl) && (
              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={() => setShowAttachment(!showAttachment)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">
                      {ticket.attachmentName || 'Oryginalny bilet PDF (Podgląd)'}
                    </span>
                  </div>
                  {showAttachment ? (
                    <ChevronUp className="w-4 h-4 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  )}
                </button>

                {showAttachment && (
                  <div className="mt-2.5 p-2.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
                    {ticket.pdfPagePreviewUrl ? (
                      <img
                        src={ticket.pdfPagePreviewUrl}
                        alt="Oryginalna strona biletu"
                        className="w-full h-auto rounded-lg shadow-sm border border-slate-200"
                      />
                    ) : ticket.attachmentType === 'image' ||
                      (ticket.attachmentDataUrl &&
                        ticket.attachmentDataUrl.startsWith('data:image')) ? (
                      <img
                        src={ticket.attachmentDataUrl}
                        alt="Załączony bilet"
                        className="max-h-80 w-auto mx-auto rounded-lg shadow-sm"
                      />
                    ) : ticket.attachmentDataUrl ? (
                      <iframe
                        src={ticket.attachmentDataUrl}
                        title="Podgląd PDF"
                        className="w-full h-72 rounded-lg border border-slate-200"
                      />
                    ) : null}

                    {ticket.attachmentDataUrl && (
                      <a
                        href={ticket.attachmentDataUrl}
                        download={
                          ticket.attachmentName || `bilet-${ticket.trainNumber}.pdf`
                        }
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline pt-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Pobierz plik PDF
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Footer — Always Visible */}
        <div className="shrink-0 p-3 bg-slate-100 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
          >
            Zamknij widok kontroli
          </button>
        </div>
      </div>
    </div>
  );
};
